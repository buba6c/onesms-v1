/**
 * Hook générique pour la synchronisation temps réel via Supabase Realtime
 * Écoute les changements sur n'importe quelle table en temps réel (WebSocket)
 * 
 * Usage:
 * const { invalidate } = useRealtimeSubscription({
 *   table: 'activations',
 *   filter: `user_id=eq.${userId}`,
 *   queryKeys: [['activations-history', userId]],
 *   onInsert: (payload) => console.log('New record:', payload.new),
 *   onUpdate: (payload) => console.log('Updated:', payload.new),
 *   onDelete: (payload) => console.log('Deleted:', payload.old),
 * });
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js';

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeSubscriptionOptions<T = any> {
  /** Table name to subscribe to */
  table: string;
  /** Optional filter (e.g., `user_id=eq.${userId}`) */
  filter?: string;
  /** Query keys to invalidate on changes */
  queryKeys?: unknown[][];
  /** Callback for INSERT events */
  onInsert?: (payload: RealtimePostgresChangesPayload<T>) => void;
  /** Callback for UPDATE events */
  onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void;
  /** Callback for DELETE events */
  onDelete?: (payload: RealtimePostgresChangesPayload<T>) => void;
  /** Callback for any change */
  onChange?: (payload: RealtimePostgresChangesPayload<T>, event: PostgresChangeEvent) => void;
  /** Event type to listen for (default: '*' for all) */
  event?: PostgresChangeEvent;
  /** Whether the subscription is enabled */
  enabled?: boolean;
  /** Schema (default: 'public') */
  schema?: string;
}

export function useRealtimeSubscription<T = any>({
  table,
  filter,
  queryKeys = [],
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  event = '*',
  enabled = true,
  schema = 'public',
}: UseRealtimeSubscriptionOptions<T>) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  // Store callbacks in refs to avoid re-subscribing
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete, onChange });
  useEffect(() => {
    callbacksRef.current = { onInsert, onUpdate, onDelete, onChange };
  }, [onInsert, onUpdate, onDelete, onChange]);

  // Function to invalidate all related queries
  const invalidateQueries = useCallback(() => {
    queryKeys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  }, [queryClient, queryKeys]);

  useEffect(() => {
    if (!enabled) return;

    // Generate unique channel name
    const channelName = `realtime-${table}-${filter || 'all'}-${Date.now()}`;
    
    // Don't create duplicate channels
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Build subscription config
    const subscriptionConfig: any = {
      event,
      schema,
      table,
    };

    if (filter) {
      subscriptionConfig.filter = filter;
    }

    // Create channel and subscribe
    const channel = supabase
      .channel(channelName)
      .on<T>(
        'postgres_changes',
        subscriptionConfig,
        (payload: RealtimePostgresChangesPayload<T>) => {
          const eventType = payload.eventType as PostgresChangeEvent;
          
          // console.log(`📡 [REALTIME] ${table} ${eventType}:`, payload);

          // Call specific callbacks
          if (eventType === 'INSERT' && callbacksRef.current.onInsert) {
            callbacksRef.current.onInsert(payload);
          }
          if (eventType === 'UPDATE' && callbacksRef.current.onUpdate) {
            callbacksRef.current.onUpdate(payload);
          }
          if (eventType === 'DELETE' && callbacksRef.current.onDelete) {
            callbacksRef.current.onDelete(payload);
          }

          // Call generic onChange
          if (callbacksRef.current.onChange) {
            callbacksRef.current.onChange(payload, eventType);
          }

          // Invalidate queries to refresh data
          invalidateQueries();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          // Connexion réussie - silencieux
        } else if (status === 'CHANNEL_ERROR') {
          // Log uniquement en dev, pas en prod
          if (import.meta.env.DEV) {
            console.warn(`⚠️ [REALTIME] ${table}:`, err?.message || 'Channel error');
          }
        } else if (status === 'TIMED_OUT') {
          // Timeout - reconnexion auto
        }
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, filter, event, schema, enabled, invalidateQueries]);

  return {
    invalidate: invalidateQueries,
  };
}

/**
 * Hook spécialisé pour les activations d'un utilisateur
 */
export function useRealtimeActivations(userId: string | undefined, options?: {
  onSmsReceived?: (activation: any) => void;
  onStatusChange?: (activation: any, oldStatus: string) => void;
}) {
  const queryClient = useQueryClient();
  
  return useRealtimeSubscription({
    table: 'activations',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    enabled: !!userId,
    queryKeys: [
      ['activations-history', userId],
      ['active-numbers', userId],
      ['user-balance', userId],
    ],
    onUpdate: (payload) => {
      const newData = payload.new as any;
      const oldData = payload.old as any;
      
      // SMS reçu
      if (oldData?.status !== 'received' && newData?.status === 'received' && newData?.sms_code) {
        options?.onSmsReceived?.(newData);
        // Invalidate balance queries
        queryClient.invalidateQueries({ queryKey: ['user-balance'] });
        queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      }
      
      // Status changed
      if (oldData?.status !== newData?.status) {
        options?.onStatusChange?.(newData, oldData?.status);
      }
    },
  });
}

/**
 * Hook spécialisé pour les rentals d'un utilisateur
 */
export function useRealtimeRentals(userId: string | undefined) {
  return useRealtimeSubscription({
    table: 'rentals',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    enabled: !!userId,
    queryKeys: [
      ['rentals-history', userId],
      ['active-rentals', userId],
    ],
  });
}

/**
 * Hook spécialisé pour les transactions d'un utilisateur
 */
export function useRealtimeTransactions(userId: string | undefined) {
  return useRealtimeSubscription({
    table: 'transactions',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    enabled: !!userId,
    queryKeys: [
      ['payments-history', userId],
      ['transactions', userId],
      ['user-balance', userId],
    ],
  });
}

/**
 * Hook pour l'admin - écoute toutes les activations
 */
export function useRealtimeAdminActivations() {
  return useRealtimeSubscription({
    table: 'activations',
    queryKeys: [
      ['admin-activations'],
      ['admin-activations-stats'],
    ],
  });
}

/**
 * Hook pour l'admin - écoute tous les utilisateurs
 */
export function useRealtimeAdminUsers() {
  return useRealtimeSubscription({
    table: 'users',
    queryKeys: [
      ['admin-users'],
      ['admin-stats'],
    ],
  });
}
