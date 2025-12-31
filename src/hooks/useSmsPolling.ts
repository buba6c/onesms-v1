/**
 * Hook pour vérifier automatiquement les SMS reçus sur les activations en attente
 */

import { useEffect, useRef } from 'react';
import { supabase, cloudFunctions } from '@/lib/supabase';
import { useToast } from './use-toast';

interface ActiveNumber {
  id: string;
  orderId: string;
  activationId: string;
  phone: string;
  service: string;
  country: string;
  timeRemaining: number;
  status: 'pending' | 'waiting' | 'received' | 'timeout' | 'cancelled' | 'active';
  smsCode?: string;
  smsText?: string;
  price: number;
  charged: boolean;
  type?: 'activation' | 'rental';
  provider?: 'sms-activate' | '5sim' | 'smspva' | 'onlinesim' | 'herosms'; // All providers
}

interface UseSmsPollingOptions {
  activeNumbers: ActiveNumber[];
  userId: string | undefined;
  onUpdate: (updatedNumber: ActiveNumber) => void;
  onBalanceUpdate?: () => void;
}

import { useTranslation } from 'react-i18next';

// Provider to status checker function mapping
const getStatusCheckerFunction = (provider?: string): string => {
  switch (provider?.toLowerCase()) {
    case '5sim':
      return 'check-5sim-status';
    case 'smspva':
      return 'check-smspva-status';
    case 'onlinesim':
      return 'check-onlinesim-status';
    case 'sms-activate':
    case 'herosms':
    default:
      return 'check-sms-activate-status';
  }
};

