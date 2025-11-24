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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  
  setUser: (user) => set({ user, loading: false }),
  
  checkAuth: async () => {
    try {
      const { user, error } = await getCurrentUser()
      
      if (error || !user) {
        set({ user: null, loading: false })
        return
      }

      // Get user profile from database
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      set({ user: profile, loading: false })
    } catch (error) {
      console.error('Auth check error:', error)
      set({ user: null, loading: false })
    }
  },
  
  signOut: async () => {
    await supabaseSignOut()
    set({ user: null })
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
  })
}
