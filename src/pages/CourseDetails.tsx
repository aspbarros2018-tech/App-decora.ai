import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Logo from '../components/Logo';

export default function CourseDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const courseId = location.state?.course || '1ten';
  const courseTitles: Record<string, string> = {
    '3sgt': 'EAP 2026 - 3º SGT PM',
    '1sgt': 'EAP 2026 - 1º SGT PM',
    '1ten': 'EAP 2026 - 1º TEN PM'
  };
  const courseTitle = courseTitles[courseId] || courseTitles['1ten'];

  const handleEnroll = () => {
    navigate('/checkout/1', { state: { plan: '2months', course: courseId } });
  };

  return (
    <div className="min-h-screen flex flex-col font-display pb-24 bg-background-dark">
      <header className="sticky top-0 z-50 bg-pmmg-blue/95 backdrop-blur-md border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <Logo />
          <div className="flex items-center gap-2">
            <Link to="/" className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-2 transition-colors">
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center w-full max-w-[480px] mx-auto">
        <section className="w-full px-6 pt-10 pb-6 bg-gradient-to-b from-pmmg-blue to-background-dark flex flex-col items-center text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
            {courseTitle}
          </h2>
          <div className="w-16 h-1 bg-pmmg-gold mt-4 rounded-full"></div>
        </section>
        <section className="w-full px-6 mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-pmmg-gold">psychology</span>
            <h3 className="text-white text-lg font-bold">Nossa Metodologia</h3>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-pmmg-gold/10 blur-2xl rounded-full pointer-events-none"></div>
            <div className="space-y-4">
              <p className="text-slate-300 text-sm leading-7 text-justify">
                Garanta uma <span className="text-white font-semibold">preparação de alto nível</span> com nossa tecnologia exclusiva. Oferecemos um treinamento focado e adaptativo, no qual você terá acesso a <span className="text-[#0099ff] font-bold underline decoration-[#0099ff]/30 underline-offset-4">aproximadamente 8.000 flashcards e questões gerados por inteligência artificial</span>, todos rigorosamente alinhados ao conteúdo programático do edital do EAP da PMMG.
              </p>
              <p className="text-slate-300 text-sm leading-7 text-justify">
                Além disso, você poderá acessar todo o material em nossa plataforma, realizar marcações em trechos importantes e revisar o conteúdo de forma prática e organizada.
              </p>
              <p className="text-slate-300 text-sm leading-7 text-justify">
                Otimize seu tempo e estude apenas o que realmente é cobrado na prova.
              </p>
            </div>
          </div>
        </section>
        <section className="w-full px-6 mb-10">
          <div className="flex flex-col gap-1 mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-pmmg-gold">library_books</span>
              <h3 className="text-white text-lg font-bold">Conteúdo Programático</h3>
            </div>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide border-l-2 border-pmmg-gold pl-2 py-1 ml-1">
              CONFORME EDITAL DRH/CRS Nº 03/2026<br/>EXAME DE APTIDÃO PROFISSIONAL (EAP 2026)
            </p>
          </div>
          <div className="space-y-3">
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-pmmg-gold/20 flex items-center justify-center text-pmmg-gold">
                <span className="material-symbols-outlined text-lg">policy</span>
              </div>
              <span className="text-white text-sm font-semibold">Legislação Jurídica</span>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-pmmg-gold/20 flex items-center justify-center text-pmmg-gold">
                <span className="material-symbols-outlined text-lg">gavel</span>
              </div>
              <span className="text-white text-sm font-semibold">Legislação Institucional</span>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-pmmg-gold/20 flex items-center justify-center text-pmmg-gold">
                <span className="material-symbols-outlined text-lg">shield</span>
              </div>
              <span className="text-white text-sm font-semibold">Doutrina Operacional</span>
            </div>
          </div>
        </section>
        <section className="w-full px-6 mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-pmmg-gold">payments</span>
            <h3 className="text-white text-lg font-bold">Planos de Acesso</h3>
          </div>
          <div className="flex flex-col gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-row items-center justify-between gap-4 shadow-lg">
              <div className="flex flex-col gap-1">
                <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">1 Mês</span>
                <div className="flex flex-col items-start">
                  <span className="text-white/40 text-sm line-through decoration-white/40">R$ 40,00</span>
                  <span className="text-white text-xl font-bold">R$ 29,90</span>
                </div>
              </div>
            </div>
            <div className="relative bg-white/5 border border-white/10 rounded-xl p-4 flex flex-row items-center justify-between gap-4 shadow-lg">
              <div className="absolute -top-2 right-4 bg-pmmg-gold text-pmmg-blue text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Popular</div>
              <div className="flex flex-col gap-1">
                <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">2 Meses</span>
                <div className="flex flex-col items-start">
                  <span className="text-white/40 text-sm line-through decoration-white/40">R$ 60,00</span>
                  <span className="text-white text-xl font-bold">R$ 49,90</span>
                </div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-row items-center justify-between gap-4 shadow-lg">
              <div className="flex flex-col gap-1">
                <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">4 Meses</span>
                <div className="flex flex-col items-start">
                  <span className="text-white/40 text-sm line-through decoration-white/40">R$ 80,00</span>
                  <span className="text-white text-xl font-bold">R$ 69,90</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <footer className="w-full px-6 mt-auto mb-6 text-center border-t border-white/5 pt-8 pb-8">
          <div className="space-y-6">
            <div className="flex justify-center gap-6 text-slate-500 text-xs">
              <Link className="hover:text-white transition-colors" to="/contato">Contato</Link>
            </div>
            <p className="text-slate-600 text-[10px] uppercase tracking-widest">
              © 2026 Decora.ai - EAP PMMG.
            </p>
          </div>
        </footer>
      </main>
      <div className="fixed bottom-0 left-0 w-full bg-background-dark/95 backdrop-blur-lg border-t border-white/10 z-40 p-4 pb-safe">
        <div className="max-w-[480px] mx-auto flex flex-col gap-2">
          <button onClick={handleEnroll} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold h-14 rounded-xl shadow-lg shadow-green-900/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group">
            <span className="uppercase tracking-wide text-lg">Matricule-se Agora</span>
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
