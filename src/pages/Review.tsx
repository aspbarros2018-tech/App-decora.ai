import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { supabase } from '../lib/supabase';
import clsx from 'clsx';

interface CategoryStat {
  name: string;
  count: number;
  accessed: number;
  description: string;
  icon: string;
  color: string;
}

const CATEGORY_METADATA: Record<string, { description: string; icon: string; color: string }> = {
  'Legislação Jurídica': { 
    description: 'Direito Penal, Processo Penal, Constitucional e Direitos Humanos.', 
    icon: 'policy', 
    color: 'blue' 
  },
  'Legislação Institucional': { 
    description: 'Estatuto, CEDM, MAPA e resoluções internas da PMMG.', 
    icon: 'gavel', 
    color: 'pmmg-gold' 
  },
  'Doutrina Operacional': { 
    description: 'Manuais de Prática Policial, POPs e diretrizes operacionais.', 
    icon: 'shield', 
    color: 'green' 
  },
};

export default function Review() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [easyCount, setEasyCount] = useState(0);
  const [hardCount, setHardCount] = useState(0);
  const [userProgress, setUserProgress] = useState<any[]>([]);
  const [studyMode, setStudyMode] = useState<'flashcard' | 'question'>('flashcard');

  useEffect(() => {
    async function fetchCategories() {
      setLoading(true);
      try {
        // 1. Get user's course
        const { data: { user } } = await supabase.auth.getUser();
        let userCourse = '3sgt';
        let isUserAdmin = false;
        
        let pData: any[] = [];
        if (user) {
          if (user.email === 'aspbarros2018@gmail.com') {
            isUserAdmin = true;
          }
          const { data: profile } = await supabase
            .from('profiles')
            .select('course, plan, created_at')
            .eq('id', user.id)
            .single();
          
          if (profile) {
            userCourse = profile.course || '3sgt';
            
            // Check plan expiration
            if (!isUserAdmin && profile.plan && profile.created_at) {
              const planDays: Record<string, number> = {
                '5days': 5,
                '1month': 30,
                '2months': 60,
                '4months': 120,
                '6months': 180
              };
              const totalPlanDays = planDays[profile.plan] || 0;
              const createdDate = new Date(profile.created_at);
              const now = new Date();
              const diffTime = Math.abs(now.getTime() - createdDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              if (totalPlanDays - diffDays <= 0) {
                navigate('/checkout/3');
                return;
              }
            }
          }

          // Fetch user progress for easy/hard counts and category progress
          let pFrom = 0;
          const pStep = 1000;
          let pHasMore = true;
          
          while (pHasMore) {
            let pQuery = supabase.from('user_progress').select('flashcard_id, difficulty').eq('user_id', user.id).order('id').range(pFrom, pFrom + pStep - 1);

            const { data: progressChunk, error: pError } = await pQuery;
              
            if (pError) {
              console.error('Error fetching user progress:', pError);
              break;
            }
            
            if (progressChunk && progressChunk.length > 0) {
              pData = [...pData, ...progressChunk];
              pFrom += pStep;
              if (progressChunk.length < pStep) pHasMore = false;
            } else {
              pHasMore = false;
            }
          }
        }

        // 2. Fetch all flashcards (handling >1000 rows)
        let allData: any[] = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;
        let useFallback = false;

        while (hasMore) {
          let query = supabase.from('flashcards').select('id, category').order('id').range(from, from + step - 1);
          
          if (studyMode === 'flashcard') {
            query = query.or('type.eq.flashcard,type.is.null');
          } else {
            query = query.eq('type', 'question');
          }

          if (!isUserAdmin && !useFallback) {
            query = query.eq('course', userCourse);
          }
          
          let { data, error } = await query;
          
          if (error && error.message.includes('type')) {
            if (studyMode === 'flashcard') {
              let fallbackQuery = supabase.from('flashcards').select('id, category').order('id').range(from, from + step - 1);
              if (!isUserAdmin && !useFallback) {
                fallbackQuery = fallbackQuery.eq('course', userCourse);
              }
              const result = await fallbackQuery;
              data = result.data;
              error = result.error;
            } else {
              data = [];
              error = null;
            }
          }

          if (error) {
            if (error.message.includes('course') && !useFallback) {
              useFallback = true;
              from = 0;
              hasMore = true;
              continue;
            }
            throw error;
          }
          
          if (data && data.length > 0) {
            allData = [...allData, ...data];
            from += step;
            if (data.length < step) hasMore = false;
          } else {
            // Se não encontrou nenhum cartão para o curso específico, tenta buscar sem filtro de curso
            if (allData.length === 0 && !useFallback && !isUserAdmin) {
              useFallback = true;
              from = 0;
              hasMore = true;
              continue;
            }
            hasMore = false;
          }
        }

        // Filter progress data to only include items that match the current studyMode
        const validIds = new Set(allData.map(item => String(item.id)));
        const filteredPData = pData.filter(p => validIds.has(String(p.flashcard_id)));

        // Deduplicate progress data, keeping the most recent (or just one)
        const uniqueProgress = new Map();
        filteredPData.forEach(p => {
          uniqueProgress.set(p.flashcard_id, p);
        });
        const deduplicatedData = Array.from(uniqueProgress.values());

        setUserProgress(deduplicatedData);
        
        setEasyCount(deduplicatedData.filter(p => p.difficulty === 'easy').length);
        setHardCount(deduplicatedData.filter(p => p.difficulty === 'hard').length);

        const counts: Record<string, { total: number, accessed: number }> = {
          'Legislação Jurídica': { total: 0, accessed: 0 },
          'Doutrina Operacional': { total: 0, accessed: 0 },
          'Legislação Institucional': { total: 0, accessed: 0 }
        };
        allData.forEach(item => {
          const cat = item.category?.trim() || 'Sem Categoria';
          if (!counts[cat]) counts[cat] = { total: 0, accessed: 0 };
          counts[cat].total += 1;
        });

        const accessedCardIds = new Set(filteredPData.map(p => String(p.flashcard_id)));
        allData.forEach(item => {
          if (accessedCardIds.has(String(item.id))) {
            const cat = item.category?.trim() || 'Sem Categoria';
            if (counts[cat]) {
              counts[cat].accessed += 1;
            }
          }
        });

        const getCategoryMeta = (name: string) => {
          const upper = name.toUpperCase();
          if (upper.includes('JURÍDICA') || upper.includes('JURIDICA')) return CATEGORY_METADATA['Legislação Jurídica'];
          if (upper.includes('INSTITUCIONAL')) return CATEGORY_METADATA['Legislação Institucional'];
          if (upper.includes('OPERACIONAL')) return CATEGORY_METADATA['Doutrina Operacional'];
          return { description: 'Estude os flashcards desta categoria.', icon: 'menu_book', color: 'primary' };
        };

        const stats: CategoryStat[] = Object.keys(counts).map(name => {
          const meta = getCategoryMeta(name);
          return {
            name,
            count: counts[name].total,
            accessed: counts[name].accessed,
            description: meta.description,
            icon: meta.icon,
            color: meta.color
          };
        }).sort((a, b) => b.count - a.count);

        setCategories(stats);
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, [studyMode]);

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col font-display bg-background-dark pb-20">
      <header className="sticky top-0 z-50 bg-pmmg-blue/95 backdrop-blur-md border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-white/80 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </Link>
            <h1 className="text-white text-lg font-bold">Revisão</h1>
          </div>
          <div className="flex items-center gap-3">
            <Logo className="h-8" showText={false} />
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full max-w-[480px] mx-auto px-5 py-6">
        
        {/* Toggle Flashcards vs Questões */}
        <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 mb-8">
          <button
            onClick={() => setStudyMode('flashcard')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              studyMode === 'flashcard' 
                ? 'bg-pmmg-gold text-background-dark shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">style</span>
            Flashcards
          </button>
          <button
            onClick={() => setStudyMode('question')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              studyMode === 'question' 
                ? 'bg-pmmg-gold text-background-dark shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">quiz</span>
            Questões
          </button>
        </div>

        <section className="mb-8">
          <h2 className="text-white text-lg font-bold mb-4">Revisão de Conteúdo ({studyMode === 'flashcard' ? 'Flashcards' : 'Questões'})</h2>
          <div className={clsx("grid gap-4", studyMode === 'flashcard' ? "grid-cols-2" : "grid-cols-1")}>
            {studyMode === 'flashcard' && (
              <Link to="/revisao/lista" state={{ difficulty: 'easy', studyMode }} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col hover:bg-white/10 transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-green-400 mb-2 text-2xl">sentiment_very_satisfied</span>
                <span className="text-white text-2xl font-black">{easyCount}</span>
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-1">Cartões Fáceis</span>
              </Link>
            )}
            <Link to="/revisao/lista" state={{ difficulty: 'hard', studyMode }} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col hover:bg-white/10 transition-colors cursor-pointer">
              <span className={clsx("material-symbols-outlined mb-2 text-2xl", studyMode === 'flashcard' ? "text-red-400" : "text-orange-400")}>
                {studyMode === 'flashcard' ? 'sentiment_very_dissatisfied' : 'error'}
              </span>
              <span className="text-white text-2xl font-black">{hardCount}</span>
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-1">
                {studyMode === 'flashcard' ? 'Cartões Difíceis' : 'Questões Erradas'}
              </span>
            </Link>
          </div>
        </section>

        <div className="mb-6">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
            <input 
              type="text" 
              placeholder="Buscar assunto..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl h-12 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-pmmg-gold/20 border-t-pmmg-gold rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 text-sm">Carregando categorias...</p>
          </div>
        ) : filteredCategories.length > 0 ? (
          <div className="flex flex-col gap-4">
            {filteredCategories.map((cat) => (
              <Link 
                key={cat.name}
                to="/categoria-detalhes" 
                state={{ category: cat.name, studyMode }}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors group relative overflow-hidden"
              >
                <div className={clsx(
                  "absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -z-10 group-hover:opacity-40 transition-all",
                  cat.color === 'blue' ? "bg-blue-500/10" : 
                  cat.color === 'pmmg-gold' ? "bg-pmmg-gold/10" : 
                  cat.color === 'green' ? "bg-green-500/10" : "bg-primary/10"
                )}></div>
                <div className="flex items-start justify-between mb-4">
                  <div className={clsx(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    cat.color === 'blue' ? "bg-blue-500/20 text-blue-400" : 
                    cat.color === 'pmmg-gold' ? "bg-pmmg-gold/20 text-pmmg-gold" : 
                    cat.color === 'green' ? "bg-green-500/20 text-green-400" : "bg-primary/20 text-primary"
                  )}>
                    <span className="material-symbols-outlined text-2xl">{cat.icon}</span>
                  </div>
                  <div className="bg-white/10 px-2 py-1 rounded text-xs font-bold text-white/60">
                    {cat.count} Cartões
                  </div>
                </div>
                <h2 className="text-white text-lg font-bold mb-1">{cat.name}</h2>
                <p className="text-slate-400 text-sm mb-4">{cat.description}</p>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className={clsx(
                    "h-full",
                    cat.color === 'blue' ? "bg-blue-400" : 
                    cat.color === 'pmmg-gold' ? "bg-pmmg-gold" : 
                    cat.color === 'green' ? "bg-green-400" : "bg-primary"
                  )} style={{ width: `${cat.count > 0 ? (cat.accessed > 0 ? Math.max(1, Math.round((cat.accessed / cat.count) * 100)) : 0) : 0}%` }}></div>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Progresso</span>
                  <div className="flex flex-col items-end">
                    <span className={clsx(
                      "text-[10px] font-bold",
                      cat.color === 'blue' ? "text-blue-400" : 
                      cat.color === 'pmmg-gold' ? "text-pmmg-gold" : 
                      cat.color === 'green' ? "text-green-400" : "text-primary"
                    )}>{cat.count > 0 ? (cat.accessed > 0 ? Math.max(1, Math.round((cat.accessed / cat.count) * 100)) : 0) : 0}%</span>
                    <span className="text-slate-500 text-[9px] font-bold tracking-tighter">({cat.accessed}/{cat.count})</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-500">Nenhuma categoria encontrada.</p>
          </div>
        )}
      </main>
      <nav className="fixed bottom-0 left-0 w-full bg-pmmg-blue/95 backdrop-blur-md border-t border-white/10 z-50 pb-safe">
        <div className="max-w-[480px] mx-auto flex justify-around items-center h-16">
          <Link to="/dashboard" className="flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-2xl">home</span>
            <span className="text-[10px] font-medium">Início</span>
          </Link>
          <Link to="/revisao" className="flex flex-col items-center gap-1 text-primary">
            <span className="material-symbols-outlined icon-fill text-2xl">history_edu</span>
            <span className="text-[10px] font-bold">Revisão</span>
          </Link>
          <Link to="/materiais" className="flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
            <span className="text-[10px] font-medium">Materiais</span>
          </Link>
          <Link to="/perfil" className="flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-2xl">person</span>
            <span className="text-[10px] font-medium">Perfil</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
