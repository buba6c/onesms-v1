// @ts-nocheck
import React from 'react';
import { motion } from 'framer-motion';
import { useSEO } from '../../hooks/useSEO';
import { useCurrency } from '../../hooks/useCurrency';
import { Link } from 'react-router-dom';

export default function InstagramLandingPage() {
  const { formatPrice, currency } = useCurrency();

  useSEO({
    title: "Numéro Virtuel Instagram - Multi-comptes Instagram | ONE SMS",
    description: `Créez plusieurs comptes Instagram avec des numéros virtuels. Évitez les bans, gérez plusieurs marques. 190+ pays, ${formatPrice(3000).replace('XOF', 'FCFA')}.`,
    keywords: ["numéro virtuel instagram","multi comptes instagram","activer instagram","instagram business","numero uk instagram"]
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
            style={{ backgroundColor: '#E1306C15', color: '#E1306C' }}
          >
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" /></svg>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6"
          >
            Solution Instagram
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Créez plusieurs comptes Instagram avec des numéros virtuels. Évitez les bans, gérez plusieurs marques. 190+ pays, {formatPrice(3000).replace('XOF', 'FCFA')}.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link to="/#services" className="inline-block px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
              Déployer maintenant - {formatPrice(4000).replace('XOF', 'FCFA')}
            </Link>
          </motion.div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-12 border-t border-slate-200">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Avantages Clés</h3>
            <ul className="space-y-4">
              {["Compatible avec tous types de comptes Instagram","Numéros réels, pas de VOIP","190+ pays disponibles","Réception SMS instantanée","Support technique réactif"].map((f, i) => (
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
              {["🇬🇧 UK","🇺🇸 USA","🇫🇷 France","🇨🇦 Canada","🇦🇺 Australie"].map((c, i) => (
                <span key={i} className="px-3 py-1 bg-white border border-slate-200 rounded text-sm text-slate-600">
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Cas d'Usage</h3>
            <ul className="space-y-3">
              {["Créer plusieurs comptes Instagram","Gérer des comptes clients (agences)","Éviter les restrictions Instagram","Séparer comptes personnel et professionnel","Tester des stratégies marketing"].map((u, i) => (
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
              "Je gère 8 comptes Instagram avec ONE SMS. Plus de galère avec les vérifications, tout est instantané !"
            </blockquote>
            <cite className="not-italic">
              <div className="font-bold">Yacine B.</div>
              <div className="text-slate-400 text-sm">Influenceur, Paris</div>
            </cite>
          </div>
        </section>
      </main>
    </div>
  );
}
