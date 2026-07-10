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

export default function WhatsAppLandingPage() {
  const { formatPrice, currency } = useCurrency();

  useSEO({
    title: "Numéro Virtuel WhatsApp - Activer WhatsApp avec ONE SMS",
    description: `Activez WhatsApp avec un numéro virtuel américain, français ou européen. 190+ pays disponibles, activation en 2 minutes, à partir de ${formatPrice(3000).replace('XOF', 'FCFA')}.`,
    keywords: ["numéro virtuel whatsapp","activer whatsapp","whatsapp usa","whatsapp sans carte sim","numero americain whatsapp"]
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
          
          <motion.div variants={FADE_UP} className="w-24 h-24 rounded-full flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(37,211,102,0.3)]" style={{ backgroundColor: '#25D366' }}>
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
          </motion.div>

          <motion.h1 variants={FADE_UP} className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Activer <span style={{ color: '#25D366' }}>WhatsApp</span>
          </motion.h1>
          
          <motion.p variants={FADE_UP} className="text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
            Activez WhatsApp avec un numéro virtuel américain, français ou européen. 190+ pays disponibles, activation en 2 minutes, à partir de {formatPrice(3000).replace('XOF', 'FCFA')}.
          </motion.p>

          <motion.div variants={FADE_UP} className="flex flex-wrap justify-center gap-4 mb-16">
            <Link to="/#services" className="px-8 py-4 rounded-full font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95" style={{ backgroundColor: '#25D366' }}>
              Acheter un numéro ({formatPrice(3000).replace('XOF', 'FCFA')})
            </Link>
          </motion.div>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={STAGGER} className="mb-20">
          <h2 className="text-2xl font-bold mb-8 text-center">Pays Disponibles</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {["🇺🇸 USA","🇫🇷 France","🇬🇧 UK","🇨🇦 Canada","🇩🇪 Allemagne"].map((c, i) => (
              <GlassCard key={i} className="text-center font-medium">{c}</GlassCard>
            ))}
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 mb-20">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={STAGGER}>
            <h2 className="text-2xl font-bold mb-6">Pourquoi choisir ONE SMS ?</h2>
            <div className="space-y-4">
              {["Réception SMS instantanée (30 secondes)","Numéros réels et actifs","Support de tous les pays WhatsApp","Pas de contrat, paiement unique","Support en français 24/7"].map((f, i) => (
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
              {["Choisissez votre pays (USA, France, UK...)","Sélectionnez le service WhatsApp","Recevez votre numéro virtuel instantanément","Entrez le numéro dans WhatsApp","Recevez le code SMS de vérification","Votre WhatsApp est activé !"].map((step, i) => (
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
            {[{"question":"Puis-je utiliser ce numéro pour WhatsApp Business ?","answer":"Oui, absolument ! Les numéros virtuels ONE SMS fonctionnent parfaitement avec WhatsApp Business. C'est idéal pour séparer votre activité professionnelle de votre vie personnelle."},{"question":"Le numéro fonctionne-t-il partout dans le monde ?","answer":"Oui, une fois WhatsApp activé avec notre numéro virtuel, vous pouvez l'utiliser depuis n'importe quel pays. Le numéro virtuel sert uniquement à l'activation."},{"question":"Combien de temps le numéro reste-t-il actif ?","answer":"Le numéro reste actif pendant 20 minutes pour recevoir votre code de vérification WhatsApp. Une fois WhatsApp activé, vous n'avez plus besoin du numéro."},{"question":"Puis-je avoir plusieurs comptes WhatsApp ?","answer":"Oui ! Vous pouvez acheter plusieurs numéros virtuels pour créer autant de comptes WhatsApp que vous le souhaitez. Idéal pour gérer plusieurs clients ou projets."}].map((faq, i) => (
              <GlassCard key={i}>
                <h3 className="font-bold text-lg mb-2" style={{ color: '#25D366' }}>{faq.question}</h3>
                <p className="text-slate-400">{faq.answer}</p>
              </GlassCard>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
