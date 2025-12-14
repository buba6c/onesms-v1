import { create } from 'zustand'
import { supabase, getCurrentUser, signOut as supabaseSignOut } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: any | null
  loading: boolean
  setUser: (user: any | null) => void
  checkAuth: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  
  setUser: (user) => set({ user, loading: false }),
  
  checkAuth: async () => {
    try {
      console.log('[AUTH] Starting checkAuth...')
      
      // getCurrentUser a maintenant son propre timeout et fallback
      const { user: authUser, error } = await getCurrentUser()
      
      if (error) {
        console.warn('[AUTH] Error getting current user:', error.message)
        set({ user: null, loading: false })
        return
      }
      
      if (!authUser) {
        console.log('[AUTH] No authenticated user found')
        set({ user: null, loading: false })
        return
      }
      
      console.log('[AUTH] User authenticated:', authUser.email)

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
          // console.log('🔄 [AUTH] Creating missing user profile...')
          
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
            // Utiliser un profil minimal basé sur authUser
            set({ 
              user: { 
                id: authUser.id, 
                email: authUser.email,
                full_name: authUser.user_metadata?.full_name || 'User',
                role: 'user',
                balance: 0
              }, 
              loading: false 
            })
            return
          }
          
          // console.log('✅ [AUTH] Profile created:', newProfile)
          set({ user: newProfile, loading: false })
          return
        }
        
        // Autre erreur - utiliser profil minimal
        set({ 
          user: { 
            id: authUser.id, 
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || 'User',
            role: 'user',
            balance: 0
          }, 
          loading: false 
        })
        return
      }

      if (profile) {
        // Profile loaded successfully
      }
      set({ user: profile, loading: false })

      // Tentative de lier un code de parrainage stocké côté client
      try {
        const pendingCode = typeof window !== 'undefined'
          ? localStorage.getItem('pending_referral_code')
          : null

        if (pendingCode) {
          const { data, error } = await supabase.functions.invoke('link-referral', {
            body: { referral_code: pendingCode },
          })

          if (!error) {
            localStorage.removeItem('pending_referral_code')
            console.log('[REFERRAL] linked', data)
          } else {
            console.warn('[REFERRAL] link error', error)
          }
        }
      } catch (err) {
        console.warn('[REFERRAL] link attempt failed', err)
      }
      
    } catch (error) {
      console.error('❌ [AUTH] checkAuth exception:', error)
      set({ user: null, loading: false })
    }
  },
  
  signOut: async () => {
    await supabaseSignOut()
    set({ user: null, loading: false })
  },
}))

// Initialize auth on load
if (typeof window !== 'undefined') {
  useAuthStore.getState().checkAuth()

  // Listen to auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      useAuthStore.getState().checkAuth()
    } else if (event === 'SIGNED_OUT') {
      useAuthStore.getState().setUser(null)
    }
    // Token refresh handled silently
  })
}
