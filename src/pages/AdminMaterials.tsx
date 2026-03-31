import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AdminMaterials() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Legislação Jurídica');
  const [selectedCourse, setSelectedCourse] = useState('3sgt');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, url: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMaterials = async () => {
    setLoadingMaterials(true);
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoadingMaterials(false);
    }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.email !== 'aspbarros2018@gmail.com') {
        navigate('/');
      } else {
        setIsCheckingAuth(false);
        fetchMaterials();
      }
    };
    checkAdmin();
  }, [navigate]);

  const COURSES = [
    { id: '3sgt', name: 'EAP 3º Sgt PM' },
    { id: '1sgt', name: 'EAP 1º Sgt PM' },
    { id: '1ten', name: 'EAP 1º Ten PM' },
  ];

  const CATEGORIES = [
    'Editais',
    'Legislação Jurídica',
    'Legislação Institucional',
    'Doutrina Operacional',
    'Últimas Provas'
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      if (!title) {
        // Use file name without extension as default title
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    } else {
      setMessage('Por favor, selecione um arquivo PDF válido.');
      setFile(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const sanitizePath = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').toLowerCase();
  };

  const handleUpload = async () => {
    if (!file || !title) {
      setMessage('Por favor, preencha o título e selecione um arquivo.');
      return;
    }

    setLoading(true);
    setMessage('Fazendo upload do arquivo...');

    try {
      // 1. Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const safeCategory = sanitizePath(category);
      const filePath = `${selectedCourse}/${safeCategory}/${fileName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('pdfs')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Erro no upload do arquivo: ${uploadError.message}`);
      }

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pdfs')
        .getPublicUrl(filePath);

      setMessage('Salvando informações no banco de dados...');

      // 3. Save metadata to materials table
      const { error: dbError } = await supabase.from('materials').insert([
        {
          title,
          category,
          course: selectedCourse,
          file_url: publicUrl,
          size: formatFileSize(file.size)
        }
      ]);

      if (dbError) {
        throw new Error(`Erro ao salvar no banco: ${dbError.message}`);
      }

      setMessage('Material importado com sucesso!');
      setFile(null);
      setTitle('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchMaterials();
    } catch (error: any) {
      console.error('Upload error:', error);
      setMessage(error.message || 'Ocorreu um erro durante a importação.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: string, fileUrl: string) => {
    setItemToDelete({ id, url: fileUrl });
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);

    try {
      // Extract file path from public URL
      const urlParts = itemToDelete.url.split('/public/pdfs/');
      if (urlParts.length === 2) {
        const filePath = urlParts[1];
        
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('pdfs')
          .remove([filePath]);
          
        if (storageError) {
          console.error('Error deleting from storage:', storageError);
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('materials')
        .delete()
        .eq('id', itemToDelete.id);

      if (dbError) throw dbError;

      // Refresh list
      fetchMaterials();
      setMessage('Material excluído com sucesso!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('Error deleting material:', error);
      setMessage('Erro ao excluir material: ' + error.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
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
    <div className="min-h-screen bg-background-dark p-6 font-display text-white pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-pmmg-gold">Importar Materiais (PDF)</h1>
          <button 
            onClick={() => navigate('/dashboard')}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </div>
        
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-4">1. Selecione o Curso</h2>
            <div className="flex flex-wrap gap-3">
              {COURSES.map(course => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourse(course.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    selectedCourse === course.id 
                      ? 'bg-pmmg-gold text-background-dark' 
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {course.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-bold mb-4">2. Selecione a Categoria</h2>
            <div className="flex flex-wrap gap-3">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    category === cat 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-bold mb-4">3. Detalhes do Material</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Título do Documento</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Código Penal Militar"
                  className="w-full bg-background-dark border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-pmmg-gold"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Arquivo PDF</label>
                <input 
                  type="file" 
                  accept=".pdf"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="block w-full text-sm text-slate-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-bold
                    file:bg-pmmg-gold/20 file:text-pmmg-gold
                    hover:file:bg-pmmg-gold/30 transition-colors"
                />
                {file && (
                  <p className="mt-2 text-sm text-green-400">
                    Arquivo selecionado: {file.name} ({formatFileSize(file.size)})
                  </p>
                )}
              </div>
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-xl mb-6 ${message.includes('Erro') || message.includes('Por favor') ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
              {message}
            </div>
          )}

          <button 
            onClick={handleUpload}
            disabled={loading || !file || !title}
            className="w-full bg-pmmg-gold hover:bg-pmmg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed text-background-dark font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin"></div>
                Enviando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">upload_file</span>
                Importar Material
              </>
            )}
          </button>
        </div>
        
        <div className="mt-8 bg-white/5 p-6 rounded-2xl border border-white/10">
          <h2 className="text-xl font-bold mb-6 text-pmmg-gold flex items-center gap-2">
            <span className="material-symbols-outlined">library_books</span>
            Materiais Importados
          </h2>
          
          {loadingMaterials ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-pmmg-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : materials.filter(mat => mat.course === selectedCourse).length === 0 ? (
            <p className="text-slate-400 text-center py-8">Nenhum material importado para este curso ainda.</p>
          ) : (
            <div className="space-y-4">
              {materials.filter(mat => mat.course === selectedCourse).map((mat) => (
                <div key={mat.id} className="bg-black/20 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg">{mat.title}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                        {COURSES.find(c => c.id === mat.course)?.name || mat.course}
                      </span>
                      <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                        {mat.category}
                      </span>
                      <span className="bg-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                        {mat.size}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => navigate('/pdf', { state: { pdfUrl: mat.file_url, title: mat.title, materialId: mat.id } })}
                      className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                      title="Visualizar PDF"
                    >
                      <span className="material-symbols-outlined">visibility</span>
                    </button>
                    <button 
                      onClick={() => confirmDelete(mat.id, mat.file_url)}
                      className="bg-red-500/20 hover:bg-red-500/40 text-red-400 p-2 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                      title="Excluir Material"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <h3 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined">info</span>
            Instruções Importantes
          </h3>
          <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
            <li>Certifique-se de que as tabelas e o bucket de storage foram criados no Supabase.</li>
            <li>O tamanho máximo do arquivo depende da configuração do seu Supabase (geralmente 50MB).</li>
            <li>Os arquivos ficarão disponíveis imediatamente para os alunos do curso selecionado.</li>
          </ul>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-background-dark border border-white/10 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Confirmar Exclusão</h3>
            <p className="text-slate-400 text-sm mb-6">
              Tem certeza que deseja excluir este material? Esta ação não pode ser desfeita e o arquivo será apagado permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={executeDelete}
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
