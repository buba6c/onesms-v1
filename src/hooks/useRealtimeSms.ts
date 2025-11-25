/**
 * Hook pour la synchronisation temps réel des SMS via Supabase Realtime
 * Écoute les changements sur la table activations en temps réel (WebSocket)
 */

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface Activation {
  id: string;
  order_id: string;
  phone: string;
  service_code: string;
  status: string;
  sms_code: string | null;
  sms_text: string | null;
  charged: boolean;
  user_id: string;
}

interface UseRealtimeSmsOptions {
  userId: string | undefined;
  onSmsReceived: (activation: Activation) => void;
  onBalanceUpdate?: () => void;
}

export function useRealtimeSms({ userId, onSmsReceived, onBalanceUpdate }: UseRealtimeSmsOptions) {
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    console.log('🔌 [REALTIME] Connexion WebSocket pour user:', userId);

    // S'abonner aux changements sur la table activations
    const channel = supabase
      .channel('sms-updates')
      .on<Activation>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'activations',
          filter: `user_id=eq.${userId}`
        },
        (payload: RealtimePostgresChangesPayload<Activation>) => {
          const newActivation = payload.new;
          const oldActivation = payload.old;

          console.log('📨 [REALTIME] Changement détecté:', {
            phone: newActivation.phone,
            oldStatus: oldActivation.status,
            newStatus: newActivation.status,
            smsCode: newActivation.sms_code
          });

          // SMS reçu !
          if (
            oldActivation.status !== 'received' &&
            newActivation.status === 'received' &&
            newActivation.sms_code
          ) {
            console.log('✅ [REALTIME] SMS reçu en temps réel!', {
              phone: newActivation.phone,
              code: newActivation.sms_code
            });

            // Notifier le parent
            onSmsReceived(newActivation);

            // Afficher notification
            toast({
              title: '✅ SMS Reçu !',
              description: `Code: ${newActivation.sms_code} - ${newActivation.phone}`,
              duration: 5000,
            });

            // Rafraîchir le solde
            if (onBalanceUpdate) {
              onBalanceUpdate();
            }
          }

          // Activation expirée/annulée
          if (
            ['timeout', 'cancelled'].includes(newActivation.status) &&
            !['timeout', 'cancelled'].includes(oldActivation.status)
          ) {
            console.log('⏰ [REALTIME] Activation expirée/annulée:', newActivation.phone);

            // Notifier le parent
            onSmsReceived(newActivation);

            // Afficher notification
            toast({
              title: newActivation.status === 'timeout' ? '⏰ Timeout' : '❌ Annulé',
              description: `${newActivation.phone} - ${newActivation.status === 'timeout' ? 'Aucun SMS reçu, fonds remboursés' : 'Activation annulée'}`,
              variant: 'destructive',
              duration: 5000,
            });

            // Rafraîchir le solde (remboursement)
            if (onBalanceUpdate) {
              onBalanceUpdate();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 [REALTIME] Status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ [REALTIME] WebSocket connecté avec succès');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [REALTIME] Erreur de connexion WebSocket');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ [REALTIME] Timeout de connexion WebSocket');
        } else if (status === 'CLOSED') {
          console.log('🔌 [REALTIME] WebSocket fermé');
        }
      });

    // Cleanup : désinscription quand le composant est démonté
    return () => {
      console.log('🔌 [REALTIME] Déconnexion WebSocket');
      supabase.removeChannel(channel);
    };
  }, [userId, onSmsReceived, onBalanceUpdate, toast]);

  return null;
}
