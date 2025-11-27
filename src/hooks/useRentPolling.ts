import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface RentalPollingOptions {
  enabled: boolean;
  rentalIds: string[];
  onUpdate?: () => void;
  intervalMs?: number;
}

/**
 * Hook pour polling automatique des messages de location
 * Vérifie les nouveaux messages toutes les 5 secondes pour les locations actives
 */
export function useRentPolling({
  enabled,
  rentalIds,
  onUpdate,
  intervalMs = 5000
}: RentalPollingOptions) {
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Ne pas démarrer si désactivé ou pas de rentals
    if (!enabled || rentalIds.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
      return;
    }

    // Fonction de polling
    const checkRentalMessages = async () => {
      try {
        // Vérifier chaque rental
        for (const rentalId of rentalIds) {
          const { data, error } = await supabase.functions.invoke('get-rent-status', {
            body: { rentId: rentalId }
          });

          if (error || !data?.success) {
            console.error(`Erreur polling rental ${rentalId}:`, error || data?.error);
            continue;
          }

          const messages = data.messages || [];
          
          // Mettre à jour le nombre de messages dans la DB si changé
          if (messages.length > 0) {
            // Query by order_id (number), rent_id, or rental_id
            const { data: currentRental } = await supabase
              .from('rentals')
              .select('message_count, sms_count, id')
              .or(`order_id.eq.${rentalId},rent_id.eq.${rentalId},rental_id.eq.${rentalId}`)
              .single();

            const currentCount = (currentRental as any)?.message_count || (currentRental as any)?.sms_count || 0;
            
            if (messages.length !== currentCount && currentRental) {
              await supabase
                .from('rentals')
                .update({ 
                  message_count: messages.length,
                  sms_count: messages.length, // Support both column names
                  updated_at: new Date().toISOString()
                })
                .eq('id', (currentRental as any).id);

              // Notifier le parent
              if (onUpdate) {
                onUpdate();
              }
            }
          }
        }
      } catch (err) {
        console.error('Erreur dans le polling des rentals:', err);
      }
    };

    // Exécuter immédiatement au démarrage
    checkRentalMessages();

    // Puis toutes les X secondes
    intervalRef.current = setInterval(checkRentalMessages, intervalMs);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, [enabled, rentalIds.join(','), onUpdate, intervalMs]);

  // Fonction pour forcer un refresh
  const forceRefresh = async () => {
    if (rentalIds.length === 0) return;

    try {
      for (const rentalId of rentalIds) {
        const { data, error } = await supabase.functions.invoke('get-rent-status', {
          body: { rentId: rentalId }
        });

        if (error || !data?.success) continue;

        const messages = data.messages || [];
        
        if (messages.length > 0) {
          // Find the rental first to get its UUID
          const { data: currentRental } = await supabase
            .from('rentals')
            .select('id')
            .or(`order_id.eq.${rentalId},rent_id.eq.${rentalId},rental_id.eq.${rentalId}`)
            .single();
          
          if (currentRental) {
            await supabase
              .from('rentals')
              .update({ 
                message_count: messages.length,
                sms_count: messages.length,
                updated_at: new Date().toISOString()
              })
              .eq('id', (currentRental as any).id);
          }
        }
      }
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error('Erreur force refresh rentals:', err);
    }
  };

  return { forceRefresh };
}
