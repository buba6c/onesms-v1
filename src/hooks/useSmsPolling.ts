/**
 * Hook pour vérifier automatiquement les SMS reçus sur les activations en attente
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';

interface ActiveNumber {
  id: string;
  orderId: string;
  activationId: string;
  phone: string;
  service: string;
  country: string;
  timeRemaining: number;
  status: 'pending' | 'waiting' | 'received' | 'timeout' | 'cancelled';
  smsCode?: string;
  smsText?: string;
  price: number;
  charged: boolean;
}

interface UseSmsPollingOptions {
  activeNumbers: ActiveNumber[];
  userId: string | undefined;
  onUpdate: (updatedNumber: ActiveNumber) => void;
  onBalanceUpdate?: () => void;
}

export function useSmsPolling({ activeNumbers, userId, onUpdate, onBalanceUpdate }: UseSmsPollingOptions) {
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

      console.log('🔄 [POLLING] Démarrage pour', num.orderId, num.phone);

      // Fonction de vérification SMS (réutilisable)
      const checkSms = async () => {
        console.log('🔍 [CHECK] Vérification SMS...', num.orderId);

        try {
          const { data: checkData, error: checkError } = await supabase.functions.invoke('check-sms-activate-status', {
            body: {
              activationId: num.activationId || num.id,
              userId: userId
            }
          });

          if (checkError) {
            console.error('❌ [CHECK] Erreur:', checkError);
            return false;
          }

          console.log('📊 [CHECK] Résultat:', checkData);

          // SMS reçu et facturé
          if (checkData.data?.status === 'received' && checkData.data?.charged) {
            console.log('✅ [CHECK] SMS reçu et facturé !');
            
            // Arrêter le polling pour ce numéro
            if (intervalsRef.current[num.orderId]) {
              clearInterval(intervalsRef.current[num.orderId]);
              delete intervalsRef.current[num.orderId];
            }
            processedOrdersRef.current.add(num.orderId);

            // Mettre à jour le numéro
            const updatedNumber: ActiveNumber = {
              ...num,
              status: 'received',
              smsCode: checkData.data.sms[0]?.code,
              smsText: checkData.data.sms[0]?.text,
              charged: true
            };

            onUpdate(updatedNumber);

            toast({
              title: '✅ SMS Reçu !',
              description: `Code: ${checkData.data.sms[0]?.code} - ${num.phone}`,
            });

            // Rafraîchir le solde
            if (onBalanceUpdate) {
              onBalanceUpdate();
            }
            
            return true;
          }

          // Timeout (fonds dégelés automatiquement)
          if (checkData.data?.status === 'timeout') {
            console.log('⏰ [CHECK] Timeout - fonds dégelés');
            
            // Arrêter le polling
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
              description: `${num.phone} - Fonds dégelés (pas de déduction).`,
              variant: 'destructive'
            });

            // Rafraîchir le solde
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
          console.log('⏰ [POLLING] Timeout sécurité pour', num.orderId);
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
      console.log('🛑 [POLLING] Arrêté pour', orderId);
    }
  };

  return { stopPolling };
}
