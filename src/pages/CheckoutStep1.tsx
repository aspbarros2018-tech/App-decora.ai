import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Logo from '../components/Logo';
import { supabase } from '../lib/supabase';

export default function CheckoutStep1() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedCourse = location.state?.course || '3sgt';
  const selectedPlan = location.state?.plan || '2months';

  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cpf') {
      // Remove non-digits
      const digits = value.replace(/\D/g, '');
      // Limit to 11 digits
      const limitedDigits = digits.slice(0, 11);
      
      // Apply mask: 000.000.000-00
      if (limitedDigits.length <= 3) {
        formattedValue = limitedDigits;
      } else if (limitedDigits.length <= 6) {
        formattedValue = `${limitedDigits.slice(0, 3)}.${limitedDigits.slice(3)}`;
      } else if (limitedDigits.length <= 9) {
        formattedValue = `${limitedDigits.slice(0, 3)}.${limitedDigits.slice(3, 6)}.${limitedDigits.slice(6)}`;
      } else {
        formattedValue = `${limitedDigits.slice(0, 3)}.${limitedDigits.slice(3, 6)}.${limitedDigits.slice(6, 9)}-${limitedDigits.slice(9)}`;
      }
    } else if (name === 'phone') {
      // Remove non-digits
      const digits = value.replace(/\D/g, '');
      // Limit to 11 digits (DDD + 9 digits)
      const limitedDigits = digits.slice(0, 11);

      // Apply mask: (00) 00000-0000
      if (limitedDigits.length <= 2) {
        formattedValue = limitedDigits.length > 0 ? `(${limitedDigits}` : '';
      } else if (limitedDigits.length <= 7) {
        formattedValue = `(${limitedDigits.slice(0, 2)}) ${limitedDigits.slice(2)}`;
      } else {
        formattedValue = `(${limitedDigits.slice(0, 2)}) ${limitedDigits.slice(2, 7)}-${limitedDigits.slice(7)}`;
      }
    }

    setFormData({ ...formData, [name]: formattedValue });
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }

    if (formData.cpf.length !== 14) {
      setError('Por favor, insira um CPF válido com 11 dígitos.');
      return;
    }

    if (formData.phone.length < 14) {
      setError('Por favor, insira um telefone válido com DDD.');
      return;
    }

    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.name,
          cpf: formData.cpf,
          phone: formData.phone,
          course: selectedCourse,
          plan: selectedPlan
        }
      }
    });

    if (error) {
      if (error.message.includes('rate limit')) {
        setError('Limite de segurança atingido. Para permitir o cadastro de muitos usuários simultâneos, é necessário ajustar os limites de taxa (Rate Limits) no painel do Supabase (Settings > Auth > Rate Limits).');
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      // Se não houver sessão, significa que o Supabase AINDA está exigindo confirmação de e-mail.
      if (!data.session) {
        setError('⚠️ AVISO: Para remover a confirmação de e-mail, acesse o painel do Supabase > Authentication > Providers > Email e DESATIVE a opção "Confirm email". O código não tem permissão para mudar isso sozinho.');
        setLoading(false);
        return;
      }
      navigate('/checkout/2', { state: { course: selectedCourse, plan: selectedPlan } });
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-display bg-gradient-to-b from-pmmg-blue/20 to-background-dark">
      <header className="sticky top-0 z-50 bg-pmmg-blue/95 backdrop-blur-md border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest hidden sm:block">
              Já tem conta?
            </span>
            <Link to="/" className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-2 transition-colors border border-white/5">
              <span className="material-symbols-outlined text-xl">login</span>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center w-full max-w-[480px] mx-auto pb-10">
        <div className="w-full px-6 pt-10 pb-6">
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1.5 w-12 bg-pmmg-gold rounded-full shadow-[0_0_10px_rgba(197,160,89,0.5)]"></div>
              <div className="h-1.5 w-12 bg-white/10 rounded-full"></div>
              <div className="h-1.5 w-12 bg-white/10 rounded-full"></div>
              <div className="h-1.5 w-12 bg-white/10 rounded-full"></div>
            </div>
            <span className="text-pmmg-gold text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Etapa 1 de 4</span>
            <h2 className="text-white text-2xl font-bold tracking-tight uppercase">Dados Pessoais</h2>
            <p className="text-slate-400 text-sm mt-1">Preencha seus dados básicos para começar</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-2xl backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pmmg-gold/10 rounded-full blur-3xl -z-10 transform translate-x-10 -translate-y-10"></div>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-xl mb-4 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleNext} className="space-y-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-white/60 text-xs font-bold ml-1 uppercase tracking-wide">Nome Completo</span>
                <input name="name" value={formData.name} onChange={handleChange} className="w-full rounded-xl text-white focus:ring-2 focus:ring-pmmg-gold/50 border border-white/10 bg-black/40 focus:border-pmmg-gold h-12 px-4 text-sm placeholder:text-slate-600 transition-all outline-none" placeholder="Digite seu nome completo" type="text" required />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-white/60 text-xs font-bold ml-1 uppercase tracking-wide">CPF</span>
                <input name="cpf" value={formData.cpf} onChange={handleChange} className="w-full rounded-xl text-white focus:ring-2 focus:ring-pmmg-gold/50 border border-white/10 bg-black/40 focus:border-pmmg-gold h-12 px-4 text-sm placeholder:text-slate-600 transition-all outline-none" placeholder="000.000.000-00" type="text" maxLength={14} required />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-white/60 text-xs font-bold ml-1 uppercase tracking-wide">E-mail</span>
                <input name="email" value={formData.email} onChange={handleChange} className="w-full rounded-xl text-white focus:ring-2 focus:ring-pmmg-gold/50 border border-white/10 bg-black/40 focus:border-pmmg-gold h-12 px-4 text-sm placeholder:text-slate-600 transition-all outline-none" placeholder="seu@email.com" type="email" required />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-white/60 text-xs font-bold ml-1 uppercase tracking-wide">Telefone</span>
                <input name="phone" value={formData.phone} onChange={handleChange} className="w-full rounded-xl text-white focus:ring-2 focus:ring-pmmg-gold/50 border border-white/10 bg-black/40 focus:border-pmmg-gold h-12 px-4 text-sm placeholder:text-slate-600 transition-all outline-none" placeholder="(00) 00000-0000" type="tel" maxLength={15} required />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-white/60 text-xs font-bold ml-1 uppercase tracking-wide">Senha</span>
                <div className="relative group">
                  <input name="password" value={formData.password} onChange={handleChange} className="w-full rounded-xl text-white focus:ring-2 focus:ring-pmmg-gold/50 border border-white/10 bg-black/40 focus:border-pmmg-gold h-12 px-4 pr-12 text-sm placeholder:text-slate-600 transition-all outline-none" placeholder="Crie uma senha segura" type={showPassword ? "text" : "password"} required />
                  <div 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </div>
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-white/60 text-xs font-bold ml-1 uppercase tracking-wide">Confirmar Senha</span>
                <div className="relative group">
                  <input name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full rounded-xl text-white focus:ring-2 focus:ring-pmmg-gold/50 border border-white/10 bg-black/40 focus:border-pmmg-gold h-12 px-4 pr-12 text-sm placeholder:text-slate-600 transition-all outline-none" placeholder="Repita sua senha" type={showConfirmPassword ? "text" : "password"} required />
                  <div 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors cursor-pointer"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showConfirmPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </div>
                </div>
              </label>
              <div className="pt-4">
                <button disabled={loading} type="submit" className="w-full bg-pmmg-gold hover:bg-pmmg-gold/90 text-black font-bold h-12 rounded-xl shadow-[0_4px_14px_0_rgba(197,160,89,0.39)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed">
                  <span>{loading ? 'Criando conta...' : 'Próximo Passo'}</span>
                  <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </div>
            </form>
          </div>
          <p className="text-center text-xs text-slate-500 mt-6 leading-relaxed px-4">
            Em caso de dúvidas, entre em <Link className="text-pmmg-gold hover:text-white underline decoration-pmmg-gold/30 underline-offset-4" to="/contato">Contato</Link> conosco.
          </p>
        </div>
      </main>
      <footer className="w-full px-6 mt-auto mb-8 text-center border-t border-white/5 pt-8">
        <p className="text-slate-600 text-[10px] uppercase tracking-widest">
          © 2026 DECORA.AI - EAP PMMG.
        </p>
      </footer>
    </div>
  );
}