export function useSmsPolling({ activeNumbers, userId, onUpdate, onBalanceUpdate }: UseSmsPollingOptions) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const intervalsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const processedOrdersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    // Pour chaque numéro en attente, démarrer un polling
    activeNumbers.forEach((num) => {
      // Ne pas repoller les numéros déjà traités ou terminés
      if (!['waiting', 'pending'].includes(num.status) || processedOrdersRef.current.has(num.orderId)) {
        return;
      }

      // Si un intervalle existe déjà pour ce numéro, ne pas en créer un nouveau
      if (intervalsRef.current[num.orderId]) {
        return;
      }

      // console.log('🔄 [POLLING] Démarrage pour', num.orderId, num.phone);

      // Fonction de vérification SMS (réutilisable)
      const checkSms = async () => {
        // console.log('🔍 [CHECK] Vérification SMS...', num.orderId);

        try {
          // Use provider-specific status checker
          const statusCheckerFunction = getStatusCheckerFunction(num.provider);

          // 1. Vérification avec la fonction appropriée
          const { data: checkData, error: checkError } = await cloudFunctions.invoke(statusCheckerFunction, {
            body: {
              activationId: num.activationId || num.id,
              userId: userId
            }
          });

          if (checkError) {
            console.error('❌ [CHECK] Erreur:', checkError);
            // Continue pour essayer la récupération depuis l'historique
          }

          // console.log('📊 [CHECK] Résultat:', checkData);

          // SMS reçu et facturé
          if (checkData?.data?.status === 'received' && checkData.data?.charged) {
            // console.log('✅ [CHECK] SMS reçu et facturé !');

            // Arrêter le polling pour ce numéro
            if (intervalsRef.current[num.orderId]) {
              clearInterval(intervalsRef.current[num.orderId]);
              delete intervalsRef.current[num.orderId];
            }
            processedOrdersRef.current.add(num.orderId);

            // Mettre à jour le numéro
            const smsContent = checkData.data.sms && checkData.data.sms.length > 0 ? checkData.data.sms[0] : null;

            const updatedNumber: ActiveNumber = {
              ...num,
              status: 'received',
              smsCode: smsContent?.code || '------',
              smsText: smsContent?.text || t('dashboard.messageReceived'),
              charged: true
            };

            onUpdate(updatedNumber);

            // 🎵 JOUER LE SON (comme dans useRealtimeSms)
            import('@/lib/sound-manager').then(({ SoundManager }) => {
              SoundManager.play(); // Use default/saved preference
            });

            toast({
              title: '✅ SMS Reçu !',
              description: `Code: ${smsContent?.code || 'N/A'} - ${num.phone}`,
            });

            // 🔔 BROWSER NOTIFICATION
            import('@/lib/notification-manager').then(({ NotificationManager }) => {
              if (NotificationManager.getPermission() === 'granted') {
                NotificationManager.send('Nouveau SMS Reçu !', {
                  body: `Code: ${smsContent?.code || 'N/A'} pour ${num.service || 'Service'}`,
                  tag: `sms-${num.orderId}`, // Prevent duplicates
                });
              }
            });

            // Rafraîchir le solde
            if (onBalanceUpdate) {
              onBalanceUpdate();
            }

            return true;
          }

          // Timeout ou Cancelled - la récupération automatique a déjà été tentée par check-sms-activate-status
          if (checkData?.data?.status === 'timeout' || checkData?.data?.status === 'cancelled') {
            // console.log('⏰ [CHECK] Timeout/Cancelled - Aucun SMS trouvé après récupération automatique');

            if (intervalsRef.current[num.orderId]) {
              clearInterval(intervalsRef.current[num.orderId]);
              delete intervalsRef.current[num.orderId];
            }
            processedOrdersRef.current.add(num.orderId);

            const updatedNumber: ActiveNumber = {
              ...num,
              status: 'timeout',
              charged: false
            };

            onUpdate(updatedNumber);

            toast({
              title: '⏰ Timeout',
              description: `${num.phone} - Aucun SMS reçu, fonds remboursés.`,
              variant: 'destructive'
            });

            if (onBalanceUpdate) {
              onBalanceUpdate();
            }

            return true;
          }
        } catch (error) {
          console.error('❌ [CHECK] Exception:', error);
        }

        return false;
      };

      // 🚀 VÉRIFICATION IMMÉDIATE au démarrage (détection instantanée)
      checkSms();

      // Stratégie de polling intelligent:
      // - 5 premières minutes: vérifier toutes les 3 secondes (période critique)
      // - 5-15 minutes: vérifier toutes les 10 secondes
      // - 15-20 minutes: vérifier toutes les 30 secondes
      let checkCount = 0;
      const getInterval = () => {
        const minutes = checkCount * 3 / 60; // 3s par check
        if (minutes < 5) return 3000; // 3 secondes
        if (minutes < 15) return 10000; // 10 secondes
        return 30000; // 30 secondes
      };

      // Fonction récursive pour polling intelligent
      const scheduleNextCheck = () => {
        const nextInterval = getInterval();
        intervalsRef.current[num.orderId] = setTimeout(async () => {
          checkCount++;
          const done = await checkSms();
          if (!done && checkCount < 400) { // Max 400 checks (20 min)
            scheduleNextCheck();
          } else {
            // Cleanup après fin du polling
            delete intervalsRef.current[num.orderId];
          }
        }, nextInterval);
      };

      scheduleNextCheck();

      // Arrêter après 25 minutes (sécurité)
      setTimeout(() => {
        if (intervalsRef.current[num.orderId]) {
          clearTimeout(intervalsRef.current[num.orderId]);
          delete intervalsRef.current[num.orderId];
          // console.log('⏰ [POLLING] Timeout sécurité pour', num.orderId);
        }
      }, 25 * 60 * 1000);
    });

    // Cleanup : arrêter tous les timeouts quand le composant est démonté
    return () => {
      Object.values(intervalsRef.current).forEach(clearTimeout);
      intervalsRef.current = {};
    };
  }, [activeNumbers, userId, onUpdate, onBalanceUpdate, toast]);

  // Fonction pour arrêter manuellement le polling d'un numéro
  const stopPolling = (orderId: string) => {
    if (intervalsRef.current[orderId]) {
      clearTimeout(intervalsRef.current[orderId]);
      delete intervalsRef.current[orderId];
      processedOrdersRef.current.add(orderId);
      // console.log('🛑 [POLLING] Arrêté pour', orderId);
    }
  };

  return { stopPolling };
}
