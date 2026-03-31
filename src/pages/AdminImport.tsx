import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AdminImport() {
  const navigate = useNavigate();
  const [csvText, setCsvText] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('3sgt');
  const [importType, setImportType] = useState<'flashcard' | 'question' | 'pdf'>('flashcard');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [courseStats, setCourseStats] = useState<{ [key: string]: { flashcards: number, questions: number, pdfs: number } }>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ITEMS_PER_PAGE = 20;

  const COURSES = [
    { id: '3sgt', name: 'EAP 3º Sgt PM' },
    { id: '1sgt', name: 'EAP 1º Sgt PM' },
    { id: '1ten', name: 'EAP 1º Ten PM' },
  ];

  const fetchCourseStats = async () => {
    try {
      // One-time migration: update flashcards with null course to '1ten'
      const { data: nullCourseData } = await supabase
        .from('flashcards')
        .select('id')
        .is('course', null)
        .limit(1);
        
      if (nullCourseData && nullCourseData.length > 0) {
        await supabase
          .from('flashcards')
          .update({ course: '1ten' })
          .is('course', null);
      }

      const stats: { [key: string]: { flashcards: number, questions: number, pdfs: number } } = {};
      for (const course of COURSES) {
        // Flashcards count
        let flashcardQuery = supabase
          .from('flashcards')
          .select('*', { count: 'exact', head: true })
          .eq('course', course.id)
          .or('type.eq.flashcard,type.is.null');
        
        let { count: flashcardCount, error: flashcardError } = await flashcardQuery;
        
        if (flashcardError) {
          const fallbackResult = await supabase
            .from('flashcards')
            .select('*', { count: 'exact', head: true })
            .eq('course', course.id);
          flashcardCount = fallbackResult.count;
          flashcardError = fallbackResult.error;
        }

        // Questions count
        let questionQuery = supabase
          .from('flashcards')
          .select('*', { count: 'exact', head: true })
          .eq('course', course.id)
          .eq('type', 'question');
          
        let { count: questionCount, error: questionError } = await questionQuery;
        
        if (questionError) {
          questionCount = 0;
          questionError = null;
        }

        // PDFs count
        let pdfQuery = supabase
          .from('materials')
          .select('*', { count: 'exact', head: true })
          .eq('course', course.id);
          
        let { count: pdfCount, error: pdfError } = await pdfQuery;

        stats[course.id] = {
          flashcards: (!flashcardError && flashcardCount !== null) ? flashcardCount : 0,
          questions: (!questionError && questionCount !== null) ? questionCount : 0,
          pdfs: (!pdfError && pdfCount !== null) ? pdfCount : 0
        };
        console.log(`Stats for ${course.id}:`, stats[course.id], 'flashcardError:', flashcardError);
      }
      console.log('Final courseStats:', stats);
      setCourseStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.email !== 'aspbarros2018@gmail.com') {
        navigate('/');
      } else {
        setIsCheckingAuth(false);
        fetchCourseStats();
      }
    };
    checkAdmin();
  }, [navigate, importType]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    // Using ISO-8859-1 (or windows-1252) to handle Excel's default CSV encoding for Portuguese accents
    reader.readAsText(file, 'ISO-8859-1');
  };

  const fetchItems = async (reset = false) => {
    if (importType === 'pdf') return; // PDFs are handled elsewhere
    
    setLoadingItems(true);
    try {
      const currentPage = reset ? 0 : page;
      let query = supabase
        .from('flashcards')
        .select('*')
        .eq('course', selectedCourse)
        .order('created_at', { ascending: false })
        .range(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE - 1);

      if (importType === 'flashcard') {
        query = query.or('type.eq.flashcard,type.is.null');
      } else {
        query = query.eq('type', 'question');
      }

      let { data, error } = await query;

      if (error) {
        if (importType === 'flashcard') {
          const fallbackResult = await supabase
            .from('flashcards')
            .select('*')
            .eq('course', selectedCourse)
            .order('created_at', { ascending: false })
            .range(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE - 1);
          
          data = fallbackResult.data;
          error = fallbackResult.error;
        } else {
          data = [];
          error = null;
        }
      }

      if (error) throw error;

      if (reset) {
        setItems(data || []);
      } else {
        setItems(prev => [...prev, ...(data || [])]);
      }
      setHasMore((data?.length || 0) === ITEMS_PER_PAGE);
      setPage(currentPage + 1);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    if (!isCheckingAuth && importType !== 'pdf') {
      fetchItems(true);
    }
  }, [selectedCourse, importType, isCheckingAuth]);

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from('flashcards').delete().eq('id', id);
      if (error) throw error;
      
      setItems(prev => prev.filter(item => item.id !== id));
      fetchCourseStats();
      setMessage('Item excluído com sucesso.');
    } catch (error: any) {
      console.error('Error deleting item:', error);
      setMessage(`Erro ao excluir item: ${error.message}`);
    } finally {
      setItemToDelete(null);
    }
  };

  const handleImport = async () => {
    if (!csvText.trim()) return;
    setLoading(true);
    setMessage('Processando...');

    try {
      // Split lines and remove empty ones
      const lines = csvText.split('\n').filter(line => line.trim() !== '');
      
      // Skip the header row (index 0)
      const dataRows = lines.slice(1);
      
      const flashcardsToInsert = dataRows.map(row => {
        // Split by semicolon
        const cols = row.split(';');
        
        if (importType === 'question') {
          // Expected structure for Questões:
          // 0: N
          // 1: CONTEUDO -> category
          // 2: NORMA/DOUTRINA -> topic
          // 3: PERGUNTA -> question
          // 4: OPCAO_A -> option_a
          // 5: OPCAO_B -> option_b
          // 6: OPCAO_C -> option_c
          // 7: OPCAO_D -> option_d
          // 8: RESPOSTA_CORRETA (A/B/C/D) -> answer
          // 9: EXPLICACAO -> explanation
          return {
            category: cols[1]?.trim() || 'Sem Categoria',
            topic: cols[2]?.trim() || 'Sem Tópico',
            question: cols[3]?.trim() || '',
            option_a: cols[4]?.trim() || '',
            option_b: cols[5]?.trim() || '',
            option_c: cols[6]?.trim() || '',
            option_d: cols[7]?.trim() || '',
            answer: cols[8]?.trim() || '',
            explanation: cols[9]?.trim() || null,
            course: selectedCourse,
            type: 'question'
          };
        } else {
          // Expected structure for Flashcards:
          // 0: N
          // 1: CONTEUDO -> category
          // 2: NORMA/DOUTRINA -> topic
          // 3: PERGUNTA -> question
          // 4: RESPOSTA -> answer
          // 5: EXPLICACAO -> explanation
          return {
            category: cols[1]?.trim() || 'Sem Categoria',
            topic: cols[2]?.trim() || 'Sem Tópico',
            question: cols[3]?.trim() || '',
            answer: cols[4]?.trim() || '',
            explanation: cols[5]?.trim() || null,
            course: selectedCourse,
            type: 'flashcard'
          };
        }
      }).filter(card => card.question && card.answer); // Only valid cards

      if (flashcardsToInsert.length === 0) {
        setMessage('Nenhum item válido encontrado no texto.');
        setLoading(false);
        return;
      }

      setMessage(`Inserindo ${flashcardsToInsert.length} itens para o curso ${selectedCourse}...`);

      // Insert in batches of 100 to avoid payload limits
      const batchSize = 100;
      let insertedCount = 0;

      for (let i = 0; i < flashcardsToInsert.length; i += batchSize) {
        const batch = flashcardsToInsert.slice(i, i + batchSize);
        
        // Log the first item of the batch to see what we are trying to insert
        if (i === 0) {
           console.log("Sample of data being inserted:", batch[0]);
        }

        let { error } = await supabase.from('flashcards').insert(batch);
        
        const isMissingColumnError = error && (
          error.message.includes('column') && 
          (error.message.includes('type') || error.message.includes('option_a') || error.message.includes('option_b') || error.message.includes('option_c') || error.message.includes('option_d'))
        );

        if (isMissingColumnError) {
           if (importType === 'flashcard') {
             // If it's a flashcard, we can try to insert without the 'type' column
             const fallbackBatch = batch.map(({ type, ...rest }) => rest);
             const fallbackResult = await supabase.from('flashcards').insert(fallbackBatch);
             error = fallbackResult.error;
           } else {
             throw new Error("ERRO DE BANCO DE DADOS: Para importar questões, você precisa criar as novas colunas na tabela 'flashcards' no Supabase: 'type' (text), 'option_a' (text), 'option_b' (text), 'option_c' (text), 'option_d' (text).");
           }
        }

        if (error) {
           console.error("Supabase Insert Error Details:", error);
           if (error.message.includes('permission denied')) {
             throw new Error("Permissão negada. Desative temporariamente o RLS da tabela 'flashcards' no Supabase.");
           }
           throw error;
        }
        
        insertedCount += batch.length;
        setMessage(`Inseridos ${insertedCount} de ${flashcardsToInsert.length}...`);
      }

      setMessage(`Sucesso! ${insertedCount} itens foram importados para o curso ${selectedCourse}.`);
      setCsvText('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchCourseStats();
    } catch (error: any) {
      console.error(error);
      setMessage(`Erro ao importar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourseFlashcards = async () => {
    setIsDeleting(true);
    setMessage(`Excluindo ${importType === 'question' ? 'questões' : 'flashcards'}...`);
    try {
      // First, we need to get all the IDs of the flashcards we're going to delete
      let getIdsQuery = supabase
        .from('flashcards')
        .select('id')
        .eq('course', selectedCourse);

      if (importType === 'flashcard') {
        getIdsQuery = getIdsQuery.or('type.eq.flashcard,type.is.null');
      } else {
        getIdsQuery = getIdsQuery.eq('type', 'question');
      }

      let { data: itemsToDelete, error: getIdsError } = await getIdsQuery;

      // Fallback if type column doesn't exist
      if (getIdsError) {
        if (importType === 'flashcard') {
          const fallbackQuery = await supabase
            .from('flashcards')
            .select('id')
            .eq('course', selectedCourse);
          itemsToDelete = fallbackQuery.data;
          getIdsError = fallbackQuery.error;
        } else {
          itemsToDelete = [];
          getIdsError = null;
        }
      }

      if (getIdsError) throw getIdsError;

      if (itemsToDelete && itemsToDelete.length > 0) {
        const ids = itemsToDelete.map(item => item.id);
        
        // Delete related user_progress first to avoid foreign key constraint errors
        // We do this in batches if there are many items
        const batchSize = 100;
        for (let i = 0; i < ids.length; i += batchSize) {
          const batchIds = ids.slice(i, i + batchSize);
          const { error: progressError } = await supabase
            .from('user_progress')
            .delete()
            .in('flashcard_id', batchIds);
            
          if (progressError) {
            console.error('Error deleting user progress:', progressError);
            // We don't throw here, we try to continue with the flashcard deletion
            // as the constraint might have ON DELETE CASCADE in some environments
          }
        }
      }

      // Now delete the flashcards
      let query = supabase
        .from('flashcards')
        .delete()
        .eq('course', selectedCourse);

      if (importType === 'flashcard') {
        query = query.or('type.eq.flashcard,type.is.null');
      } else {
        query = query.eq('type', 'question');
      }

      let { error } = await query;

      if (error) {
        if (importType === 'flashcard') {
          const fallbackResult = await supabase
            .from('flashcards')
            .delete()
            .eq('course', selectedCourse);
          
          error = fallbackResult.error;
        } else {
          error = null; // Nothing to delete
        }
      }

      if (error) throw error;

      setMessage(`Todos os itens do tipo ${importType === 'question' ? 'Questões' : 'Flashcards'} do curso ${COURSES.find(c => c.id === selectedCourse)?.name} foram excluídos com sucesso.`);
      fetchCourseStats();
    } catch (error: any) {
      console.error(error);
      
      // Check for foreign key violation
      if (error.code === '23503' || error.message?.includes('violates foreign key constraint')) {
        setMessage('ERRO DE BANCO DE DADOS: Não é possível excluir os flashcards porque existem usuários que já estudaram e têm progresso salvo neles. Para resolver isso definitivamente, você precisa executar um comando SQL no Supabase para ativar a exclusão em cascata (ON DELETE CASCADE). Veja as instruções abaixo.');
      } else {
        setMessage(`Erro ao excluir: ${error.message}`);
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-pmmg-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark p-6 font-display text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-pmmg-gold">Importador de Flashcards (Admin)</h1>
          <button 
            onClick={() => {
              navigate('/dashboard');
            }}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </div>
        
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
          <div className="mb-6">
            <h3 className="text-white/80 text-sm font-bold uppercase tracking-wider mb-3">1. Selecione o Tipo de Importação</h3>
            <div className="flex gap-4">
              <button
                onClick={() => setImportType('flashcard')}
                className={`flex-1 p-3 rounded-xl border transition-all text-sm font-bold flex items-center justify-center gap-2 ${
                  importType === 'flashcard' 
                    ? 'border-pmmg-gold bg-pmmg-gold/10 text-pmmg-gold' 
                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                <span className="material-symbols-outlined">style</span>
                Flashcards
              </button>
              <button
                onClick={() => setImportType('question')}
                className={`flex-1 p-3 rounded-xl border transition-all text-sm font-bold flex items-center justify-center gap-2 ${
                  importType === 'question' 
                    ? 'border-pmmg-gold bg-pmmg-gold/10 text-pmmg-gold' 
                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                <span className="material-symbols-outlined">quiz</span>
                Questões
              </button>
              <button
                onClick={() => navigate('/admin/materials')}
                className={`flex-1 p-3 rounded-xl border transition-all text-sm font-bold flex items-center justify-center gap-2 border-white/10 bg-white/5 text-slate-400 hover:border-white/20`}
              >
                <span className="material-symbols-outlined">picture_as_pdf</span>
                PDFs
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-white/80 text-sm font-bold uppercase tracking-wider mb-3">2. Selecione o Curso de Destino</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {COURSES.map(course => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourse(course.id)}
                  className={`p-4 rounded-xl border transition-all text-sm font-bold flex items-center justify-center ${
                    selectedCourse === course.id 
                      ? 'border-pmmg-gold bg-pmmg-gold/10 text-pmmg-gold' 
                      : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <span className="text-base">{course.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-white/10 mb-6"></div>

          <p className="text-sm text-slate-400 mb-4">
            3. Selecione o seu arquivo CSV ou cole o conteúdo abaixo. O sistema espera as colunas separadas por ponto e vírgula (;).
            <br/><br/>
            <strong>Estrutura esperada ({importType === 'question' ? 'Questões' : 'Flashcards'}):</strong><br/>
            {importType === 'question' 
              ? 'N; CATEGORIA; TOPICO; PERGUNTA; OPCAO_A; OPCAO_B; OPCAO_C; OPCAO_D; RESPOSTA_CORRETA (A, B, C ou D); EXPLICACAO'
              : 'N; CATEGORIA; TOPICO; PERGUNTA; RESPOSTA; EXPLICACAO'}
          </p>

          <div className="mb-6">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload}
              ref={fileInputRef}
              className="block w-full text-sm text-slate-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-pmmg-gold file:text-black
                hover:file:bg-pmmg-gold/90 cursor-pointer"
            />
          </div>
          
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full h-64 bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-slate-300 font-mono focus:ring-2 focus:ring-pmmg-gold outline-none mb-4"
            placeholder="Cole aqui o conteúdo do CSV ou selecione um arquivo acima..."
          />
          
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleImport}
              disabled={loading || !csvText.trim()}
              className="bg-pmmg-gold text-black font-bold px-6 py-3 rounded-xl hover:bg-pmmg-gold/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Importando...' : 'Importar Flashcards'}
            </button>

            {message && (
              <span className={`text-sm font-semibold ${message.includes('Erro') ? 'text-red-400' : 'text-green-400'}`}>
                {message}
              </span>
            )}
          </div>
        </div>

        {/* List of Imported Items */}
        <div className="mt-8 bg-white/5 p-6 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-pmmg-gold flex items-center gap-2">
              <span className="material-symbols-outlined">list</span>
              Itens Importados ({importType === 'question' ? 'Questões' : 'Flashcards'})
            </h2>
            <button 
              onClick={() => setShowDeleteModal(true)}
              disabled={((importType === 'question' ? courseStats[selectedCourse]?.questions : courseStats[selectedCourse]?.flashcards) || 0) === 0}
              className="bg-red-500/20 hover:bg-red-500/40 text-red-400 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">delete_sweep</span>
              Excluir Todos
            </button>
          </div>
          
          {loadingItems && items.length === 0 && importType === 'question' ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-pmmg-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : ((importType === 'question' ? courseStats[selectedCourse]?.questions : courseStats[selectedCourse]?.flashcards) || 0) === 0 ? (
            <p className="text-slate-400 text-center py-8">Nenhum {importType === 'question' ? 'banco de questões' : 'banco de flashcards'} importado para este curso ainda.</p>
          ) : (
            <div className="space-y-4">
              {importType === 'flashcard' && (courseStats[selectedCourse]?.flashcards || 0) > 0 ? (
                <div className="bg-black/20 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400">
                      <span className="material-symbols-outlined">description</span>
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">
                        Arquivo CSV - Flashcards
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="bg-pmmg-gold/20 text-pmmg-gold text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                          {COURSES.find(c => c.id === selectedCourse)?.name}
                        </span>
                        <span className="bg-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                          {courseStats[selectedCourse]?.flashcards || 0} flashcards
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowDeleteModal(true)}
                      className="bg-red-500/20 hover:bg-red-500/40 text-red-400 p-2 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                      title="Excluir Arquivo CSV de Flashcards"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ) : importType === 'question' ? (
                <>
                  {items.map((item) => (
                    <div key={item.id} className="bg-black/20 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="bg-pmmg-gold/20 text-pmmg-gold text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                            {item.category || 'Sem Categoria'}
                          </span>
                          <span className="bg-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                            {item.topic || 'Sem Tópico'}
                          </span>
                        </div>
                        <h3 className="text-white font-medium text-sm line-clamp-2">
                          {item.question}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setItemToDelete(item.id)}
                          className="bg-red-500/20 hover:bg-red-500/40 text-red-400 p-2 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                          title="Excluir Item"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {hasMore && (
                    <button
                      onClick={() => fetchItems()}
                      disabled={loadingItems}
                      className="w-full py-3 border border-white/10 rounded-xl text-slate-400 hover:bg-white/5 transition-colors text-sm font-bold disabled:opacity-50"
                    >
                      {loadingItems ? 'Carregando...' : 'Carregar Mais'}
                    </button>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Delete Item Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-background-dark border border-white/10 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Confirmar Exclusão</h3>
            <p className="text-slate-400 text-sm mb-6">
              Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteItem(itemToDelete)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-background-dark border border-white/10 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Confirmar Exclusão</h3>
            <p className="text-slate-400 text-sm mb-6">
              Tem certeza que deseja excluir <strong>TODOS</strong> os <strong className="text-white">{importType === 'question' ? courseStats[selectedCourse]?.questions || 0 : courseStats[selectedCourse]?.flashcards || 0}</strong> {importType === 'question' ? 'questões' : 'flashcards'} do curso <strong className="text-white">{COURSES.find(c => c.id === selectedCourse)?.name}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteCourseFlashcards}
                disabled={isDeleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'Excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
