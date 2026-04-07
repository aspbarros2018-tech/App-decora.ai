import { useState, useEffect, ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type ViewState = 'main' | 'dados_pessoais' | 'alterar_senha' | 'central_ajuda' | 'mensagem_enviada';

interface ProfileData {
  full_name: string;
  cpf: string;
  phone: string;
  email: string;
  course: string;
  plan: string;
  created_at: string;
  avatar_url?: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ViewState>('main');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    full_name: '',
    avatar_url: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  const [helpEmail, setHelpEmail] = useState('');
  const [helpLoading, setHelpLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const COURSE_NAMES: Record<string, string> = {
    '3sgt': 'EAP 3º Sgt PM',
    '1sgt': 'EAP 1º Sgt PM',
    '1ten': 'EAP 1º Ten PM',
  };

  const PLAN_NAMES: Record<string, string> = {
    '5days': 'Acesso Gratuito (5 Dias)',
    '1month': 'Mensal',
    '2months': 'Bimestral',
    '4months': 'Quadrimestral',
    '6months': 'Semestral',
  };

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setProfile({
          full_name: data.full_name || 'Usuário',
          cpf: data.cpf || 'Não informado',
          phone: data.phone || 'Não informado',
          email: user.email || '',
          course: data.course || '3sgt',
          plan: data.plan || '',
          created_at: data.created_at || '',
          avatar_url: data.avatar_url || ''
        });
        setHelpEmail(user.email || '');
        setEditData({
          full_name: data.full_name || 'Usuário',
          avatar_url: data.avatar_url || ''
        });
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [navigate]);

  const handleUpdateProfile = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editData.full_name,
          avatar_url: editData.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, full_name: editData.full_name, avatar_url: editData.avatar_url } : null);
      setIsEditing(false);
      alert('Perfil atualizado com sucesso!');
    } catch (err: any) {
      console.error('Error updating profile:', err);
      alert('Erro ao atualizar perfil: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData(prev => ({ ...prev, avatar_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleUpdatePassword = async () => {
    setPasswordError('');
    if (passwordData.new !== passwordData.confirm) {
      setPasswordError('As senhas não coincidem.');
      return;
    }
    if (passwordData.new.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new
      });

      if (error) throw error;

      setActiveView('main');
      setPasswordData({ current: '', new: '', confirm: '' });
      alert('Senha alterada com sucesso!');
    } catch (err: any) {
      setPasswordError(err.message || 'Erro ao alterar senha.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-pmmg-gold/20 border-t-pmmg-gold rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 text-sm">Carregando perfil...</p>
        </div>
      );
    }

    if (activeView === 'dados_pessoais') {
      return (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Nome Completo</p>
              <p className="text-white font-medium">{profile?.full_name}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">E-mail</p>
              <p className="text-white font-medium">{profile?.email}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">CPF</p>
              <p className="text-white font-medium">{profile?.cpf}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Telefone</p>
              <p className="text-white font-medium">{profile?.phone}</p>
            </div>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Curso Matriculado</p>
              <p className="text-white font-medium">{profile ? COURSE_NAMES[profile.course] : '...'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Pacote Aderido</p>
              <div className="inline-block mt-1 bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Plano Premium
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeView === 'alterar_senha') {
      return (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            {passwordError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg">
                {passwordError}
              </div>
            )}
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Nova Senha</label>
              <div className="relative">
                <input 
                  type={showNewPassword ? "text" : "password"} 
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white focus:outline-none focus:border-primary transition-colors"
                  placeholder="Digite a nova senha"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">
                    {showNewPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Confirmar Nova Senha</label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white focus:outline-none focus:border-primary transition-colors"
                  placeholder="Confirme a nova senha"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">
                    {showConfirmPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>
            <button 
              className="w-full bg-primary text-black font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors mt-4 disabled:opacity-50"
              onClick={handleUpdatePassword}
              disabled={passwordLoading}
            >
              {passwordLoading ? 'Alterando...' : 'Salvar Nova Senha'}
            </button>
          </div>
        </div>
      );
    }

    if (activeView === 'central_ajuda') {
      return (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <p className="text-slate-300 text-sm mb-4">
              Descreva o problema que você está enfrentando. Sua mensagem será enviada diretamente para nossa equipe de suporte.
            </p>
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">E-mail para Contato</label>
              <input 
                type="email"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors mb-4"
                placeholder="Seu melhor e-mail"
                value={helpEmail}
                onChange={(e) => setHelpEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Mensagem</label>
              <textarea 
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors min-h-[150px] resize-none"
                placeholder="Descreva seu problema aqui..."
                value={helpMessage}
                onChange={(e) => setHelpMessage(e.target.value)}
              ></textarea>
            </div>
            <button 
              className="w-full bg-primary text-black font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={helpLoading}
              onClick={async () => {
                if (!helpEmail.trim()) {
                  alert('Por favor, informe um e-mail para contato.');
                  return;
                }
                if (!helpMessage.trim()) {
                  alert('Por favor, digite uma mensagem.');
                  return;
                }

                setHelpLoading(true);
                try {
                  const response = await fetch("https://formsubmit.co/ajax/aspbarros2018@gmail.com", {
                    method: "POST",
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        name: profile?.full_name || 'Usuário',
                        email: helpEmail,
                        message: helpMessage,
                        _subject: "Suporte Técnico - EAP PM"
                    })
                  });

                  if (response.ok) {
                    setActiveView('mensagem_enviada');
                    setHelpMessage('');
                  } else {
                    alert("Erro ao enviar mensagem. Tente novamente mais tarde.");
                  }
                } catch (error) {
                  alert("Erro ao enviar mensagem. Verifique sua conexão.");
                } finally {
                  setHelpLoading(false);
                }
              }}
            >
              <span className="material-symbols-outlined">send</span>
              {helpLoading ? 'Enviando...' : 'Enviar Mensagem'}
            </button>
          </div>
        </div>
      );
    }

    if (activeView === 'mensagem_enviada') {
      return (
        <div className="space-y-4 animate-fade-in flex flex-col items-center justify-center py-10">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-green-400 text-4xl">check_circle</span>
          </div>
          <h2 className="text-white text-2xl font-bold text-center">Mensagem Enviada!</h2>
          <p className="text-slate-400 text-center max-w-xs">
            Sua mensagem foi enviada com sucesso. Nossa equipe de suporte responderá em breve.
          </p>
          <button 
            className="w-full max-w-xs bg-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/20 transition-colors mt-8"
            onClick={() => setActiveView('main')}
          >
            Voltar ao Perfil
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full border-4 border-pmmg-gold/30 p-1 bg-background-dark overflow-hidden relative group">
              {editData.avatar_url || profile?.avatar_url ? (
                <img 
                  src={isEditing ? editData.avatar_url : profile?.avatar_url} 
                  alt="Profile" 
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <img 
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'U')}&background=c5a059&color=fff&size=128`} 
                  alt="Profile" 
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              {isEditing && (
                <label className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-white">photo_camera</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              )}
            </div>
          </div>
          
          {isEditing ? (
            <div className="w-full space-y-4">
              <div className="space-y-1">
                <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider ml-1">Nome Completo</label>
                <input 
                  type="text"
                  value={editData.full_name}
                  onChange={(e) => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                  placeholder="Seu nome completo"
                />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      full_name: profile?.full_name || '',
                      avatar_url: profile?.avatar_url || ''
                    });
                  }}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleUpdateProfile}
                  disabled={isSaving}
                  className="flex-1 bg-pmmg-gold hover:bg-pmmg-gold/90 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 group">
                <h2 className="text-white text-2xl font-bold">{profile?.full_name}</h2>
              </div>
              <span className="text-slate-400 text-sm mt-1 mb-4">{profile?.email}</span>
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Editar Perfil
              </button>
            </>
          )}
        </div>
        <div className="space-y-6">
          <section>
            <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3 ml-1">Assinatura</h3>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-pmmg-gold">school</span>
                  <div className="flex flex-col">
                    <span className="text-white text-sm font-medium">Curso Selecionado</span>
                    <span className="text-slate-400 text-xs">{COURSE_NAMES[profile?.course || '3sgt']}</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-white/5 pt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-400">card_membership</span>
                  <div className="flex flex-col">
                    <span className="text-white text-sm font-medium">Plano Atual</span>
                    <span className="text-slate-400 text-xs">{PLAN_NAMES[profile?.plan || ''] || 'Nenhum plano ativo'}</span>
                  </div>
                </div>
                {profile?.plan && (
                  <div className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Ativo
                  </div>
                )}
              </div>
            </div>
          </section>
          <section>
            <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3 ml-1">Conta</h3>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <button onClick={() => setActiveView('dados_pessoais')} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400">person</span>
                  <span className="text-white text-sm font-medium">Dados Pessoais</span>
                </div>
                <span className="material-symbols-outlined text-white/20">chevron_right</span>
              </button>
              <button onClick={() => setActiveView('alterar_senha')} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400">lock</span>
                  <span className="text-white text-sm font-medium">Alterar Senha</span>
                </div>
                <span className="material-symbols-outlined text-white/20">chevron_right</span>
              </button>
            </div>
          </section>
          <section>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <button onClick={() => setActiveView('central_ajuda')} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400">help</span>
                  <span className="text-white text-sm font-medium">Central de Ajuda</span>
                </div>
                <span className="material-symbols-outlined text-white/20">chevron_right</span>
              </button>
            </div>
          </section>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-4 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors font-bold mt-4">
            <span className="material-symbols-outlined">logout</span>
            Sair da Conta
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col font-display bg-background-dark pb-20">
      <header className="sticky top-0 z-50 bg-pmmg-blue/95 backdrop-blur-md border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <div className="flex items-center gap-3">
            {activeView === 'main' ? (
              <Link to="/dashboard" className="text-white/80 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-2xl">arrow_back</span>
              </Link>
            ) : (
              <button onClick={() => setActiveView('main')} className="text-white/80 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-2xl">arrow_back</span>
              </button>
            )}
            <h1 className="text-white text-lg font-bold">
              {activeView === 'main' && 'Meu Perfil'}
              {activeView === 'dados_pessoais' && 'Dados Pessoais'}
              {activeView === 'alterar_senha' && 'Alterar Senha'}
              {activeView === 'central_ajuda' && 'Central de Ajuda'}
              {activeView === 'mensagem_enviada' && 'Sucesso'}
            </h1>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full max-w-[480px] mx-auto px-5 py-6">
        {renderContent()}
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
          <Link to="/materiais" className="flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
            <span className="text-[10px] font-medium">Materiais</span>
          </Link>
          <Link to="/perfil" className="flex flex-col items-center gap-1 text-primary">
            <span className="material-symbols-outlined icon-fill text-2xl">person</span>
            <span className="text-[10px] font-bold">Perfil</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
