import { Link, useParams } from 'react-router-dom';
import Logo from '../components/Logo';
import clsx from 'clsx';

export default function ReviewCategoryList() {
  const { type } = useParams<{ type: string }>();
  const isEasy = type === 'faceis';

  const title = isEasy ? 'Cartões Fáceis' : 'Cartões Difíceis';
  const icon = isEasy ? 'sentiment_very_satisfied' : 'sentiment_very_dissatisfied';
  const colorClass = isEasy ? 'text-green-400' : 'text-red-400';
  const bgClass = isEasy ? 'bg-green-400/10' : 'bg-red-400/10';
  const borderClass = isEasy ? 'border-green-400/30' : 'border-red-400/30';

  const categories = [
    { id: 1, name: 'Legislação Jurídica', count: isEasy ? 45 : 12 },
    { id: 2, name: 'Legislação Institucional', count: isEasy ? 60 : 18 },
    { id: 3, name: 'Doutrina Operacional', count: isEasy ? 45 : 15 },
  ];

  return (
    <div className="min-h-screen flex flex-col font-display bg-background-dark pb-20">
      <header className="sticky top-0 z-50 bg-pmmg-blue/95 backdrop-blur-md border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-white/80 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </Link>
            <h1 className="text-white text-lg font-bold">{title}</h1>
          </div>
          <Logo className="h-8" showText={false} />
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full max-w-[480px] mx-auto px-5 py-6">
        <div className="flex flex-col items-center text-center mb-8 mt-4">
          <div className={clsx("w-20 h-20 rounded-full flex items-center justify-center mb-4 border shadow-lg", bgClass, borderClass)}>
            <span className={clsx("material-symbols-outlined text-4xl icon-fill", colorClass)}>{icon}</span>
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">Revisão por Categoria</h2>
          <p className="text-slate-400 text-sm max-w-[280px]">
            Selecione uma categoria abaixo para revisar apenas os seus <strong className="text-white">{title.toLowerCase()}</strong>.
          </p>
        </div>

        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white text-lg font-bold">{category.name}</h3>
                <div className={clsx("px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1", bgClass, colorClass)}>
                  <span className="material-symbols-outlined text-sm">{icon}</span>
                  {category.count} cartões
                </div>
              </div>
              <Link 
                to="/estudo" 
                className={clsx(
                  "w-full font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2",
                  isEasy ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"
                )}
              >
                <span className="material-symbols-outlined">play_arrow</span>
                Revisar {category.count} Cartões
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
