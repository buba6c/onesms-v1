import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// URL pour l'API backend Node.js (remplace les Edge Functions)
const apiServerUrl = import.meta.env.VITE_API_SERVER_URL || 'http://onesms-api.46.202.171.108.sslip.io'

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables:', {
    url: supabaseUrl ? '✓' : '✗',
    key: supabaseAnonKey ? '✓' : '✗'
  })
  throw new Error('Missing Supabase environment variables')
}

console.log('✅ Supabase client initialized:', supabaseUrl)
console.log('✅ API Server URL:', apiServerUrl)

// Client principal pour DB/Auth (Coolify)
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
  // Utiliser l'URL actuelle pour le redirect
  const baseUrl = window.location.origin;
  
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
  // Vérifier d'abord si l'email existe dans la base de données
  const { data: userData, error: checkError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email)
    .single()

  if (checkError || !userData) {
    return { 
      data: null, 
      error: { 
        message: 'Aucun compte trouvé avec cette adresse email.' 
      } 
    }
  }

  const baseUrl = window.location.origin;

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

// ============================================================================
// EDGE FUNCTIONS CLIENT (utilise Supabase Cloud car Coolify ne supporte pas Deno)
// ============================================================================

// ============================================================================
// API SERVER CLIENT (remplace les Edge Functions)
// ============================================================================

/**
 * Appeler l'API backend Node.js
 * Remplace cloudFunctions.invoke()
 */
class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async invoke(functionName: string, options?: { body?: any }) {
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`${this.baseUrl}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(options?.body || {})
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`❌ [API] ${functionName}:`, data);
        return { data: null, error: data };
      }

      return { data, error: null };
    } catch (err: any) {
      console.error(`❌ [API] ${functionName} exception:`, err);
      return { data: null, error: err };
    }
  }
}

// Client pour appeler l'API backend
export const cloudFunctions = new APIClient(apiServerUrl);

// Wrapper pour compatibilité
export const invokeEdgeFunction = async <T = any>(
  functionName: string, 
  options?: { body?: any; headers?: Record<string, string> }
): Promise<{ data: T | null; error: any }> => {
  return cloudFunctions.invoke(functionName, options) as Promise<{ data: T | null; error: any }>;
}
