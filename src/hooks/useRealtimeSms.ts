/**
 * Hook pour la synchronisation temps réel des SMS via Supabase Realtime
 * Écoute les changements sur la table activations en temps réel (WebSocket)
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';
import { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js';

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

  // Use refs to avoid re-subscribing when callbacks change
  const onSmsReceivedRef = useRef(onSmsReceived);
  const onBalanceUpdateRef = useRef(onBalanceUpdate);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Update refs when callbacks change (doesn't trigger re-render)
  useEffect(() => {
    onSmsReceivedRef.current = onSmsReceived;
  }, [onSmsReceived]);

  useEffect(() => {
    onBalanceUpdateRef.current = onBalanceUpdate;
  }, [onBalanceUpdate]);

  // Ref for sound preference (fetched from admin settings)
  const soundPreferenceRef = useRef<string>('coin');

  // Fetch global sound setting on mount
  useEffect(() => {
    const fetchSoundSetting = async () => {
      const { data } = await (supabase as any).rpc('get_setting', { setting_key: 'app_notification_sound' });
      if (data) {
        soundPreferenceRef.current = data;
      }
    };
    fetchSoundSetting();
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Don't create a new channel if one already exists
    if (channelRef.current) {
      return;
    }

    // WebSocket connection for realtime SMS updates
    // console.log('🔌 [REALTIME] Connexion WebSocket pour user:', userId);

    // S'abonner aux changements sur la table activations
    const channel = supabase
      .channel(`sms-updates-${userId}`) // Unique channel name per user
      .on<Activation>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'activations',
          filter: `user_id=eq.${userId}`
        },
        (payload: RealtimePostgresChangesPayload<Activation>) => {
          const newActivation = payload.new as Activation;
          const oldActivation = payload.old as Partial<Activation>;

          // Guard: vérifier que les données sont valides
          if (!newActivation || !newActivation.phone) {
            console.warn('⚠️ [REALTIME] Données invalides reçues');
            return;
          }

          // Change detected - check if SMS received
          // console.log('📨 [REALTIME] Changement détecté:', ...);

          // SMS reçu !
          if (
            oldActivation?.status !== 'received' &&
            newActivation.status === 'received' &&
            newActivation.sms_code
          ) {
            // SMS received in realtime

            // Notifier le parent via ref
            onSmsReceivedRef.current(newActivation);

            // 🎵 JOUER LE SON
            import('@/lib/sound-manager').then(({ SoundManager }) => {
              SoundManager.play(soundPreferenceRef.current as any);
            });

            // 🔔 BROWSER NOTIFICATION
            import('@/lib/notification-manager').then(({ NotificationManager }) => {
              if (NotificationManager.getPermission() === 'granted') {
                NotificationManager.send('Nouveau SMS Reçu !', {
                  body: `Code: ${newActivation.sms_code} de ${newActivation.service_code || 'Service'}`,
                  tag: `sms-${newActivation.id}`, // Prevent duplicates
                });
              }
            });

            // Afficher notification
            toast({
              title: '✅ SMS Reçu !',
              description: `Code: ${newActivation.sms_code} - ${newActivation.phone}`,
              duration: 5000,
            });

            // Rafraîchir le solde
            if (onBalanceUpdateRef.current) {
              onBalanceUpdateRef.current();
            }
          }

          // Activation expirée (timeout seulement - cancelled est géré par l'action utilisateur)
          // Ne pas afficher de toast pour 'cancelled' car cancelActivation() le fait déjà
          if (
            newActivation.status === 'timeout' &&
            oldActivation?.status !== 'timeout'
          ) {
            // Activation expired (timeout)

            // Notifier le parent via ref
            onSmsReceivedRef.current(newActivation);

            // Afficher notification pour timeout seulement
            toast({
              title: '⏰ Activation expirée',
              description: `${newActivation.phone} - Aucun SMS reçu, fonds remboursés`,
              variant: 'destructive',
              duration: 5000,
            });

            // Rafraîchir le solde (remboursement)
            if (onBalanceUpdateRef.current) {
              onBalanceUpdateRef.current();
            }
          }

          // Pour cancelled, juste rafraîchir sans toast (toast déjà affiché par l'action)
          if (
            newActivation.status === 'cancelled' &&
            oldActivation?.status !== 'cancelled'
          ) {
            onSmsReceivedRef.current(newActivation);
            if (onBalanceUpdateRef.current) {
              onBalanceUpdateRef.current();
            }
          }
        }
      )
      .subscribe((status, err) => {
        // Handle connection status - silencieux en production
        if (status === 'SUBSCRIBED') {
          // Successfully connected - silent
        } else if (status === 'CHANNEL_ERROR' && import.meta.env.DEV) {
          console.warn('⚠️ [REALTIME-SMS]:', err?.message || 'WebSocket error');
        }
        // Auto-reconnect géré par Supabase
      });

    channelRef.current = channel;

    // Cleanup : désinscription quand le composant est démonté
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, toast]); // Only userId and toast (stable) as dependencies

  return null;
}
