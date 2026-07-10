import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

const slides = [
  {
    title: "Vérification SMS Globale",
    titleHighlight: "Globale",
    text: "Compatible avec WhatsApp, Telegram, Google, Facebook et plus de 1600+ services pour une expérience de vérification parfaite partout dans le monde."
  },
  {
    title: "5.2M+ Numéros Disponibles",
    titleHighlight: "Instantanément",
    text: "Accédez à un vaste réseau de numéros jetables dans 190 pays différents pour tous vos besoins d'activation et de sécurité."
  },
  {
    title: "Tarifs Imbattables & Sécurité",
    titleHighlight: "Maximale",
    text: "Profitez de notre infrastructure automatisée, rapide et fiable, supportant de nombreux moyens de paiement (Mobile Money, Cartes, etc.)."
  }
];

// Composant pour une orbite avec animation
const Orbit = ({ size, duration, children, reverse = false }: { size: number, duration: number, children: React.ReactNode, reverse?: boolean }) => {
  return (
    <div 
      className="absolute top-1/2 left-1/2 rounded-full border border-white/10"
      style={{ 
        width: size, 
        height: size, 
        marginTop: -size / 2, 
        marginLeft: -size / 2,
        animation: `spin ${duration}s linear infinite ${reverse ? 'reverse' : ''}`
      }}
    >
      {children}
    </div>
  );
};

// Composant pour contrer la rotation de l'orbite afin que l'icône reste droite
const CounterRotation = ({ duration, children, reverse = false }: { duration: number, children: React.ReactNode, reverse?: boolean }) => {
  return (
    <div style={{ animation: `spin ${duration}s linear infinite ${reverse ? '' : 'reverse'}` }}>
      {children}
    </div>
  );
};

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-slide effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row bg-white rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/5 relative">
        
        {/* Left Side - Form Container */}
        <div className="w-full lg:w-1/2 flex flex-col relative z-10 min-h-[600px]">
          {/* Subtle Grid Background for the form area */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:30px_30px]"></div>
          
          <div className="flex-1 flex flex-col justify-center px-6 md:px-16 py-12 relative z-10">
            <div className="w-full max-w-sm mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2 font-display">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </div>

              {children}
            </div>
          </div>
        </div>

        {/* Right Side - Decorative Split Screen */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12 relative overflow-hidden flex flex-col items-center justify-center min-h-[500px]" style={{ background: 'linear-gradient(135deg, #003a8c 0%, #004BB5 30%, #0088E0 70%, #00C4FF 100%)' }}>
          
          {/* Background Gradients & Glows */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-blue-500/20 rounded-full blur-[80px] md:blur-[100px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-64 md:w-96 h-64 md:h-96 bg-purple-500/20 rounded-full blur-[80px] md:blur-[100px]"></div>
          </div>

          <div className="relative w-full h-full flex flex-col items-center justify-between z-10 py-6 md:py-10">
            
            {/* Title Area - Dynamic via Carousel */}
            <div className="w-full text-center h-[70px] md:h-[80px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.5 }}
                >
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight font-display">
                    {slides[currentSlide].title.replace(slides[currentSlide].titleHighlight, '')}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-100 to-white block mt-1">
                      {slides[currentSlide].titleHighlight}
                    </span>
                  </h2>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Orbital Animation Area */}
            <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center my-8 md:my-10 scale-[0.65] sm:scale-75 md:scale-90 lg:scale-100">
              
              {/* Center Logo */}
              <div className="relative z-20 w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.5)]">
                <img src="/logo.png" alt="ONE SMS" className="w-16 h-auto" />
              </div>

              {/* Orbit 1 */}
              <Orbit size={200} duration={20}>
                <div className="absolute top-0 left-1/2 -ml-5 -mt-5">
                  <CounterRotation duration={20}>
                    <div className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    </div>
                  </CounterRotation>
                </div>
                <div className="absolute bottom-0 left-1/2 -ml-5 -mt-5">
                  <CounterRotation duration={20}>
                    <div className="w-10 h-10 bg-[#0088cc] rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-current"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
                    </div>
                  </CounterRotation>
                </div>
              </Orbit>

              {/* Orbit 2 */}
              <Orbit size={300} duration={30} reverse>
                <div className="absolute top-[15%] right-[10%] -mt-6">
                  <CounterRotation duration={30} reverse>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-100">
                      <svg viewBox="0 0 24 24" className="w-7 h-7"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                    </div>
                  </CounterRotation>
                </div>
                <div className="absolute bottom-[15%] left-[10%] -mt-6">
                  <CounterRotation duration={30} reverse>
                    <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center shadow-lg">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    </div>
                  </CounterRotation>
                </div>
              </Orbit>

              {/* Orbit 3 */}
              <Orbit size={420} duration={45}>
                <div className="absolute top-[50%] -left-7 -mt-7">
                  <CounterRotation duration={45}>
                    <div className="w-14 h-14 bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] rounded-full flex items-center justify-center shadow-lg shadow-pink-500/30">
                      <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" /></svg>
                    </div>
                  </CounterRotation>
                </div>
                <div className="absolute top-[50%] -right-7 -mt-7">
                  <CounterRotation duration={45}>
                    <div className="w-14 h-14 bg-[#1877F2] rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30">
                      <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                    </div>
                  </CounterRotation>
                </div>
              </Orbit>
            </div>

            {/* Bottom Description Area - Dynamic */}
            <div className="w-full text-center px-4 md:px-16 min-h-[60px] md:h-[80px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="text-sm md:text-base text-blue-100/90 font-medium leading-relaxed">
                    {slides[currentSlide].text}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Pagination Dots */}
            <div className="flex justify-center gap-3 mt-4 md:mt-6 pb-4 md:pb-0">
              {slides.map((_, index) => (
                <button 
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentSlide ? 'w-6 md:w-8 bg-blue-500' : 'w-2 bg-white/20 hover:bg-white/40'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
