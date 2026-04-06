import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { supabase } from '../lib/supabase';

interface CategoryStat {
  name: string;
  count: number;
  accessed: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCards, setTotalCards] = useState(0);
  const [totalAccessed, setTotalAccessed] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lastAccessed, setLastAccessed] = useState<{ category: string, topic: string } | null>(null);
  const [remainingDays, setRemainingDays] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [studyMode, setStudyMode] = useState<'flashcard' | 'question'>(
    (localStorage.getItem('last_study_mode') as 'flashcard' | 'question') || 'flashcard'
  );

  useEffect(() => {
    // Check for payment success in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      setShowSuccessModal(true);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    async function fetchDashboardData() {
      setLoading(true);
      try {
        // 1. Get user's course
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }

        let userCourse = '';
        let userPlan = '';
        let createdAt = '';
        let isUserAdmin = false;
        
        if (user.email === 'aspbarros2018@gmail.com') {
          setIsAdmin(true);
          isUserAdmin = true;
        }

        // Se acabamos de voltar do pagamento, vamos esperar um pouco para o webhook processar
        const isReturningFromPayment = params.get('payment') === 'success';
        if (isReturningFromPayment) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('course, plan, created_at, last_category, last_topic')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          userCourse = profile.course;
          userPlan = profile.plan;
          createdAt = profile.created_at;
          
          if (profile.last_category && profile.last_topic) {
            setLastAccessed({ category: profile.last_category, topic: profile.last_topic });
          }
        }

        // If no course or plan, redirect to checkout
        if (!isUserAdmin && (!userCourse || !userPlan)) {
          // Se estivermos mostrando o modal de sucesso, não redirecionamos ainda
          if (!isReturningFromPayment) {
            navigate('/checkout/2');
            return;
          }
        }

        // Calculate remaining days
        if (userPlan && createdAt) {
          const planDays: Record<string, number> = {
            '5days': 5,
            '1month': 30,
            '2months': 60,
            '4months': 120,
            '6months': 180
          };
          
          const totalPlanDays = planDays[userPlan] || 0;
          const createdDate = new Date(createdAt);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - createdDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const remaining = Math.max(0, totalPlanDays - diffDays);
          setRemainingDays(remaining);

          // If plan expired, redirect to checkout
          if (!isUserAdmin && remaining <= 0) {
            navigate('/checkout/3');
            return;
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
          
          // Filter by studyMode (flashcard or question)
          // If studyMode is flashcard, we include null types for backward compatibility
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
              continue; // retry without course filter
            }
            throw error;
          }
          
          if (data && data.length > 0) {
            allData = [...allData, ...data];
            from += step;
            if (data.length < step) hasMore = false;
          } else {
            hasMore = false;
          }
        }

        // Se não encontrou nenhum cartão para o curso específico, tenta buscar sem filtro de curso
        if (allData.length === 0 && !useFallback && !isUserAdmin) {
          useFallback = true;
          hasMore = true;
          from = 0;
          while (hasMore) {
            let query = supabase.from('flashcards').select('id, category').order('id').range(from, from + step - 1);
            
            if (studyMode === 'flashcard') {
              query = query.or('type.eq.flashcard,type.is.null');
            } else {
              query = query.eq('type', 'question');
            }

            let { data, error } = await query;
            
            if (error && error.message.includes('type')) {
              if (studyMode === 'flashcard') {
                const fallbackQuery = await supabase.from('flashcards').select('id, category').order('id').range(from, from + step - 1);
                data = fallbackQuery.data;
                error = fallbackQuery.error;
              } else {
                data = [];
                error = null;
              }
            }

            if (error) throw error;
            
            if (data && data.length > 0) {
              allData = [...allData, ...data];
              from += step;
              if (data.length < step) hasMore = false;
            } else {
              hasMore = false;
            }
          }
        }

        setTotalCards(allData.length);
        const counts: Record<string, { total: number, accessed: number }> = {
          'Legislação Jurídica': { total: 0, accessed: 0 },
          'Doutrina Operacional': { total: 0, accessed: 0 },
          'Legislação Institucional': { total: 0, accessed: 0 }
        };
        
        allData.forEach(item => {
          const cat = item.category?.trim() || 'Sem Categoria';
          // Find matching category case-insensitively
          const matchingCat = Object.keys(counts).find(k => k.toLowerCase() === cat.toLowerCase());
          const finalCat = matchingCat || cat;
          
          if (!counts[finalCat]) counts[finalCat] = { total: 0, accessed: 0 };
          counts[finalCat].total += 1;
        });

        // 3. Fetch user progress
        let progressData: any[] = [];
        if (user) {
          let pFrom = 0;
          let pHasMore = true;
          while (pHasMore) {
            let pQuery = supabase.from('user_progress').select('flashcard_id').eq('user_id', user.id).order('id').range(pFrom, pFrom + step - 1);
            
            const { data: pData, error: pError } = await pQuery;
            
            if (pError) {
              console.error('Error fetching user progress:', pError);
              break; 
            }

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
        setTotalAccessed(accessedCardIds.size);

        allData.forEach(item => {
          if (accessedCardIds.has(String(item.id))) {
            const cat = item.category?.trim() || 'Sem Categoria';
            const matchingCat = Object.keys(counts).find(k => k.toLowerCase() === cat.toLowerCase());
            const finalCat = matchingCat || cat;
            
            if (counts[finalCat]) {
              counts[finalCat].accessed += 1;
            }
          }
        });

        const stats: CategoryStat[] = Object.keys(counts).map(name => ({
          name,
          count: counts[name].total,
          accessed: counts[name].accessed
        })).sort((a, b) => {
          // Force specific order: Legislação Jurídica, Doutrina Operacional, Legislação Institucional
          const order: Record<string, number> = {
            'Legislação Jurídica': 1,
            'Doutrina Operacional': 2,
            'Legislação Institucional': 3
          };
          const orderA = order[a.name] || 99;
          const orderB = order[b.name] || 99;
          if (orderA !== orderB) return orderA - orderB;
          return b.count - a.count;
        }).slice(0, 3); // Show top 3

        setCategories(stats);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [studyMode]);

  const overallPercentage = totalCards > 0 ? (totalAccessed > 0 ? Math.max(1, Math.round((totalAccessed / totalCards) * 100)) : 0) : 0;
  const overallPercentageFormatted = totalCards > 0 ? (totalAccessed / totalCards * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen flex flex-col font-display bg-background-dark pb-20">
      <header className="sticky top-0 z-50 bg-pmmg-blue/95 backdrop-blur-md border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <Logo className="h-8" />
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Link to="/admin/import" className="bg-pmmg-gold/20 text-pmmg-gold border border-pmmg-gold/50 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-pmmg-gold/30 transition-colors">
                  Admin
                </Link>
              </>
            )}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg" title="Dias restantes do plano">
              <span className="material-symbols-outlined text-primary text-sm">schedule</span>
              <span className="text-white font-bold text-sm">
                {isAdmin ? 'Ilimitado' : remainingDays !== null ? `${remainingDays} dias` : '...'}
              </span>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full max-w-[480px] mx-auto px-5 py-6">
        
        {/* Toggle Flashcards vs Questões */}
        <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 mb-8">
          <button
            onClick={() => {
              setStudyMode('flashcard');
              localStorage.setItem('last_study_mode', 'flashcard');
            }}
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
            onClick={() => {
              setStudyMode('question');
              localStorage.setItem('last_study_mode', 'question');
            }}
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-lg font-bold">Resumo Geral ({studyMode === 'flashcard' ? 'Flashcards' : 'Questões'})</h2>
          </div>
          <div className="bg-gradient-to-br from-pmmg-blue to-pmmg-blue/60 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1 block">Total de Cartões</span>
              <div className="flex items-baseline gap-2">
                <span className="text-white text-4xl font-black">{totalCards}</span>
                <span className="text-white/40 text-sm">disponíveis</span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${overallPercentage}%` }}></div>
                </div>
                <span className="text-white text-xs font-bold">{overallPercentageFormatted}% ({totalAccessed}/{totalCards})</span>
              </div>
            </div>
            <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-white/5 text-9xl rotate-12">school</span>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-white text-lg font-bold mb-4">Continuar de onde parou</h2>
          {lastAccessed ? (
            <div 
              onClick={() => {
                const lastStudyMode = localStorage.getItem('last_accessed_study_mode') || studyMode;
                navigate('/estudo', { state: { category: lastAccessed.category, topic: lastAccessed.topic, studyMode: lastStudyMode } });
              }}
              className="bg-white/5 border border-pmmg-gold/30 rounded-2xl p-5 flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="text-pmmg-gold text-[10px] font-bold uppercase tracking-wider mb-1">{lastAccessed.category}</span>
                <span className="text-white font-bold">{lastAccessed.topic}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-pmmg-gold/20 flex items-center justify-center text-pmmg-gold">
                <span className="material-symbols-outlined">play_arrow</span>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-center text-center">
              <span className="text-slate-400 text-sm">Nenhum estudo iniciado ainda. Comece a estudar para continuar de onde parou!</span>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-lg font-bold">Estudar por conteúdos</h2>
            <Link to="/revisao" className="text-primary text-xs font-bold uppercase tracking-wider hover:text-white transition-colors">Ver Tudo</Link>
          </div>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 h-16 animate-pulse"></div>
              ))}
            </div>
          ) : categories.length > 0 ? (
            <div className="space-y-3">
              {categories.map((cat) => {
                const percentage = cat.count > 0 ? (cat.accessed > 0 ? Math.max(1, Math.round((cat.accessed / cat.count) * 100)) : 0) : 0;
                
                let icon = 'menu_book';
                let colorClass = 'bg-primary/20 text-primary';
                let barColorClass = 'bg-primary';
                
                if (cat.name === 'Legislação Jurídica') {
                  icon = 'policy';
                  colorClass = 'bg-blue-500/20 text-blue-400';
                  barColorClass = 'bg-blue-400';
                } else if (cat.name === 'Legislação Institucional') {
                  icon = 'gavel';
                  colorClass = 'bg-pmmg-gold/20 text-pmmg-gold';
                  barColorClass = 'bg-pmmg-gold';
                } else if (cat.name === 'Doutrina Operacional') {
                  icon = 'shield';
                  colorClass = 'bg-green-500/20 text-green-400';
                  barColorClass = 'bg-green-400';
                }

                return (
                  <Link 
                    key={cat.name} 
                    to="/categoria-detalhes" 
                    state={{ category: cat.name, studyMode }}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3 hover:bg-white/10 transition-colors"
                  >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                            <span className="material-symbols-outlined">
                              {icon}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white font-bold">{cat.name}</span>
                            <span className="text-slate-400 text-xs">{cat.count} cartões</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-white/80 text-xs font-bold">{percentage}%</span>
                          <span className="text-slate-500 text-[10px] font-bold tracking-tighter">({cat.accessed}/{cat.count})</span>
                        </div>
                      </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className={`${barColorClass} h-full transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-white/5 border border-dashed border-white/10 rounded-xl p-8 text-center">
              <p className="text-slate-500 text-sm">Nenhum conteúdo disponível ainda.</p>
            </div>
          )}
        </section>
      </main>

      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-[400px] bg-background-dark border border-pmmg-gold/30 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-pmmg-gold shadow-[0_0_15px_rgba(197,160,89,0.8)]"></div>
            
            <div className="w-20 h-20 bg-pmmg-gold/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-pmmg-gold/30 shadow-[0_0_30px_rgba(197,160,89,0.2)]">
              <span className="material-symbols-outlined text-pmmg-gold text-4xl font-bold">check_circle</span>
            </div>
            
            <h2 className="text-white text-2xl font-bold mb-3 tracking-tight">Pagamento Confirmado!</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              Sua assinatura foi ativada com sucesso. Você já tem acesso total a todos os flashcards e materiais. Bons estudos!
            </p>
            
            <button 
              onClick={() => {
                setShowSuccessModal(false);
                window.location.reload(); // Refresh to get updated profile
              }}
              className="w-full bg-pmmg-gold hover:bg-pmmg-gold/90 text-[#0a0e17] font-bold h-14 rounded-xl shadow-lg shadow-pmmg-gold/20 transition-all flex items-center justify-center gap-2 group"
            >
              <span>Começar a Estudar</span>
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 w-full bg-pmmg-blue/95 backdrop-blur-md border-t border-white/10 z-50 pb-safe">
        <div className="max-w-[480px] mx-auto flex justify-around items-center h-16">
          <Link to="/dashboard" className="flex flex-col items-center gap-1 text-primary">
            <span className="material-symbols-outlined icon-fill text-2xl">home</span>
            <span className="text-[10px] font-bold">Início</span>
          </Link>
          <Link to="/revisao" className="flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-2xl">history_edu</span>
            <span className="text-[10px] font-medium">Revisão</span>
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
