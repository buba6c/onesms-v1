import { supabase } from './supabase'

export interface Service {
  id: string
  code: string
  name: string
  display_name: string | null
  category: string
  icon: string
  active: boolean
  popularity_score: number
  total_available: number
  created_at: string
  updated_at: string
}

export interface ServiceIcon {
  id: string
  service_code: string
  icon_url: string | null
  icon_emoji: string
  icon_type: 'emoji' | 'url' | 'upload'
  created_at: string
  updated_at: string
}

export interface Country {
  id: string
  code: string
  name: string
  flag_emoji: string
  success_rate: number
  active: boolean
  price_multiplier: number
  available_numbers: number
  provider: string
  display_order: number
  created_at: string
  updated_at: string
}

// Interface pour les données 5sim en temps réel
export interface Sim5CountryData {
  countryCode: string
  countryName: string
  operators: {
    [operatorName: string]: {
      cost: number      // Prix en roubles
      count: number     // Numéros disponibles
      rate?: number     // Taux de réussite (0-100), omis si < 20% ou peu de commandes
    }
  }
  // Données agrégées
  totalCount: number
  avgCost: number
  maxRate: number  // Meilleur taux de réussite parmi les opérateurs
}

export interface PricingRule {
  id: string
  service_code: string
  country_code: string
  provider: string
  operator: string | null
  activation_cost: number
  activation_price: number
  rent_cost: number
  rent_price: number
  available_count: number
  margin_percentage: number
  active: boolean
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export interface SyncLog {
  id: string
  sync_type: 'services' | 'countries' | 'pricing' | 'full'
  status: 'running' | 'success' | 'error'
  services_synced: number
  countries_synced: number
  prices_synced: number
  error_message: string | null
  started_at: string
  completed_at: string | null
  triggered_by: string | null
}

// Trigger SMS-Activate synchronization
export const triggerSync = async (): Promise<{ success: boolean; message?: string; stats?: any; error?: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    console.log('🚀 [SYNC] Démarrage de la synchronisation SMS-Activate...')
    
    // L'Edge Function crée son propre sync_log, pas besoin de le faire ici
    
    // Timeout de 5 minutes (Edge Functions ont limite de 5 min)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 min
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-sms-activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ [SYNC] Erreur HTTP:', response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ [SYNC] Résultat:', result)
      
      // L'Edge Function gère le log de sync
      return result
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      throw fetchError
    }
  } catch (error: any) {
    console.error('❌ [SYNC] Erreur:', error)
    return {
      success: false,
      error: error.message || 'Sync failed'
    }
  }
}

