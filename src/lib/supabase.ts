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

// Client principal pour DB/Auth (Coolify)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'X-Client-Info': 'onesms-web'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    // Attempt to auto-reconnect more significantly
    timeout: 20000,
  }
})

// Auth helpers
// Note: Cette fonction utilise une Edge Function pour vérifier l'email
// car la table users nécessite maintenant une authentification (RLS sécurisé)
export const checkEmailExists = async (email: string) => {
  try {
    // Méthode sécurisée: utiliser signInWithOtp en mode dry-run
    // Si l'email n'existe pas dans auth.users, Supabase retourne une erreur spécifique
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase(),
      options: {
        shouldCreateUser: false, // Ne pas créer de compte si n'existe pas
      }
    })

    // Si erreur "Signups not allowed" ou "User not found", l'email n'existe pas
    if (error) {
      // "Signups not allowed for otp" signifie que l'email n'existe pas dans auth.users
      if (error.message?.includes('Signups not allowed') ||
        error.message?.includes('User not found') ||
        error.message?.includes('user_not_found')) {
        return false
      }
      // Autres erreurs = on ne peut pas déterminer, on assume que ça n'existe pas
      console.warn('checkEmailExists warning:', error.message)
      return false
    }

    // Pas d'erreur = l'email existe (un OTP a été envoyé)
    return true
  } catch (err) {
    console.error('Error checking email:', err)
    return false
  }
}

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
    // D'abord essayer getSession (lecture locale, plus rapide)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    console.log('[SUPABASE] getSession result:', {
      hasSession: !!session,
      userId: session?.user?.id?.substring(0, 8),
      error: sessionError?.message
    })

    if (sessionError) {
      console.error('[SUPABASE] getSession error:', sessionError)
      return { user: null, error: sessionError }
    }

    if (session?.user) {
      return { user: session.user, error: null }
    }

    // Si pas de session locale, essayer getUser avec timeout
    console.log('[SUPABASE] No local session, trying getUser...')
    const getUserPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise<{ data: { user: null }, error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('getUser timeout')), 5000)
    )

    const result = await Promise.race([getUserPromise, timeoutPromise])
    return { user: result.data.user, error: result.error }
  } catch (error: any) {
    console.error('[SUPABASE] getCurrentUser exception:', error.message)
    return { user: null, error }
  }
}

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

export const resetPasswordForEmail = async (email: string) => {
  // Note: On ne vérifie plus si l'email existe dans la table users (RLS sécurisé)
  // Supabase Auth gère automatiquement: si l'email n'existe pas, aucun mail n'est envoyé
  // mais on retourne quand même succès pour éviter l'énumération d'emails (sécurité)

  const baseUrl = window.location.origin;

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/reset-password`,
  })

  // Pour des raisons de sécurité, on retourne toujours succès
  // (évite l'énumération d'emails - bonne pratique OWASP)
  if (error && error.message?.includes('User not found')) {
    // On simule un succès pour ne pas révéler si l'email existe
    return { data: {}, error: null }
  }

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
// SUPABASE EDGE FUNCTIONS CLIENT (HTTPS)
// ============================================================================

/**
 * Appeler les Edge Functions Supabase Cloud (HTTPS)
 */
class CloudFunctionsClient {
  private retryCount = 0;
  private maxRetries = 1;

  async invoke(functionName: string, options?: { body?: any }) {
    try {
      let { data: { session } } = await supabase.auth.getSession();

      // Si pas de session et qu'on a déjà réessayé, ne pas réessayer
      if (!session && this.retryCount > 0) {
        console.warn(`[API] ${functionName}: No session after retry, aborting`);
        return { data: null, error: { code: 401, message: 'No session available' } };
      }

      const token = session?.access_token;

      const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(options?.body || {})
      });

      const data = await response.json();

      if (!response.ok) {
        // Si 401, essayer de rafraîchir la session une fois
        if (response.status === 401 && this.retryCount < this.maxRetries) {
          console.log(`[API] ${functionName}: 401, attempting session refresh...`);
          this.retryCount++;

          // Forcer un refresh de la session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (refreshData?.session && !refreshError) {
            console.log(`[API] ${functionName}: Session refreshed, retrying...`);
            const result = await this.invoke(functionName, options);
            this.retryCount = 0;
            return result;
          }
        }

        this.retryCount = 0;
        console.error(`❌ [API] ${functionName}:`, data);
        return { data: null, error: data };
      }

      this.retryCount = 0;
      return { data, error: null };
    } catch (err: any) {
      this.retryCount = 0;
      console.error(`❌ [API] ${functionName} exception:`, err);
      return { data: null, error: err };
    }
  }
}

// Client pour appeler les Edge Functions Supabase Cloud
export const cloudFunctions = new CloudFunctionsClient();

// Wrapper pour compatibilité
export const invokeEdgeFunction = async <T = any>(
  functionName: string,
  options?: { body?: any; headers?: Record<string, string> }
): Promise<{ data: T | null; error: any }> => {
  return cloudFunctions.invoke(functionName, options) as Promise<{ data: T | null; error: any }>;
}
