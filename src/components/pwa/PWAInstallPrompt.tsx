import React, { useState, useEffect, useCallback } from 'react';
import { Download, X, Share } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Define the BeforeInstallPromptEvent interface
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const INSTALLED_KEY = 'pwa_installed';
const DISMISSED_KEY = 'pwa_prompt_dismissed';
const DISMISSED_IOS_KEY = 'pwa_ios_prompt_dismissed';
const DISMISS_COOLDOWN_DAYS = 7; // Re-show prompt after 7 days

/**
 * Check if the app is ACTUALLY running in standalone (installed) mode right now.
 * Does NOT check localStorage — only real runtime signals.
 */
function isActuallyStandalone(): boolean {
  // Check display-mode: standalone (Chromium, Firefox)
  if (window.matchMedia('(display-mode: standalone)').matches) return true;

  // Check iOS standalone (Safari)
  if ((window.navigator as any).standalone === true) return true;

  // Check Android TWA
  if (document.referrer.includes('android-app://')) return true;

  return false;
}

/**
 * Check if a dismiss key has expired (older than DISMISS_COOLDOWN_DAYS)
 */
function isDismissExpired(key: string): boolean {
  const value = localStorage.getItem(key);
  if (!value) return true; // never dismissed
  
  // Legacy: old code stored 'true' — treat as expired so prompt re-shows
  if (value === 'true') return true;
  
  const dismissedAt = parseInt(value, 10);
  if (isNaN(dismissedAt)) return true;
  
  const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return daysSince >= DISMISS_COOLDOWN_DAYS;
}

export function PWAInstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Mark app as installed — hides prompt forever
  const markAsInstalled = useCallback(() => {
    localStorage.setItem(INSTALLED_KEY, 'true');
    localStorage.removeItem(DISMISSED_KEY);
    localStorage.removeItem(DISMISSED_IOS_KEY);
    setShowPrompt(false);
    setDeferredPrompt(null);
  }, []);

  useEffect(() => {
    // ─── 1. Actually running as installed app? Mark & exit ───
    if (isActuallyStandalone()) {
      markAsInstalled();
      return;
    }

    // ─── 1b. Clear stale "installed" flag if NOT actually standalone ───
    // This fixes the case where the user uninstalled or is visiting in browser
    if (localStorage.getItem(INSTALLED_KEY) === 'true') {
      localStorage.removeItem(INSTALLED_KEY);
    }

    // ─── 2. Listen for the "appinstalled" event (fires after successful install) ───
    const handleAppInstalled = () => {
      console.log('✅ PWA installed successfully');
      markAsInstalled();
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // ─── 3. Listen for display-mode change (catches install in real-time) ───
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        markAsInstalled();
      }
    };
    standaloneQuery.addEventListener('change', handleDisplayModeChange);

    // ─── 4. Detect platform ───
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // ─── 5. Should we show the prompt? Check time-based dismiss ───
    const dismissedKey = isIosDevice ? DISMISSED_IOS_KEY : DISMISSED_KEY;
    const canShow = isDismissExpired(dismissedKey);

    // For iOS, we can show instructions after a delay since there's no native prompt event
    let timer: NodeJS.Timeout;
    if (isIosDevice && canShow) {
      timer = setTimeout(() => setShowPrompt(true), 3000);
    }

    // ─── 6. Capture the beforeinstallprompt event (Chromium only) ───
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      if (canShow) {
        // Show after a short delay once we know it's installable
        timer = setTimeout(() => setShowPrompt(true), 1000);
      }
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      standaloneQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, [markAsInstalled]);

  // ─── Handle "Installer" button click ───
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Trigger native Chrome/Edge/Brave install dialog
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        markAsInstalled();
      } else {
        // User dismissed native dialog → just hide our banner
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else {
      // No native prompt (dev mode, or non-Chromium browser)
      // On some environments, we might want to alert the user
      alert(t('common.browserNotSupportedPwa', 'Veuillez installer depuis le menu de votre navigateur (Ajouter à l\'écran d\'accueil).'));
      setShowPrompt(false);
    }
  };

  // ─── Handle "X" dismiss ───
  const handleDismiss = () => {
    setShowPrompt(false);
    const dismissedKey = isIOS ? DISMISSED_IOS_KEY : DISMISSED_KEY;
    localStorage.setItem(dismissedKey, Date.now().toString());
  };

  // Don't render if nothing to show
  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 p-4 rounded-2xl shadow-2xl shadow-blue-900/20">
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-start gap-4">
          <img 
            src="/icons/icon-192x192.png" 
            alt="OneSMS" 
            className="w-16 h-16 rounded-2xl flex-shrink-0 shadow-lg border border-white/10 object-cover"
          />
          
          <div className="flex-1 pt-1">
            <h3 className="text-white font-bold text-sm mb-1">
              Installer l'application OneSMS
            </h3>
            
            {isIOS ? (
              <p className="text-slate-300 text-xs leading-relaxed mb-3">
                Installez notre application sur votre iPhone pour un accès plus rapide. 
                Appuyez sur <span className="bg-white/10 px-1.5 py-0.5 rounded text-white inline-flex items-center gap-1"><Share className="w-3 h-3" />Partager</span> puis sur <span className="font-semibold text-white">Sur l'écran d'accueil</span>.
              </p>
            ) : (
              <>
                <p className="text-slate-300 text-xs leading-relaxed mb-3">
                  Installez OneSMS sur votre appareil pour une expérience plus rapide et des notifications en temps réel.
                </p>
                <button 
                  onClick={handleInstallClick}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Installer maintenant
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
