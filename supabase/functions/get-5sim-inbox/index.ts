import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId, userId } = await req.json()

    console.log('📬 [INBOX] Récupération inbox pour order:', orderId)

    // Récupérer l'API key 5sim
    const fiveSimApiKey = Deno.env.get('FIVE_SIM_API_KEY')
    if (!fiveSimApiKey) {
      throw new Error('5sim API key not configured')
    }

    // Appeler l'API 5sim pour récupérer les SMS
    const inboxUrl = `https://5sim.net/v1/user/sms/inbox/${orderId}`
    console.log('🌐 [INBOX] Appel 5sim:', inboxUrl)

    const inboxResponse = await fetch(inboxUrl, {
      headers: {
        'Authorization': `Bearer ${fiveSimApiKey}`,
        'Accept': 'application/json'
      }
    })

    if (!inboxResponse.ok) {
      const errorText = await inboxResponse.text()
      console.error('❌ [INBOX] 5sim error:', errorText)
      throw new Error(`5sim API error: ${inboxResponse.status}`)
    }

    const inboxData = await inboxResponse.json()
    console.log('✅ [INBOX] SMS récupérés:', inboxData.Total || 0)

    return new Response(
      JSON.stringify({
        success: true,
        data: inboxData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('❌ [INBOX] Exception:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