// Update popularity scores
export const updatePopularityScores = async (): Promise<{ success: boolean; message?: string; top10?: any; error?: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    console.log('🔄 [SCORES] Mise à jour des popularity scores...')
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-popularity-scores`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ [SCORES] Résultat:', result)
    return result
  } catch (error: any) {
    console.error('❌ [SCORES] Erreur:', error)
    return {
      success: false,
      error: error.message || 'Update failed'
    }
  }
}

/**
 * Récupère les prix et taux de réussite en temps réel depuis l'API 5sim pour un service donné
 * Endpoint: GET /v1/guest/prices?product={serviceCode}
 * Retourne: { [country]: { [operator]: { cost, count, rate? } } }
 */
export const fetch5simPricesForService = async (serviceCode: string): Promise<Sim5CountryData[]> => {
  try {
    console.log(`🌍 [5SIM] Récupération des prix pour ${serviceCode}...`)
    
    // Appel direct à l'API 5sim (publique, pas besoin d'auth)
    const response = await fetch(`https://5sim.net/v1/guest/prices?product=${serviceCode.toLowerCase()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      console.error(`❌ [5SIM] HTTP ${response.status}:`, await response.text())
      return []
    }

    const data = await response.json()
    console.log(`✅ [5SIM] Données reçues pour ${serviceCode}:`, Object.keys(data).length, 'pays')

    // Transformer la réponse 5sim en format exploitable
    // Structure RÉELLE: { serviceName: { countryName: { operatorName: { cost, count, rate? } } } }
    const countries: Sim5CountryData[] = []
    
    const serviceData = data[serviceCode.toLowerCase()]
    if (!serviceData || typeof serviceData !== 'object') {
      console.warn(`⚠️ [5SIM] Service "${serviceCode}" introuvable dans la réponse`)
      return []
    }

    for (const [countryName, operators] of Object.entries(serviceData)) {
      if (typeof operators !== 'object' || !operators) continue

      let totalCount = 0
      let totalCost = 0
      let maxRate = 0
      let operatorCount = 0
      const operatorMap: Record<string, any> = {}

      // Agréger les données des opérateurs
      for (const [operatorName, operatorData] of Object.entries(operators)) {
        const op = operatorData as any
        if (!op || typeof op !== 'object') continue

        totalCount += op.count || 0
        totalCost += op.cost || 0
        operatorCount++

        // Le rate est omis si < 20% ou peu de commandes
        const rate = op.rate || 0
        if (rate > maxRate) maxRate = rate

        operatorMap[operatorName] = {
          cost: op.cost || 0,
          count: op.count || 0,
          rate: rate
        }
      }

      if (operatorCount > 0) {
        countries.push({
          countryCode: countryName,
          countryName: countryName,
          operators: operatorMap,
          totalCount,
          avgCost: totalCost / operatorCount,
          maxRate  // Tri par ce champ = meilleur opérateur du pays
        })
      }
    }

    // TRI COMME 5SIM: Stock × Rate (équilibre popularité/qualité)
    // Cette stratégie met England #1, Italy #2, Canada #4, comme sur 5sim.net
    countries.sort((a, b) => {
      const scoreA = a.totalCount * (a.maxRate / 100)
      const scoreB = b.totalCount * (b.maxRate / 100)
      return scoreB - scoreA
    })

    console.log(`📊 [5SIM] Pays triés (Stock×Rate):`, countries.slice(0, 5).map(c => `${c.countryName} (score: ${(c.totalCount * (c.maxRate / 100)).toFixed(0)}, ${c.maxRate}%, ${c.totalCount} nums)`))
    return countries

  } catch (error) {
    console.error('❌ [5SIM] Erreur lors de la récupération des prix:', error)
    return []
  }
}

// Update success rates
export const updateSuccessRates = async (): Promise<{ success: boolean; message?: string; stats?: any; error?: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    console.log('🌍 [RATES] Mise à jour des success rates...')
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-success-rates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ [RATES] Résultat:', result)
    return result
  } catch (error: any) {
    console.error('❌ [RATES] Erreur:', error)
    return {
      success: false,
      error: error.message || 'Update failed'
    }
  }
}

