// @ts-nocheck
import React from 'react';
import { motion } from 'framer-motion';
import { useSEO } from '../../hooks/useSEO';
import { useCurrency } from '../../hooks/useCurrency';
import { Link } from 'react-router-dom';

export default function TelegramLandingPage() {
  const { formatPrice, currency } = useCurrency();

  useSEO({
    title: "Numéro Virtuel Telegram - Activer Telegram Premium | ONE SMS",
    description: `Activez Telegram et Telegram Premium avec un numéro virtuel. 190+ pays, activation instantanée, à partir de ${formatPrice(3000).replace('XOF', 'FCFA')}.`,
    keywords: ["numéro virtuel telegram","telegram premium","activer telegram","numero francais telegram","telegram sans carte sim"]
  });

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-pink-300 overflow-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" style={{ backgroundColor: '#229ED9' }}></div>
      <div className="fixed top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-yellow-300 mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <Link to="/" className="text-3xl font-black tracking-tighter">
          ON<span className="text-pink-500">E</span> SMS
        </Link>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-20">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          
          <div className="flex-1 text-center lg:text-left">
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              transition={{ type: "spring", bounce: 0.5 }}
              className="inline-block w-20 h-20 rounded-[2rem] flex items-center justify-center mb-8 rotate-12 shadow-xl"
              style={{ backgroundColor: '#229ED9' }}
            >
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
            </motion.div>
            
            <motion.h1 
              initial={{ x: -50, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }}
              className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-6"
            >
              Get <br/> <span style={{ color: '#229ED9' }}>Telegram</span>
            </motion.h1>
            
            <motion.p 
              initial={{ x: -50, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }} 
              transition={{ delay: 0.1 }}
              className="text-xl md:text-2xl font-medium text-slate-600 mb-8 max-w-lg mx-auto lg:mx-0"
            >
              Activez Telegram et Telegram Premium avec un numéro virtuel. 190+ pays, activation instantanée, à partir de {formatPrice(3000).replace('XOF', 'FCFA')}.
            </motion.p>
            
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              <Link to="/#services" className="inline-block px-10 py-5 rounded-full text-xl font-bold bg-slate-900 text-white hover:scale-105 transition-transform shadow-[8px_8px_0px_rgba(0,0,0,0.2)]">
                Grab your number 👉
              </Link>
            </motion.div>
          </div>

          <div className="flex-1 w-full max-w-md lg:max-w-none">
            <motion.div 
              initial={{ opacity: 0, rotate: -5 }} 
              animate={{ opacity: 1, rotate: 0 }}
              className="bg-white/80 backdrop-blur-lg border-4 border-slate-900 rounded-[3rem] p-8 shadow-[16px_16px_0px_rgba(15,23,42,1)]"
            >
              <h3 className="text-2xl font-black mb-6 uppercase border-b-4 border-slate-900 pb-4">Features</h3>
              <ul className="space-y-4">
                {["Compatible Telegram et Telegram Premium","Réception SMS en temps réel","Numéros de 190+ pays","Pas d'abonnement, paiement unique","Support français 24/7"].map((f, i) => (
                  <li key={i} className="flex items-center gap-3 font-bold text-lg">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-white border-2 border-slate-900" style={{ backgroundColor: '#229ED9' }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8 p-4 rounded-2xl bg-slate-100 border-2 border-slate-900">
                <div className="font-black text-slate-400 uppercase text-sm mb-2">Available in</div>
                <div className="flex flex-wrap gap-2">
                  {["🇫🇷 France","🇺🇸 USA","🇬🇧 UK","🇩🇪 Allemagne","🇳🇱 Pays-Bas"].map((c, i) => (
                    <span key={i} className="px-3 py-1 bg-white border-2 border-slate-900 rounded-full font-bold text-sm">
                      {c.split(' ')[0]}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
