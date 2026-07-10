// @ts-nocheck
import { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { MessageSquare, Copy, CheckCircle2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getServiceLogo, getServiceLogoFallback } from '@/lib/logo-service';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

export function SmsRevealPopup() {
  const { smsRevealOpen, smsData, hideSmsReveal } = useUIStore();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [progress, setProgress] = useState(100);
  const [isCopied, setIsCopied] = useState(false);

  // Auto-hide after 5 seconds
  useEffect(() => {
    if (smsRevealOpen) {
      setProgress(100);
      setIsCopied(false);
      
      const startTime = Date.now();
      const duration = 5000;
      
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);
        
        if (remaining <= 0) {
          clearInterval(interval);
          hideSmsReveal();
        }
      }, 16); // 60fps

      return () => clearInterval(interval);
    }
  }, [smsRevealOpen, hideSmsReveal]);

  const handleCopy = () => {
    if (smsData?.sms_code) {
      navigator.clipboard.writeText(smsData.sms_code);
      setIsCopied(true);
      toast({ title: t('common.copied', 'Copié !') });
    }
  };

  return (
    <AnimatePresence>
      {smsRevealOpen && smsData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={hideSmsReveal}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
            className="relative w-full max-w-sm bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-[2rem] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-full flex items-center justify-center shadow-md">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 leading-tight">Nouveau SMS</h3>
                  <p className="text-xs text-gray-500 font-medium">Reçu instantanément</p>
                </div>
              </div>
              <button 
                onClick={hideSmsReveal}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-white border border-gray-100 rounded-2xl shadow-sm p-3">
                  <img 
                    src={getServiceLogo(smsData.service_code || '')} 
                    onError={(e) => getServiceLogoFallback(e, smsData.service_code || '')}
                    alt={smsData.service_code}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              
              <p className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-widest">{smsData.service_code}</p>
              
              <div 
                onClick={handleCopy}
                className="group relative cursor-pointer inline-flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-2xl px-8 py-4 transition-colors"
              >
                <span className="text-5xl font-black text-gray-900 tracking-[0.2em] font-mono select-all">
                  {smsData.sms_code}
                </span>
                
                {/* Copy feedback */}
                <div className={cn(
                  "absolute inset-0 flex items-center justify-center rounded-2xl transition-all duration-300 backdrop-blur-sm",
                  isCopied ? "bg-emerald-500/90 opacity-100" : "bg-indigo-500/90 opacity-0 group-hover:opacity-100"
                )}>
                  {isCopied ? (
                    <div className="flex items-center gap-2 text-white">
                      <CheckCircle2 className="w-6 h-6" />
                      <span className="font-bold text-lg tracking-wide">Copié !</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-white">
                      <Copy className="w-6 h-6" />
                      <span className="font-bold text-lg tracking-wide">Copier</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-gray-100">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
