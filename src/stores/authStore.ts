import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase, cloudFunctions, getCurrentUser, signOut as supabaseSignOut } from '@/lib/supabase'

interface AuthState {
  user: any | null
  loading: boolean
  setUser: (user: any | null) => void
  checkAuth: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true, // Initial loading state

      setUser: (user) => set({ user, loading: false }),

      checkAuth: async () => {
        try {
          // Si nous avons déjà un utilisateur localement stocké, on le marque comme chargé immédiatement
          // pour l'affichage (sensation de vitesse), mais on revérifie en background
          const currentUser = get().user;
          if (currentUser) {
            set({ loading: false });
          } else {
            set({ loading: true });
          }

          // console.log('[AUTH] Starting checkAuth...')

          // getCurrentUser a maintenant son propre timeout et fallback
          const { user: authUser, error } = await getCurrentUser()

          if (error) {
            console.warn('[AUTH] Error getting current user:', error.message)
            // Si erreur, on efface l'utilisateur pour forcer la reco si nécessaire
            // ou on garde le cache si c'est juste un problème réseau ?
            // Pour sécurité, on clear si session invalide.
            if (error.message.includes('Auth session missing')) {
              set({ user: null, loading: false })
            } else {
              set({ loading: false }) // Keep existing user if just network error?
            }
            return
          }

          if (!authUser) {
            // console.log('[AUTH] No authenticated user found')
            if (get().user) {
              console.log('[AUTH] Clearing stale local user')
              set({ user: null, loading: false })
            } else {
              set({ user: null, loading: false })
            }
            return
          }

          // console.log('[AUTH] User authenticated:', authUser.email)

          // User found, fetching profile
          // Get user profile from database
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single()

          if (profileError) {
            console.error('❌ [AUTH] Profile fetch error:', profileError)

            // Si le profil n'existe pas, créer un profil basique
            if (profileError.code === 'PGRST116') {

              const newUserData = {
                id: authUser.id,
                email: authUser.email,
                full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
                role: 'user',
                balance: 0
              };

              const { data: newProfile, error: createError } = await (supabase
                .from('users') as any)
                .insert(newUserData)
                .select()
                .single()

              if (createError) {
                console.error('❌ [AUTH] Failed to create profile:', createError)
                const fallbackUser = {
                  id: authUser.id,
                  email: authUser.email,
                  full_name: authUser.user_metadata?.full_name || 'User',
                  role: 'user',
                  balance: 0
                }
                set({ user: fallbackUser, loading: false })
                return
              }

              set({ user: newProfile, loading: false })
              return
            }

            // Autre erreur - utiliser profil minimal
            const fallbackUser = {
              id: authUser.id,
              email: authUser.email,
              full_name: authUser.user_metadata?.full_name || 'User',
              role: 'user',
              balance: 0
            }
            set({ user: fallbackUser, loading: false })
            return
          }

          if (profile) {
            // Comparer avec l'état actuel pour éviter re-render inutiles si identique
            // JSON.stringify est simple pour comparaison deep basic
            const currentUserStr = JSON.stringify(get().user);
            const newProfileStr = JSON.stringify(profile);

            if (currentUserStr !== newProfileStr) {
              set({ user: profile, loading: false })
            } else {
              set({ loading: false })
            }
          }

          // Tentative de lier un code de parrainage stocké côté client
          try {
            const pendingCode = typeof window !== 'undefined'
              ? localStorage.getItem('pending_referral_code')
              : null

            if (pendingCode) {
              // Asynchrone, ne bloque pas l'UI
              cloudFunctions.invoke('link-referral', {
                body: { referral_code: pendingCode },
              }).then(({ data, error }) => {
                if (!error) {
                  localStorage.removeItem('pending_referral_code')
                } else if (error?.error === 'invalid_code') {
                  localStorage.removeItem('pending_referral_code')
                }
              })
            }
          } catch (err) {
            // ignore
          }

        } catch (error) {
          console.error('❌ [AUTH] checkAuth exception:', error)
          set({ user: null, loading: false })
        }
      },

      signOut: async () => {
        // 1. Immediate local cleanup (Optimistic UI)
        set({ user: null, loading: false })
        try {
          localStorage.removeItem('auth-storage')
        } catch (e) {
          // ignore
        }

        // 2. Network cleanup in background (best effort)
        try {
          await supabaseSignOut()
        } catch (err) {
          console.error('[AUTH] SignOut error (background):', err)
        }
      },
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
      partialize: (state) => ({ user: state.user }), // Only persist 'user', not 'loading'
    }
  )
)

// Initialize auth on load
if (typeof window !== 'undefined') {
  // D'abord charger la session existante
  useAuthStore.getState().checkAuth()

  // Listen to auth changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    // console.log('[AUTH] onAuthStateChange:', event, session?.user?.email)

    if (event === 'SIGNED_IN' && session) {
      useAuthStore.getState().checkAuth()
    } else if (event === 'SIGNED_OUT') {
      // Re-vérifier s'il y a une session valide (peut être refresh en cours)
      const { data: { session: currentSession } } = await supabase.auth.getSession()

      if (!currentSession) {
        // console.log('[AUTH] Confirmed sign out')
        useAuthStore.getState().setUser(null)
      }
    } else if (event === 'INITIAL_SESSION') {
      if (session) {
        useAuthStore.getState().checkAuth()
      } else {
        // Ne pas effacer immédiatement si on a des données locales (persistence)
        // Laisser checkAuth décider si le token est invalide
        useAuthStore.getState().checkAuth()
      }
    }
  })
}
