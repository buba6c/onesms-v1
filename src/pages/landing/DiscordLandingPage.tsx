// @ts-nocheck
import React from 'react';
import { motion } from 'framer-motion';
import { useSEO } from '../../hooks/useSEO';
import { useCurrency } from '../../hooks/useCurrency';
import { Link } from 'react-router-dom';

const FADE_UP = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20, stiffness: 100 } }
};
const STAGGER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

function NocturnalGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(6,182,212,0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(37,99,235,0.06),transparent_60%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
    </div>
  );
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={FADE_UP} className={`relative rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 ${className}`}>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

export default function DiscordLandingPage() {
  const { formatPrice, currency } = useCurrency();

  useSEO({
    title: "Numéro Virtuel Discord - Éviter la vérification téléphonique",
    description: `Créez plusieurs comptes Discord avec des numéros virtuels. Pour gamers, développeurs, modérateurs. 190+ pays, ${formatPrice(3000).replace('XOF', 'FCFA')}.`,
    keywords: ["numéro virtuel discord","multi comptes discord","discord nitro","verification discord","numero us discord"]
  });

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30 overflow-hidden relative">
      <NocturnalGrid />
      
      <nav className="relative z-50 w-full p-6 flex justify-between items-center max-w-7xl mx-auto">
        <Link to="/" className="text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
          ONE SMS
        </Link>
        <Link to="/" className="px-5 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-colors font-medium">
          Tous les services
        </Link>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24">
        <motion.div initial="hidden" animate="visible" variants={STAGGER} className="flex flex-col items-center text-center max-w-3xl mx-auto">
          
          <motion.div variants={FADE_UP} className="w-24 h-24 rounded-full flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(37,211,102,0.3)]" style={{ backgroundColor: '#5865F2' }}>
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" /></svg>
          </motion.div>

          <motion.h1 variants={FADE_UP} className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Activer <span style={{ color: '#5865F2' }}>Discord</span>
          </motion.h1>
          
          <motion.p variants={FADE_UP} className="text-lg md:text-xl text-indigo-200 mb-10 max-w-2xl mx-auto leading-relaxed">
            Créez plusieurs comptes Discord avec des numéros virtuels. Pour gamers, développeurs, modérateurs. 190+ pays, {formatPrice(3000).replace('XOF', 'FCFA')}.
          </motion.p>

          <motion.div variants={FADE_UP} className="flex flex-wrap justify-center gap-4 mb-16">
            <Link to="/#services" className="px-8 py-4 rounded-xl font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] shadow-[0_0_20px_rgba(88,101,242,0.4)] transition-all hover:scale-105 active:scale-95">
              Acheter un numéro ({formatPrice(3000).replace('XOF', 'FCFA')})
            </Link>
          </motion.div>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={STAGGER} className="mb-20">
          <h2 className="text-2xl font-bold mb-8 text-center">Pays Disponibles</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {["🇺🇸 USA","🇬🇧 UK","🇩🇪 Allemagne","🇫🇷 France","🇳🇱 Pays-Bas"].map((c, i) => (
              <GlassCard key={i} className="text-center font-medium">{c}</GlassCard>
            ))}
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 mb-20">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={STAGGER}>
            <h2 className="text-2xl font-bold mb-6">Pourquoi choisir ONE SMS ?</h2>
            <div className="space-y-4">
              {["Compatible Discord et Discord Nitro","Vérification instantanée","Numéros de 190+ pays","Pas de restrictions","Support 24/7"].map((f, i) => (
                <GlassCard key={i} className="flex items-center gap-4 p-4!">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">✓</div>
                  <span>{f}</span>
                </GlassCard>
              ))}
            </div>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={STAGGER}>
            <h2 className="text-2xl font-bold mb-6">Comment ça marche ?</h2>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
              {["Sélectionnez votre pays","Choisissez Discord","Obtenez votre numéro","Créez votre compte Discord","Vérifiez avec le code SMS","Rejoignez vos serveurs !"].map((step, i) => (
                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-slate-900 text-slate-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    {i+1}
                  </div>
                  <GlassCard className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4!">
                    {step}
                  </GlassCard>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={STAGGER} className="max-w-3xl mx-auto mb-20">
          <h2 className="text-2xl font-bold mb-8 text-center">Questions Fréquentes</h2>
          <div className="space-y-4">
            {[{"question":"Puis-je avoir plusieurs comptes Discord ?","answer":"Oui ! Créez autant de comptes que vous voulez pour séparer gaming, dev, modération, et vie personnelle."},{"question":"Ça fonctionne pour Discord Nitro ?","answer":"Absolument. Les numéros ONE SMS fonctionnent pour activer Discord, Discord Nitro et tous les serveurs."},{"question":"Les serveurs acceptent ces numéros ?","answer":"Oui, ce sont de vrais numéros mobiles. Les serveurs Discord avec vérification téléphonique les acceptent."}].map((faq, i) => (
              <GlassCard key={i}>
                <h3 className="font-bold text-lg mb-2" style={{ color: '#5865F2' }}>{faq.question}</h3>
                <p className="text-slate-400">{faq.answer}</p>
              </GlassCard>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
