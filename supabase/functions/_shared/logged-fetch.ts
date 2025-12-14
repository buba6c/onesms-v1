/**
 * ============================================================================
 * LOGGED FETCH - Wrapper pour tracer tous les appels API externes
 * ============================================================================
 * 
 * Ce wrapper enregistre automatiquement tous les appels vers SMS-Activate
 * dans la table logs_provider pour debugging et audit.
 * 
 * Usage:
 * ```typescript
 * import { loggedFetch } from '../_shared/logged-fetch.ts'
 * 
 * const response = await loggedFetch(apiUrl, {
 *   action: 'getNumber',
 *   provider: 'sms-activate',
 *   userId: userId,
 *   activationId: activationId
 * })
 * ```
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface LoggedFetchOptions {
  // Identification de l'action
  action: string // getPrices, getNumber, setStatus, etc.
  provider?: string // 'sms-activate' par défaut
  
  // Contexte (pour lier le log à une entité)
  userId?: string
  activationId?: string
  rentalId?: string
  
  // Options fetch standard
  method?: string
  headers?: Record<string, string>
  body?: string
  signal?: AbortSignal
}

interface LoggedFetchResult {
  response: Response
  responseText: string
  responseTimeMs: number
}

/**
 * Effectue un appel HTTP et log automatiquement dans logs_provider
 * IMPORTANT: Cette fonction doit TOUJOURS logger, même en cas d'erreur
 */
export async function loggedFetch(
  url: string,
  options: LoggedFetchOptions
): Promise<LoggedFetchResult> {
  // ✅ Log AVANT l'appel pour tracer chaque tentative
  console.log(`🔍 [loggedFetch] Starting: ${options.action} to ${url.substring(0, 80)}...`)
  const startTime = Date.now()
  const provider = options.provider || 'sms-activate'
  
  // Extraire params de l'URL (sans API key pour sécurité)
  const urlObj = new URL(url)
  const params: Record<string, string> = {}
  urlObj.searchParams.forEach((value, key) => {
    if (key !== 'api_key' && key !== 'apiKey') {
      params[key] = value
    }
  })
  
  let response: Response | null = null
  let responseText = ''
  let responseStatus = 0
  let errorMessage: string | null = null
  
  try {
    // Appel fetch avec timeout par défaut de 10s
    response = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body,
      signal: options.signal || AbortSignal.timeout(10000)
    })
    
    responseStatus = response.status
    responseText = await response.text()
    
    const responseTimeMs = Date.now() - startTime
    
    // Log succès en BDD
    console.log(`📝 [logged-fetch] Logging ${options.action} to database...`)
    await logToDatabase({
      provider,
      action: options.action,
      requestUrl: url.replace(/api_key=[^&]+/, 'api_key=HIDDEN'), // Masquer API key
      requestParams: params,
      responseStatus,
      responseBody: responseText,
      responseTimeMs,
      userId: options.userId,
      activationId: options.activationId,
      rentalId: options.rentalId,
      errorMessage: null
    })
    console.log(`✅ [logged-fetch] Logged successfully`)
    
    return {
      response: new Response(responseText, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      }),
      responseText,
      responseTimeMs
    }
    
  } catch (error: any) {
    errorMessage = error.message || String(error)
    const responseTimeMs = Date.now() - startTime
    
    // ✅ Log erreur IMMÉDIATEMENT
    console.error(`❌ [loggedFetch] ERROR in ${options.action}:`, errorMessage)
    
    // Log erreur en BDD avec tous les détails
    await logToDatabase({
      provider,
      action: options.action,
      requestUrl: url.replace(/api_key=[^&]+/, 'api_key=HIDDEN'),
      requestParams: params,
      responseStatus: responseStatus || 500,
      responseBody: responseText || `Error: ${errorMessage}`,
      responseTimeMs,
      userId: options.userId,
      activationId: options.activationId,
      rentalId: options.rentalId,
      errorMessage: errorMessage || 'Unknown error'
    }).catch((dbError: any) => {
      // Si même le logging échoue, on log dans la console au minimum
      console.error(`❌ [loggedFetch] Failed to log error to DB:`, dbError.message)
    })
    
    // Re-throw l'erreur pour que l'appelant puisse la gérer
    throw error
  }
}

/**
 * Enregistre un log dans la table logs_provider
 */
async function logToDatabase(log: {
  provider: string
  action: string
  requestUrl: string
  requestParams: Record<string, string>
  responseStatus: number
  responseBody: string | null
  responseTimeMs: number
  userId?: string
  activationId?: string
  rentalId?: string
  errorMessage: string | null
}) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    console.log(`📊 [logToDatabase] Inserting log for action: ${log.action}`)
    
    const { data, error } = await supabase.from('logs_provider').insert({
      provider: log.provider,
      action: log.action,
      request_url: log.requestUrl,
      request_params: log.requestParams,
      response_status: log.responseStatus,
      response_body: log.responseBody,
      response_time_ms: log.responseTimeMs,
      user_id: log.userId || null,
      activation_id: log.activationId || null,
      rental_id: log.rentalId || null,
      error_message: log.errorMessage,
      created_at: new Date().toISOString()
    }).select()
    
    if (error) {
      console.error('❌ [logToDatabase] Failed to log to logs_provider:', error.message, error)
    } else {
      console.log('✅ [logToDatabase] Successfully inserted:', data)
    }
    
  } catch (error: any) {
    // Ne pas faire échouer la requête principale si le logging échoue
    console.error('❌ Error in logToDatabase:', error.message)
  }
}

/**
 * Exemple d'utilisation:
 * 
 * ```typescript
 * // Dans buy-sms-activate-number/index.ts:
 * import { loggedFetch } from '../_shared/logged-fetch.ts'
 * 
 * const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${API_KEY}&action=getNumber&...`
 * 
 * const { responseText } = await loggedFetch(apiUrl, {
 *   action: 'getNumber',
 *   userId: userId,
 *   activationId: activationId
 * })
 * 
 * // Parse response
 * if (responseText.startsWith('ACCESS_NUMBER:')) {
 *   const [, id, phone] = responseText.split(':')
 *   // ...
 * }
 * ```
 */
