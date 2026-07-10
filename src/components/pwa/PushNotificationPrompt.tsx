import React, { useState, useEffect } from 'react';
import { Bell, BellRing, X } from 'lucide-react';

export function PushNotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Only run in browser
    if (!('Notification' in window)) {
      return;
    }

    setPermission(Notification.permission);

    // If notifications are not determined yet, and we haven't asked recently
    if (Notification.permission === 'default') {
      const hasDismissed = localStorage.getItem('push_prompt_dismissed');
      // Wait a bit before showing to not overwhelm the user
      if (!hasDismissed) {
        setTimeout(() => setShowPrompt(true), 5000);
      }
    }
  }, []);

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);
      
      if (result === 'granted') {
        // Here you would typically get a service worker registration and push manager subscription
        // For example:
        // const registration = await navigator.serviceWorker.ready;
        // const subscription = await registration.pushManager.subscribe({ ... })
        // Then send subscription to your server
        console.log('Notification permission granted.');
        
        // Example test notification
        new Notification('Bienvenue sur OneSMS !', {
          body: 'Vous recevrez vos alertes SMS ici.',
          icon: '/icons/icon-192x192.png'
        });
      } else {
        localStorage.setItem('push_prompt_dismissed', 'true');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('push_prompt_dismissed', 'true');
  };

  if (!showPrompt || permission !== 'default') return null;

  return (
    <div className="fixed top-20 md:top-24 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 animate-in slide-in-from-top-5 fade-in duration-500">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-blue-500/30 p-4 rounded-2xl shadow-2xl shadow-blue-900/30">
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-3 text-blue-400 relative">
            <BellRing className="w-6 h-6 animate-pulse" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900"></div>
          </div>
          
          <h3 className="text-white font-bold text-sm mb-1">
            Activer les notifications
          </h3>
          <p className="text-slate-300 text-xs leading-relaxed mb-4">
            Ne manquez jamais un SMS ! Soyez notifié instantanément lorsque vous recevez un code de vérification.
          </p>
          
          <div className="flex w-full gap-2">
            <button 
              onClick={handleDismiss}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
            >
              Plus tard
            </button>
            <button 
              onClick={requestPermission}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <Bell className="w-3 h-3" />
              Activer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
