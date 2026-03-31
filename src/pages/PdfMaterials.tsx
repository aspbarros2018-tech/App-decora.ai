import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { supabase } from '../lib/supabase';

interface Material {
  id: string;
  title: string;
  category: string;
  course: string;
  file_url: string;
  size: string;
}

const COURSES = [
  { id: '3sgt', name: 'EAP 3º Sgt PM' },
  { id: '1sgt', name: 'EAP 1º Sgt PM' },
  { id: '1ten', name: 'EAP 1º Ten PM' },
];

export default function PdfMaterials() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userCourse, setUserCourse] = useState('3sgt');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function fetchMaterials() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let currentCourse = userCourse;
        let adminStatus = false;
        
        if (user) {
          if (user.email === 'aspbarros2018@gmail.com') {
            adminStatus = true;
            setIsAdmin(true);
          } else {
            const { data: profile } = await supabase
              .from('profiles')
              .select('course, plan, created_at')
              .eq('id', user.id)
              .single();
            
            if (profile) {
              currentCourse = profile.course || '3sgt';
              setUserCourse(currentCourse);

              // Check plan expiration
              if (!adminStatus && profile.plan && profile.created_at) {
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
          }
        }

        const { data, error } = await supabase
          .from('materials')
          .select('*')
          .eq('course', currentCourse);

        if (error) {
          console.error('Error fetching materials:', error);
        } else if (data) {
          setMaterials(data);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMaterials();
  }, [userCourse]); // Re-fetch when userCourse changes

  const filteredMaterials = materials.filter(mat => 
    mat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mat.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group materials by category
  const groupedMaterials = filteredMaterials.reduce((acc, material) => {
    if (!acc[material.category]) {
      acc[material.category] = [];
    }
    acc[material.category].push(material);
    return acc;
  }, {} as Record<string, Material[]>);

  return (
    <div className="min-h-screen flex flex-col font-display bg-background-dark pb-20">
      <header className="sticky top-0 z-50 bg-pmmg-blue/95 backdrop-blur-md border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-white/80 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </Link>
            <h1 className="text-white text-lg font-bold truncate">Materiais do conteúdo programático</h1>
          </div>
          <Logo className="h-8" showText={false} />
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full max-w-[480px] mx-auto px-5 py-6">
        
        {isAdmin && (
          <div className="mb-6">
            <h2 className="text-white text-sm font-bold mb-3">Filtrar por Curso (Visão Admin)</h2>
            <div className="flex flex-wrap gap-2">
              {COURSES.map(course => (
                <button
                  key={course.id}
                  onClick={() => setUserCourse(course.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    userCourse === course.id 
                      ? 'bg-pmmg-gold text-background-dark' 
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {course.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
            <input 
              type="text" 
              placeholder="Buscar documento (ex: Código Penal)" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl h-12 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-pmmg-gold/20 border-t-pmmg-gold rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 text-sm">Carregando materiais...</p>
          </div>
        ) : Object.keys(groupedMaterials).length > 0 ? (
          <div className="flex flex-col gap-8">
            {Object.entries(groupedMaterials).map(([category, items]: [string, Material[]]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
                  <h2 className="text-white text-xs font-bold uppercase tracking-widest">{category}</h2>
                </div>
                <div className="flex flex-col gap-3">
                  {items.map((item) => (
                    <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                        <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <h3 className="text-white text-sm font-bold truncate">{item.title}</h3>
                        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{item.size} • {item.course.toUpperCase()}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link 
                          to="/pdf" 
                          state={{ pdfUrl: item.file_url, title: item.title, materialId: item.id }}
                          className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">visibility</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/5 border border-dashed border-white/10 rounded-xl p-8 text-center">
            <p className="text-slate-500 text-sm mb-4">Nenhum material disponível ainda.</p>
            {isAdmin && (
              <Link to="/admin/materials" className="text-primary text-xs font-bold uppercase tracking-widest border border-primary/30 px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors">
                Importar PDFs
              </Link>
            )}
          </div>
        )}
      </main>
      <nav className="fixed bottom-0 left-0 w-full bg-pmmg-blue/95 backdrop-blur-md border-t border-white/10 z-50 pb-safe">
        <div className="max-w-[480px] mx-auto flex justify-around items-center h-16">
          <Link to="/dashboard" className="flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-2xl">home</span>
            <span className="text-[10px] font-medium">Início</span>
          </Link>
          <Link to="/revisao" className="flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-2xl">history_edu</span>
            <span className="text-[10px] font-medium">Revisão</span>
          </Link>
          <Link to="/materiais" className="flex flex-col items-center gap-1 text-primary">
            <span className="material-symbols-outlined icon-fill text-2xl">picture_as_pdf</span>
            <span className="text-[10px] font-bold">Materiais</span>
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
