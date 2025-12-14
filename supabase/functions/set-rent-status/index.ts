// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'

async function logRental(supabase: any, entry: Record<string, any>) {
  if (!supabase) return
  try {
    await supabase.from('rental_logs').insert({
      rent_id: entry.rentId,
      rental_id: entry.rentalId,
      user_id: entry.userId,
      action: entry.action,
      status: entry.status,
      payload: entry.payload,
      response_text: entry.responseText,
      created_at: new Date().toISOString()
    })
  } catch (e) {
    console.log('⚠️ rental_logs insert failed (ignored):', (e as Error).message)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse body once
    let body: any = {}
    try {
      const rawBody = await req.text()
      console.log('📥 Raw body:', rawBody)
      if (rawBody) {
        body = JSON.parse(rawBody)
      }
    } catch (e) {
      console.log('⚠️ Could not parse body:', e)
    }
    
    const { rentId, action, userId: bodyUserId } = body
    
    console.log('📥 Parsed:', { rentId, action, bodyUserId })
    
    if (!rentId || !action) {
      console.log('❌ Missing rentId or action')
      return new Response(
        JSON.stringify({ error: 'Missing rentId or action', received: body }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (action !== 'finish' && action !== 'cancel') {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be "finish" or "cancel"' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`🏠 ${action === 'finish' ? 'Finishing' : 'Canceling'} rental:`, rentId)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Vérifier l'authentification - support token OU userId dans body
    let userId: string | null = null
    
    // 1. Essayer d'abord via le token Authorization
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (!authError && user) {
          userId = user.id
          console.log('✅ User authenticated via token:', userId)
        }
      } catch (e) {
        console.log('⚠️ Token auth failed:', e)
      }
    }
    
    // 2. Si pas de token valide, utiliser userId depuis le body
    if (!userId && bodyUserId) {
      userId = bodyUserId
      console.log('✅ User ID from body:', userId)
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'No valid token or userId provided' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Vérifier que le rental appartient à l'utilisateur (schéma actuel: rent_id / rental_id)
    let rental = null

    const { data: rental2 } = await supabase
      .from('rentals')
      .select('*')
      .eq('rent_id', rentId)
      .eq('user_id', userId)
      .single()
    
    if (rental2) {
      rental = rental2
    } else {
      // Try rental_id
      const { data: rental3 } = await supabase
        .from('rentals')
        .select('*')
        .eq('rental_id', rentId)
        .eq('user_id', userId)
        .single()
      rental = rental3
    }

    if (!rental) {
      await logRental(supabase, {
        rentId,
        rentalId: null,
        userId,
        action,
        status: 'not-found',
        payload: body,
        responseText: 'Rental not found'
      })
      return new Response(
        JSON.stringify({ error: 'Rental not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Vérifier que le rental est actif
    if (rental.status !== 'active') {
      // Si déjà terminé ou annulé, retourner succès (idempotent)
      if (rental.status === 'completed' || rental.status === 'finished' || rental.status === 'cancelled') {
        console.log('ℹ️ Rental already in terminal state:', rental.status)
        await logRental(supabase, {
          rentId,
          rentalId: rental.rental_id,
          userId,
          action,
          status: `already-${rental.status}`,
          payload: body,
          responseText: 'Rental already terminal'
        })
        return new Response(
          JSON.stringify({ 
            success: true,
            message: `Rental already ${rental.status}`,
            status: rental.status,
            refundAmount: 0
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      return new Response(
        JSON.stringify({ error: 'Rental is not active', currentStatus: rental.status }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Appel API SMS-Activate
    const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')!
    const status = action === 'finish' ? '1' : '2'
    const setStatusUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setRentStatus&id=${rentId}&status=${status}`

    console.log('📞 Calling SMS-Activate set rent status API...')
    
    const response = await fetch(setStatusUrl)
    const data = await response.json()

    console.log('📨 SMS-Activate response:', data)

    // Gérer les réponses SMS-Activate
    const isSuccess = data.status === 'success'
    const isAlreadyFinished = data.message?.includes('STATUS_FINISH') || data.message?.includes('FINISH')
    const isAlreadyCancelled = data.message?.includes('STATUS_CANCEL') || data.message?.includes('CANCEL')
    
    if (isSuccess || isAlreadyFinished || isAlreadyCancelled) {
      // 🔒 FES avec fonctions atomiques
      let refundAmount = 0
      // ✅ SÉCURITÉ: Utiliser UNIQUEMENT frozen_amount
      const frozenAmount = rental.frozen_amount || 0

      if (action === 'cancel' && (isSuccess || isAlreadyCancelled)) {
        const startDate = new Date(rental.start_date || rental.created_at)
        const now = new Date()
        const minutesElapsed = (now.getTime() - startDate.getTime()) / 60000

        if (minutesElapsed <= 20 && frozenAmount > 0) {
          // Refund to balance (guard-safe)
          refundAmount = frozenAmount
          console.log(`🔓 [CANCEL-RENT] Calling secure_unfreeze_balance refund amount=${refundAmount}`)
          const { data: refundResult, error: refundErr } = await supabase.rpc('secure_unfreeze_balance', {
            p_user_id: userId,
            p_rental_id: rental.id,
            p_refund_to_balance: true,
            p_refund_reason: 'Rental cancelled by user (< 20min)'
          })
          if (refundErr) {
            console.error('⚠️ secure_unfreeze_balance refund failed:', refundErr)
            await logRental(supabase, {
              rentId,
              rentalId: rental.rental_id,
              userId,
              action: 'cancel-refund',
              status: 'error',
              payload: { body, minutesElapsed, frozenAmount },
              responseText: refundErr.message
            })
          } else {
            console.log(`💰 [CANCEL-RENT] secure_unfreeze_balance refund SUCCESS:`, refundResult)
            await logRental(supabase, {
              rentId,
              rentalId: rental.rental_id,
              userId,
              action: 'cancel-refund',
              status: 'ok',
              payload: { body, minutesElapsed, frozenAmount },
              responseText: 'refunded'
            })
          }
        } else {
          // Consume frozen (commit) after 20min
          console.log(`🔓 [CANCEL-RENT] >20min, calling secure_unfreeze_balance commit`)
          const { data: commitResult, error: commitErr } = await supabase.rpc('secure_unfreeze_balance', {
            p_user_id: userId,
            p_rental_id: rental.id,
            p_refund_to_balance: false,
            p_refund_reason: 'Rental cancelled after 20min - no refund'
          })
          if (commitErr) {
            console.error('⚠️ secure_unfreeze_balance commit failed:', commitErr)
            await logRental(supabase, {
              rentId,
              rentalId: rental.rental_id,
              userId,
              action: 'cancel-commit',
              status: 'error',
              payload: { body, minutesElapsed, frozenAmount },
              responseText: commitErr.message
            })
          } else {
            console.log(`🔓 [CANCEL-RENT] secure_unfreeze_balance commit SUCCESS:`, commitResult)
            await logRental(supabase, {
              rentId,
              rentalId: rental.rental_id,
              userId,
              action: 'cancel-commit',
              status: 'ok',
              payload: { body, minutesElapsed, frozenAmount },
              responseText: 'committed after threshold'
            })
          }
        }
      } else if (action === 'finish' || isAlreadyFinished) {
        // Commit frozen when finished (skip if no frozen amount - legacy rentals)
        if (frozenAmount > 0) {
          console.log(`🔓 [FINISH-RENT] Calling secure_unfreeze_balance commit`)
          const { data: commitResult, error: commitErr } = await supabase.rpc('secure_unfreeze_balance', {
            p_user_id: userId,
            p_rental_id: rental.id,
            p_refund_to_balance: false,
            p_refund_reason: 'Rental finished by user'
          })
          if (commitErr) {
            console.error('⚠️ secure_unfreeze_balance commit failed:', commitErr)
            await logRental(supabase, {
              rentId,
              rentalId: rental.rental_id,
              userId,
              action: 'finish-commit',
              status: 'error',
              payload: { body, frozenAmount },
              responseText: commitErr.message
            })
          } else {
            console.log(`🔓 [FINISH-RENT] secure_unfreeze_balance commit SUCCESS:`, commitResult)
            await logRental(supabase, {
              rentId,
              rentalId: rental.rental_id,
              userId,
              action: 'finish-commit',
              status: 'ok',
              payload: { body, frozenAmount },
              responseText: 'committed'
            })
          }
        } else {
          console.log(`ℹ️ [FINISH-RENT] No frozen amount - legacy rental or already consumed`)
          await logRental(supabase, {
            rentId,
            rentalId: rental.rental_id,
            userId,
            action: 'finish-no-freeze',
            status: 'ok',
            payload: { body },
            responseText: 'no frozen amount to commit'
          })
        }
      }

      // Déterminer le nouveau statut
      // Note: constraint CHECK autorise: 'active', 'completed', 'cancelled', 'expired'
      let newStatus = action === 'finish' || isAlreadyFinished ? 'completed' : 'cancelled'
      if (isAlreadyCancelled) newStatus = 'cancelled'
      
      // Mettre à jour le statut du rental et reset frozen_amount
      const { error: updateError } = await supabase
        .from('rentals')
        .update({
          status: newStatus,
          refund_amount: refundAmount,
          frozen_amount: 0,
          end_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', rental.id)

      if (updateError) {
        console.error('❌ Failed to update rental status:', updateError)
        await logRental(supabase, {
          rentId,
          rentalId: rental.rental_id,
          userId,
          action: 'update-status',
          status: 'error',
          payload: { body, newStatus },
          responseText: updateError.message
        })
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update rental status in database',
            details: updateError.message
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      console.log(`✅ Rental status updated to: ${newStatus}`)

      // Update related transaction status to completed
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('related_rental_id', rental.id)
        .eq('status', 'pending')
        .maybeSingle()

      if (transaction) {
        await supabase
          .from('transactions')
          .update({ 
            status: 'completed',
            metadata: {
              ...transaction.metadata,
              completed_at: new Date().toISOString(),
              completion_reason: action,
              refund_amount: refundAmount
            }
          })
          .eq('id', transaction.id)
      }

      await logRental(supabase, {
        rentId,
        rentalId: rental.rental_id,
        userId,
        action,
        status: 'success',
        payload: { body, newStatus, refundAmount },
        responseText: data.message || 'success'
      })

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Rental ${action === 'finish' ? 'finished' : 'cancelled'} successfully`,
          status: newStatus,
          refundAmount: refundAmount
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      const errorMessage = data.message || 'Failed to update rent status'
      console.log('⚠️ SMS-Activate returned error:', errorMessage)
      // Fallback: if cancel requested, still unfreeze locally to avoid stuck frozen funds
      if (action === 'cancel') {
        const startDate = new Date(rental.start_date || rental.created_at)
        const now = new Date()
        const minutesElapsed = (now.getTime() - startDate.getTime()) / 60000
        const frozenAmount = rental.frozen_amount || 0

        let refundAmount = 0
        let fallbackStatus = 'cancelled'
        if (minutesElapsed <= 20 && frozenAmount > 0) {
          refundAmount = frozenAmount
          const { error: refundErr } = await supabase.rpc('secure_unfreeze_balance', {
            p_user_id: userId,
            p_rental_id: rental.id,
            p_refund_to_balance: true,
            p_refund_reason: 'Rental cancelled by user (<20min) fallback'
          })
          if (refundErr) {
            await logRental(supabase, {
              rentId,
              rentalId: rental.rental_id,
              userId,
              action: 'cancel-refund-fallback',
              status: 'error',
              payload: { body, minutesElapsed, frozenAmount },
              responseText: refundErr.message
            })
            return new Response(
              JSON.stringify({ success: false, error: `Fallback refund failed: ${refundErr.message}`, rental: { id: rental.id, status: rental.status } }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        } else {
          // commit after 20min to clear frozen if provider failed
          const { error: commitErr } = await supabase.rpc('secure_unfreeze_balance', {
            p_user_id: userId,
            p_rental_id: rental.id,
            p_refund_to_balance: false,
            p_refund_reason: 'Rental cancel fallback after 20min'
          })
          if (commitErr) {
            await logRental(supabase, {
              rentId,
              rentalId: rental.rental_id,
              userId,
              action: 'cancel-commit-fallback',
              status: 'error',
              payload: { body, minutesElapsed, frozenAmount },
              responseText: commitErr.message
            })
            return new Response(
              JSON.stringify({ success: false, error: `Fallback commit failed: ${commitErr.message}`, rental: { id: rental.id, status: rental.status } }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }

        await supabase
          .from('rentals')
          .update({
            status: fallbackStatus,
            refund_amount: refundAmount,
            frozen_amount: 0,
            end_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', rental.id)

        await logRental(supabase, {
          rentId,
          rentalId: rental.rental_id,
          userId,
          action: 'cancel-fallback',
          status: 'ok',
          payload: { body, minutesElapsed, frozenAmount, refundAmount },
          responseText: errorMessage
        })

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Rental cancelled locally (provider error)',
            status: fallbackStatus,
            refundAmount
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      await logRental(supabase, {
        rentId,
        rentalId: rental.rental_id,
        userId,
        action,
        status: 'sms-activate-error',
        payload: { body },
        responseText: errorMessage
      })
      
      // Return 200 to avoid console spam, but indicate failure
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          rental: { id: rental.id, status: rental.status }
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('❌ Error in set-rent-status:', error)
    await logRental(supabase, {
      rentId: null,
      rentalId: null,
      userId: null,
      action: 'set-rent-status',
      status: 'exception',
      payload: null,
      responseText: (error as Error).message
    })
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
