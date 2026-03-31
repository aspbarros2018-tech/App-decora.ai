import express from 'express';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { Readable } from 'stream';
import https from 'https';
import http from 'http';

// Load environment variables from .env file if present
dotenv.config();

// Use process.cwd() for reliable path resolution in containers
const rootPath = process.cwd();
const distPath = path.join(rootPath, 'dist');

// Helper to log with timestamp
const log = (msg: string, ...args: any[]) => {
  console.log(`[${new Date().toISOString()}] ${msg}`, ...args);
};

// Initialize Supabase Admin (for webhooks)
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseAdmin: any = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    log('Supabase Admin initialized successfully');
  } catch (err) {
    log('Failed to initialize Supabase Admin:', err);
  }
} else {
  log('Supabase credentials missing. Webhook functionality will be limited.');
}

async function startServer() {
  const app = express();
  const port = 3000;

  // Log all requests for debugging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  console.log(`Starting server. NODE_ENV: ${process.env.NODE_ENV}`);

  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      time: new Date().toISOString(),
      env: process.env.NODE_ENV,
      asaas: !!process.env.ASAAS_API_KEY,
      supabase: !!supabaseAdmin
    });
  });

  // Proxy PDF route to bypass CORS (Agora protegido contra SSRF)
  app.get('/api/proxy-pdf', async (req, res) => {
    let url = req.query.url as string;
    if (!url) {
      return res.status(400).send('Missing URL');
    }

    console.log(`[PDF Proxy] Solicitando URL: ${url}`);

    // PROTEÇÃO (SSRF): Bloqueia IPs internos e localhost
    try {
      const parsedUrl = new URL(url);
      
      // Bloqueia protocolos não-HTTP
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        console.warn(`[PDF Proxy] Protocolo inválido: ${parsedUrl.protocol}`);
        return res.status(400).send('Protocolo inválido');
      }

      // Bloqueia localhost e IPs de loopback
      const hostname = parsedUrl.hostname;
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
        hostname === '169.254.169.254' // AWS/GCP metadata
      ) {
        console.warn(`[PDF Proxy] Tentativa de SSRF barrada (IP interno): ${url}`);
        return res.status(403).send('Acesso Negado: Endereço interno não permitido.');
      }
      
      // Se VITE_SUPABASE_URL estiver disponível, podemos fazer uma verificação extra (opcional)
      const allowedDomain = process.env.VITE_SUPABASE_URL || '';
      if (allowedDomain) {
        try {
          const parsedAllowed = new URL(allowedDomain.startsWith('http') ? allowedDomain : `https://${allowedDomain}`);
          if (hostname !== parsedAllowed.hostname && !hostname.endsWith('.supabase.co')) {
             console.warn(`[PDF Proxy] Aviso: URL não pertence ao domínio esperado (${parsedAllowed.hostname}), mas foi permitida.`);
          }
        } catch (err) {
          console.warn(`[PDF Proxy] Erro ao parsear VITE_SUPABASE_URL: ${allowedDomain}`);
        }
      }
      
    } catch (e: any) {
      console.warn(`[PDF Proxy] URL inválida fornecida para proxy: ${url}. Erro: ${e.message}`);
      return res.status(400).send('URL inválida');
    }

    try {
      console.log(`[PDF Proxy] Iniciando download do Supabase: ${url}`);
      
      // Fazemos um fetch simples, sem repassar headers do cliente (como Range ou Accept-Encoding).
      // Isso evita erros 400 do Supabase e garante que recebemos o arquivo completo.
      // O fetch nativo do Node lida automaticamente com redirecionamentos (301/302).
      let response = await fetch(url);
      
      // Fallback 1: Fix hostname typo (tasypbhoytjdtbx -> fmwzmtasypbhoytjdtbx)
      if (!response.ok && url.includes('tasypbhoytjdtbx.supabase.co') && !url.includes('fmwzmtasypbhoytjdtbx')) {
        console.warn(`[PDF Proxy] Fallback 1: Corrigindo erro de digitação no hostname.`);
        const fallbackUrl = url.replace('tasypbhoytjdtbx.supabase.co', 'fmwzmtasypbhoytjdtbx.supabase.co');
        response = await fetch(fallbackUrl);
        if (response.ok) {
           console.log(`[PDF Proxy] Fallback 1 bem-sucedido!`);
           url = fallbackUrl;
        }
      }

      // Fallback 2: Fix bucket typo (operacional -> pdfs)
      if (!response.ok && url.includes('/operacional/')) {
        console.warn(`[PDF Proxy] Fallback 2: Tentando buscar no bucket 'pdfs' em vez de 'operacional'.`);
        const fallbackUrl = url.replace('/operacional/', '/pdfs/');
        response = await fetch(fallbackUrl);
        if (response.ok) {
           console.log(`[PDF Proxy] Fallback 2 bem-sucedido!`);
           url = fallbackUrl;
        }
      }

      // Fallback 3: Fix both typos
      if (!response.ok && url.includes('tasypbhoytjdtbx.supabase.co') && !url.includes('fmwzmtasypbhoytjdtbx') && url.includes('/operacional/')) {
        console.warn(`[PDF Proxy] Fallback 3: Corrigindo hostname e bucket.`);
        const fallbackUrl = url.replace('tasypbhoytjdtbx.supabase.co', 'fmwzmtasypbhoytjdtbx.supabase.co').replace('/operacional/', '/pdfs/');
        response = await fetch(fallbackUrl);
        if (response.ok) {
           console.log(`[PDF Proxy] Fallback 3 bem-sucedido!`);
           url = fallbackUrl;
        }
      }
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error(`[PDF Proxy] Falha no fetch: ${response.status} ${response.statusText}. Body: ${errorText}`);
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(response.status).send(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      }
      
      // Lemos o arquivo inteiro para a memória do servidor.
      // Isso garante que o Content-Length enviado ao cliente seja 100% exato,
      // evitando travamentos no react-pdf causados por descompressão automática ou streams corrompidos.
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log(`[PDF Proxy] Fetch success. Tamanho: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
      
      res.status(200);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', response.headers.get('content-type') || 'application/pdf');
      res.setHeader('Content-Length', buffer.length.toString());
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
      
      // Enviamos o buffer completo para o cliente
      res.send(buffer);
    } catch (error) {
      console.error('[PDF Proxy] Error proxying PDF:', error);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(500).send('Error proxying PDF');
    }
  });

  // Asaas Payment Creation
    app.post('/api/create-asaas-payment', express.json(), async (req, res) => {
    console.log('Received request for Asaas payment:', req.body);
    const { plan, course, userId, email, name, cpf, paymentMethod } = req.body;
    
    const asaasApiKey = process.env.ASAAS_API_KEY || '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjlmMjVkY2I2LWQ4OTgtNDFiOC1iMzRlLTVhNjNmNjMyYmFlYzo6JGFhY2hfODU0OGVkYTgtY2M5ZC00Mjg4LTg4YTktMWYxNWE4YTA2YjZm';
    // Use sandbox for dev, production for prod
    let asaasUrl = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';

    // Proteção: Se o usuário acidentalmente colocar a chave de API na variável de URL, forçamos a URL correta
    if (asaasUrl.startsWith('$aact')) {
      asaasUrl = 'https://api.asaas.com/v3';
    }

    if (!asaasApiKey) {
      console.error('Asaas API Key is missing in environment variables.');
      return res.status(500).json({ error: 'O Asaas não foi configurado corretamente no servidor (Falta ASAAS_API_KEY).' });
    }

    const plans: Record<string, { name: string, price: number }> = {
      '1month': { name: 'Plano 1 Mês', price: 29.90 },
      '2months': { name: 'Plano 2 Meses', price: 49.90 },
      '4months': { name: 'Plano 4 Meses', price: 69.90 },
    };

    const selectedPlan = plans[plan];
    if (!selectedPlan) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    try {
      // 1. Find or create customer in Asaas
      let customerId = '';
      
      // First try to find by CPF if provided, otherwise by email
      let searchUrl = `${asaasUrl}/customers?email=${encodeURIComponent(email)}`;
      if (cpf) {
        // Remove non-numeric characters from CPF for search
        const cleanCpf = cpf.replace(/\D/g, '');
        searchUrl = `${asaasUrl}/customers?cpfCnpj=${cleanCpf}`;
      }

      const customerSearchResponse = await fetch(searchUrl, {
        headers: { 'access_token': asaasApiKey }
      });
      const customerSearch = await customerSearchResponse.json();

      if (customerSearch.data && customerSearch.data.length > 0) {
        customerId = customerSearch.data[0].id;
        
        // Update the customer name if it's different
        if (name && customerSearch.data[0].name !== name) {
          await fetch(`${asaasUrl}/customers/${customerId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
            body: JSON.stringify({ name })
          });
        }
      } else {
        const newCustomerResponse = await fetch(`${asaasUrl}/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
          body: JSON.stringify({ 
            name: name || email, 
            email, 
            cpfCnpj: cpf || '' 
          })
        });
        const newCustomer = await newCustomerResponse.json();
        if (newCustomer.errors) {
          throw new Error(`Erro ao criar cliente: ${newCustomer.errors[0].description}`);
        }
        customerId = newCustomer.id;
      }

      // 2. Create payment
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3); // Due in 3 days

      const paymentData: any = {
        customer: customerId,
        billingType: paymentMethod === 'pix' ? 'PIX' : 'CREDIT_CARD',
        value: selectedPlan.price,
        dueDate: dueDate.toISOString().split('T')[0],
        description: `${selectedPlan.name} - ${course === '3sgt' ? 'EAP 3º Sgt' : course === '1sgt' ? 'EAP 1º Sgt' : 'EAP 1º Ten'}`,
        externalReference: JSON.stringify({ userId, plan, course })
      };

      const paymentResponse = await fetch(`${asaasUrl}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
        body: JSON.stringify(paymentData)
      });
      
      const payment = await paymentResponse.json();

      if (payment.errors) {
        throw new Error(`Erro ao criar cobrança: ${payment.errors[0].description}`);
      }

      console.log('Asaas payment created successfully:', payment.id);
      res.json({ url: payment.invoiceUrl });
    } catch (error: any) {
      console.error('Detailed error in Asaas payment creation:', error);
      res.status(500).json({ error: `Erro no Asaas: ${error.message}` });
    }
  });

  // Asaas Webhook (Agora protegido com validação de Token)
  app.post('/api/asaas-webhook', express.json(), async (req, res) => {
    // PROTEÇÃO: Verificar se o token de acesso do webhook vindo do Asaas bate com a API_KEY configurada.
    const expectedToken = process.env.ASAAS_API_KEY || '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjlmMjVkY2I2LWQ4OTgtNDFiOC1iMzRlLTVhNjNmNjMyYmFlYzo6JGFhY2hfODU0OGVkYTgtY2M5ZC00Mjg4LTg4YTktMWYxNWE4YTA2YjZm';
    const receivedToken = req.headers['asaas-access-token'];

    if (!expectedToken || receivedToken !== expectedToken) {
      console.warn('Asaas Webhook Bloqueado: Autenticação Falhou ou Tentativa de Ataque Identificada.', { ip: req.ip });
      return res.status(401).json({ error: 'Não Autorizado', received: false });
    }

    const { event, payment } = req.body;
    console.log(`Received Asaas webhook event: ${event}`);

    // Asaas sends PAYMENT_RECEIVED for PIX/Boleto and PAYMENT_CONFIRMED for Credit Card
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      try {
        const metadata = JSON.parse(payment.externalReference || '{}');
        const { userId, plan, course } = metadata;

        if (userId && supabaseAdmin) {
          console.log(`Payment successful (${event}) for user ${userId}. Updating profile...`);
          const { error } = await supabaseAdmin
            .from('profiles')
            .upsert({
              id: userId,
              plan,
              course,
              updated_at: new Date().toISOString(),
            });

          if (error) {
            console.error('Error updating profile via webhook:', error);
          } else {
            console.log(`Profile updated successfully for user ${userId}`);
          }
        } else if (userId && !supabaseAdmin) {
          console.warn('Payment successful but Supabase Admin is not initialized. Profile update skipped.');
        }
      } catch (err) {
        console.error('Error processing Asaas webhook metadata:', err);
      }
    }

    res.json({ received: true });
  });

  // Vite middleware for development
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));
  
  if (hasDist) {
    log('Production mode: Serving static files from', distPath);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      // Don't serve index for API routes
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    log('Development mode: Using Vite middleware...');
    try {
      // Use dynamic import to avoid bundling Vite in production
      const viteModule = await import('vite');
      const vite = await viteModule.createServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      log('Vite failed to load. Server is in a bad state.');
      app.get('*', (req, res) => {
        res.status(503).send('Application is starting up. Please refresh in 10 seconds.');
      });
    }
  }

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    log('Unhandled Error:', err);
    if (res.headersSent) return next(err);
    res.status(500).send('Internal Server Error');
  });

  // Use the PORT environment variable provided by Cloud Run
  const finalPort = process.env.PORT || port;
  app.listen(Number(finalPort), '0.0.0.0', () => {
    log(`Server listening at http://0.0.0.0:${finalPort}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
