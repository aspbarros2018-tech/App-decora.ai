import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { supabase } from '../lib/supabase';

interface TopicStat {
  name: string;
  count: number;
  accessed: number;
}

export default function CategoryDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const categoryName = location.state?.category || 'Legislação Jurídica';
  const studyMode = location.state?.studyMode || 'flashcard';
  
  const [topics, setTopics] = useState<TopicStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCards, setTotalCards] = useState(0);
  const [totalAccessed, setTotalAccessed] = useState(0);

  useEffect(() => {
    async function fetchTopics() {
      setLoading(true);
      try {
        // 1. Get user's course
        const { data: { user } } = await supabase.auth.getUser();
        let userCourse = '3sgt';
        let isUserAdmin = false;
        
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
        }

        // 2. Fetch all flashcards for this category (handling >1000 rows)
        let allData: any[] = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;
        let useFallback = false;

        while (hasMore) {
          let query = supabase.from('flashcards').select('id, topic').eq('category', categoryName).order('id').range(from, from + step - 1);
          
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
              let fallbackQuery = supabase.from('flashcards').select('id, topic').eq('category', categoryName).order('id').range(from, from + step - 1);
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

        // 3. Fetch user progress
        let progressData: any[] = [];
        if (user) {
          let pFrom = 0;
          let pHasMore = true;
          while (pHasMore) {
            const { data: pData, error: pError } = await supabase
              .from('user_progress')
              .select('flashcard_id')
              .eq('user_id', user.id)
              .order('id')
              .range(pFrom, pFrom + step - 1);
              
            if (pError) throw pError;
            
            if (pData && pData.length > 0) {
              progressData = [...progressData, ...pData];
              pFrom += step;
              if (pData.length < step) pHasMore = false;
            } else {
              pHasMore = false;
            }
          }
        }

        const accessedCardIds = new Set(progressData.map(p => String(p.flashcard_id)));

        setTotalCards(allData.length);
        
        const counts: Record<string, { total: number, accessed: number }> = {};
        let categoryAccessed = 0;

        allData.forEach(item => {
          const topic = item.topic?.trim() || 'Sem Tópico';
          if (!counts[topic]) {
            counts[topic] = { total: 0, accessed: 0 };
          }
          counts[topic].total += 1;
          
          if (accessedCardIds.has(String(item.id))) {
            counts[topic].accessed += 1;
            categoryAccessed += 1;
          }
        });

        setTotalAccessed(categoryAccessed);

        const stats: TopicStat[] = Object.keys(counts).map(name => ({
          name,
          count: counts[name].total,
          accessed: counts[name].accessed
        })).sort((a, b) => b.count - a.count);

        setTopics(stats);
      } catch (err) {
        console.error('Error fetching topics:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTopics();
  }, [categoryName]);

  const percentage = totalCards > 0 ? (totalAccessed > 0 ? Math.max(1, Math.round((totalAccessed / totalCards) * 100)) : 0) : 0;

  return (
    <div className="min-h-screen flex flex-col font-display bg-background-dark pb-24">
      <header className="sticky top-0 z-50 bg-pmmg-blue/95 backdrop-blur-md border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/revisao" className="text-white/80 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </Link>
            <h1 className="text-white text-lg font-bold truncate max-w-[200px]">{categoryName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Logo className="h-8" showText={false} />
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full max-w-[480px] mx-auto px-5 py-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Progresso da Categoria</span>
            <span className="text-blue-400 font-bold">{percentage}%</span>
          </div>
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-400 h-full shadow-[0_0_10px_rgba(96,165,250,0.5)] transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
          </div>
          <div className="flex justify-between mt-3 text-xs text-slate-500">
            <span>{totalAccessed} Estudados</span>
            <span>{totalCards - totalAccessed} Restantes</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-bold">Subtópicos</h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-pmmg-gold/20 border-t-pmmg-gold rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 text-sm">Carregando tópicos...</p>
          </div>
        ) : topics.length > 0 ? (
          <div className="space-y-3">
            {topics.map((topic) => {
              const topicPercentage = topic.count > 0 ? (topic.accessed > 0 ? Math.max(1, Math.round((topic.accessed / topic.count) * 100)) : 0) : 0;
              return (
              <div key={topic.name} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col hover:bg-white/10 transition-colors cursor-pointer group">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-bold text-base">{topic.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                    topicPercentage === 100 ? 'bg-green-500/20 text-green-400' :
                    topicPercentage > 0 ? 'bg-blue-500/20 text-blue-400' :
                    'bg-white/10 text-slate-400'
                  }`}>
                    {topicPercentage === 100 ? 'Concluído' : topicPercentage > 0 ? 'Em Andamento' : 'Não Iniciado'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total de Cartões</span>
                    <span className="text-white font-black text-lg">{topic.accessed} / {topic.count}</span>
                  </div>
                  <Link 
                    to="/estudo" 
                    state={{ category: categoryName, topic: topic.name, studyMode }}
                    className="bg-pmmg-gold/20 text-pmmg-gold px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-pmmg-gold hover:text-black transition-all group"
                  >
                    Iniciar <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">play_arrow</span>
                  </Link>
                </div>
                <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mt-3">
                  <div className={`h-full transition-all duration-1000 ${
                    topicPercentage === 100 ? 'bg-green-400' : 'bg-blue-400'
                  }`} style={{ width: `${topicPercentage}%` }}></div>
                </div>
              </div>
            )})}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-500">Nenhum tópico encontrado para esta categoria.</p>
          </div>
        )}
      </main>
    </div>
  );
}
