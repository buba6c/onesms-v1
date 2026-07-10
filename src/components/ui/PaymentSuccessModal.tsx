import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './button';

export function PaymentSuccessModal() {
  const { paymentSuccessOpen, hidePaymentSuccess } = useUIStore();
  const { t } = useTranslation();

  // Handle Confetti
  useEffect(() => {
    if (paymentSuccessOpen) {
      import('canvas-confetti').then((confetti) => {
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
          confetti.default({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#2563eb', '#4f46e5', '#9333ea', '#38bdf8'] // Logo colors (Blue/Indigo/Purple/Cyan)
          });
          confetti.default({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#2563eb', '#4f46e5', '#9333ea', '#38bdf8']
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
      });
    }
  }, [paymentSuccessOpen]);

  return (
    <AnimatePresence>
      {paymentSuccessOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop avec flou intense */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={hidePaymentSuccess}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 50, rotateX: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20, rotateX: -20 }}
            transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
            style={{ perspective: 1000 }}
            className="relative w-full max-w-md bg-white dark:bg-gray-950 rounded-[2.5rem] shadow-[0_0_80px_-15px_rgba(37,99,235,0.5)] p-1 text-center overflow-hidden"
          >
            {/* Border Gradient Wrap */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 opacity-20" />

            <div className="relative bg-white dark:bg-gray-950 rounded-[2.4rem] p-8 pt-12 overflow-hidden">
              {/* Abstract decorative background */}
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white dark:from-blue-900/20 dark:via-gray-950 dark:to-gray-950 -z-10" />
              
              {/* Bouton fermer */}
              <button 
                onClick={hidePaymentSuccess}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 flex items-center justify-center transition-colors z-20"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>

              {/* Icône Animée */}
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", bounce: 0.6, duration: 1 }}
                className="relative w-28 h-28 mx-auto mb-8"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-[2rem] rotate-45 blur-lg opacity-40 animate-pulse" />
                <div className="relative w-full h-full bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-xl shadow-blue-500/30 border-4 border-white dark:border-gray-950">
                  <CheckCircle2 className="w-14 h-14 text-white drop-shadow-md" />
                </div>
              </motion.div>

              {/* Texte */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-3">
                  Paiement Réussi !
                </h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium text-sm leading-relaxed mb-8 px-2">
                  Félicitations, votre solde a été mis à jour avec succès. Vous pouvez dès à présent profiter de tous nos services.
                </p>
              </motion.div>

              {/* Bouton d'action */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                <button 
                  onClick={hidePaymentSuccess}
                  className="w-full h-16 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-black text-lg shadow-xl shadow-blue-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Continuer <span className="text-2xl leading-none">🚀</span>
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
