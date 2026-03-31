import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Se for o admin e der erro (provavelmente porque não existe), tenta criar a conta automaticamente
      if (email === 'aspbarros2018@gmail.com' && password === 'pelacao86') {
        if (error.message.includes('Email not confirmed')) {
          setError('Por favor, verifique sua caixa de entrada (aspbarros2018@gmail.com) e clique no link de confirmação antes de entrar.');
          setLoading(false);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (!signUpError) {
          // Se a sessão for nula após o cadastro, significa que precisa confirmar o email
          if (!data.session) {
            setError('Conta de administrador criada! Por favor, verifique sua caixa de entrada (aspbarros2018@gmail.com) para confirmar o e-mail antes de entrar.');
          } else {
            navigate('/dashboard');
          }
          setLoading(false);
          return;
        } else {
          // Se o erro for de rate limit, pode ser que a conta já exista mas o email não foi confirmado
          if (signUpError.message.includes('security purposes')) {
             setError('Aguarde alguns segundos e tente novamente, ou verifique se você recebeu um email de confirmação.');
          } else if (signUpError.message.includes('User already registered')) {
             setError('A conta já existe. Se você não consegue entrar, verifique seu email para confirmar a conta.');
          } else {
             setError(`Erro ao criar admin: ${signUpError.message}`);
          }
          setLoading(false);
          return;
        }
      }

      setError(error.message === 'Invalid login credentials' ? 'Email ou senha incorretos.' : error.message);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-display bg-background-dark">
      <header className="sticky top-0 z-50 bg-pmmg-blue/95 backdrop-blur-md border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <Logo />
          <button onClick={() => document.getElementById('cursos')?.scrollIntoView({ behavior: 'smooth' })} className="flex items-center gap-3 group cursor-pointer">
            <span className="text-white/80 group-hover:text-white transition-colors text-sm font-semibold">
              Cadastre-se
            </span>
            <div className="bg-white/10 group-hover:bg-white/20 text-white rounded-lg p-2 transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">login</span>
            </div>
          </button>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center w-full max-w-[480px] mx-auto">
        <section className="w-full px-6 pt-12 pb-8 bg-gradient-to-b from-pmmg-blue to-background-dark">
          <h1 className="text-white tracking-tight text-3xl font-extrabold leading-[1.1] mb-6 text-center uppercase">
            Sua aprovação começa aqui
          </h1>
          <p className="text-slate-400 text-base leading-relaxed text-justify">
            Memorize com método: flashcards e questões estruturadas, alinhadas ao conteúdo programático do edital vigente do EAP da PMMG.
          </p>
        </section>
        <div className="w-full px-6 py-4">
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-2xl">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-xl mb-4 text-center">
                {error}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="flex flex-col w-full">
                <label className="flex flex-col gap-1.5">
                  <span className="text-white/60 text-xs font-semibold ml-1 uppercase tracking-wide">Email</span>
                  <input 
                    className="w-full rounded-xl text-white focus:ring-1 focus:ring-primary border border-white/10 bg-black/20 focus:border-primary h-12 px-4 text-sm placeholder:text-slate-600 transition-all outline-none" 
                    placeholder="email@exemplo.com" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </label>
              </div>
              <div className="flex flex-col w-full">
                <label className="flex flex-col gap-1.5">
                  <span className="text-white/60 text-xs font-semibold ml-1 uppercase tracking-wide">Senha</span>
                  <div className="relative group">
                    <input 
                      className="w-full rounded-xl text-white focus:ring-1 focus:ring-primary border border-white/10 bg-black/20 focus:border-primary h-12 px-4 pr-12 text-sm placeholder:text-slate-600 transition-all outline-none" 
                      placeholder="••••••••" 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                    <div 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 cursor-pointer hover:text-white transition-colors flex items-center justify-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showPassword ? 'visibility' : 'visibility_off'}
                      </span>
                    </div>
                  </div>
                </label>
              </div>
              <button disabled={loading} type="submit" className="w-full bg-primary hover:bg-primary/90 text-pmmg-blue font-bold h-12 rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed">
                <span>{loading ? 'Entrando...' : 'Entrar'}</span>
              </button>
              <div className="flex justify-between items-center pt-2 px-1">
                <Link className="text-slate-500 text-xs hover:text-white transition-colors" to="/recuperar-senha">Recuperar senha</Link>
              </div>
            </form>
          </div>
        </div>
        <section id="cursos" className="w-full px-6 mt-6 mb-10">
          <div className="flex flex-col items-center mb-6">
            <h3 className="text-white text-xl font-bold">Cursos Disponíveis</h3>
          </div>
          <div className="space-y-4">
            <div className="rank-gradient border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-xl hover:border-white/20 transition-all">
              <div className="p-5">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-primary text-[10px] font-bold uppercase tracking-[0.2em]">PMMG • EAP 2026</span>
                  </div>
                  <h4 className="text-white text-lg font-bold tracking-tight leading-snug">
                    Exame de Aptidão Profissional - 3º Sgt PM - EAP/2026
                  </h4>
                  <p className="text-slate-400 text-sm mt-2 font-medium italic">
                    Flashcards e questões para memorizar os conteúdos com rapidez, foco e eficiência.
                  </p>
                  <Link to="/curso" state={{ course: '3sgt' }} className="mt-5 self-end text-xs font-bold text-primary hover:text-white transition-colors uppercase tracking-wider flex items-center gap-1 group">
                    Saiba mais <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
            <div className="rank-gradient border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-xl hover:border-white/20 transition-all">
              <div className="p-5">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-primary text-[10px] font-bold uppercase tracking-[0.2em]">PMMG • EAP 2026</span>
                  </div>
                  <h4 className="text-white text-lg font-bold tracking-tight leading-snug">
                    Exame de Aptidão Profissional - 1º Sgt PM - EAP/2026
                  </h4>
                  <p className="text-slate-400 text-sm mt-2 font-medium italic">Flashcards e questões para memorizar os conteúdos com rapidez, foco e eficiência.</p>
                  <Link to="/curso" state={{ course: '1sgt' }} className="mt-5 self-end text-xs font-bold text-primary hover:text-white transition-colors uppercase tracking-wider flex items-center gap-1 group">
                    Saiba mais <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
            <div className="rank-gradient border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-xl hover:border-white/20 transition-all">
              <div className="p-5">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-primary text-[10px] font-bold uppercase tracking-[0.2em]">PMMG • EAP 2026</span>
                  </div>
                  <h4 className="text-white text-lg font-bold tracking-tight leading-snug">
                    Exame de Aptidão Profissional - 1º Ten PM - EAP/2026
                  </h4>
                  <p className="text-slate-400 text-sm mt-2 font-medium italic">Flashcards e questões para memorizar os conteúdos com rapidez, foco e eficiência.</p>
                  <Link to="/curso" state={{ course: '1ten' }} className="mt-5 self-end text-xs font-bold text-primary hover:text-white transition-colors uppercase tracking-wider flex items-center gap-1 group">
                    Saiba mais <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
        <footer className="w-full px-6 mt-auto mb-12 text-center border-t border-white/5 pt-8">
          <div className="space-y-6">
            <div className="flex justify-center gap-6 text-slate-500 text-xs">
              <Link className="hover:text-white transition-colors" to="/contato">Contato</Link>
            </div>
            <p className="text-slate-600 text-[10px] uppercase tracking-widest">
              © 2026 DECORA.AI - EAP PMMG.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
