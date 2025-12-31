import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, cloudFunctions } from '@/lib/supabase';

// Type pour un message de rent
export interface RentMessage {
  phoneFrom: string;
  text: string;
  service: string;
  date: string;
  type?: string;
  accepted?: string;
}

// Cache des messages par rentalId
export type RentMessagesCache = Record<string, RentMessage[]>;

interface RentalPollingOptions {
  enabled: boolean;
  rentalIds: string[];
  onUpdate?: () => void;
  onMessagesUpdate?: (messages: RentMessagesCache) => void;
  intervalMs?: number;
}

// Track errors to avoid console spam
const errorCounts: Record<string, number> = {};
const MAX_ERROR_LOGS = 3;

/**
 * Hook pour polling automatique des messages de location
 * Vérifie les nouveaux messages toutes les 5 secondes pour les locations actives
 */
export function useRentPolling({
  enabled,
  rentalIds,
  onUpdate,
  onMessagesUpdate,
  intervalMs = 5000
}: RentalPollingOptions) {
  const intervalRef = useRef<NodeJS.Timeout>();
  const userIdRef = useRef<string | null>(null);
  const [messagesCache, setMessagesCache] = useState<RentMessagesCache>({});

  // Get user ID on mount (use getSession to avoid network call)
  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      userIdRef.current = session?.user?.id || null;
    };
    getUserId();
  }, []);

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
        // Get current user ID if not cached (use getSession - local read, no network)
        if (!userIdRef.current) {
          const { data: { session } } = await supabase.auth.getSession();
          userIdRef.current = session?.user?.id || null;
          
          // Si pas de session, ne pas faire de polling
          if (!userIdRef.current) {
            console.log('[RENT_POLLING] No session, skipping poll');
            return;
          }
        }

        // Vérifier chaque rental et collecter les messages
        const newMessagesCache: RentMessagesCache = { ...messagesCache };
        let hasNewMessages = false;

        for (const rentalId of rentalIds) {
          const { data, error } = await cloudFunctions.invoke('get-rent-status', {
            body: { rentId: rentalId, userId: userIdRef.current }
          });

          // Handle network errors
          if (error) {
            const errorKey = `rental-${rentalId}`;
            errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1;
            
            if (errorCounts[errorKey] <= MAX_ERROR_LOGS) {
              console.warn(`⚠️ Polling rental ${rentalId} (${errorCounts[errorKey]}/${MAX_ERROR_LOGS}):`, 
                error?.message || 'Failed to send a request to the Edge Function');
            }
            continue;
          }

          // Check if rental is finished or cancelled - stop polling
          if (data?.finished || data?.cancelled) {
            // console.log(`✅ Rental ${rentalId} ${data.finished ? 'finished' : 'cancelled'} - removing from poll`);
            // Notify parent to refresh
            if (onUpdate) {
              onUpdate();
            }
            continue;
          }

          if (!data?.success) {
            // Limit error logging to avoid spam
            const errorKey = `rental-${rentalId}`;
            errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1;
            
            if (errorCounts[errorKey] <= MAX_ERROR_LOGS) {
              console.warn(`⚠️ Polling rental ${rentalId} (${errorCounts[errorKey]}/${MAX_ERROR_LOGS}):`, 
                data?.error || 'Unknown error');
            } else if (errorCounts[errorKey] === MAX_ERROR_LOGS + 1) {
              console.warn(`⚠️ Polling rental ${rentalId}: Suppressing further errors...`);
            }
            continue;
          }
          
          // Reset error count on success
          const errorKey = `rental-${rentalId}`;
          if (errorCounts[errorKey]) {
            errorCounts[errorKey] = 0;
          }

          const messages: RentMessage[] = data.messages || [];
          
          // Stocker les messages dans le cache
          if (messages.length > 0) {
            const previousCount = newMessagesCache[rentalId]?.length || 0;
            newMessagesCache[rentalId] = messages;
            
            if (messages.length > previousCount) {
              hasNewMessages = true;
              // New messages notification (silent)
            }
          }
        }

        // Mettre à jour le cache si des changements
        if (Object.keys(newMessagesCache).length > 0) {
          setMessagesCache(newMessagesCache);
          if (onMessagesUpdate) {
            onMessagesUpdate(newMessagesCache);
          }
        }

        // Notifier le parent pour rafraîchir l'UI si nouveaux messages
        if (hasNewMessages && onUpdate) {
          onUpdate();
        }
      } catch (err) {
        // Silent error handling for polling
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
      // Get current user ID if not cached
      if (!userIdRef.current) {
        const { data: { user } } = await supabase.auth.getUser();
        userIdRef.current = user?.id || null;
      }

      for (const rentalId of rentalIds) {
        const { data, error } = await cloudFunctions.invoke('get-rent-status', {
          body: { rentId: rentalId, userId: userIdRef.current }
        });

        if (error || !data?.success) continue;

        const messages = data.messages || [];
        
        // Messages loaded silently
      }
      
      // L'edge function met à jour la DB, on notifie juste le parent
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      // Silent error handling
    }
  };

  // Fonction pour récupérer les messages d'un rental spécifique
  const getMessages = useCallback((rentalId: string): RentMessage[] => {
    return messagesCache[rentalId] || [];
  }, [messagesCache]);

  return { forceRefresh, messagesCache, getMessages };
}
