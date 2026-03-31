import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

export default function RecoverPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'sent' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSendLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setStep('sent');
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password === confirmPassword) {
      alert('Senha alterada com sucesso!');
      navigate('/');
    } else {
      alert('As senhas não coincidem.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-display bg-background-dark">
      <header className="sticky top-0 z-50 bg-pmmg-blue/95 backdrop-blur-md border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <Link to="/">
            <Logo className="h-10" />
          </Link>
          <Link to="/" className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-2 transition-colors">
            <span className="material-symbols-outlined text-xl">close</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center w-full max-w-[480px] mx-auto px-6 py-10">
        <div className="w-full bg-white/5 border border-white/10 p-6 rounded-2xl shadow-2xl">
          
          {step === 'email' && (
            <>
              <h2 className="text-white text-2xl font-bold mb-2">Recuperar Senha</h2>
              <p className="text-slate-400 text-sm mb-6">
                Digite seu e-mail cadastrado. Enviaremos um link para você criar uma nova senha.
              </p>
              <form onSubmit={handleSendLink} className="space-y-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-white/60 text-xs font-semibold ml-1 uppercase tracking-wide">E-mail</span>
                  <input 
                    className="w-full rounded-xl text-white focus:ring-1 focus:ring-primary border border-white/10 bg-black/20 focus:border-primary h-12 px-4 text-sm placeholder:text-slate-600 transition-all outline-none" 
                    placeholder="email@exemplo.com" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </label>
                <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-pmmg-blue font-bold h-12 rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2">
                  <span>Enviar Link</span>
                </button>
              </form>
            </>
          )}

          {step === 'sent' && (
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">mark_email_read</span>
              </div>
              <h2 className="text-white text-2xl font-bold mb-2">E-mail Enviado!</h2>
              <p className="text-slate-400 text-sm mb-6">
                Enviamos um link de recuperação para <strong>{email}</strong>. Verifique sua caixa de entrada e a pasta de spam.
              </p>
              
              <div className="w-full pt-6 border-t border-white/10 mt-2">
                <p className="text-xs text-slate-500 mb-4">Para fins de demonstração, clique no botão abaixo para simular o clique no link do e-mail:</p>
                <button 
                  onClick={() => setStep('reset')}
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold h-12 rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">link</span>
                  <span>Simular clique no link</span>
                </button>
              </div>
            </div>
          )}

          {step === 'reset' && (
            <>
              <h2 className="text-white text-2xl font-bold mb-2">Criar Nova Senha</h2>
              <p className="text-slate-400 text-sm mb-6">
                Digite sua nova senha abaixo.
              </p>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-white/60 text-xs font-semibold ml-1 uppercase tracking-wide">Nova Senha</span>
                  <div className="relative">
                    <input 
                      className="w-full rounded-xl text-white focus:ring-1 focus:ring-primary border border-white/10 bg-black/20 focus:border-primary h-12 px-4 pr-12 text-sm placeholder:text-slate-600 transition-all outline-none" 
                      placeholder="••••••••" 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showPassword ? 'visibility' : 'visibility_off'}
                      </span>
                    </button>
                  </div>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-white/60 text-xs font-semibold ml-1 uppercase tracking-wide">Confirmar Nova Senha</span>
                  <div className="relative">
                    <input 
                      className="w-full rounded-xl text-white focus:ring-1 focus:ring-primary border border-white/10 bg-black/20 focus:border-primary h-12 px-4 pr-12 text-sm placeholder:text-slate-600 transition-all outline-none" 
                      placeholder="••••••••" 
                      type={showConfirmPassword ? "text" : "password"} 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required 
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
                </label>
                <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-pmmg-blue font-bold h-12 rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2">
                  <span>Salvar Nova Senha</span>
                </button>
              </form>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
