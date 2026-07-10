// @ts-nocheck
import React from 'react';
import { motion } from 'framer-motion';
import { useSEO } from '../../hooks/useSEO';
import { useCurrency } from '../../hooks/useCurrency';
import { Link } from 'react-router-dom';

export default function GoogleVoiceLandingPage() {
  const { formatPrice, currency } = useCurrency();

  useSEO({
    title: "Numéro Américain Google Voice | ONE SMS",
    description: `Activez Google Voice avec un numéro américain. Obtenez votre numéro US gratuit Google Voice en 5 minutes. ${formatPrice(6000).replace('XOF', 'FCFA')}.`,
    keywords: ["activer google voice","numero americain","google voice senegal","google voice france","numero us gratuit"]
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-500/30">
      <header className="border-b border-slate-200 bg-white">
        <nav className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold tracking-tight text-blue-900">
            ONE SMS <span className="font-light text-slate-500">Business</span>
          </Link>
          <Link to="/#services" className="text-sm font-medium text-blue-600 hover:text-blue-800">
            Retour aux services
          </Link>
        </nav>
      </header>

      <main>
        <section className="pt-24 pb-16 px-6 text-center max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center p-4 rounded-2xl mb-6 shadow-sm"
            style={{ backgroundColor: '#0F9D5815', color: '#0F9D58' }}
          >
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6"
          >
            Solution Google Voice
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Activez Google Voice avec un numéro américain. Obtenez votre numéro US gratuit Google Voice en 5 minutes. {formatPrice(6000).replace('XOF', 'FCFA')}.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link to="/#services" className="inline-block px-8 py-4 bg-[#1DA462] text-white font-semibold rounded-xl shadow-lg shadow-[#1DA462]/30 hover:bg-[#188C53] transition-colors">
              Déployer maintenant - {formatPrice(6000).replace('XOF', 'FCFA')}
            </Link>
          </motion.div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-12 border-t border-slate-200">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Avantages Clés</h3>
            <ul className="space-y-4">
              {["Numéro américain réel","Compatible Google Voice","Taux de succès 95%+","Support dédié","Tutoriel vidéo inclus"].map((f, i) => (
                <li key={i} className="flex gap-3 text-slate-700">
                  <span className="text-blue-500 mt-0.5">✦</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Couverture Globale</h3>
            <div className="flex flex-wrap gap-2">
              {["🇺🇸 USA uniquement"].map((c, i) => (
                <span key={i} className="px-3 py-1 bg-white border border-slate-200 rounded text-sm text-slate-600">
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Cas d'Usage</h3>
            <ul className="space-y-3">
              {["Obtenir un numéro américain gratuit","Appels et SMS gratuits aux USA","Créer des comptes US (PayPal, Stripe...)","Freelance sur des plateformes US","Communiquer avec des clients américains"].map((u, i) => (
                <li key={i} className="text-sm text-slate-600 border-l-2 border-slate-200 pl-3 py-1">
                  {u}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-slate-900 text-white py-20 px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="text-yellow-400 mb-6 text-2xl">★★★★★</div>
            <blockquote className="text-2xl font-medium mb-8 leading-snug">
              "J'ai enfin mon numéro américain pour Upwork et PayPal ! Google Voice activé en 5 minutes avec ONE SMS."
            </blockquote>
            <cite className="not-italic">
              <div className="font-bold">Ibrahim K.</div>
              <div className="text-slate-400 text-sm">Freelancer, Dakar</div>
            </cite>
          </div>
        </section>
      </main>
    </div>
  );
}
