// @ts-nocheck
import { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { MessageSquare, Copy, CheckCircle2, X, MoreVertical, Key, History, ChevronDown, ChevronUp, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getServiceLogo, getServiceLogoFallback } from '@/lib/logo-service';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const SERVICE_NAMES: Record<string, string> = {
  'wa': 'WhatsApp', 'tg': 'Telegram', 'ig': 'Instagram', 'fb': 'Facebook',
  'tw': 'Twitter/X', 'ds': 'Discord', 'fu': 'Snapchat', 'lf': 'TikTok',
  'vi': 'Viber', 'wb': 'WeChat', 'vk': 'VKontakte', 'ok': 'Odnoklassniki',
  'tn': 'LinkedIn', 'go': 'Google', 'mm': 'Microsoft', 'wx': 'Apple',
  'dr': 'OpenAI/ChatGPT', 'mb': 'Yahoo', 'am': 'Amazon', 'ot': 'Service SMS',
};

const formatServiceName = (code?: string) => {
  if (!code) return 'Service SMS';
  const lower = code.toLowerCase();
  return SERVICE_NAMES[lower] || lower.toUpperCase();
};

// Helper pour formater le temps en heures et minutes ("écrit en heure et mn")
const formatTimeHoursAndMinutes = (expiresAt?: string | number) => {
  if (!expiresAt) return '';
  const expiresTimestamp = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime();
  if (isNaN(expiresTimestamp)) return '';
  const remainingSeconds = Math.max(0, Math.floor((expiresTimestamp - Date.now()) / 1000));
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  if (hours > 0) {
    return `${hours} h ${minutes} mn`;
  }
  if (minutes > 0) {
    return `${minutes} mn`;
  }
  return `${seconds} s`;
};

export function SmsRevealPopup() {
  const { smsRevealOpen, smsData, hideSmsReveal } = useUIStore();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [progress, setProgress] = useState(100);
  const [isCopied, setIsCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const isRent = Boolean(smsData?.is_rent || smsData?.type === 'rent' || smsData?.type === 'rental');
  const rentRemainingFormatted = formatTimeHoursAndMinutes(smsData?.expires_at);

  // Auto-hide after 8 seconds (paused if user opens history or actions)
  useEffect(() => {
    if (smsRevealOpen) {
      setProgress(100);
      setIsCopied(false);
      setShowHistory(false);
      setShowActionsMenu(false);
      setIsPaused(false);
      
      const duration = 8000;
      const interval = 50;
      const steps = duration / interval;
      let currentStep = 0;

      const timer = setInterval(() => {
        if (!isPaused && !showHistory && !showActionsMenu) {
          currentStep++;
          setProgress(Math.max(0, 100 - (currentStep / steps) * 100));
          if (currentStep >= steps) {
            clearInterval(timer);
            hideSmsReveal();
          }
        }
      }, interval);

      return () => clearInterval(timer);
    }
  }, [smsRevealOpen, hideSmsReveal, isPaused, showHistory, showActionsMenu]);

  const copyCode = () => {
    if (smsData?.sms_code) {
      navigator.clipboard.writeText(smsData.sms_code);
      setIsCopied(true);
      toast({
        title: "Code copié !",
        description: "Prêt à être collé dans votre application",
      });
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleCopy = () => {
    if (smsData?.sms_code) {
      navigator.clipboard.writeText(smsData.sms_code);
      setIsCopied(true);
      toast({ title: t('common.copied', 'Copié !') });
    }
  };

  const handleCopyPhone = () => {
    if (smsData?.phone) {
      navigator.clipboard.writeText(smsData.phone);
      toast({ title: '📱 Numéro copié !', description: smsData.phone });
      setShowActionsMenu(false);
    }
  };

  const messagesList = Array.isArray(smsData?.sms_history) && smsData.sms_history.length > 0
    ? smsData.sms_history
    : smsData?.sms_code
      ? [{ code: smsData.sms_code, text: smsData.sms_code, date: new Date().toISOString() }]
      : [];

  return (
    <AnimatePresence>
      {smsRevealOpen && smsData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={hideSmsReveal}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />

          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className={cn(
              "relative w-full max-w-md backdrop-blur-xl rounded-[2rem] overflow-hidden transition-all",
              isRent
                ? "bg-gradient-to-b from-rose-950/95 via-white/95 to-white/95 border-2 border-rose-400/80 shadow-[0_0_35px_-5px_rgba(244,63,94,0.5)]"
                : "bg-white/95 border border-white/60 shadow-blue-500/10"
            )}
          >
            {/* Header avec contour rose lumineux et temps en h et mn pour la location */}
            <div className={cn(
              "flex items-center justify-between px-6 py-4 border-b",
              isRent ? "bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 text-white border-rose-400/40 shadow-sm" : "border-gray-100 text-gray-900"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shadow-md",
                  isRent ? "bg-white/20 backdrop-blur-md border border-white/30" : "bg-gradient-to-br from-indigo-500 to-cyan-500"
                )}>
                  {isRent ? (
                    <Key className="w-5 h-5 text-white animate-pulse" />
                  ) : (
                    <MessageSquare className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold leading-tight">
                      {isRent ? 'Nouveau SMS (Location)' : 'Nouveau SMS'}
                    </h3>
                    {isRent && (
                      <span className="px-2 py-0.5 rounded-full bg-white/25 text-white text-[10px] font-black uppercase tracking-wider">
                        Rent
                      </span>
                    )}
                  </div>
                  <p className={cn("text-xs font-medium", isRent ? "text-rose-100" : "text-gray-500")}>
                    {isRent && rentRemainingFormatted ? `⏳ Expire dans : ${rentRemainingFormatted}` : isRent ? 'Ligne active de location' : 'Reçu instantanément'}
                  </p>
                </div>
              </div>

              {/* Menu 3 points & Close */}
              <div className="flex items-center gap-1.5 relative">
                <button
                  type="button"
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    isRent ? "hover:bg-white/20 text-white" : "hover:bg-gray-100 text-gray-600"
                  )}
                  title="Actions"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                <button 
                  type="button"
                  onClick={hideSmsReveal}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    isRent ? "hover:bg-white/20 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-500"
                  )}
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Dropdown Menu 3 points */}
                <AnimatePresence>
                  {showActionsMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 5 }}
                      className="absolute right-0 top-10 z-50 w-48 bg-white border border-gray-200 shadow-xl rounded-2xl py-1.5 text-left text-gray-800 text-xs font-semibold overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          handleCopy();
                          setShowActionsMenu(false);
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-gray-50 text-gray-700 transition-colors"
                      >
                        <Copy className="w-4 h-4 text-[#0055FF]" />
                        <span>Copier le code SMS</span>
                      </button>
                      {smsData?.phone && (
                        <button
                          type="button"
                          onClick={handleCopyPhone}
                          className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-gray-50 text-gray-700 transition-colors"
                        >
                          <Smartphone className="w-4 h-4 text-emerald-600" />
                          <span>Copier le numéro</span>
                        </button>
                      )}
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        type="button"
                        onClick={hideSmsReveal}
                        className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-red-50 text-red-600 transition-colors"
                      >
                        <X className="w-4 h-4 text-red-500" />
                        <span>Fermer le modal</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className={cn(
                  "w-16 h-16 rounded-2xl shadow-sm p-3 border",
                  isRent ? "bg-purple-50/80 border-purple-200" : "bg-white border-gray-100"
                )}>
                  <img 
                    src={getServiceLogo((smsData.service_code || 'ot').toLowerCase())} 
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.dataset.fallbackLoaded === 'true') return;
                      target.dataset.fallbackLoaded = 'true';
                      target.src = getServiceLogoFallback((smsData.service_code || 'ot').toLowerCase());
                    }}
                    alt={smsData.service_code || 'service'}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2 mb-2">
                <p className="text-base font-extrabold text-gray-800 tracking-wide">
                  {formatServiceName(smsData.service_code)}
                </p>
                {smsData.phone && (
                  <span className="text-xs font-mono font-semibold text-gray-500 px-2 py-0.5 bg-gray-100 rounded-lg">
                    {smsData.phone}
                  </span>
                )}
              </div>
              
              {/* Main SMS Code display */}
              <div 
                onClick={handleCopy}
                className={cn(
                  "group relative cursor-pointer inline-flex items-center justify-center border-2 border-dashed rounded-2xl px-8 py-4 transition-colors w-full",
                  isRent
                    ? "bg-purple-50/50 border-purple-200 hover:border-purple-400"
                    : "bg-gray-50 border-gray-200 hover:border-indigo-400"
                )}
              >
                <span className="text-4xl sm:text-5xl font-black text-gray-900 tracking-[0.2em] font-mono select-all">
                  {smsData.sms_code || 'REÇU'}
                </span>
                
                {/* Copy feedback */}
                <div className={cn(
                  "absolute inset-0 flex items-center justify-center rounded-2xl transition-all duration-300 backdrop-blur-sm",
                  isCopied
                    ? "bg-emerald-500/90 opacity-100"
                    : isRent
                      ? "bg-purple-600/90 opacity-0 group-hover:opacity-100"
                      : "bg-indigo-500/90 opacity-0 group-hover:opacity-100"
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

              {/* Bouton de déroulement de l'historique des SMS (spécialement utile pour les locations) */}
              {messagesList.length > 0 && (
                <div className="mt-4 text-left">
                  <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors",
                      isRent
                        ? "bg-purple-50/80 border-purple-200 text-purple-900 hover:bg-purple-100"
                        : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <History className={cn("w-4 h-4", isRent ? "text-purple-600" : "text-[#0055FF]")} />
                      <span>
                        {isRent ? "SMS reçus sur cette location" : "Détails & SMS reçus"} ({messagesList.length})
                      </span>
                    </div>
                    {showHistory ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  <AnimatePresence>
                    {showHistory && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 space-y-2 max-h-52 overflow-y-auto pr-1"
                      >
                        {messagesList.map((msg, index) => {
                          const code = msg.code || msg.text || smsData.sms_code;
                          const dateStr = msg.date || msg.received_at;
                          return (
                            <div
                              key={index}
                              className="bg-gray-50 border border-gray-200/70 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-mono font-extrabold text-gray-900 truncate">
                                  {code}
                                </p>
                                {dateStr && (
                                  <p className="text-[10px] text-gray-400 mt-0.5">
                                    {new Date(dateStr).toLocaleTimeString('fr-FR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit'
                                    })}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (code) {
                                    navigator.clipboard.writeText(code);
                                    toast({ title: t('common.copied', 'Copié !') });
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 font-bold text-gray-700 flex items-center gap-1 flex-shrink-0"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copier</span>
                              </button>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-gray-100">
              <div 
                className={cn(
                  "h-full transition-all",
                  isRent ? "bg-gradient-to-r from-purple-600 to-violet-500" : "bg-gradient-to-r from-indigo-500 to-cyan-500"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
