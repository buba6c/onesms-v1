// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { loggedFetch } from '../_shared/logged-fetch.ts'
import { SMSPoolClient } from '../_shared/smspool.ts'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const SMS_ACTIVATE_BASE_URL = 'https://hero-sms.com/stubs/handler_api.php'
// Note: SMSPool API Key will be fetched from DB

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

    // Fetch SMSPool API Key
    const { data: spSettings } = await supabaseClient.from('system_settings').select('value').eq('key', 'smspool_api_key').single()
    const SMSPOOL_API_KEY = spSettings?.value

    const { data: activations, error: fetchError } = await supabaseClient
      .from('activations')
      .select('*')
      .in('status', ['pending', 'waiting'])
      .in('provider', ['sms-activate', '5sim', 'grizzly', 'onlinesim', 'smspool']) // 🔧 ADDED: smspool
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
      errors: [] as string[],
    }

    for (const activation of activations || []) {
      try {
        console.log(`\n🔍 [CRON-CHECK-SMS] Checking ${activation.phone} (${activation.order_id})...`)
        results.checked++

        const expiresAt = new Date(activation.expires_at)
        const now = new Date()

        if (now > expiresAt) {
          console.log(`⏰ [CRON-CHECK-SMS] Expired: ${activation.order_id}`)

          const { data: lockedActivation, error: lockError } = await supabaseClient
            .from('activations')
            .update({
              status: 'timeout',
              charged: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', activation.id)
            .in('status', ['pending', 'waiting'])
            .select()
            .single()

          if (!lockedActivation || lockError) {
            console.log('⚠️ [CRON-CHECK-SMS] Already processed (lock failed)')
            results.expired++
            continue
          }

          const { data: refundResult, error: refundErr } = await supabaseClient.rpc('atomic_refund', {
            p_user_id: activation.user_id,
            p_activation_id: activation.id,
            p_rental_id: null,
            p_transaction_id: null,
            p_reason: 'Cron timeout (expired)',
          })

          if (refundErr) {
            console.error('⚠️ [CRON-CHECK-SMS] atomic_refund failed:', refundErr)
          } else if (refundResult?.idempotent) {
            console.log('⚠️ [CRON-CHECK-SMS] Already refunded (idempotent)')
          } else {
            console.log(`✅ [CRON-CHECK-SMS] atomic_refund SUCCESS: ${refundResult?.refunded || 0} refunded`)
          }

          results.expired++
          continue
        }

        if (activation.provider === 'smspool') {
          if (!SMSPOOL_API_KEY) {
            console.error(`❌ [CRON-CHECK-SMS] SMSPool API Key missing for ${activation.order_id}`)
            results.errors.push(`${activation.order_id}: Missing SMSPool Key`)
            continue
          }

          try {
            const client = new SMSPoolClient(SMSPOOL_API_KEY)
            // Use robust timeout of 10s via client internal logic
            const check = await client.checkOrder(activation.order_id)
            const statusNum = Number(check.status)

            // CRITICAL: SMSPool returns status=3 (Expired) BUT still includes the SMS code!
            // So we MUST check for SMS presence FIRST, regardless of status
            if (check.sms && check.full_sms) {
              const smsCode = check.sms
              const smsText = check.full_sms
              console.log(`✅ [CRON-CHECK-SMS] SMSPool SMS RECEIVED (status=${statusNum}): ${smsCode}`)

              const { data: processResult, error: processError } = await supabaseClient.rpc('process_sms_received', {
                p_order_id: activation.order_id,
                p_code: smsCode,
                p_text: smsText,
                p_source: 'cron_smspool'
              })

              if (processError) {
                console.error(`❌ [CRON-CHECK-SMS] process_sms_received error: ${processError.message}`)
              } else {
                results.found++
                console.log(`✅ [CRON-CHECK-SMS] process_sms_received SUCCESS (atomic)`)
              }
            } else if (statusNum === 3) {
              console.log(`ℹ️ [CRON-CHECK-SMS] SMSPool reports 'expired/cancelled' for ${activation.order_id} with NO SMS. Waiting for local timeout expire.`)
              // We DO NOT refund immediately here to correspond with the "disable refund" policy we adopted in the main function.
              // We let the "local timeout" (20 min) handle the refund at the top of this loop.
            } else {
              // Status 1 = pending, no SMS yet
              // console.log(`⏳ [CRON-CHECK-SMS] SMSPool Pending: ${statusNum}`)
            }

          } catch (err) {
            console.error(`❌ [CRON-CHECK-SMS] SMSPool Check Error for ${activation.order_id}:`, err)
          }
          continue // SKIP SMS-ACTIVATE LOGIC
        }

        const v1Url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getStatus&id=${activation.order_id}`
        const { responseText: v1Text } = await loggedFetch(v1Url, {
          action: 'getStatus',
          provider: 'sms-activate',
          userId: activation.user_id,
          activationId: activation.id,
        })

        console.log(`📥 [CRON-CHECK-SMS] V1 Response: ${v1Text}`)

        if (v1Text.startsWith('STATUS_OK:')) {
          const code = v1Text.split(':')[1]
          const smsText = `Votre code de validation est ${code}`

          const { data: processResult, error: processError } = await supabaseClient.rpc('process_sms_received', {
            p_order_id: activation.order_id,
            p_code: code,
            p_text: smsText,
            p_source: 'cron',
          })

          if (processError) {
            console.error(`❌ [CRON-CHECK-SMS] process_sms_received error for ${activation.order_id}:`, processError)
            continue
          }

          if (processResult?.success) {
            console.log(`✅ [CRON-CHECK-SMS] process_sms_received SUCCESS for ${activation.order_id}`)
          } else {
            console.error(`❌ [CRON-CHECK-SMS] process_sms_received returned error payload for ${activation.order_id}:`, processResult)
          }

          results.found++
        } else if (v1Text === 'STATUS_CANCEL') {
          console.log(`❌ [CRON-CHECK-SMS] Cancelled: ${activation.order_id}`)

          const { data: lockedActivation, error: lockError } = await supabaseClient
            .from('activations')
            .update({
              status: 'cancelled',
              charged: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', activation.id)
            .in('status', ['pending', 'waiting'])
            .select()
            .single()

          if (!lockedActivation || lockError) {
            console.log('⚠️ [CRON-CHECK-SMS] Already processed (lock failed)')
            continue
          }

          const { data: refundResult, error: refundErr } = await supabaseClient.rpc('atomic_refund', {
            p_user_id: activation.user_id,
            p_activation_id: activation.id,
            p_rental_id: null,
            p_transaction_id: null,
            p_reason: 'Cron cancelled (STATUS_CANCEL)',
          })

          if (refundErr) {
            console.error('⚠️ [CRON-CHECK-SMS] atomic_refund failed:', refundErr)
          } else if (refundResult?.idempotent) {
            console.log('⚠️ [CRON-CHECK-SMS] Already refunded (idempotent)')
          } else {
            console.log(`✅ [CRON-CHECK-SMS] atomic_refund SUCCESS: ${refundResult?.refunded || 0} refunded`)
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error: any) {
        console.error(`❌ [CRON-CHECK-SMS] Error for ${activation.order_id}:`, error.message)
        results.errors.push(`${activation.order_id}: ${error.message}`)
      }
    }

    console.log('\n✅ [CRON-CHECK-SMS] Activations check complete')
    console.log(`   Checked: ${results.checked}`)
    console.log(`   Found SMS: ${results.found}`)
    console.log(`   Expired: ${results.expired}`)
    console.log(`   Errors: ${results.errors.length}`)

    console.log('\n🏠 [CRON-CHECK-SMS] Starting rentals check...')

    const rentalResults = {
      checked: 0,
      found: 0,
      expired: 0,
      errors: [] as string[],
    }

    const { data: rentals, error: rentalsFetchError } = await supabaseClient
      .from('rentals')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(50)

    if (rentalsFetchError) {
      console.error(`❌ [CRON-CHECK-SMS] Failed to fetch rentals: ${rentalsFetchError.message}`)
    } else {
      console.log(`📊 [CRON-CHECK-SMS] Found ${rentals?.length || 0} active rentals`)

      for (const rental of rentals || []) {
        try {
          const rentId = rental.order_id || rental.rent_id || rental.rental_id

          if (!rentId) {
            console.warn(`⚠️ [CRON-CHECK-SMS] No rent ID found for rental ${rental.id}`)
            continue
          }

          console.log(`\n🔍 [CRON-CHECK-SMS] Checking rental ${rental.phone} (${rentId})...`)
          rentalResults.checked++

          const expiresAt = new Date(rental.expires_at || rental.end_date)
          const now = new Date()

          if (now > expiresAt) {
            console.log(`⏰ [CRON-CHECK-SMS] Rental expired: ${rentId}`)

            await supabaseClient
              .from('rentals')
              .update({
                status: 'expired',
                updated_at: new Date().toISOString(),
              })
              .eq('id', rental.id)

            rentalResults.expired++
            continue
          }

          const rentStatusUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentStatus&id=${rentId}`
          console.log(`📞 [CRON-CHECK-SMS] Calling getRentStatus for ${rentId}...`)

          const rentResponse = await fetch(rentStatusUrl)
          const rentData = await rentResponse.json()

          console.log('📨 [CRON-CHECK-SMS] Rent status response:', rentData)

          if (rentData.status === 'success') {
            const messages = Object.values(rentData.values || {}) as any[]
            const messageCount = parseInt(rentData.quantity || '0')
            const currentCount = rental.message_count || rental.sms_count || 0

            if (messageCount > currentCount) {
              console.log(`📩 [CRON-CHECK-SMS] New SMS for rental ${rentId}: ${messageCount} (was ${currentCount})`)

              const latestMessage = messages[0]

              await supabaseClient
                .from('rentals')
                .update({
                  message_count: messageCount,
                  sms_count: messageCount,
                  last_message_date: latestMessage?.date,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', rental.id)

              rentalResults.found++
            }
          } else if (rentData.status === 'error') {
            console.warn(`⚠️ [CRON-CHECK-SMS] API error for rental ${rentId}:`, rentData.message)
          }

          await new Promise((resolve) => setTimeout(resolve, 500))
        } catch (error: any) {
          console.error(`❌ [CRON-CHECK-SMS] Error for rental ${rental.id}:`, error.message)
          rentalResults.errors.push(`${rental.id}: ${error.message}`)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        activations: results,
        rentals: rentalResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    console.error('❌ [CRON-CHECK-SMS] Unexpected error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
