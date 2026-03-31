import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Logo from '../components/Logo';

export default function CheckoutStep3() {
  const navigate = useNavigate();
  const location = useLocation();
  const course = location.state?.course || '3sgt';
  const [selectedPlan, setSelectedPlan] = useState('2months');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) return;
    navigate('/checkout/4', { state: { course, plan: selectedPlan } });
  };

  return (
    <div className="min-h-screen flex flex-col font-display bg-background-dark">
      <header className="sticky top-0 z-50 bg-pmmg-blue/95 backdrop-blur-md border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <Logo />
          <div className="flex items-center gap-2">
            <Link to="/checkout/2" className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-2 transition-colors">
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full max-w-[480px] mx-auto px-6 py-6 pb-24">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Planos</h2>
            <span className="text-primary font-bold text-xs uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
              Etapa 3 de 4
            </span>
          </div>
          <p className="text-slate-400 text-sm mb-4">Escolha o plano que melhor se adapta ao seu tempo de estudo.</p>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden flex">
            <div className="h-full bg-primary w-3/4 rounded-full shadow-[0_0_10px_rgba(197,160,89,0.5)]"></div>
          </div>
        </div>
        <form onSubmit={handleNext} className="flex flex-col gap-4 flex-1">
          <label className="relative cursor-pointer group block">
            <input 
              className="peer sr-only" 
              name="plan" 
              type="radio" 
              value="1month" 
              checked={selectedPlan === '1month'}
              onChange={() => setSelectedPlan('1month')}
            />
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl transition-all duration-300 peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary/50 peer-checked:bg-[rgba(197,160,89,0.08)] hover:border-white/20 shadow-lg peer-checked:shadow-primary/10 relative overflow-hidden peer-checked:[&_.radio-dot]:bg-primary peer-checked:[&_.radio-dot]:border-primary peer-checked:[&_.radio-dot]:scale-110 peer-checked:[&_.radio-dot_span]:opacity-100">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Acesso Básico</span>
                  <h3 className="text-white text-xl font-bold leading-tight">1 Mês</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-slate-500 text-sm line-through decoration-slate-500/50">R$ 40,00</span>
                    <span className="text-white text-2xl font-black">R$ 29,90</span>
                  </div>
                </div>
                <div className="radio-dot shrink-0 w-6 h-6 rounded-full border-2 border-white/20 flex items-center justify-center group-hover:border-white/40 transition-all">
                  <span className="material-symbols-outlined text-[#0a0e17] text-[16px] opacity-0 transition-opacity font-bold">check</span>
                </div>
              </div>
            </div>
          </label>
          <label className="relative cursor-pointer group block">
            <input 
              className="peer sr-only" 
              name="plan" 
              type="radio" 
              value="2months" 
              checked={selectedPlan === '2months'}
              onChange={() => setSelectedPlan('2months')}
            />
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl transition-all duration-300 peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary/50 peer-checked:bg-[rgba(197,160,89,0.08)] hover:border-white/20 shadow-lg peer-checked:shadow-primary/10 relative overflow-hidden peer-checked:[&_.radio-dot]:bg-primary peer-checked:[&_.radio-dot]:border-primary peer-checked:[&_.radio-dot]:scale-110 peer-checked:[&_.radio-dot_span]:opacity-100">
              <div className="absolute top-0 right-0 bg-primary text-[#0a0e17] text-[9px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-widest shadow-md">
                Mais Popular
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-primary/90 text-xs font-bold uppercase tracking-wider mb-1">Custo-Benefício</span>
                  <h3 className="text-white text-xl font-bold leading-tight">2 Meses</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-slate-500 text-sm line-through decoration-slate-500/50">R$ 60,00</span>
                    <span className="text-white text-2xl font-black">R$ 49,90</span>
                  </div>
                </div>
                <div className="radio-dot shrink-0 w-6 h-6 rounded-full border-2 border-white/20 flex items-center justify-center group-hover:border-white/40 transition-all">
                  <span className="material-symbols-outlined text-[#0a0e17] text-[16px] opacity-0 transition-opacity font-bold">check</span>
                </div>
              </div>
            </div>
          </label>
          <label className="relative cursor-pointer group block">
            <input 
              className="peer sr-only" 
              name="plan" 
              type="radio" 
              value="4months" 
              checked={selectedPlan === '4months'}
              onChange={() => setSelectedPlan('4months')}
            />
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl transition-all duration-300 peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary/50 peer-checked:bg-[rgba(197,160,89,0.08)] hover:border-white/20 shadow-lg peer-checked:shadow-primary/10 relative overflow-hidden peer-checked:[&_.radio-dot]:bg-primary peer-checked:[&_.radio-dot]:border-primary peer-checked:[&_.radio-dot]:scale-110 peer-checked:[&_.radio-dot_span]:opacity-100">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Acesso Estendido</span>
                  <h3 className="text-white text-xl font-bold leading-tight">4 Meses</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-slate-500 text-sm line-through decoration-slate-500/50">R$ 80,00</span>
                    <span className="text-white text-2xl font-black">R$ 69,90</span>
                  </div>
                </div>
                <div className="radio-dot shrink-0 w-6 h-6 rounded-full border-2 border-white/20 flex items-center justify-center group-hover:border-white/40 transition-all">
                  <span className="material-symbols-outlined text-[#0a0e17] text-[16px] opacity-0 transition-opacity font-bold">check</span>
                </div>
              </div>
            </div>
          </label>
          <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-3">
            <h4 className="text-white text-sm font-bold uppercase tracking-wider">Termos de Uso</h4>
            <div className="bg-black/20 p-4 rounded-lg border border-white/10 max-h-32 overflow-y-auto">
              <h5 className="text-white text-xs font-bold mb-2">TERMO DE CIÊNCIA E CONCORDÂNCIA</h5>
              <div className="text-slate-400 text-xs leading-relaxed space-y-2">
                <p>Declaro que li atentamente e estou ciente de que os flashcards e as questões disponibilizados nesta plataforma serão gerados por Inteligência Artificial (IA), com base exclusivamente no conteúdo da matéria definida no edital atualizado do CRS do EAP PMMG.</p>
                <p>Estou ciente, ainda, de que não haverá explicações, esclarecimentos ou instruções adicionais quanto ao conteúdo dos materiais disponibilizados.</p>
                <p>Eventuais questões relacionadas ao funcionamento do aplicativo deverão ser encaminhadas por meio do campo “Contato”, sendo que a administração da plataforma responderá na primeira oportunidade.</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer mt-2">
              <input 
                type="checkbox" 
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-black/20 text-primary focus:ring-primary focus:ring-offset-background-dark" 
                required 
              />
              <span className="text-white text-sm">Li e concordo para prosseguir</span>
            </label>
          </div>
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-dark via-background-dark/95 to-transparent z-40 max-w-[480px] mx-auto pb-safe">
            <button disabled={!termsAccepted} type="submit" className="w-full bg-primary hover:bg-primary/90 text-[#0a0e17] font-bold h-14 rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-sm tracking-wide uppercase group disabled:opacity-50 disabled:cursor-not-allowed">
              <span>Ir para Pagamento</span>
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
