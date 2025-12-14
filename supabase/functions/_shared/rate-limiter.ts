/**
 * ============================================================================
 * RATE LIMITER - Protection contre le spam et abus
 * ============================================================================
 * 
 * Ce module implémente un système de rate limiting par utilisateur
 * pour éviter les abus sur les endpoints sensibles.
 * 
 * Usage:
 * ```typescript
 * import { checkRateLimit } from '../_shared/rate-limiter.ts'
 * 
 * const rateCheck = await checkRateLimit(userId, 'buy_activation')
 * if (!rateCheck.allowed) {
 *   return new Response(
 *     JSON.stringify({ error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfterSeconds }),
 *     { status: 429 }
 *   )
 * }
 * ```
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Configuration des limites par action
 */
interface RateLimitConfig {
  maxRequests: number  // Nombre max de requêtes
  windowMs: number     // Fenêtre de temps en millisecondes
}

/**
 * Limites configurées par action
 */
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Achats
  'buy_activation': { 
    maxRequests: 10,    // 10 achats
    windowMs: 60000     // par minute
  },
  'buy_rent': { 
    maxRequests: 5,     // 5 locations
    windowMs: 60000     // par minute
  },
  
  // Actions sur activations
  'retry_sms': { 
    maxRequests: 3,     // 3 retry
    windowMs: 300000    // par 5 minutes
  },
  'cancel_activation': { 
    maxRequests: 20,    // 20 annulations
    windowMs: 60000     // par minute
  },
  'finish_activation': { 
    maxRequests: 20,    // 20 confirmations
    windowMs: 60000     // par minute
  },
  
  // Synchronisations
  'sync_services': { 
    maxRequests: 1,     // 1 sync complète
    windowMs: 600000    // par 10 minutes
  },
  'sync_prices': { 
    maxRequests: 5,     // 5 syncs partielles
    windowMs: 300000    // par 5 minutes
  },
  
  // Vérifications
  'check_status': { 
    maxRequests: 30,    // 30 vérifications
    windowMs: 60000     // par minute
  },
  'get_inbox': { 
    maxRequests: 20,    // 20 lectures inbox
    windowMs: 60000     // par minute
  }
}

/**
 * Résultat de la vérification de rate limit
 */
interface RateLimitResult {
  allowed: boolean          // true si requête autorisée
  remaining: number         // Nombre de requêtes restantes
  retryAfterSeconds?: number // Secondes avant de réessayer (si blocked)
  resetAt?: Date           // Date de reset du compteur
}

/**
 * Vérifie si l'utilisateur a dépassé sa limite de requêtes
 */
export async function checkRateLimit(
  userId: string,
  action: string
): Promise<RateLimitResult> {
  const limit = RATE_LIMITS[action]
  
  // Si pas de limite configurée, autoriser
  if (!limit) {
    return {
      allowed: true,
      remaining: 999
    }
  }
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  const now = Date.now()
  const windowStart = new Date(now - limit.windowMs)
  
  try {
    // Compter les requêtes dans la fenêtre de temps
    // On utilise activity_logs OU on pourrait créer une table dédiée rate_limits
    const { data: logs, error } = await supabase
      .from('activity_logs')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('action', action)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error checking rate limit:', error.message)
      // En cas d'erreur, on autorise par défaut (fail open)
      return { allowed: true, remaining: limit.maxRequests }
    }
    
    const count = logs?.length || 0
    const remaining = Math.max(0, limit.maxRequests - count)
    
    // Si limite dépassée
    if (count >= limit.maxRequests) {
      // Calculer quand le plus ancien log expirera
      const oldestLog = logs[logs.length - 1]
      const oldestLogTime = new Date(oldestLog.created_at).getTime()
      const resetAt = new Date(oldestLogTime + limit.windowMs)
      const retryAfterSeconds = Math.ceil((resetAt.getTime() - now) / 1000)
      
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
        resetAt
      }
    }
    
    // Limite OK, on enregistre cette tentative
    await supabase.from('activity_logs').insert({
      user_id: userId,
      action: action,
      entity_type: 'rate_limit',
      details: {
        limit: limit.maxRequests,
        window_ms: limit.windowMs,
        count: count + 1
      },
      created_at: new Date().toISOString()
    })
    
    return {
      allowed: true,
      remaining: remaining - 1, // -1 car on vient d'en utiliser une
      resetAt: new Date(now + limit.windowMs)
    }
    
  } catch (error: any) {
    console.error('❌ Exception in checkRateLimit:', error.message)
    // En cas d'erreur, on autorise par défaut (fail open)
    return { allowed: true, remaining: limit.maxRequests }
  }
}

/**
 * Middleware pour ajouter facilement le rate limiting à une Edge Function
 * 
 * Usage:
 * ```typescript
 * import { withRateLimit } from '../_shared/rate-limiter.ts'
 * 
 * serve(async (req) => {
 *   const rateLimitResult = await withRateLimit(req, 'buy_activation')
 *   if (rateLimitResult) {
 *     return rateLimitResult // Response 429
 *   }
 *   
 *   // Continue avec la logique normale...
 * })
 * ```
 */
export async function withRateLimit(
  req: Request,
  action: string
): Promise<Response | null> {
  // Extraire user_id du JWT
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    // Pas d'auth = pas de rate limit (sera géré par autre middleware)
    return null
  }
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }
    
    const rateCheck = await checkRateLimit(user.id, action)
    
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Trop de requêtes. Réessayez dans ${rateCheck.retryAfterSeconds} secondes.`,
          retryAfter: rateCheck.retryAfterSeconds,
          resetAt: rateCheck.resetAt?.toISOString()
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateCheck.retryAfterSeconds),
            'X-RateLimit-Limit': String(RATE_LIMITS[action]?.maxRequests || 0),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateCheck.resetAt?.toISOString() || ''
          }
        }
      )
    }
    
    // Ajouter headers informatifs
    req.headers.set('X-RateLimit-Remaining', String(rateCheck.remaining))
    
    return null // OK, pas de blocage
    
  } catch (error: any) {
    console.error('❌ Error in withRateLimit:', error.message)
    return null // Fail open
  }
}

/**
 * Réinitialiser les compteurs pour un utilisateur (admin uniquement)
 */
export async function resetRateLimit(userId: string, action?: string): Promise<void> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  const query = supabase
    .from('activity_logs')
    .delete()
    .eq('user_id', userId)
    .eq('entity_type', 'rate_limit')
  
  if (action) {
    query.eq('action', action)
  }
  
  await query
}

/**
 * Obtenir les statistiques de rate limiting pour un utilisateur
 */
export async function getRateLimitStats(userId: string): Promise<Record<string, {
  count: number
  limit: number
  remaining: number
  resetAt: Date
}>> {
  const stats: Record<string, any> = {}
  
  for (const [action, limit] of Object.entries(RATE_LIMITS)) {
    const result = await checkRateLimit(userId, action)
    stats[action] = {
      count: limit.maxRequests - result.remaining,
      limit: limit.maxRequests,
      remaining: result.remaining,
      resetAt: result.resetAt || new Date()
    }
  }
  
  return stats
}
