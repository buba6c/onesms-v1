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
      console.log('🔐 [AUTH] Checking authentication...')
      
      const { user: authUser, error } = await getCurrentUser()
      
      if (error) {
        console.error('❌ [AUTH] getCurrentUser error:', error)
        set({ user: null, loading: false })
        return
      }
      
      if (!authUser) {
        console.log('⚠️ [AUTH] No authenticated user')
        set({ user: null, loading: false })
        return
      }

      console.log('✅ [AUTH] Auth user found:', authUser.id, authUser.email)

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
          console.log('🔄 [AUTH] Creating missing user profile...')
          
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              email: authUser.email,
              full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
              role: 'user',
              balance: 0
            })
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
          
          console.log('✅ [AUTH] Profile created:', newProfile)
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

      console.log('✅ [AUTH] Profile loaded:', profile?.email, 'Role:', profile?.role)
      set({ user: profile, loading: false })
      
    } catch (error) {
      console.error('❌ [AUTH] checkAuth exception:', error)
      set({ user: null, loading: false })
    }
  },
  
  signOut: async () => {
    console.log('🚪 [AUTH] Signing out...')
    await supabaseSignOut()
    set({ user: null, loading: false })
  },
}))

// Initialize auth on load
if (typeof window !== 'undefined') {
  console.log('🚀 [AUTH] Initializing auth store...')
  useAuthStore.getState().checkAuth()

  // Listen to auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔔 [AUTH] Auth state changed:', event, session?.user?.email)
    
    if (event === 'SIGNED_IN' && session) {
      useAuthStore.getState().checkAuth()
    } else if (event === 'SIGNED_OUT') {
      useAuthStore.getState().setUser(null)
    } else if (event === 'TOKEN_REFRESHED') {
      console.log('🔄 [AUTH] Token refreshed')
    }
  })
}
