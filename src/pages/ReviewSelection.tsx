import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

export default function ReviewSelection() {
  const navigate = useNavigate();

  const handleStartReview = () => {
    navigate('/estudo');
  };

  return (
    <div className="min-h-screen flex flex-col font-display bg-background-dark pb-24">
      <header className="sticky top-0 z-50 bg-pmmg-blue/95 backdrop-blur-md border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-white/80 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </Link>
            <h1 className="text-white text-lg font-bold">Revisão Diária</h1>
          </div>
          <Logo className="h-8" showText={false} />
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full max-w-[480px] mx-auto px-5 py-6">
        <div className="flex flex-col items-center text-center mb-8 mt-4">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4 border border-primary/30 shadow-[0_0_30px_rgba(197,160,89,0.2)]">
            <span className="material-symbols-outlined text-4xl text-primary icon-fill">psychology</span>
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">Sua Meta de Hoje</h2>
          <p className="text-slate-400 text-sm max-w-[280px]">
            Você tem <strong className="text-white">42 cartões</strong> agendados pelo algoritmo para revisão hoje.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
          <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-4">Composição da Revisão</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <span className="text-white text-sm font-medium">Cartões Errados (Recentes)</span>
              </div>
              <span className="text-white font-bold">12</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                <span className="text-white text-sm font-medium">Revisão de Curto Prazo</span>
              </div>
              <span className="text-white font-bold">18</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <span className="text-white text-sm font-medium">Revisão de Longo Prazo</span>
              </div>
              <span className="text-white font-bold">12</span>
            </div>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full mt-6 flex overflow-hidden">
            <div className="h-full bg-red-400" style={{ width: '28%' }}></div>
            <div className="h-full bg-orange-400" style={{ width: '43%' }}></div>
            <div className="h-full bg-green-400" style={{ width: '29%' }}></div>
          </div>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-xl shrink-0">tips_and_updates</span>
          <p className="text-primary/90 text-xs leading-relaxed font-medium">
            Dica: Tente lembrar a resposta antes de virar o cartão. O esforço mental fortalece a conexão neural e melhora a retenção.
          </p>
        </div>
      </main>
      <div className="fixed bottom-0 left-0 w-full bg-background-dark/95 backdrop-blur-lg border-t border-white/10 z-40 p-4 pb-safe">
        <div className="max-w-[480px] mx-auto flex flex-col gap-2">
          <button onClick={handleStartReview} className="w-full bg-primary hover:bg-primary/90 text-[#0a0e17] font-bold h-14 rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group">
            <span className="material-symbols-outlined icon-fill">play_arrow</span>
            <span className="uppercase tracking-wide text-sm">Iniciar Revisão (42)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
