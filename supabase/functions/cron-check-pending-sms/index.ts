import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.io/stubs/handler_api.php'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔄 [CRON-CHECK-SMS] Starting periodic SMS check...')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all pending/waiting activations
    const { data: activations, error: fetchError } = await supabaseClient
      .from('activations')
      .select('*')
      .in('status', ['pending', 'waiting'])
      .order('created_at', { ascending: true })
      .limit(50)

    if (fetchError) {
      throw new Error(`Failed to fetch activations: ${fetchError.message}`)
    }

    console.log(`📊 [CRON-CHECK-SMS] Found ${activations?.length || 0} pending activations`)

    const results = {
      checked: 0,
      found: 0,
      expired: 0,
      errors: [] as string[]
    }

    for (const activation of activations || []) {
      try {
        console.log(`\n🔍 [CRON-CHECK-SMS] Checking ${activation.phone} (${activation.order_id})...`)
        results.checked++

        // Check if expired
        const expiresAt = new Date(activation.expires_at)
        const now = new Date()
        
        if (now > expiresAt) {
          console.log(`⏰ [CRON-CHECK-SMS] Expired: ${activation.order_id}`)
          
          await supabaseClient
            .from('activations')
            .update({ status: 'timeout' })
            .eq('id', activation.id)

          // Refund frozen balance
          const { data: transaction } = await supabaseClient
            .from('transactions')
            .select('*')
            .eq('related_activation_id', activation.id)
            .eq('status', 'pending')
            .single()

          if (transaction) {
            await supabaseClient
              .from('transactions')
              .update({ status: 'refunded' })
              .eq('id', transaction.id)

            const { data: user } = await supabaseClient
              .from('users')
              .select('frozen_balance')
              .eq('id', activation.user_id)
              .single()

            if (user) {
              await supabaseClient
                .from('users')
                .update({
                  frozen_balance: Math.max(0, user.frozen_balance - activation.price)
                })
                .eq('id', activation.user_id)
            }
          }

          results.expired++
          continue
        }

        // Check V1 API (more reliable)
        const v1Url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getStatus&id=${activation.order_id}`
        const v1Response = await fetch(v1Url)
        const v1Text = await v1Response.text()

        console.log(`📥 [CRON-CHECK-SMS] V1 Response: ${v1Text}`)

        if (v1Text.startsWith('STATUS_OK:')) {
          const code = v1Text.split(':')[1]
          const smsText = `Votre code de validation est ${code}`

          console.log(`✅ [CRON-CHECK-SMS] SMS found! Code: ${code}`)

          // Update activation
          await supabaseClient
            .from('activations')
            .update({
              status: 'received',
              sms_code: code,
              sms_text: smsText
            })
            .eq('id', activation.id)

          // Charge user
          const { data: transaction } = await supabaseClient
            .from('transactions')
            .select('*')
            .eq('related_activation_id', activation.id)
            .eq('status', 'pending')
            .single()

          if (transaction) {
            await supabaseClient
              .from('transactions')
              .update({ status: 'completed' })
              .eq('id', transaction.id)

            const { data: user } = await supabaseClient
              .from('users')
              .select('balance, frozen_balance')
              .eq('id', activation.user_id)
              .single()

            if (user) {
              await supabaseClient
                .from('users')
                .update({
                  balance: user.balance - activation.price,
                  frozen_balance: Math.max(0, user.frozen_balance - activation.price)
                })
                .eq('id', activation.user_id)

              console.log(`💰 [CRON-CHECK-SMS] User charged: ${activation.price}`)
            }
          }

          results.found++
        } else if (v1Text === 'STATUS_CANCEL') {
          console.log(`❌ [CRON-CHECK-SMS] Cancelled: ${activation.order_id}`)
          
          await supabaseClient
            .from('activations')
            .update({ status: 'cancelled' })
            .eq('id', activation.id)
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error: any) {
        console.error(`❌ [CRON-CHECK-SMS] Error for ${activation.order_id}:`, error.message)
        results.errors.push(`${activation.order_id}: ${error.message}`)
      }
    }

    console.log('\n✅ [CRON-CHECK-SMS] Check complete')
    console.log(`   Checked: ${results.checked}`)
    console.log(`   Found SMS: ${results.found}`)
    console.log(`   Expired: ${results.expired}`)
    console.log(`   Errors: ${results.errors.length}`)

    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('❌ [CRON-CHECK-SMS] Fatal error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
