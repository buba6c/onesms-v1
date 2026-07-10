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

// ============================================================================
// 🔒 MUTEX: Prevent multiple simultaneous checkAuth() calls
// This was causing a stampede of 10+ requests at login
// ============================================================================
let checkAuthInProgress = false
let checkAuthQueue: Array<() => void> = []

/**
 * Fetch profile with retry + exponential backoff.
 * On fragile networks (mobile / West Africa), a single attempt often fails
 * when fired alongside many concurrent requests.
 */
async function fetchProfileWithRetry(
  userId: string,
  maxRetries = 2,
  baseDelay = 500
): Promise<{ data: any; error: any }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    // Success or non-network error (e.g. PGRST116 = row not found) → return immediately
    if (!error || (error.code && error.code !== 'PGRST116' && !isNetworkError(error))) {
      return { data, error }
    }
    if (!error) return { data, error }

    // Network error + retries remaining → wait then retry
    if (isNetworkError(error) && attempt < maxRetries) {
      const delay = baseDelay * Math.pow(2, attempt) // 500ms, 1000ms
      console.warn(`[AUTH] Profile fetch failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`)
      await new Promise(r => setTimeout(r, delay))
      continue
    }

    return { data, error }
  }
  // Should never reach here, but TypeScript wants a return
  return { data: null, error: { message: 'Max retries exceeded' } }
}

function isNetworkError(error: any): boolean {
  if (!error) return false
  const msg = error.message || ''
  return (
    msg.includes('Load failed') ||
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('network') ||
    msg.includes('TypeError') ||
    msg.includes('ERR_') ||
    !error.code // Supabase errors have a code, network errors typically don't
  )
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true, // Initial loading state

      setUser: (user) => set({ user, loading: false }),

      checkAuth: async () => {
        // 🔒 MUTEX: If already running, wait for it to finish instead of stampeding
        if (checkAuthInProgress) {
          return new Promise<void>((resolve) => {
            checkAuthQueue.push(resolve)
          })
        }

        checkAuthInProgress = true

        try {
          // Si nous avons déjà un utilisateur localement stocké, on le marque comme chargé immédiatement
          // pour l'affichage (sensation de vitesse), mais on revérifie en background
          const currentUser = get().user;
          if (currentUser) {
            set({ loading: false });
          } else {
            set({ loading: true });
          }

          // getCurrentUser a maintenant son propre timeout et fallback
          const { user: authUser, error } = await getCurrentUser()

          if (error) {
            console.warn('[AUTH] Error getting current user:', error.message)
            // Si erreur, on efface l'utilisateur pour forcer la reco si nécessaire
            if (error.message?.includes('Auth session missing')) {
              set({ user: null, loading: false })
            } else {
              set({ loading: false }) // Keep existing user if just network error
            }
            return
          }

          if (!authUser) {
            if (get().user) {
              console.log('[AUTH] Clearing stale local user')
            }
            set({ user: null, loading: false })
            return
          }

          // User found, fetching profile with retry logic
          const { data: profile, error: profileError } = await fetchProfileWithRetry(authUser.id)

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
        } finally {
          // 🔒 Release mutex and resolve all waiting callers
          checkAuthInProgress = false
          const waiters = checkAuthQueue
          checkAuthQueue = []
          waiters.forEach(resolve => resolve())
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
  // Flag to prevent multiple initial checks
  let initialCheckStarted = false;

  const startInitialCheck = () => {
    if (initialCheckStarted) return;
    initialCheckStarted = true;
    useAuthStore.getState().checkAuth();
  };

  // Listen to auth changes — DEDUPLICATED: only handle meaningful events
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      // checkAuth has its own mutex, safe to call
      useAuthStore.getState().checkAuth()
    } else if (event === 'SIGNED_OUT') {
      // Re-vérifier s'il y a une session valide (peut être refresh en cours)
      const { data: { session: currentSession } } = await supabase.auth.getSession()

      if (!currentSession) {
        useAuthStore.getState().setUser(null)
      }
    } else if (event === 'INITIAL_SESSION') {
      // INITIAL_SESSION occurs on client load — use the single startInitialCheck
      startInitialCheck();
    }
  })

  // Fallback: Si INITIAL_SESSION ne tire pas assez vite, on lance quand même
  setTimeout(startInitialCheck, 1000);

  // ============================================================================
  // 🔒 Admin 2FA verification — DELAYED to avoid stampede at login
  // Only runs on /admin routes, with a longer delay to let auth settle first
  // ============================================================================
  const checkAdminVerification = async () => {
    // 1. Never force logout if we are on the login page
    if (typeof window !== 'undefined' && window.location.pathname === '/login') {
      return
    }

    // 2. Only enforce 2FA when actually on an admin route
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin')) {
      return
    }

    // 3. Wait for auth to be settled (don't race with checkAuth)
    const store = useAuthStore.getState()
    if (store.loading) {
      // Auth still loading, retry in 1s
      setTimeout(checkAdminVerification, 1000)
      return
    }

    // 4. Use the already-loaded user from store instead of making another DB query
    const user = store.user
    if (user && user.role === 'admin') {
      const verified = sessionStorage.getItem('admin_2fa_verified')

      if (!verified) {
        console.log('[AUTH] Admin 2FA missing on admin route. Redirecting to login.')
        await supabase.auth.signOut()
        useAuthStore.getState().setUser(null)
        window.location.href = '/login'
      }
    }
  }

  // Run check on load — increased delay to 3s to let auth settle first
  setTimeout(checkAdminVerification, 3000)
}
