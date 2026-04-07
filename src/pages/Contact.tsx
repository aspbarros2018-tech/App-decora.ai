import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

export default function Contact() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch("https://formsubmit.co/ajax/37e9097b1e88233c7086be52013c5c36", {
        method: "POST",
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            name: name,
            email: email,
            message: message,
            _subject: "Novo Contato - EAP PM"
        })
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate(-1);
        }, 2000);
      } else {
        alert("Erro ao enviar mensagem. Tente novamente mais tarde.");
      }
    } catch (error) {
      alert("Erro ao enviar mensagem. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-display bg-background-dark">
      <header className="sticky top-0 z-50 bg-pmmg-blue/95 backdrop-blur-md border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <Logo />
          <button onClick={() => navigate(-1)} className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-2 transition-colors">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center w-full max-w-[480px] mx-auto">
        <section className="w-full px-6 pt-10 pb-6 bg-gradient-to-b from-pmmg-blue to-background-dark flex flex-col items-center text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Fale Conosco
          </h2>
          <div className="w-16 h-1 bg-pmmg-gold mt-4 rounded-full"></div>
          <p className="text-slate-400 text-sm mt-4 leading-relaxed">
            Tem alguma dúvida ou sugestão? Envie uma mensagem para nossa equipe.
          </p>
        </section>
        
        <div className="w-full px-6 py-4">
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-2xl">
            {success ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl text-green-500">check_circle</span>
                </div>
                <h3 className="text-white text-xl font-bold mb-2">Mensagem Enviada!</h3>
                <p className="text-slate-400 text-sm">
                  Agradecemos o contato. Retornaremos em breve.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col w-full">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-white/60 text-xs font-semibold ml-1 uppercase tracking-wide">Nome</span>
                    <input 
                      className="w-full rounded-xl text-white focus:ring-1 focus:ring-primary border border-white/10 bg-black/20 focus:border-primary h-12 px-4 text-sm placeholder:text-slate-600 transition-all outline-none" 
                      placeholder="Seu nome completo" 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required 
                    />
                  </label>
                </div>
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
                    <span className="text-white/60 text-xs font-semibold ml-1 uppercase tracking-wide">Mensagem</span>
                    <textarea 
                      className="w-full rounded-xl text-white focus:ring-1 focus:ring-primary border border-white/10 bg-black/20 focus:border-primary p-4 text-sm placeholder:text-slate-600 transition-all outline-none min-h-[120px] resize-none" 
                      placeholder="Como podemos ajudar?" 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required 
                    />
                  </label>
                </div>
                <button disabled={loading} type="submit" className="w-full bg-primary hover:bg-primary/90 text-pmmg-blue font-bold h-12 rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed">
                  <span>{loading ? 'Enviando...' : 'Enviar Mensagem'}</span>
                  {!loading && <span className="material-symbols-outlined text-lg">send</span>}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
