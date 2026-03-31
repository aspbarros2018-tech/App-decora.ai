import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Logo from '../components/Logo';
import { supabase } from '../lib/supabase';

function CheckoutForm({ 
  plan, 
  course, 
  isCouponValid, 
  selectedPayment, 
  onSuccess 
}: { 
  plan: string, 
  course: string, 
  isCouponValid: boolean, 
  selectedPayment: string,
  onSuccess: () => void
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
      }

      // 1. Se for cupom, ativa direto
      if (isCouponValid) {
        const now = new Date().toISOString();
        const metadata = user.user_metadata || {};
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({ 
            id: user.id,
            course,
            plan: '1month',
            full_name: metadata.full_name || '',
            cpf: metadata.cpf || '',
            phone: metadata.phone || '',
            updated_at: now,
            created_at: now
          });
        if (upsertError) throw upsertError;
        onSuccess();
        return;
      }

      // 2. Asaas Payment (PIX ou Cartão)
      const metadata = user.user_metadata || {};
      const response = await fetch('/api/create-asaas-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plan, 
          course, 
          userId: user.id, 
          email: user.email,
          name: metadata.full_name || '',
          cpf: metadata.cpf || '',
          paymentMethod: selectedPayment
        }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao iniciar pagamento no Asaas');
      
      // Redireciona para a URL de pagamento do Asaas (fatura)
      // Open the Asaas payment URL in a new tab to avoid iframe restrictions
      window.open(data.url, '_blank');
      
      // Show a message to the user
      setError('A página de pagamento foi aberta em uma nova aba. Se o seu navegador bloqueou, clique no link abaixo.');
      
      // Add a fallback link in case the popup was blocked
      const fallbackLink = document.createElement('a');
      fallbackLink.href = data.url;
      fallbackLink.target = '_blank';
      fallbackLink.className = 'mt-4 inline-block text-blue-500 underline';
      fallbackLink.innerText = 'Clique aqui para acessar a página de pagamento';
      document.getElementById('payment-error-container')?.appendChild(fallbackLink);
      
    } catch (err: any) {
      console.error('Erro no pagamento:', err);
      setError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
      {error && (
        <div id="payment-error-container" className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg text-red-400 text-xs text-center font-bold mt-2">
          {error}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-dark via-background-dark/95 to-transparent z-40 max-w-[480px] mx-auto pb-safe">
        <button 
          type="submit" 
          disabled={isProcessing}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-bold h-14 rounded-xl shadow-lg shadow-green-900/40 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-sm tracking-wide uppercase group disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Processando...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">{isCouponValid ? 'verified' : (selectedPayment === 'pix' ? 'qr_code' : 'lock')}</span>
              <span>
                {isCouponValid 
                  ? 'Ativar Acesso Grátis' 
                  : (selectedPayment === 'pix' ? 'Gerar PIX' : 'Pagar com Cartão')}
              </span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function CheckoutStep4() {
  const navigate = useNavigate();
  const location = useLocation();
  const course = location.state?.course || '3sgt';
  const plan = location.state?.plan || '2months';
  const [selectedPayment, setSelectedPayment] = useState('pix');
  const [coupon, setCoupon] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const isCouponValid = coupon.toLowerCase() === 'padrão';
  const originalPrice = plan === '1month' ? 29.90 : plan === '2months' ? 49.90 : 69.90;
  const finalPrice = isCouponValid ? 0 : originalPrice;

  // Handle automatic redirection
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate]);

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-display bg-background-dark px-6">
        <div className="w-full max-w-[400px] bg-white/5 border border-white/10 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_15px_rgba(197,160,89,0.8)]"></div>
          
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/30 shadow-[0_0_30px_rgba(197,160,89,0.2)]">
            <span className="material-symbols-outlined text-primary text-4xl font-bold">check_circle</span>
          </div>
          
          <h2 className="text-white text-2xl font-bold mb-3 tracking-tight">
            {isCouponValid ? 'Cupom Aplicado!' : 'Assinatura Ativada!'}
          </h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            {isCouponValid 
              ? 'Seu acesso gratuito por 1 mês foi liberado com sucesso. Aproveite seus estudos!' 
              : 'Parabéns! Sua matrícula foi confirmada. Você já pode acessar todo o conteúdo exclusivo.'}
          </p>
          
          <div className="space-y-4">
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-[loading_2s_linear]"></div>
            </div>
            
            <button 
              onClick={() => navigate('/dashboard')}
              className="w-full bg-primary hover:bg-primary/90 text-[#0a0e17] font-bold h-14 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group"
            >
              <span>Ir para o Dashboard</span>
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
            <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">
              Redirecionando automaticamente...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-display bg-background-dark">
      <header className="sticky top-0 z-50 bg-pmmg-blue/95 backdrop-blur-md border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <Logo />
          <div className="flex items-center gap-2">
            <Link to="/checkout/3" className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-2 transition-colors">
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full max-w-[480px] mx-auto px-6 py-6 pb-24">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Pagamento</h2>
            <span className="text-primary font-bold text-xs uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
              Etapa 4 de 4
            </span>
          </div>
          <p className="text-slate-400 text-sm mb-4">Finalize sua assinatura de forma segura.</p>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden flex">
            <div className="h-full bg-primary w-full rounded-full shadow-[0_0_10px_rgba(197,160,89,0.5)]"></div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 shadow-lg">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4 border-b border-white/10 pb-2">Resumo do Pedido</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-300 text-sm">
              Plano {plan === '1month' ? '1 Mês' : plan === '2months' ? '2 Meses' : '4 Meses'} ({course === '3sgt' ? 'EAP 3º Sgt PM' : course === '1sgt' ? 'EAP 1º Sgt PM' : 'EAP 1º Ten PM'})
            </span>
            <span className={isCouponValid ? "text-slate-500 line-through text-xs" : "text-white font-bold"}>R$ {originalPrice.toFixed(2).replace('.', ',')}</span>
          </div>
          
          {isCouponValid && (
            <div className="flex justify-between items-center mb-2 text-green-400">
              <span className="text-sm">Cupom "padrão" aplicado (1 Mês Grátis)</span>
              <span className="font-bold">- R$ {originalPrice.toFixed(2).replace('.', ',')}</span>
            </div>
          )}

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
            <span className="text-white font-bold text-base">Total</span>
            <span className="text-primary font-black text-xl">R$ {finalPrice.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-white text-xs font-bold uppercase tracking-wider mb-2 ml-1">Cupom de Desconto</label>
          <div className="relative">
            <input 
              type="text" 
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="Digite seu cupom"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all outline-none"
            />
            {isCouponValid && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-green-500">check_circle</span>
            )}
          </div>
        </div>

        {/* Stripe Elements Wrapper */}
        <div className="flex flex-col gap-4 flex-1">
          <div className="flex flex-col gap-4">
            <label className="relative cursor-pointer group block" onClick={() => setSelectedPayment('pix')}>
              <div className={`bg-white/5 border ${selectedPayment === 'pix' ? 'border-primary ring-1 ring-primary/50 bg-[rgba(197,160,89,0.08)]' : 'border-white/10'} p-4 rounded-xl transition-all duration-300 hover:border-white/20 shadow-lg flex items-center gap-4`}>
                <div className="w-10 h-10 rounded-lg bg-[#32BCAD]/20 flex items-center justify-center text-[#32BCAD]">
                  <span className="material-symbols-outlined">qr_code_2</span>
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-white font-bold">PIX</span>
                  <span className="text-slate-400 text-[10px] uppercase tracking-wide">Aprovação imediata</span>
                </div>
                <div className={`shrink-0 w-5 h-5 rounded-full border-2 ${selectedPayment === 'pix' ? 'bg-primary border-primary scale-110' : 'border-white/20'} flex items-center justify-center transition-all`}>
                  <span className={`material-symbols-outlined text-[#0a0e17] text-[14px] ${selectedPayment === 'pix' ? 'opacity-100' : 'opacity-0'} font-bold`}>check</span>
                </div>
              </div>
            </label>

            <label className="relative cursor-pointer group block" onClick={() => setSelectedPayment('credit')}>
              <div className={`bg-white/5 border ${selectedPayment === 'credit' ? 'border-primary ring-1 ring-primary/50 bg-[rgba(197,160,89,0.08)]' : 'border-white/10'} p-4 rounded-xl transition-all duration-300 hover:border-white/20 shadow-lg flex items-center gap-4`}>
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <span className="material-symbols-outlined">credit_card</span>
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-white font-bold">Cartão de Crédito</span>
                  <span className="text-slate-400 text-[10px] uppercase tracking-wide">Até 12x</span>
                </div>
                <div className={`shrink-0 w-5 h-5 rounded-full border-2 ${selectedPayment === 'credit' ? 'bg-primary border-primary scale-110' : 'border-white/20'} flex items-center justify-center transition-all`}>
                  <span className={`material-symbols-outlined text-[#0a0e17] text-[14px] ${selectedPayment === 'credit' ? 'opacity-100' : 'opacity-0'} font-bold`}>check</span>
                </div>
              </div>
            </label>
          </div>

          <CheckoutForm 
            plan={plan}
            course={course}
            isCouponValid={isCouponValid}
            selectedPayment={selectedPayment}
            onSuccess={() => setIsSuccess(true)}
          />
        </div>
      </main>
    </div>
  );
}
