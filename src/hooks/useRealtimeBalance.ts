/**
 * Hook pour synchroniser le solde utilisateur en temps réel et de façon ultra-réactive
 * 
 * TERMINOLOGIE UNIFIÉE:
 * - solde = balance en DB = tout l'argent du compte (ce qui est affiché)
 * - frozen = frozen_balance en DB = montant gelé pour achats en cours
 * - disponible = solde - frozen (calculé dynamiquement, pas stocké)
 * 
 * Met à jour automatiquement quand les valeurs changent en DB, sur activations, ou au focus
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
  const [localBalance, setLocalBalance] = useState<number | null>(user?.balance ?? null);
  const [localFrozen, setLocalFrozen] = useState<number | null>(user?.frozen_balance ?? null);

  // Fonction pour forcer le refresh depuis la base de données
  const refreshBalance = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('balance, frozen_balance')
        .eq('id', user.id)
        .single<{ balance: number; frozen_balance: number }>();
      
      if (!error && data) {
        setLocalBalance(data.balance);
        setLocalFrozen(data.frozen_balance);
        // Mettre à jour le store Zustand
        setUser({ ...user, balance: data.balance, frozen_balance: data.frozen_balance });
        // Mettre à jour le cache React Query
        queryClient.setQueryData(['user-balance', user.id], {
          balance: data.balance,
          frozen_balance: data.frozen_balance
        });
      }
    } catch (err) {
      console.error('⚠️ [REALTIME-BALANCE] Erreur refreshBalance:', err);
    }
  }, [user?.id, setUser, queryClient]);

  // Sync au montage et lors du focus navigateur (mobile / desktop)
  useEffect(() => {
    if (!user?.id) return;

    // Fetch initial immédiat au montage
    refreshBalance();

    const handleFocus = () => {
      refreshBalance();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        refreshBalance();
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id, refreshBalance]);

  // Écoute Realtime sur la table users ET sur la table activations pour réactivité instantanée
  useEffect(() => {
    if (!user?.id) return;

    if (userIdRef.current === user.id && channelRef.current) {
      return;
    }

    userIdRef.current = user.id;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`user-balance-sync-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData && typeof newData.balance === 'number') {
            setLocalBalance(newData.balance);
            setLocalFrozen(newData.frozen_balance ?? 0);
            setUser({
              ...user,
              balance: newData.balance,
              frozen_balance: newData.frozen_balance ?? 0,
            });
            queryClient.setQueryData(['user-balance', user.id], {
              balance: newData.balance,
              frozen_balance: newData.frozen_balance ?? 0
            });
            queryClient.invalidateQueries({ queryKey: ['user-balance', user.id] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activations',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Si une activation est achetée, modifiée ou remboursée, on rafraîchit la balance immédiatement
          refreshBalance();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, refreshBalance, setUser, queryClient]);

  const solde = localBalance ?? user?.balance ?? 0;
  const frozen = localFrozen ?? user?.frozen_balance ?? 0;
  const disponible = Math.max(0, solde - frozen);
  
  return {
    solde,
    frozen,
    disponible,
    balance: solde,
    frozenBalance: frozen,
    availableBalance: disponible,
    refreshBalance,
  };
}