// Get all services
export const getServices = async (filters?: {
  active?: boolean
  category?: string
  search?: string
}): Promise<Service[]> => {
  let query = supabase
    .from('services')
    .select('*')
    // TRI COMME 5SIM: popularity_score DESC puis stock total
    // popularity_score suit l'ordre exact de la homepage 5sim.net
    .order('popularity_score', { ascending: false })
    .order('total_available', { ascending: false })
    .limit(10000) // Récupérer tous les services sans limitation

  if (filters?.active !== undefined) {
    query = query.eq('active', filters.active)
  }

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,display_name.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Update service
export const updateService = async (id: string, updates: Partial<Service>): Promise<Service> => {
  const { data, error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Get all countries
export const getCountries = async (filters?: {
  active?: boolean
  search?: string
}): Promise<Country[]> => {
  let query = supabase
    .from('countries')
    .select('*')
    // TRI COMME 5SIM: display_order DESC puis available_numbers DESC
    .order('display_order', { ascending: false })
    .order('available_numbers', { ascending: false })

  if (filters?.active !== undefined) {
    query = query.eq('active', filters.active)
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Update country
export const updateCountry = async (id: string, updates: Partial<Country>): Promise<Country> => {
  const { data, error } = await supabase
    .from('countries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Get pricing rules
export const getPricingRules = async (filters?: {
  service_code?: string
  country_code?: string
  active?: boolean
}): Promise<PricingRule[]> => {
  let query = supabase
    .from('pricing_rules')
    .select('*')
    .order('service_code')

  if (filters?.service_code) {
    query = query.eq('service_code', filters.service_code)
  }

  if (filters?.country_code) {
    query = query.eq('country_code', filters.country_code)
  }

  if (filters?.active !== undefined) {
    query = query.eq('active', filters.active)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Update pricing rule
export const updatePricingRule = async (id: string, updates: Partial<PricingRule>): Promise<PricingRule> => {
  const { data, error } = await supabase
    .from('pricing_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Get sync logs
export const getSyncLogs = async (limit: number = 10): Promise<SyncLog[]> => {
  const { data, error } = await supabase
    .from('sync_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Get latest sync log
export const getLatestSyncLog = async (): Promise<SyncLog | null> => {
  const { data, error } = await supabase
    .from('sync_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data
}

// Get service icons
export const getServiceIcons = async (): Promise<ServiceIcon[]> => {
  const { data, error } = await supabase
    .from('service_icons')
    .select('*')
    .order('service_code')

  if (error) throw error
  return data || []
}

// Update service icon
export const updateServiceIcon = async (serviceCode: string, updates: Partial<ServiceIcon>): Promise<ServiceIcon> => {
  const { data, error } = await supabase
    .from('service_icons')
    .upsert({
      service_code: serviceCode,
      ...updates
    }, {
      onConflict: 'service_code'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Get service statistics
export const getServiceStats = async () => {
  // Récupérer le COUNT total des services
  const { count: totalServicesCount } = await supabase
    .from('services')
    .select('*', { count: 'exact', head: true })

  // Récupérer le COUNT des services actifs
  const { count: activeServicesCount } = await supabase
    .from('services')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)

  // Récupérer les services pour calculer popularServices
  const { data: services } = await supabase
    .from('services')
    .select('popularity_score')
    .limit(10000)

  const { data: countries } = await supabase
    .from('countries')
    .select('*')
    .limit(10000)

  // Utiliser COUNT exact pour les pricing_rules au lieu de récupérer tous les records
  const { count: pricingRulesCount } = await supabase
    .from('pricing_rules')
    .select('*', { count: 'exact', head: true })

  // Récupérer TOUTES les pricing_rules pour le total_available avec pagination
  let allPricing: any[] = []
  let page = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data: pricingPage, error } = await supabase
      .from('pricing_rules')
      .select('available_count')
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
      console.error('❌ [STATS] Erreur pagination pricing_rules:', error)
      break
    }

    if (pricingPage && pricingPage.length > 0) {
      allPricing = allPricing.concat(pricingPage)
      page++
      hasMore = pricingPage.length === pageSize
    } else {
      hasMore = false
    }
  }

  const totalServices = totalServicesCount || 0
  const activeServices = activeServicesCount || 0
  const popularServices = services?.filter(s => s.popularity_score >= 50).length || 0
  const totalCountries = countries?.length || 0
  const activeCountries = countries?.filter(c => c.active).length || 0
  const totalAvailable = allPricing.reduce((sum, p) => sum + (p.available_count || 0), 0)

  console.log('📊 [STATS] Services:', totalServices, 'Active:', activeServices, 'Popular:', popularServices, 'Pricing rules:', pricingRulesCount, 'Total available:', totalAvailable, `(from ${allPricing.length} records)`)

  return {
    totalServices,
    activeServices,
    popularServices,
    totalCountries,
    activeCountries,
    totalAvailable,
    pricingRulesCount
  }
}
