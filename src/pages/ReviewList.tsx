import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import clsx from 'clsx';

export default function ReviewList() {
  const location = useLocation();
  const navigate = useNavigate();
  const difficulty = location.state?.difficulty || 'easy';
  const studyMode = location.state?.studyMode || 'flashcard';
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchCards() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }

        let userCourse = '3sgt';
        let isUserAdmin = false;
        
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

        // Fetch user progress for the selected difficulty
        let progressData: any[] = [];
        let pFrom = 0;
        const pStep = 1000;
        let pHasMore = true;
        
        while (pHasMore) {
          let pQuery = supabase.from('user_progress').select('flashcard_id').eq('difficulty', difficulty).eq('user_id', user.id).order('id').range(pFrom, pFrom + pStep - 1);

          const { data: progressChunk, error: pError } = await pQuery;
            
          if (pError) {
            console.error('Error fetching user progress:', pError);
            break;
          }
          
          if (progressChunk && progressChunk.length > 0) {
            progressData = [...progressChunk, ...progressData];
            pFrom += pStep;
            if (progressChunk.length < pStep) pHasMore = false;
          } else {
            pHasMore = false;
          }
        }

        if (progressData.length === 0) {
          setCards([]);
          setLoading(false);
          return;
        }

        const targetCardIds = new Set(progressData.map(p => String(p.flashcard_id)));

        // Fetch all cards
        let allData: any[] = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;
        let useFallback = false;

        while (hasMore) {
          let query = supabase.from('flashcards').select('*').order('id').range(from, from + step - 1);
          
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
              let fallbackQuery = supabase.from('flashcards').select('*').order('id').range(from, from + step - 1);
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
            if (data.length < step) {
              if (allData.length === 0 && !useFallback && !isUserAdmin) {
                useFallback = true;
                from = 0;
                hasMore = true;
                continue;
              }
              hasMore = false;
            }
          } else {
            if (allData.length === 0 && !useFallback && !isUserAdmin) {
              useFallback = true;
              from = 0;
              hasMore = true;
              continue;
            }
            hasMore = false;
          }
        }

        const filteredCards = allData.filter(card => targetCardIds.has(String(card.id)));
        
        // Sort by category and topic
        const sorted = filteredCards.sort((a, b) => {
          const catA = a.category || '';
          const catB = b.category || '';
          if (catA !== catB) return catA.localeCompare(catB);
          const topA = a.topic || '';
          const topB = b.topic || '';
          return topA.localeCompare(topB);
        });

        setCards(sorted);
      } catch (err: any) {
        console.error('Error fetching cards:', err);
        setError('Não foi possível carregar os cartões.');
      } finally {
        setLoading(false);
      }
    }

    fetchCards();
  }, [difficulty, studyMode, navigate]);

  const filteredCards = cards.filter(card => 
    card.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.topic?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group cards by category and topic
  const groupedCards: Record<string, Record<string, any[]>> = {};
  filteredCards.forEach(card => {
    const cat = card.category || 'Sem Categoria';
    const top = card.topic || 'Sem Matéria';
    if (!groupedCards[cat]) groupedCards[cat] = {};
    if (!groupedCards[cat][top]) groupedCards[cat][top] = [];
    groupedCards[cat][top].push(card);
  });

  const itemName = studyMode === 'flashcard' ? 'Cartões' : 'Questões';
  const itemNameSingular = studyMode === 'flashcard' ? 'Cartão' : 'Questão';

  return (
    <div className="min-h-screen flex flex-col font-display bg-background-dark pb-20">
      <header className="sticky top-0 z-50 bg-pmmg-blue/95 backdrop-blur-md border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/revisao" className="text-white/80 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </Link>
            <h1 className="text-white text-lg font-bold">
              {studyMode === 'flashcard' 
                ? (difficulty === 'easy' ? 'Cartões Fáceis' : 'Cartões Difíceis')
                : 'Questões Erradas'}
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-[480px] mx-auto px-5 py-6">
        {!loading && !error && cards.length > 0 && (
          <div className="space-y-4 mb-8">
            <button 
              onClick={() => navigate('/estudo', { state: { difficulty, studyMode } })}
              className="w-full bg-pmmg-gold text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:bg-pmmg-gold/90 transition-colors"
            >
              <span className="material-symbols-outlined">play_circle</span>
              Revisar {studyMode === 'flashcard' ? (difficulty === 'easy' ? 'Todos os Cartões Fáceis' : 'Todos os Cartões Difíceis') : 'Todas as Questões Erradas'}
            </button>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
              <input 
                type="text" 
                placeholder="Filtrar por matéria ou conteúdo..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl h-12 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
              />
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-pmmg-gold/20 border-t-pmmg-gold rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 text-sm">Carregando {itemName.toLowerCase()}...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400">{error}</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-12 bg-white/5 border border-dashed border-white/10 rounded-3xl p-8">
            <span className="material-symbols-outlined text-slate-600 text-5xl mb-4">sentiment_dissatisfied</span>
            <p className="text-slate-500">
              {studyMode === 'flashcard' 
                ? `Nenhum cartão marcado como ${difficulty === 'easy' ? 'fácil' : 'difícil'} ainda.`
                : 'Nenhuma questão errada ainda.'}
            </p>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Nenhum resultado para "{searchTerm}"</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.keys(groupedCards).map(category => (
              <div key={category} className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                  <span className="material-symbols-outlined text-primary text-xl">
                    {category.includes('Jurídica') ? 'policy' : category.includes('Operacional') ? 'shield' : 'gavel'}
                  </span>
                  <h2 className="text-white text-xl font-bold">{category}</h2>
                </div>
                {Object.keys(groupedCards[category]).map(topic => (
                  <div key={topic} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:bg-white/10 transition-colors group">
                    <div className="flex flex-col">
                      <h3 className="text-white font-bold text-base mb-1">{topic}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          {groupedCards[category][topic].length} {groupedCards[category][topic].length === 1 ? itemNameSingular : itemName}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                        <span className={clsx(
                          "text-[10px] font-bold uppercase tracking-wider",
                          difficulty === 'easy' ? "text-green-400" : (studyMode === 'flashcard' ? "text-red-400" : "text-orange-400")
                        )}>
                          {studyMode === 'flashcard' ? (difficulty === 'easy' ? 'Fácil' : 'Difícil') : 'Errada'}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate('/estudo', { state: { category, topic, difficulty, studyMode } })}
                      className="w-10 h-10 rounded-full bg-pmmg-gold/20 flex items-center justify-center text-pmmg-gold group-hover:bg-pmmg-gold group-hover:text-black transition-all"
                    >
                      <span className="material-symbols-outlined">play_arrow</span>
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
