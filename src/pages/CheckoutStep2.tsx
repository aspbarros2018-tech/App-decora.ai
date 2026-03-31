import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Logo from '../components/Logo';

export default function CheckoutStep2() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCourse, setSelectedCourse] = React.useState(location.state?.course || '3sgt');

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/checkout/3', { state: { course: selectedCourse } });
  };

  return (
    <div className="min-h-screen flex flex-col font-display bg-background-dark">
      <header className="sticky top-0 z-50 bg-pmmg-blue/95 backdrop-blur-md border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <Logo />
          <div className="flex items-center gap-2">
            <Link to="/checkout/1" className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-2 transition-colors">
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full max-w-[480px] mx-auto px-6 py-6 pb-24">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Escolha do Curso</h2>
            <span className="text-primary font-bold text-xs uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
              Etapa 2 de 4
            </span>
          </div>
          <p className="text-slate-400 text-sm mb-4">Selecione o concurso para o qual você deseja focar seus estudos.</p>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden flex">
            <div className="h-full bg-primary w-2/4 rounded-full shadow-[0_0_10px_rgba(197,160,89,0.5)]"></div>
          </div>
        </div>
        <form onSubmit={handleNext} className="flex flex-col gap-3 flex-1">
          <label className="relative cursor-pointer group">
            <input 
              className="peer sr-only" 
              name="course" 
              type="radio" 
              value="3sgt" 
              checked={selectedCourse === '3sgt'}
              onChange={() => setSelectedCourse('3sgt')}
            />
            <div className="rank-gradient border border-white/10 p-4 rounded-xl transition-all duration-300 peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary/50 peer-checked:bg-[rgba(197,160,89,0.08)] hover:border-white/20 shadow-lg peer-checked:shadow-primary/10 peer-checked:[&_.radio-dot]:bg-primary peer-checked:[&_.radio-dot]:border-primary peer-checked:[&_.radio-dot]:scale-110 peer-checked:[&_.radio-dot_span]:opacity-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-primary/80 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">PMMG • 2026</span>
                  <h3 className="text-white text-base font-bold leading-tight">EAP 3º Sgt PM</h3>
                  <p className="text-slate-400 text-[11px] mt-1.5 font-medium italic leading-relaxed">Cartões com foco direto no conteúdo programático</p>
                </div>
                <div className="radio-dot shrink-0 mt-1 w-5 h-5 rounded-full border-2 border-white/20 flex items-center justify-center group-hover:border-white/40 transition-all">
                  <span className="material-symbols-outlined text-[#0a0e17] text-[14px] opacity-0 transition-opacity font-bold">check</span>
                </div>
              </div>
            </div>
          </label>
          <label className="relative cursor-pointer group">
            <input 
              className="peer sr-only" 
              name="course" 
              type="radio" 
              value="1sgt" 
              checked={selectedCourse === '1sgt'}
              onChange={() => setSelectedCourse('1sgt')}
            />
            <div className="rank-gradient border border-white/10 p-4 rounded-xl transition-all duration-300 peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary/50 peer-checked:bg-[rgba(197,160,89,0.08)] hover:border-white/20 shadow-lg peer-checked:shadow-primary/10 peer-checked:[&_.radio-dot]:bg-primary peer-checked:[&_.radio-dot]:border-primary peer-checked:[&_.radio-dot]:scale-110 peer-checked:[&_.radio-dot_span]:opacity-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-primary/80 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">PMMG • 2026</span>
                  <h3 className="text-white text-base font-bold leading-tight">EAP 1º Sgt PM</h3>
                  <p className="text-slate-400 text-[11px] mt-1.5 font-medium italic leading-relaxed">Cartões com foco direto no conteúdo programático</p>
                </div>
                <div className="radio-dot shrink-0 mt-1 w-5 h-5 rounded-full border-2 border-white/20 flex items-center justify-center group-hover:border-white/40 transition-all">
                  <span className="material-symbols-outlined text-[#0a0e17] text-[14px] opacity-0 transition-opacity font-bold">check</span>
                </div>
              </div>
            </div>
          </label>
          <label className="relative cursor-pointer group">
            <input 
              className="peer sr-only" 
              name="course" 
              type="radio" 
              value="1ten" 
              checked={selectedCourse === '1ten'}
              onChange={() => setSelectedCourse('1ten')}
            />
            <div className="rank-gradient border border-white/10 p-4 rounded-xl transition-all duration-300 peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary/50 peer-checked:bg-[rgba(197,160,89,0.08)] hover:border-white/20 shadow-lg peer-checked:shadow-primary/10 peer-checked:[&_.radio-dot]:bg-primary peer-checked:[&_.radio-dot]:border-primary peer-checked:[&_.radio-dot]:scale-110 peer-checked:[&_.radio-dot_span]:opacity-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-primary/80 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">PMMG • 2026</span>
                  <h3 className="text-white text-base font-bold leading-tight">EAP 1º Ten PM</h3>
                  <p className="text-slate-400 text-[11px] mt-1.5 font-medium italic leading-relaxed">Cartões com foco direto no conteúdo programático</p>
                </div>
                <div className="radio-dot shrink-0 mt-1 w-5 h-5 rounded-full border-2 border-white/20 flex items-center justify-center group-hover:border-white/40 transition-all">
                  <span className="material-symbols-outlined text-[#0a0e17] text-[14px] opacity-0 transition-opacity font-bold">check</span>
                </div>
              </div>
            </div>
          </label>

          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-dark via-background-dark/95 to-transparent z-40 max-w-[480px] mx-auto pb-safe">
            <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-[#0a0e17] font-bold h-14 rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-sm tracking-wide uppercase group">
              <span>Próximo Passo</span>
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
