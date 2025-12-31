import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProviderStatus {
  name: string
  status: 'active' | 'inactive' | 'error'
  balance: number
  currency: string
  apiUrl: string
  lastCheck: string
  error?: string
  stats?: {
    todayPurchases: number
    totalAvailable: number
    avgResponseTime: number
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get auth user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if user is admin
    const { data: userData } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const providers: ProviderStatus[] = []

    // Check SMS-Activate (HeroSMS)
    // Try DB first, then fallback to env var
    let smsActivateKey = Deno.env.get('SMS_ACTIVATE_API_KEY')

    const { data: smsActivateSetting } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'sms_activate_api_key')
      .single()

    if (smsActivateSetting?.value) {
      smsActivateKey = smsActivateSetting.value
    }

    if (smsActivateKey) {
      try {
        const startTime = Date.now()
        const response = await fetch(
          `https://hero-sms.com/stubs/handler_api.php?api_key=${smsActivateKey}&action=getBalance`,
          { signal: AbortSignal.timeout(5000) }
        )
        const responseTime = Date.now() - startTime
        const text = await response.text()

        if (text.startsWith('ACCESS_BALANCE:')) {
          const balance = parseFloat(text.split(':')[1])

          // Get today's purchases
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const { data: purchases } = await supabaseClient
            .from('activations')
            .select('id')
            .eq('provider', 'sms-activate')
            .gte('created_at', today.toISOString())

          providers.push({
            name: 'SMS-Activate',
            status: 'active',
            balance,
            currency: 'RUB',
            apiUrl: 'https://hero-sms.com',
            lastCheck: new Date().toISOString(),
            stats: {
              todayPurchases: purchases?.length || 0,
              totalAvailable: 0, // Not provided by API
              avgResponseTime: responseTime
            }
          })
        } else {
          throw new Error(text)
        }
      } catch (error: any) {
        providers.push({
          name: 'SMS-Activate',
          status: 'error',
          balance: 0,
          currency: 'RUB',
          apiUrl: 'https://hero-sms.com',
          lastCheck: new Date().toISOString(),
          error: error.message
        })
      }
    } else {
      providers.push({
        name: 'SMS-Activate',
        status: 'inactive',
        balance: 0,
        currency: 'RUB',
        apiUrl: 'https://hero-sms.com',
        lastCheck: new Date().toISOString(),
        error: 'API Key not configured'
      })
    }

    // Check 5sim
    // Try DB first, then fallback to env var
    let fivesimKey = Deno.env.get('FIVESIM_API_KEY')

    // Try to get from database settings
    const { data: fivesimSetting } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', '5sim_api_key')
      .single()

    if (fivesimSetting?.value) {
      fivesimKey = fivesimSetting.value
    }

    if (fivesimKey) {
      try {
        const startTime = Date.now()
        const response = await fetch('https://5sim.net/v1/user/profile', {
          headers: { 'Authorization': `Bearer ${fivesimKey}` },
          signal: AbortSignal.timeout(5000)
        })
        const responseTime = Date.now() - startTime

        if (response.ok) {
          const data = await response.json()

          // Get today's purchases
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const { data: purchases } = await supabaseClient
            .from('activations')
            .select('id')
            .eq('provider', '5sim')
            .gte('created_at', today.toISOString())

          providers.push({
            name: '5sim',
            status: 'active',
            balance: data.balance || 0,
            currency: 'RUB',
            apiUrl: 'https://5sim.net',
            lastCheck: new Date().toISOString(),
            stats: {
              todayPurchases: purchases?.length || 0,
              totalAvailable: 0,
              avgResponseTime: responseTime
            }
          })
        } else {
          throw new Error(`HTTP ${response.status}`)
        }
      } catch (error: any) {
        providers.push({
          name: '5sim',
          status: 'error',
          balance: 0,
          currency: 'RUB',
          apiUrl: 'https://5sim.net',
          lastCheck: new Date().toISOString(),
          error: error.message
        })
      }
    } else {
      providers.push({
        name: '5sim',
        status: 'inactive',
        balance: 0,
        currency: 'RUB',
        apiUrl: 'https://5sim.net',
        lastCheck: new Date().toISOString(),
        error: 'API Key not configured'
      })
    }

    // Check SMSPVA
    let smspvaKey = Deno.env.get('SMSPVA_API_KEY')

    const { data: smspvaSetting } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'smspva_api_key')
      .single()

    if (smspvaSetting?.value) {
      smspvaKey = smspvaSetting.value
    }

    if (smspvaKey) {
      try {
        const startTime = Date.now()
        const response = await fetch(
          `https://smspva.com/priemnik.php?metod=get_balance&service=opt4&apikey=${smspvaKey}`,
          { signal: AbortSignal.timeout(5000) }
        )
        const responseTime = Date.now() - startTime
        const data = await response.json()

        if (data.response === '1' || data.response === 1) {
          const balance = parseFloat(data.balance) || 0

          // Get today's purchases
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const { data: purchases } = await supabaseClient
            .from('activations')
            .select('id')
            .eq('provider', 'smspva')
            .gte('created_at', today.toISOString())

          providers.push({
            name: 'SMSPVA',
            status: 'active',
            balance,
            currency: 'USD',
            apiUrl: 'https://smspva.com',
            lastCheck: new Date().toISOString(),
            stats: {
              todayPurchases: purchases?.length || 0,
              totalAvailable: 0,
              avgResponseTime: responseTime
            }
          })
        } else {
          throw new Error(data.response || 'Unknown error')
        }
      } catch (error: any) {
        providers.push({
          name: 'SMSPVA',
          status: 'error',
          balance: 0,
          currency: 'USD',
          apiUrl: 'https://smspva.com',
          lastCheck: new Date().toISOString(),
          error: error.message
        })
      }
    } else {
      providers.push({
        name: 'SMSPVA',
        status: 'inactive',
        balance: 0,
        currency: 'USD',
        apiUrl: 'https://smspva.com',
        lastCheck: new Date().toISOString(),
        error: 'API Key not configured'
      })
    }

    // Check OnlineSIM
    let onlinesimKey = Deno.env.get('ONLINESIM_API_KEY')

    const { data: onlinesimSetting } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'onlinesim_api_key')
      .single()

    if (onlinesimSetting?.value) {
      onlinesimKey = onlinesimSetting.value
    }

    if (onlinesimKey) {
      try {
        const startTime = Date.now()
        const response = await fetch(
          `https://onlinesim.io/api/getBalance.php?apikey=${onlinesimKey}`,
          { signal: AbortSignal.timeout(5000) }
        )
        const responseTime = Date.now() - startTime
        const data = await response.json()

        if (data.response === 1 || data.response === '1') {
          const balance = parseFloat(data.balance) || 0

          // Get today's purchases
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const { data: purchases } = await supabaseClient
            .from('activations')
            .select('id')
            .eq('provider', 'onlinesim')
            .gte('created_at', today.toISOString())

          providers.push({
            name: 'OnlineSIM',
            status: 'active',
            balance,
            currency: 'USD',
            apiUrl: 'https://onlinesim.io',
            lastCheck: new Date().toISOString(),
            stats: {
              todayPurchases: purchases?.length || 0,
              totalAvailable: 0,
              avgResponseTime: responseTime
            }
          })
        } else {
          throw new Error(data.response || 'Unknown error')
        }
      } catch (error: any) {
        providers.push({
          name: 'OnlineSIM',
          status: 'error',
          balance: 0,
          currency: 'USD',
          apiUrl: 'https://onlinesim.io',
          lastCheck: new Date().toISOString(),
          error: error.message
        })
      }
    } else {
      providers.push({
        name: 'OnlineSIM',
        status: 'inactive',
        balance: 0,
        currency: 'USD',
        apiUrl: 'https://onlinesim.io',
        lastCheck: new Date().toISOString(),
        error: 'API Key not configured'
      })
    }

    // Log the check
    await supabaseClient.rpc('log_event', {
      p_level: 'info',
      p_category: 'api',
      p_message: 'Provider status checked',
      p_metadata: { providers: providers.map(p => ({ name: p.name, status: p.status })) },
      p_user_id: user.id
    })

    return new Response(
      JSON.stringify({ success: true, providers }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
