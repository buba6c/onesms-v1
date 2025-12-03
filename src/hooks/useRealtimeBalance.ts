/**
 * Hook pour synchroniser le solde utilisateur en temps réel
 * 
 * TERMINOLOGIE UNIFIÉE:
 * - solde = balance en DB = tout l'argent du compte (ce qui est affiché)
 * - frozen = frozen_balance en DB = montant gelé pour achats en cours
 * - disponible = solde - frozen (calculé dynamiquement, pas stocké)
 * 
 * Met à jour automatiquement quand les valeurs changent en DB
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useQueryClient } from '@tanstack/react-query';

export function useRealtimeBalance() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);
  const userIdRef = useRef<string | null>(null);
  
  // Local state pour mise à jour immédiate
  const [localBalance, setLocalBalance] = useState<number | null>(null);
  const [localFrozen, setLocalFrozen] = useState<number | null>(null);

  // Fonction pour forcer le refresh
  const refreshBalance = useCallback(async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', user.id)
      .single<{ balance: number; frozen_balance: number }>();
    
    if (data) {
      setLocalBalance(data.balance);
      setLocalFrozen(data.frozen_balance);
      // Aussi mettre à jour le store
      setUser({ ...user, balance: data.balance, frozen_balance: data.frozen_balance });
      // Et invalider la query
      queryClient.invalidateQueries({ queryKey: ['user-balance', user.id] });
    }
  }, [user?.id, setUser, queryClient]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    // Éviter de recréer le channel si même user
    if (userIdRef.current === user.id && channelRef.current) {
      return;
    }

    userIdRef.current = user.id;
    
    // console.log('🔔 [REALTIME-BALANCE] Setting up subscription for user:', user.id);

    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to changes on the users table for this specific user
    const channel = supabase
      .channel(`user-balance-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          // console.log('💰 [REALTIME-BALANCE] User updated:', payload.new);
          
          const newData = payload.new as any;
          
          // Mise à jour IMMÉDIATE du state local
          setLocalBalance(newData.balance);
          setLocalFrozen(newData.frozen_balance);
          
          // Aussi mettre à jour le store
          setUser({
            ...user,
            balance: newData.balance,
            frozen_balance: newData.frozen_balance,
          });
          
          // Invalider les queries
          queryClient.invalidateQueries({ queryKey: ['user-balance'] });

          // console.log('✅ [REALTIME-BALANCE] Updated:', { balance: newData.balance, frozen_balance: newData.frozen_balance });
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' && import.meta.env.DEV) {
          console.warn('⚠️ [REALTIME-BALANCE]:', err?.message || 'Channel error');
        }
        // Auto-reconnect géré par Supabase
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      // console.log('🔌 [REALTIME-BALANCE] Cleaning up subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]); // Seulement user.id comme dépendance

  // TERMINOLOGIE UNIFIÉE:
  // - solde = balance en DB (tout l'argent du compte) - C'EST CE QU'ON AFFICHE
  // - frozen = frozen_balance en DB (gelé pour achats en cours)
  // - disponible = solde - frozen (calculé, pas stocké), jamais négatif
  const solde = localBalance ?? user?.balance ?? 0;
  const frozen = localFrozen ?? user?.frozen_balance ?? 0;
  const disponible = Math.max(0, solde - frozen); // Jamais négatif
  
  return {
    // Propriétés principales
    solde,           // Balance totale du compte (affiché en header)
    frozen,          // Montant gelé pour achats en cours
    disponible,      // Ce que l'utilisateur peut dépenser (solde - frozen), >= 0
    
    // Alias pour compatibilité (utiliser solde/frozen/disponible à la place)
    balance: solde,
    frozenBalance: frozen,
    availableBalance: disponible,
    
    refreshBalance,
  };
}
