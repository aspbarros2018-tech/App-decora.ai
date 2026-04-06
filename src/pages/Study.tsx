import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import Logo from '../components/Logo';
import { supabase } from '../lib/supabase';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  explanation: string | null;
  category: string;
  topic: string;
  type?: 'flashcard' | 'question';
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_option?: string;
}

export default function Study() {
  const navigate = useNavigate();
  const location = useLocation();
  const categoryFilter = location.state?.category;
  const topicFilter = location.state?.topic;
  const difficultyFilter = location.state?.difficulty; // 'easy' or 'hard'
  const studyMode = location.state?.studyMode || 'flashcard';

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [allFetchedCards, setAllFetchedCards] = useState<Flashcard[]>([]);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [hasProgress, setHasProgress] = useState(false);
  const [isFinishedAll, setIsFinishedAll] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'hard' | 'easy' | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isTableChecked, setIsTableChecked] = useState(false);

  useEffect(() => {
    const checkTable = async () => {
      try {
        const { error: tableError } = await supabase
          .from('user_progress')
          .select('id')
          .limit(1);
        
        if (tableError && tableError.code === 'PGRST116') {
          // This is fine, it just means no data
          setIsTableChecked(true);
        } else if (tableError) {
          console.error('Error checking user_progress table:', tableError);
          setSaveError(`Erro ao acessar tabela de progresso: ${tableError.message}`);
        } else {
          setIsTableChecked(true);
        }
      } catch (err: any) {
        console.error('Unexpected error checking table:', err);
        setSaveError(`Erro inesperado: ${err.message}`);
      }
    };

    checkTable();
  }, []);

  useEffect(() => {
    async function fetchCards() {
      setLoading(true);
      try {
        // 1. Get user's course from profile
        const { data: { user } } = await supabase.auth.getUser();
        let userCourse = '3sgt'; // default
        let isUserAdmin = false;
        let userId = null;
        
        if (user) {
          userId = user.id;
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

        // 2. Fetch all cards (handling >1000 rows)
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
          if (categoryFilter) {
            query = query.eq('category', categoryFilter);
          }
          if (topicFilter) {
            query = query.eq('topic', topicFilter);
          }
          
          let { data, error } = await query;
          
          if (error && error.message.includes('type')) {
            if (studyMode === 'flashcard') {
              let fallbackQuery = supabase.from('flashcards').select('*').order('id').range(from, from + step - 1);
              if (!isUserAdmin && !useFallback) {
                fallbackQuery = fallbackQuery.eq('course', userCourse);
              }
              if (categoryFilter) {
                fallbackQuery = fallbackQuery.eq('category', categoryFilter);
              }
              if (topicFilter) {
                fallbackQuery = fallbackQuery.eq('topic', topicFilter);
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

        // 3. Filter by difficulty if requested
        if (difficultyFilter && userId) {
          let progressData: any[] = [];
          let pFrom = 0;
          let pHasMore = true;
          while (pHasMore) {
            const { data: pData, error: pError } = await supabase
              .from('user_progress')
              .select('flashcard_id, difficulty')
              .eq('user_id', userId)
              .eq('difficulty', difficultyFilter)
              .order('id')
              .range(pFrom, pFrom + step - 1);
            
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
          
          const targetCardIds = new Set(progressData.map(p => String(p.flashcard_id)));
          allData = allData.filter(card => targetCardIds.has(String(card.id)));
        }

        if (allData.length > 0) {
          // Sort by ID for linear study
          const sorted = [...allData].sort((a, b) => {
            // Try to sort numerically if IDs are numbers, otherwise string compare
            const idA = parseInt(a.id);
            const idB = parseInt(b.id);
            if (!isNaN(idA) && !isNaN(idB)) return idA - idB;
            return String(a.id).localeCompare(String(b.id));
          });
          
          setAllFetchedCards(sorted);

          // Check for progress if not a difficulty filter study
          if (!difficultyFilter && userId && categoryFilter && topicFilter) {
            const { data: progress, error: pError } = await supabase
              .from('user_progress')
              .select('flashcard_id')
              .eq('user_id', userId)
              .in('flashcard_id', sorted.map(c => c.id));
            
            if (!pError && progress && progress.length > 0) {
              setHasProgress(true);
              if (progress.length === sorted.length) {
                setIsFinishedAll(true);
              }
              setShowResumeModal(true);
              // Don't set cards yet, wait for modal choice
            } else {
              // No progress, start fresh. Keep ordered to maintain consistent numbering.
              setCards(sorted);
            }
          } else {
            // Difficulty study or no filters, just start
            setCards(sorted);
          }
        } else {
          setCards([]);
        }
      } catch (err: any) {
        console.error('Error fetching cards:', err);
        setError('Não foi possível carregar os cartões de estudo.');
      } finally {
        setLoading(true); // Keep loading true if modal is shown
        if (!showResumeModal) setLoading(false);
      }
    }

    fetchCards();
  }, [categoryFilter, topicFilter]);

  // Handle modal choice
  useEffect(() => {
    if (showResumeModal) {
      setLoading(false);
    }
  }, [showResumeModal]);

  const startStudy = (mode: 'resume' | 'restart') => {
    async function prepareStudy() {
      const { data: { user } } = await supabase.auth.getUser();
      if (mode === 'resume') {
        // Get progress to filter
        const { data: progress } = await supabase
          .from('user_progress')
          .select('flashcard_id')
          .eq('user_id', user?.id)
          .in('flashcard_id', allFetchedCards.map(c => c.id));
        
        const seenIds = new Set(progress?.map(p => p.flashcard_id) || []);
        
        // Find the index of the first unseen card
        const firstUnseenIndex = allFetchedCards.findIndex(c => !seenIds.has(c.id));
        
        setCards(allFetchedCards);
        
        if (firstUnseenIndex !== -1) {
          setCurrentCardIndex(firstUnseenIndex);
        } else {
          // If all seen, start from the beginning
          setCurrentCardIndex(0);
        }
      } else {
        // Restart: study all, sorted linearly
        setCards(allFetchedCards);
        setCurrentCardIndex(0);
      }
      setShowResumeModal(false);
    }
    prepareStudy();
  };

  const currentCard = cards[currentCardIndex];
  const isLastCard = currentCardIndex === cards.length - 1;
  const progressPercentage = cards.length > 0 ? ((currentCardIndex + 1) / cards.length) * 100 : 0;

  const handleNext = async () => {
    setSaveError(null);
    if (selectedDifficulty && currentCard) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Use upsert for more robust saving
          const { error: upsertError } = await supabase
            .from('user_progress')
            .upsert({
              user_id: user.id,
              flashcard_id: currentCard.id,
              difficulty: selectedDifficulty,
              updated_at: new Date().toISOString()
            }, { 
              onConflict: 'user_id,flashcard_id' 
            });

          if (upsertError) {
            console.error('Error saving progress:', upsertError);
            setSaveError(`Erro ao salvar: ${upsertError.message || JSON.stringify(upsertError)}`);
            return; // Stop execution if there's an error
          }
          
          // Save last accessed category and topic
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
              last_category: currentCard.category,
              last_topic: currentCard.topic,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
          if (profileError) console.error('Error updating profile:', profileError);
          
          // Save the study mode for the "Continuar de onde parou" feature
          localStorage.setItem('last_accessed_study_mode', studyMode);
        }
      } catch (err: any) {
        console.error('Error saving progress:', err);
        setSaveError(err.message || 'Erro desconhecido ao salvar');
        return; // Stop execution if there's an error
      }
    }

    if (isLastCard) {
      setIsFinished(true);
    } else {
      setCurrentCardIndex(prev => prev + 1);
      setIsFlipped(false);
      setSelectedDifficulty(null);
    }
  };

  if (showResumeModal) {
    return (
      <div className="min-h-screen flex flex-col font-display bg-background-dark items-center justify-center p-5">
        <div className="bg-white/5 border border-pmmg-gold/30 rounded-3xl p-8 max-w-[480px] w-full text-center flex flex-col items-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-pmmg-gold shadow-[0_0_15px_rgba(197,160,89,0.8)]"></div>
          
          <div className="w-20 h-20 bg-pmmg-gold/20 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-pmmg-gold text-4xl">history</span>
          </div>
          
          <h2 className="text-white text-2xl font-bold mb-4">
            {isFinishedAll ? 'Conteúdo Concluído!' : 'Continuar de onde parou?'}
          </h2>
          
          <p className="text-slate-300 mb-8 leading-relaxed text-sm">
            {isFinishedAll 
              ? 'Você já estudou todos os cartões desta matéria. Deseja recomeçar do início para revisar tudo?' 
              : 'Identificamos que você já iniciou o estudo desta matéria. Deseja continuar apenas os cartões restantes ou recomeçar do primeiro?'}
          </p>
          
          <div className="flex flex-col gap-3 w-full">
            {!isFinishedAll && (
              <button 
                onClick={() => startStudy('resume')}
                className="w-full bg-pmmg-gold hover:bg-pmmg-gold/90 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">play_arrow</span>
                Continuar Estudo
              </button>
            )}
            
            <button 
              onClick={() => startStudy('restart')}
              className={clsx(
                "w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2",
                isFinishedAll 
                  ? "bg-pmmg-gold hover:bg-pmmg-gold/90 text-black" 
                  : "bg-white/10 hover:bg-white/20 text-white"
              )}
            >
              <span className="material-symbols-outlined">restart_alt</span>
              {isFinishedAll ? 'Recomeçar Agora' : 'Começar do Início'}
            </button>
            
            <button 
              onClick={() => navigate('/revisao')}
              className="w-full bg-transparent text-slate-400 hover:text-white py-2 text-xs font-bold uppercase tracking-widest transition-colors mt-2"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col font-display bg-background-dark items-center justify-center p-5">
        <div className="w-12 h-12 border-4 border-pmmg-gold/20 border-t-pmmg-gold rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 animate-pulse">Carregando seus cartões...</p>
      </div>
    );
  }

  if (error || cards.length === 0) {
    return (
      <div className="min-h-screen flex flex-col font-display bg-background-dark items-center justify-center p-5">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-[480px] w-full text-center flex flex-col items-center shadow-2xl">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-slate-500 text-4xl">
              {error ? 'error' : 'sentiment_dissatisfied'}
            </span>
          </div>
          <h2 className="text-white text-2xl font-bold mb-4">
            {error ? 'Ops!' : 'Nenhum cartão encontrado'}
          </h2>
          <p className="text-slate-300 mb-8 leading-relaxed">
            {error || 'Não encontramos cartões para esta categoria. Importe novos cartões ou escolha outra matéria.'}
          </p>
          <Link 
            to="/revisao" 
            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Voltar para Revisão
          </Link>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen flex flex-col font-display bg-background-dark items-center justify-center p-5">
        <div className="bg-white/5 border border-pmmg-gold/30 rounded-3xl p-8 max-w-[480px] w-full text-center flex flex-col items-center shadow-2xl">
          <div className="w-20 h-20 bg-pmmg-gold/20 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-pmmg-gold text-4xl">emoji_events</span>
          </div>
          <h2 className="text-white text-2xl font-bold mb-4">Revisão Concluída!</h2>
          <p className="text-slate-300 mb-8 leading-relaxed">
            Você finalizou todos os cartões desta matéria. Continue assim para alcançar a aprovação.
          </p>
          <Link 
            to="/revisao" 
            className="w-full bg-pmmg-gold hover:bg-pmmg-gold/90 text-black font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Voltar para Revisão
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-display bg-background-dark">
      <header className="sticky top-0 z-50 bg-pmmg-blue/95 backdrop-blur-md border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/revisao" className="text-white/80 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-2xl">close</span>
            </Link>
            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider truncate max-w-[150px]">
                {currentCard.category}
              </span>
              <h1 className="text-white text-sm font-bold">Cartão {currentCardIndex + 1} de {cards.length}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Logo className="h-8" showText={false} />
          </div>
        </div>
        <div className="w-full h-1 bg-white/10 absolute bottom-0 left-0">
          <div 
            className="h-full bg-primary transition-all duration-300" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full max-w-[480px] mx-auto px-5 py-6 overflow-hidden">
        {saveError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4 text-red-400 text-sm text-center">
            Erro ao salvar: {saveError}. Verifique se a tabela user_progress existe no Supabase.
          </div>
        )}
        <div className="flex-1 relative [perspective:1000px] w-full mb-6" onClick={() => studyMode === 'flashcard' && !isFlipped && setIsFlipped(true)}>
          <div className={clsx(
            "w-full h-full absolute transition-all duration-500 [transform-style:preserve-3d]",
            isFlipped ? "rotate-y-180" : (studyMode === 'flashcard' ? "cursor-pointer" : "")
          )}>
            {/* Frente do Cartão */}
            <div className="absolute inset-0 [backface-visibility:hidden] bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col shadow-2xl overflow-y-auto hide-scrollbar">
              <div className="flex justify-between items-start mb-4">
                <span className="text-pmmg-gold text-[10px] font-bold uppercase tracking-wider">Pergunta</span>
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{currentCard.topic}</span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <h2 className={clsx(
                  "text-white font-bold leading-relaxed mb-6",
                  studyMode === 'question' ? "text-lg md:text-xl" : "text-xl md:text-2xl"
                )}>
                  {currentCard.question}
                </h2>
                
                {studyMode === 'question' && (
                  <div className="w-full flex flex-col gap-3 mt-4">
                    {['A', 'B', 'C', 'D'].map((opt) => {
                      const optionText = currentCard[`option_${opt.toLowerCase()}` as keyof Flashcard];
                      if (!optionText) return null;
                      
                      return (
                        <button
                          key={opt}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOption(opt);
                            const isCorrect = opt.toUpperCase() === currentCard.answer.trim().charAt(0).toUpperCase();
                            setSelectedDifficulty(isCorrect ? 'easy' : 'hard');
                            setIsFlipped(true);
                          }}
                          className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 transition-colors flex items-start gap-3"
                        >
                          <span className="bg-white/10 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                            {opt}
                          </span>
                          <span className="text-slate-200 text-sm leading-relaxed">
                            {optionText}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {studyMode === 'flashcard' && (
                <div className="mt-auto pt-6">
                  <button 
                    className="w-full bg-pmmg-gold hover:bg-pmmg-gold/90 text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFlipped(true);
                    }}
                  >
                    <span className="material-symbols-outlined text-xl">visibility</span>
                    Ver Resposta
                  </button>
                </div>
              )}
            </div>
            {/* Verso do Cartão */}
            <div className="absolute inset-0 [backface-visibility:hidden] rotate-y-180 bg-white/5 border border-pmmg-gold/30 rounded-3xl p-6 flex flex-col shadow-2xl overflow-y-auto hide-scrollbar">
              <div className="flex flex-col gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-pmmg-gold text-[10px] font-bold uppercase tracking-wider">Pergunta</span>
                  </div>
                  <p className={clsx("text-slate-300 italic", studyMode === 'question' ? "text-xs" : "text-sm")}>
                    {currentCard.question}
                  </p>
                </div>
                <div className="w-full h-px bg-white/10"></div>

                {studyMode === 'question' && selectedOption && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={clsx(
                        "material-symbols-outlined text-sm",
                        selectedOption.toUpperCase() === currentCard.answer.trim().charAt(0).toUpperCase() ? "text-green-400" : "text-red-400"
                      )}>
                        {selectedOption.toUpperCase() === currentCard.answer.trim().charAt(0).toUpperCase() ? 'check_circle' : 'cancel'}
                      </span>
                      <span className={clsx(
                        "text-[10px] font-bold uppercase tracking-wider",
                        selectedOption.toUpperCase() === currentCard.answer.trim().charAt(0).toUpperCase() ? "text-green-400" : "text-red-400"
                      )}>
                        Sua Resposta: {selectedOption}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-pmmg-gold text-sm">check_circle</span>
                    <span className="text-pmmg-gold text-[10px] font-bold uppercase tracking-wider">
                      {studyMode === 'question' ? `Resposta Correta: ${currentCard.answer || ''}` : 'Resposta'}
                    </span>
                  </div>
                  <p className="text-white text-sm font-medium leading-relaxed">
                    {studyMode === 'question' && currentCard.answer 
                      ? (currentCard[`option_${currentCard.answer.trim().charAt(0).toLowerCase()}` as keyof Flashcard] || currentCard.answer)
                      : currentCard.answer}
                  </p>
                </div>

                {currentCard.explanation && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-pmmg-gold text-sm">lightbulb</span>
                      <span className="text-pmmg-gold text-[10px] font-bold uppercase tracking-wider">Explicação</span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {currentCard.explanation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Controles de Avaliação (Visíveis apenas quando virado) */}
        <div className={clsx(
          "w-full transition-all duration-300 flex flex-col gap-3",
          isFlipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none absolute bottom-0"
        )}>
          {studyMode === 'flashcard' && (
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setSelectedDifficulty('hard')}
                className={clsx(
                  "bg-transparent hover:bg-white/5 border rounded-xl p-4 flex flex-col items-center justify-center transition-colors group",
                  selectedDifficulty === 'hard' ? "border-red-400 bg-red-400/10" : "border-white/20"
                )}
              >
                <span className={clsx(
                  "font-bold text-sm uppercase tracking-wider",
                  selectedDifficulty === 'hard' ? "text-red-400" : "text-white/70"
                )}>Difícil</span>
              </button>
              <button 
                onClick={() => setSelectedDifficulty('easy')}
                className={clsx(
                  "bg-transparent hover:bg-white/5 border rounded-xl p-4 flex flex-col items-center justify-center transition-colors group",
                  selectedDifficulty === 'easy' ? "border-green-400 bg-green-400/10" : "border-white/20"
                )}
              >
                <span className={clsx(
                  "font-bold text-sm uppercase tracking-wider",
                  selectedDifficulty === 'easy' ? "text-green-400" : "text-white/70"
                )}>Fácil</span>
              </button>
            </div>
          )}
          
          {selectedDifficulty && (
            <button
              onClick={handleNext}
              className="w-full mt-2 bg-white text-black font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2"
            >
              {isLastCard ? 'Concluir Revisão' : 'Prosseguir'}
              <span className="material-symbols-outlined">
                {isLastCard ? 'done_all' : 'arrow_forward'}
              </span>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
