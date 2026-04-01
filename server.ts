import express from 'express';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
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

const app = express();

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

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

// Proxy PDF route to bypass CORS
app.get('/api/proxy-pdf', async (req, res) => {
  let url = req.query.url as string;
  if (!url) {
    return res.status(400).send('Missing URL');
  }

  if (url.includes('%3A%2F%2F')) {
    url = decodeURIComponent(url);
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.status(400).send('Protocolo inválido');
    }

    const hostname = parsedUrl.hostname;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
      hostname === '169.254.169.254'
    ) {
      return res.status(403).send('Acesso Negado: Endereço interno não permitido.');
    }
  } catch (e: any) {
    return res.status(400).send('URL inválida');
  }

  try {
    if (supabaseAdmin && url.includes('/pdfs/')) {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/pdfs/');
        if (pathParts.length >= 2) {
          const filePath = decodeURIComponent(pathParts[1]);
          const { data, error } = await supabaseAdmin.storage.from('pdfs').download(filePath);
          
          if (!error && data) {
            const arrayBuffer = await data.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            return res.send(buffer);
          }
        }
      } catch (sdkErr: any) {}
    }

    let response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).send(`Erro ao buscar PDF`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  } catch (error: any) {
    res.status(500).send(`Erro interno no proxy: ${error.message}`);
  }
});

// Asaas Payment Creation
app.post('/api/create-asaas-payment', express.json(), async (req, res) => {
  const { plan, course, userId, email, name, cpf, paymentMethod } = req.body;
  const asaasApiKey = process.env.ASAAS_API_KEY;
  let asaasUrl = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';

  if (!asaasApiKey) {
    return res.status(500).json({ error: 'ASAAS_API_KEY não configurada' });
  }

  const plans: Record<string, { name: string, price: number }> = {
    '1month': { name: 'Plano 1 Mês', price: 29.90 },
    '2months': { name: 'Plano 2 Meses', price: 49.90 },
    '4months': { name: 'Plano 4 Meses', price: 69.90 },
  };

  const selectedPlan = plans[plan];
  if (!selectedPlan) return res.status(400).json({ error: 'Plano inválido' });

  try {
    let customerId = '';
    let searchUrl = `${asaasUrl}/customers?email=${encodeURIComponent(email)}`;
    if (cpf) {
      const cleanCpf = cpf.replace(/\D/g, '');
      searchUrl = `${asaasUrl}/customers?cpfCnpj=${cleanCpf}`;
    }

    const customerSearchResponse = await fetch(searchUrl, {
      headers: { 'access_token': asaasApiKey }
    });
    const customerSearch = await customerSearchResponse.json();

    if (customerSearch.data && customerSearch.data.length > 0) {
      customerId = customerSearch.data[0].id;
    } else {
      const newCustomerResponse = await fetch(`${asaasUrl}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
        body: JSON.stringify({ name: name || email, email, cpfCnpj: cpf || '' })
      });
      const newCustomer = await newCustomerResponse.json();
      if (newCustomer.errors) throw new Error(newCustomer.errors[0].description);
      customerId = newCustomer.id;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);

    const paymentResponse = await fetch(`${asaasUrl}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': asaasApiKey },
      body: JSON.stringify({
        customer: customerId,
        billingType: paymentMethod === 'pix' ? 'PIX' : 'CREDIT_CARD',
        value: selectedPlan.price,
        dueDate: dueDate.toISOString().split('T')[0],
        description: `${selectedPlan.name} - ${course}`,
        externalReference: JSON.stringify({ userId, plan, course })
      })
    });
    
    const payment = await paymentResponse.json();
    if (payment.errors) throw new Error(payment.errors[0].description);
    res.json({ url: payment.invoiceUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Asaas Webhook
app.post('/api/asaas-webhook', express.json(), async (req, res) => {
  const expectedToken = process.env.ASAAS_API_KEY;
  const receivedToken = req.headers['asaas-access-token'];

  if (!expectedToken || receivedToken !== expectedToken) {
    return res.status(401).json({ error: 'Não Autorizado' });
  }

  const { event, payment } = req.body;
  if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
    try {
      const { userId, plan, course } = JSON.parse(payment.externalReference || '{}');
      if (userId && supabaseAdmin) {
        await supabaseAdmin.from('profiles').upsert({
          id: userId, plan, course, updated_at: new Date().toISOString()
        });
      }
    } catch (err) {}
  }
  res.json({ received: true });
});

// Serve static files in production (Vercel)
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(process.cwd(), 'dist');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
      res.sendFile(path.join(publicPath, 'index.html'));
    });
  }
}

// Start listener if not on Vercel
if (!process.env.VERCEL) {
  // Serve static files in local development if dist exists
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    log(`Server listening at http://localhost:${port}`);
  });
}

export default app;
