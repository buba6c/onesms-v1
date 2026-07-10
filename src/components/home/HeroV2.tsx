import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Trophy, Clock, Users, ArrowRight, Shield, Zap, MessageSquare } from 'lucide-react';
import { BlurFade } from '@/components/ui/blur-fade';

export function HeroV2() {
  return (
    <section className="relative min-h-screen bg-[#020817] flex items-center justify-center pt-32 pb-20 px-4 md:px-8 font-sans overflow-hidden">
      
      {/* Background Gradients & Grid (Non-Linear Mesh) */}
      <div className="absolute inset-0 pointer-events-none">
          {/* Complex glowing orbs for non-linear effect */}
          {/* Top Left Bright Blue Glow */}
          <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[150px]"></div>
          
          {/* Center Right Cyan Glow (Behind the phone) */}
          <div className="absolute top-[20%] right-[0%] w-[900px] h-[900px] bg-cyan-500/10 rounded-full blur-[180px]"></div>

          {/* Bottom Left Indigo Glow */}
          <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-indigo-500/15 rounded-full blur-[120px]"></div>
          
          {/* Very subtle grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
      </div>

      <div className="container mx-auto max-w-7xl relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center">
          
          {/* LEFT COLUMN - TEXT & CTA */}
          <div className="max-w-2xl">
            <BlurFade delay={0.1} direction="up">
              <h1 className="text-5xl md:text-6xl lg:text-[4.5rem] font-bold text-white leading-[1.1] tracking-tight mb-6">
                La plateforme de <br className="hidden md:block" />
                confiance pour la <br className="hidden md:block" />
                vérification SMS
              </h1>
            </BlurFade>

            <BlurFade delay={0.2} direction="up">
              <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-[500px] leading-relaxed opacity-90">
                Obtenez vos numéros de téléphone virtuels et recevez vos SMS de vérification instantanément. Fiable, rapide, et sécurisé.
              </p>
            </BlurFade>

            <BlurFade delay={0.3} direction="up">
              <div className="flex flex-col sm:flex-row items-center gap-4 max-w-md">
                <Link to="/register" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-full font-bold transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:shadow-[0_0_40px_rgba(37,99,235,0.5)] flex items-center justify-center gap-3 text-lg group border border-blue-400/20">
                    Commencer
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm text-blue-100/80">
                <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70">
                  <rect x="0.5" y="0.5" width="15" height="11" rx="1.5" fill="transparent" stroke="currentColor"/>
                  <path d="M0.5 4H15.5" stroke="currentColor"/>
                </svg>
                Création de compte gratuite, sans carte de crédit requise.
              </div>
            </BlurFade>
          </div>


          {/* RIGHT COLUMN - VISUAL COMPOSITION */}
          <div className="relative h-[600px] flex items-center justify-center lg:justify-end w-full">
            
            {/* Soft background shape behind phone */}
            <div className="absolute right-[5%] top-[10%] w-[280px] h-[450px] bg-blue-900/40 rounded-3xl transform rotate-3 blur-3xl"></div>

            {/* Connecting Lines (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" style={{ zIndex: 0 }}>
               {/* Line to Top Left Card */}
               <path d="M 350 250 C 250 250, 200 180, 150 180" fill="none" stroke="rgba(56,189,248,0.2)" strokeWidth="1.5" strokeDasharray="4 4" />
               {/* Line to Bottom Left Card */}
               <path d="M 350 350 C 250 350, 200 450, 100 450" fill="none" stroke="rgba(56,189,248,0.2)" strokeWidth="1.5" strokeDasharray="4 4" />
               {/* Line to Bottom Right Card */}
               <path d="M 400 450 C 400 550, 250 550, 250 550" fill="none" stroke="rgba(56,189,248,0.2)" strokeWidth="1.5" />
            </svg>

            {/* 1. Phone Mockup - Ultra Realistic CSS Frame (Titanium Dark) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative z-10 w-[320px] h-[660px] bg-[#0f172a] rounded-[3.5rem] shadow-[0_0_80px_rgba(56,189,248,0.15)] border-[8px] border-[#1e293b] right-[5%] overflow-hidden ring-1 ring-slate-800 flex items-center justify-center"
            >
              {/* Inner black border for bezel */}
              <div className="absolute inset-0 border-[6px] border-[#020817] rounded-[3.1rem] pointer-events-none z-30"></div>
              
              {/* Dynamic Island Notch */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[110px] h-[32px] bg-black rounded-[20px] z-40 flex items-center justify-between px-2.5">
                 <div className="w-2.5 h-2.5 rounded-full bg-[#111] shadow-[inset_0px_0px_2px_rgba(255,255,255,0.2)]"></div>
                 <div className="w-3 h-3 rounded-full bg-[#111] shadow-[inset_0px_0px_3px_rgba(255,255,255,0.3)]"></div>
              </div>

              {/* Status Bar (Time, Icons) */}
              <div className="absolute top-4 w-full px-7 flex justify-between items-center z-30 text-white text-[11px] font-medium tracking-tight">
                <span className="ml-1">9:41</span>
                <div className="flex gap-1.5 items-center mr-1">
                  {/* Fake status icons */}
                  <div className="flex gap-0.5 items-end h-2.5">
                    <div className="w-0.5 h-1 bg-black rounded-sm"></div>
                    <div className="w-0.5 h-1.5 bg-black rounded-sm"></div>
                    <div className="w-0.5 h-2 bg-black rounded-sm"></div>
                    <div className="w-0.5 h-2.5 bg-black rounded-sm"></div>
                  </div>
                  <svg width="12" height="10" viewBox="0 0 12 10" className="fill-black"><path d="M6 1.5C3.8 1.5 1.8 2.3 0 3.6L6 9.5L12 3.6C10.2 2.3 8.2 1.5 6 1.5ZM6 0C8.7 0 11.2 1 13.3 2.7L12 4C10.3 2.6 8.2 1.8 6 1.8C3.8 1.8 1.7 2.6 0 4L-1.3 2.7C0.8 1 3.3 0 6 0Z"/></svg>
                  <div className="w-[18px] h-[10px] border border-black rounded-[3px] p-[1px] relative">
                    <div className="bg-black w-full h-full rounded-[1px]"></div>
                    <div className="absolute -right-[2px] top-1/2 -translate-y-1/2 w-[1px] h-1 bg-black"></div>
                  </div>
                </div>
              </div>

              {/* Bottom Home Bar */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1.5 bg-white/20 rounded-full z-30"></div>

              {/* Screen Content */}
              <div className="w-full h-full bg-[#020817] flex flex-col relative z-10 pt-[3.5rem] pb-8">
                
                {/* Header App */}
                <div className="px-5 pb-3 border-b border-white/10 bg-[#0a0f1c]/90 backdrop-blur-md z-20 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">OneSMS Bot</h3>
                    <p className="text-[10px] text-green-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)]"></span>
                      En ligne
                    </p>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 p-5 overflow-hidden flex flex-col gap-4 relative">
                  <div className="text-center text-[10px] text-slate-500 font-medium mb-1">Aujourd'hui, 09:41</div>
                  
                  {/* Bot Bubble 1 */}
                  <div className="bg-[#1e293b] border border-white/5 shadow-sm rounded-2xl rounded-tl-sm p-3 text-xs text-slate-200 max-w-[85%] self-start">
                    Bonjour, Bienvenue sur OneSMS ! Comment puis-je vous aider ?
                  </div>

                  {/* User Bubble */}
                  <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm p-3 text-xs max-w-[85%] self-end shadow-md shadow-blue-600/20">
                    J'ai besoin d'un numéro pour vérifier mon WhatsApp.
                  </div>

                  {/* Bot Bubble 2 */}
                  <div className="bg-[#1e293b] border border-white/5 shadow-sm rounded-2xl rounded-tl-sm p-3 text-xs text-slate-200 max-w-[85%] self-start flex flex-col gap-2">
                    <span>C'est noté ! Voici votre code WhatsApp :</span>
                    <div className="bg-[#0a0f1c] border border-white/10 p-2 rounded-lg font-mono font-bold text-center tracking-widest text-cyan-400">
                      G-123456
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>


            {/* 2. Floating Card: Trophy (Top Left) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1, y: [0, -12, 0] }}
              transition={{ duration: 0.6, delay: 0.4, y: { repeat: Infinity, duration: 4, ease: "easeInOut" } }}
              className="hidden md:flex absolute z-20 top-[12%] right-[60%] bg-[#0a0f1c]/80 backdrop-blur-xl rounded-2xl p-4 shadow-[0_20px_40px_rgba(0,0,0,0.5)] border border-white/10 w-[200px] flex-col"
            >
              <div className="flex flex-col items-center text-center gap-1">
                <div className="flex items-center justify-center gap-1">
                  <Trophy className="w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow-md" />
                  <span className="text-xl font-bold text-white drop-shadow-md">#1</span>
                </div>
                <p className="text-[11px] text-white font-medium leading-tight mt-1 opacity-90">
                  Plateforme de vérification SMS en Europe
                </p>
              </div>
            </motion.div>

            {/* 3. Floating Card: Graph (Bottom Left) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
              transition={{ duration: 0.6, delay: 0.6, y: { repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 } }}
              className="hidden md:flex absolute z-20 top-[48%] right-[68%] bg-[#0f172a]/90 backdrop-blur-xl rounded-[1.5rem] p-5 shadow-[0_20px_40px_rgb(0,0,0,0.25)] border border-slate-700/50 w-[190px] h-[170px] flex-col"
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-slate-200 font-semibold tracking-wide">Réception Code</span>
              </div>
              
              <div className="flex-1 relative mt-2">
                {/* Dummy Graph SVG */}
                <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                  <path d="M0,30 Q25,10 50,20 T100,5" fill="none" stroke="#38bdf8" strokeWidth="3" />
                  <circle cx="100" cy="5" r="4" fill="#38bdf8" />
                  {/* Subtle area gradient */}
                  <path d="M0,30 Q25,10 50,20 T100,5 L100,40 L0,40 Z" fill="url(#graphGrad)" className="opacity-20" />
                  <defs>
                    <linearGradient id="graphGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div className="mt-auto pt-2">
                <div className="text-2xl font-bold text-white leading-none tracking-tight">
                  <span className="text-3xl">&lt;5</span><span className="text-sm font-normal text-slate-400 ml-1">secondes</span>
                </div>
              </div>
            </motion.div>

            {/* 4. Floating Card: Avatars (Bottom Right) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
              transition={{ duration: 0.6, delay: 0.8, y: { repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 0.5 } }}
              className="hidden md:flex absolute z-20 bottom-[10%] -right-[8%] bg-[#0a0f1c]/80 backdrop-blur-2xl rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/10 w-[230px] flex-col items-center text-center"
            >
              {/* Overlapping Avatars */}
              <div className="flex -space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full border-2 border-white bg-blue-100 overflow-hidden">
                  <img src="https://i.pravatar.cc/100?img=33" alt="User 1" className="w-full h-full object-cover" />
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-white bg-purple-100 overflow-hidden">
                  <img src="https://i.pravatar.cc/100?img=47" alt="User 2" className="w-full h-full object-cover" />
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-white bg-green-100 overflow-hidden">
                  <img src="https://i.pravatar.cc/100?img=12" alt="User 3" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="text-xl font-bold text-white leading-tight">100K+</div>
              <div className="text-[10px] uppercase tracking-widest text-white font-bold mt-1">Utilisateurs satisfaits</div>
            </motion.div>

          </div>
        </div>
      </div>
    </section>
  );
}
