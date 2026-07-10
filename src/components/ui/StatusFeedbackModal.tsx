import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { ShieldX, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function StatusFeedbackModal() {
  const { statusFeedbackOpen, statusFeedbackType, hideStatusFeedback } = useUIStore();

  // Auto-hide after 3.5 seconds
  useEffect(() => {
    if (statusFeedbackOpen) {
      const timer = setTimeout(() => {
        hideStatusFeedback();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [statusFeedbackOpen, hideStatusFeedback]);

  const config = {
    cancelled: {
      icon: ShieldX,
      color: 'text-red-500',
      bgBase: 'bg-red-50',
      bgGlow: 'bg-red-500',
      title: 'Activation Annulée',
      desc: 'Les fonds ont été remboursés sur votre solde.',
    },
    timeout: {
      icon: Clock,
      color: 'text-orange-500',
      bgBase: 'bg-orange-50',
      bgGlow: 'bg-orange-500',
      title: 'Délai Expiré',
      desc: 'Le numéro a expiré. Vous avez été remboursé.',
    }
  };

  const currentConfig = statusFeedbackType ? config[statusFeedbackType] : null;

  return (
    <AnimatePresence>
      {statusFeedbackOpen && currentConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
          {/* Backdrop blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={hideStatusFeedback}
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm pointer-events-auto"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
            className="relative w-full max-w-sm bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-[2rem] overflow-hidden pointer-events-auto"
          >
            <button 
              onClick={hideStatusFeedback}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100/50 hover:bg-gray-200 flex items-center justify-center transition-colors z-10"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>

            {/* Body */}
            <div className="p-8 text-center flex flex-col items-center">
              <div className="relative mb-6 mt-2">
                <div className={`absolute inset-0 ${currentConfig.bgGlow} blur-2xl opacity-20 rounded-full scale-150 animate-pulse`} />
                <div className={`w-20 h-20 bg-gradient-to-br from-white to-${currentConfig.bgBase} rounded-full mx-auto flex items-center justify-center shadow-lg relative z-10 border border-gray-100`}>
                  <currentConfig.icon className={`w-10 h-10 ${currentConfig.color}`} />
                </div>
              </div>
              
              <h3 className="text-2xl font-black text-gray-900 mb-2">{currentConfig.title}</h3>
              <p className="text-sm font-medium text-gray-500">{currentConfig.desc}</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
