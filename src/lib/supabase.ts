import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables:', {
    url: supabaseUrl ? '✓' : '✗',
    key: supabaseAnonKey ? '✓' : '✗'
  })
  throw new Error('Missing Supabase environment variables')
}

console.log('✅ Supabase client initialized:', supabaseUrl)

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'onesms-web'
    }
  }
})

// Auth helpers
export const signUp = async (email: string, password: string, metadata?: any) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  })
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signInWithGoogle = async () => {
  // Détecter l'environnement par l'URL actuelle
  const baseUrl = window.location.origin.includes('localhost') 
    ? window.location.origin 
    : 'https://onesms-sn.com';
  
  console.log('🔐 [GOOGLE AUTH] Redirect URL:', `${baseUrl}/dashboard`);
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${baseUrl}/dashboard`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })
  return { data, error }
}

export const signInWithPhone = async (phone: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      channel: 'sms',
    },
  })
  return { data, error }
}

export const verifyOtp = async (phone: string, token: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  try {
    // Essayer getUser avec timeout court
    const getUserPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise<{ data: { user: null }, error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('getUser timeout')), 5000)
    )
    
    const result = await Promise.race([getUserPromise, timeoutPromise])
    return { user: result.data.user, error: result.error }
  } catch (error: any) {
    console.warn('[SUPABASE] getUser failed, trying getSession:', error.message)
    
    // Fallback: utiliser getSession (plus rapide, lecture locale)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        return { user: null, error: sessionError }
      }
      return { user: session?.user || null, error: null }
    } catch (fallbackError: any) {
      console.error('[SUPABASE] getSession also failed:', fallbackError)
      return { user: null, error: fallbackError }
    }
  }
}

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

export const resetPasswordForEmail = async (email: string) => {
  const baseUrl = window.location.origin.includes('localhost') 
    ? window.location.origin 
    : 'https://onesms-sn.com';

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/reset-password`,
  })
  return { data, error }
}

export const updatePassword = async (password: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password
  })
  return { data, error }
}

export const resendConfirmationEmail = async (email: string) => {
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
  })
  return { data, error }
}
