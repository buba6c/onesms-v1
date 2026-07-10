import { useState, useEffect } from 'react';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info, AlertTriangle, CheckCircle, AlertCircle, X, Sparkles, Wrench, RefreshCw, Gift, Bell, Newspaper } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function GlobalPopup() {
  const { data: announcements } = useAnnouncements();
  const { t } = useTranslation();
  
  // Find the first active popup announcement that hasn't been dismissed
  const [activePopup, setActivePopup] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!announcements || announcements.length === 0) return;

    // Get dismissed popups from localStorage
    const getDismissed = () => {
      try {
        const stored = localStorage.getItem('dismissed_popups');
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    };

    const dismissed = getDismissed();

    // Find the first announcement that should be shown as a popup AND hasn't been dismissed
    const popupToShow = announcements.find(
      (ann) => ann.show_as_popup && !dismissed.includes(ann.id)
    );

    if (popupToShow) {
      // Delay slightly to not interrupt initial render aggressively
      const timer = setTimeout(() => {
        setActivePopup(popupToShow);
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [announcements]);

  useEffect(() => {
    const handleOpenPopup = (e: CustomEvent) => {
      setActivePopup(e.detail);
      setIsOpen(true);
    };
    
    window.addEventListener('open-popup', handleOpenPopup as EventListener);
    return () => {
      window.removeEventListener('open-popup', handleOpenPopup as EventListener);
    };
  }, []);

  const handleDismiss = () => {
    setIsOpen(false);
    
    if (activePopup) {
      try {
        const stored = localStorage.getItem('dismissed_popups');
        const dismissed = stored ? JSON.parse(stored) : [];
        if (!dismissed.includes(activePopup.id)) {
          dismissed.push(activePopup.id);
          localStorage.setItem('dismissed_popups', JSON.stringify(dismissed));
        }
      } catch (e) {
        console.error('Failed to save dismissed popup state', e);
      }
    }
    
    // Clear active popup after animation finishes
    setTimeout(() => {
      setActivePopup(null);
    }, 300);
  };

  if (!activePopup) return null;

  // Icon and colors based on type
  const getIcon = () => {
    // Check if we have a color theme explicitly set, otherwise use primary
    const colorClass = activePopup.color_theme === 'danger' ? 'text-red-500' :
                       activePopup.color_theme === 'warning' ? 'text-amber-500' :
                       activePopup.color_theme === 'success' ? 'text-emerald-500' :
                       activePopup.color_theme === 'secondary' ? 'text-slate-500' :
                       activePopup.color_theme === 'dark' ? 'text-gray-900' :
                       'text-primary';

    switch (activePopup.type) {
      case 'warning': return <AlertTriangle className={`h-8 w-8 ${colorClass}`} />;
      case 'error': return <AlertCircle className={`h-8 w-8 ${colorClass}`} />;
      case 'success': return <CheckCircle className={`h-8 w-8 ${colorClass}`} />;
      case 'promotional': return <Sparkles className={`h-8 w-8 ${colorClass}`} />;
      case 'maintenance': return <Wrench className={`h-8 w-8 ${colorClass}`} />;
      case 'update': return <RefreshCw className={`h-8 w-8 ${colorClass}`} />;
      case 'gift': return <Gift className={`h-8 w-8 ${colorClass}`} />;
      case 'alert': return <Bell className={`h-8 w-8 ${colorClass}`} />;
      case 'news': return <Newspaper className={`h-8 w-8 ${colorClass}`} />;
      default: return <Info className={`h-8 w-8 ${colorClass}`} />;
    }
  };

  const getGradient = () => {
    switch (activePopup.color_theme) {
      case 'secondary': return 'from-slate-600 to-slate-500';
      case 'danger': return 'from-red-600 to-red-500';
      case 'warning': return 'from-amber-500 to-amber-400';
      case 'success': return 'from-emerald-600 to-emerald-500';
      case 'dark': return 'from-gray-900 to-gray-800';
      default: return 'from-primary to-primary/80'; // Logo colors
    }
  };

  // ------------------------------------
  // TEMPLATES
  // ------------------------------------

  const renderDefault = () => (
    <DialogContent className="sm:max-w-[425px] overflow-hidden p-0 border-0 shadow-2xl rounded-2xl bg-white dark:bg-slate-900 [&>button]:hidden">
      <div className={`h-24 w-full bg-gradient-to-r ${getGradient()} relative flex items-center justify-center`}>
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-lg mt-12">
          {getIcon()}
        </div>
        
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-1.5 backdrop-blur-md transition-colors z-20"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      <div className="p-6 pt-10 text-center space-y-4">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white text-center">
            {activePopup.title}
          </DialogTitle>
        </DialogHeader>
        <div className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap text-sm leading-relaxed max-h-[40vh] overflow-y-auto custom-scrollbar px-2">
          {activePopup.content}
        </div>
        <div className="pt-4 pb-2">
          <Button 
            onClick={handleDismiss}
            className={`w-full rounded-xl font-bold text-white shadow-lg bg-gradient-to-r ${getGradient()} hover:opacity-90 transition-all active:scale-95`}
          >
            Compris
          </Button>
        </div>
      </div>
    </DialogContent>
  );

  const renderModern = () => (
    <DialogContent className="sm:max-w-[450px] p-6 border-0 shadow-2xl rounded-3xl bg-white dark:bg-slate-900 overflow-hidden [&>button]:hidden">
      <div className="absolute top-0 right-0 p-4">
        <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors bg-gray-100 dark:bg-slate-800 rounded-full p-1">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex flex-col items-center text-center mt-4">
        <div className={`p-4 rounded-3xl bg-gradient-to-br ${getGradient()} shadow-lg shadow-${activePopup.type === 'error' ? 'red' : 'blue'}-500/20 mb-6 transform hover:rotate-12 transition-transform duration-500`}>
          <div className="bg-white dark:bg-slate-800 p-2 rounded-xl">
            {getIcon()}
          </div>
        </div>
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {activePopup.title}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 text-gray-500 dark:text-gray-400 whitespace-pre-wrap text-[15px] leading-relaxed max-h-[35vh] overflow-y-auto w-full custom-scrollbar">
          {activePopup.content}
        </div>
        <div className="w-full mt-8">
          <Button onClick={handleDismiss} className={`w-full py-6 rounded-2xl font-bold text-lg text-white bg-gradient-to-r ${getGradient()} hover:opacity-90 transition-all hover:shadow-xl hover:-translate-y-1`}>
            D'accord, c'est noté
          </Button>
        </div>
      </div>
    </DialogContent>
  );

  const renderGlassmorphism = () => (
    <DialogContent className="sm:max-w-[400px] p-0 border border-white/20 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] rounded-[2rem] bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl overflow-hidden [&>button]:hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${getGradient()} opacity-10`}></div>
      <div className="relative p-8">
        <button onClick={handleDismiss} className="absolute top-6 right-6 text-gray-500 hover:text-gray-900 transition-colors">
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-start gap-4 mb-6">
          <div className={`p-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-white/40 shadow-sm`}>
            {getIcon()}
          </div>
        </div>
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
            {activePopup.title}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-3 text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm leading-relaxed max-h-[35vh] overflow-y-auto custom-scrollbar">
          {activePopup.content}
        </div>
        <div className="mt-8">
          <Button onClick={handleDismiss} className={`w-full rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/50 text-gray-900 dark:text-white shadow-sm hover:bg-white dark:hover:bg-slate-800 font-semibold py-6 transition-all`}>
            Continuer
          </Button>
        </div>
      </div>
    </DialogContent>
  );

  const renderNeon = () => (
    <DialogContent className="sm:max-w-[425px] p-1 border-0 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] rounded-2xl bg-gray-900 overflow-hidden [&>button]:hidden">
      <div className={`absolute inset-0 bg-gradient-to-r ${getGradient()} opacity-50`}></div>
      <div className="relative bg-gray-950 p-8 rounded-[15px] h-full flex flex-col items-center text-center border border-gray-800">
        <button onClick={handleDismiss} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors bg-gray-900 rounded-full p-1">
          <X className="h-5 w-5" />
        </button>
        <div className={`p-1 rounded-full bg-gradient-to-r ${getGradient()} mb-6 animate-pulse`}>
          <div className="bg-gray-950 p-3 rounded-full">
            {getIcon()}
          </div>
        </div>
        <DialogHeader>
          <DialogTitle className={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r ${getGradient()} uppercase tracking-wider`}>
            {activePopup.title}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 text-gray-400 whitespace-pre-wrap text-sm leading-relaxed max-h-[35vh] overflow-y-auto w-full custom-scrollbar">
          {activePopup.content}
        </div>
        <div className="w-full mt-8">
          <Button onClick={handleDismiss} className={`w-full py-6 rounded-xl font-bold text-white bg-gray-900 border border-gray-800 hover:bg-gray-800 hover:border-gray-700 transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)]`}>
            Fermer
          </Button>
        </div>
      </div>
    </DialogContent>
  );

  const renderElegant = () => (
    <DialogContent className="sm:max-w-[500px] p-10 border border-gray-200 dark:border-gray-800 shadow-xl rounded-none bg-[#FAFAFA] dark:bg-[#111] [&>button]:hidden">
      <button onClick={handleDismiss} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors">
        <X className="h-6 w-6" />
      </button>
      <div className="flex flex-col items-center text-center">
        <div className="mb-6 opacity-80">
          {getIcon()}
        </div>
        <div className="w-12 h-px bg-gray-300 dark:bg-gray-700 mb-6"></div>
        <DialogHeader>
          <DialogTitle className="text-3xl font-serif text-gray-900 dark:text-gray-100 font-light tracking-wide">
            {activePopup.title}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-6 text-gray-500 dark:text-gray-400 whitespace-pre-wrap text-sm leading-loose max-h-[35vh] overflow-y-auto w-full custom-scrollbar font-serif">
          {activePopup.content}
        </div>
        <div className="w-full mt-10 flex justify-center">
          <Button onClick={handleDismiss} className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-6 uppercase tracking-widest text-xs font-semibold shadow-md">
            Continuer
          </Button>
        </div>
      </div>
    </DialogContent>
  );

  const renderPlayful = () => (
    <DialogContent className="sm:max-w-[400px] p-8 border-0 shadow-2xl rounded-[2.5rem] bg-white dark:bg-slate-900 overflow-hidden [&>button]:hidden">
      <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${getGradient()} opacity-20 rounded-full blur-2xl animate-pulse`}></div>
      <div className={`absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr ${getGradient()} opacity-20 rounded-full blur-2xl animate-pulse delay-700`}></div>
      
      <button onClick={handleDismiss} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors z-20">
        <X className="h-6 w-6" />
      </button>

      <div className="flex flex-col items-center text-center relative z-10">
        <div className={`mb-6 p-4 rounded-full bg-white dark:bg-slate-800 shadow-xl animate-bounce border border-gray-100 dark:border-gray-800`}>
          {getIcon()}
        </div>
        <DialogHeader>
          <DialogTitle className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
            {activePopup.title}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2 text-gray-600 dark:text-gray-300 whitespace-pre-wrap text-base leading-relaxed max-h-[35vh] overflow-y-auto w-full custom-scrollbar font-medium">
          {activePopup.content}
        </div>
        <div className="w-full mt-8">
          <Button onClick={handleDismiss} className={`w-full rounded-full py-6 text-lg font-bold text-white bg-gradient-to-r ${getGradient()} shadow-lg transform transition-transform hover:scale-105 hover:shadow-xl active:scale-95`}>
            Génial !
          </Button>
        </div>
      </div>
    </DialogContent>
  );

  const renderBrutalism = () => (
    <DialogContent className="sm:max-w-[450px] p-6 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] rounded-none bg-[#f4f4f0] dark:bg-gray-800 dark:border-gray-900 dark:shadow-[8px_8px_0px_rgba(0,0,0,0.5)] [&>button]:hidden">
      <button onClick={handleDismiss} className="absolute top-4 right-4 text-black dark:text-white hover:text-primary transition-colors z-20 font-black">
        <X className="h-6 w-6 stroke-[3]" />
      </button>

      <div className="flex items-start gap-5 mt-2">
        <div className={`p-4 bg-white dark:bg-gray-700 border-2 border-black dark:border-gray-900 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]`}>
          {getIcon()}
        </div>
        <div className="flex-1 text-left">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter mb-2">
              {activePopup.title}
            </DialogTitle>
          </DialogHeader>
          <div className="text-black/80 dark:text-gray-300 whitespace-pre-wrap text-base leading-relaxed max-h-[35vh] overflow-y-auto w-full custom-scrollbar font-mono font-medium">
            {activePopup.content}
          </div>
        </div>
      </div>
      <div className="w-full mt-8">
        <Button onClick={handleDismiss} className={`w-full py-6 text-lg font-black text-white bg-black dark:bg-gray-900 border-2 border-black dark:border-gray-950 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-y-1 hover:shadow-[0px_0px_0px_rgba(0,0,0,0.5)] transition-all rounded-none uppercase tracking-widest`}>
          OK J'AI COMPRIS
        </Button>
      </div>
    </DialogContent>
  );

  const renderTemplate = () => {
    switch (activePopup.design_template) {
      case 'modern': return renderModern();
      case 'glassmorphism': return renderGlassmorphism();
      case 'neon': return renderNeon();
      case 'elegant': return renderElegant();
      case 'playful': return renderPlayful();
      case 'brutalism': return renderBrutalism();
      default: return renderDefault();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDismiss() }}>
      {renderTemplate()}
    </Dialog>
  );
}
