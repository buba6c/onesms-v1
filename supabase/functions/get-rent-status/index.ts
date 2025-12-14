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
    // Support both URL params and body
    const url = new URL(req.url)
    let rentId = url.searchParams.get('rent_id') || url.searchParams.get('rentId')
    let page = url.searchParams.get('page') || '1'
    let size = url.searchParams.get('size') || '20'
    let bodyUserId: string | null = null
    
    console.log('📥 Request method:', req.method)
    console.log('📥 URL params rentId:', rentId)
    
    // Parse body ONCE if POST request
    let body: any = null
    if (req.method === 'POST') {
      try {
        const rawBody = await req.text()
        console.log('📥 Raw body:', rawBody)
        
        if (rawBody) {
          body = JSON.parse(rawBody)
          console.log('📥 Parsed body:', JSON.stringify(body))
          rentId = rentId || body.rentId || body.rent_id
          page = body.page || page
          size = body.size || size
          bodyUserId = body.userId || body.user_id || null
        }
      } catch (e) {
        console.log('⚠️ Could not parse body:', e)
      }
    }
    
    console.log('📥 Final rentId:', rentId)
    
    if (!rentId) {
      console.log('❌ Missing rentId - returning 400')
      await logRental(null as any, { rentId: null, rentalId: null, userId: null, action: 'get-rent-status', status: 'missing-rent-id', payload: { method: req.method, url: req.url }, responseText: 'Missing rentId' })
      return new Response(
        JSON.stringify({ error: 'Missing rentId parameter', debug: { method: req.method, url: req.url } }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🏠 Getting rent status:', { rentId, page, size, bodyUserId })

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
      console.error('❌ No valid authentication')
      await logRental(supabase, { rentId, rentalId: null, userId: null, action: 'get-rent-status', status: 'unauthorized', payload: { method: req.method, rentId }, responseText: 'Unauthorized' })
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'No valid token or userId provided' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Vérifier que le rental appartient à l'utilisateur
    console.log('🔍 Querying rental with:', { rentId, userId })
    
    // Schema has: rent_id (TEXT), rental_id (TEXT) - NO order_id
    let rental = null
    let fetchError = null
    
    // Try rent_id first (primary column in current schema)
    console.log('🔍 Trying rent_id...')
    const { data: rental1, error: error1 } = await supabase
      .from('rentals')
      .select('*')
      .eq('user_id', userId)
      .eq('rent_id', rentId)
      .maybeSingle()
    
    console.log('📋 rent_id query result:', { found: !!rental1, error: error1?.message })
    
    if (rental1) {
      rental = rental1
      console.log('✅ Found rental by rent_id')
    } else if (error1) {
      console.log('⚠️ rent_id error:', error1.message)
      fetchError = error1
    }
    
    // If not found, try rental_id as fallback
    if (!rental) {
      console.log('🔍 Trying rental_id...')
      const { data: rental2, error: error2 } = await supabase
        .from('rentals')
        .select('*')
        .eq('user_id', userId)
        .eq('rental_id', rentId)
        .maybeSingle()
      
      console.log('📋 rental_id query result:', { found: !!rental2, error: error2?.message })
      
      if (rental2) {
        rental = rental2
        console.log('✅ Found rental by rental_id')
      } else if (error2) {
        console.log('⚠️ rental_id error:', error2.message)
        if (!fetchError) fetchError = error2
      }
    }

    console.log('📋 Final result:', { found: !!rental, rentId, userId })

    if (fetchError || !rental) {
      console.error('❌ Rental not found:', { rentId, userId, error: fetchError?.message })
      await logRental(supabase, { rentId, rentalId: null, userId, action: 'get-rent-status', status: 'not-found', payload: { body, rentId, userId }, responseText: fetchError?.message || 'Rental not found' })
      return new Response(
        JSON.stringify({ 
          error: 'Rental not found',
          details: fetchError?.message,
          rentId,
          userId
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Vérifier si le rental est expiré
    const endDate = rental.end_date || rental.expires_at
    let isExpired = false
    if (endDate) {
      const expiresAt = new Date(endDate).getTime()
      const now = Date.now()
      isExpired = now > expiresAt
      if (isExpired) {
        console.log('⏰ Rental expired, but still fetching messages for display')
        // NE PAS retourner ici - continuer pour récupérer les messages
        // Mettre à jour le statut en DB si pas encore fait
        if (rental.status === 'active') {
          await supabase
            .from('rentals')
            .update({ status: 'expired', updated_at: new Date().toISOString() })
            .eq('id', rental.id)
        }

        // 🔒 Politique >20min: commit le frozen même en expiration
        const startDate = new Date(rental.start_date || rental.created_at)
        const minutesElapsed = (now - startDate.getTime()) / 60000
        const frozenAmount = rental.frozen_amount || 0
        if (minutesElapsed > 20 && frozenAmount > 0) {
          console.log('🔓 [EXPIRED-RENT] >20min, committing frozen via secure_unfreeze_balance')
          const { error: commitErr } = await supabase.rpc('secure_unfreeze_balance', {
            p_user_id: rental.user_id,
            p_rental_id: rental.id,
            p_refund_to_balance: false,
            p_refund_reason: 'Rental expired after 20min - commit frozen'
          })
          if (commitErr) {
            console.log('⚠️ secure_unfreeze_balance commit on expired failed:', commitErr.message)
            await logRental(supabase, { rentId, rentalId: rental.rental_id, userId, action: 'get-rent-status', status: 'expired-commit-error', payload: { minutesElapsed, frozenAmount }, responseText: commitErr.message })
          } else {
            await logRental(supabase, { rentId, rentalId: rental.rental_id, userId, action: 'get-rent-status', status: 'expired-commit', payload: { minutesElapsed, frozenAmount }, responseText: 'committed after expiration' })
          }
        }
      }
    }

    // Appel API SMS-Activate pour récupérer les SMS
    const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')!
    const statusUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentStatus&id=${rentId}&page=${page}&size=${size}`

    console.log('📞 Calling SMS-Activate rent status API...')
    
    const response = await fetch(statusUrl)
    const responseText = await response.text()
    
    console.log('📨 SMS-Activate raw response:', responseText)
    
    let data: any
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      // Response might be a simple string like "STATUS_WAIT_CODE"
      console.log('📨 SMS-Activate text response:', responseText)
      
      // Handle common text responses
      if (responseText.includes('STATUS_WAIT_CODE') || responseText.includes('STATUS_WAIT_RETRY')) {
        return new Response(
          JSON.stringify({ 
            success: true,
            quantity: 0,
            messages: [],
            rental: rental,
            status: responseText.trim()
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      // Rental might be cancelled or finished
      if (responseText.includes('NO_ID_RENT') || responseText.includes('BAD_KEY') || responseText.includes('ERROR')) {
        console.log('⚠️ SMS-Activate error response:', responseText)
        return new Response(
          JSON.stringify({ 
            success: false,
            error: responseText.trim(),
            rental: rental,
            message: 'Rental may have expired or been cancelled'
          }),
          { 
            status: 200, // Return 200 so frontend doesn't spam retries
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      return new Response(
        JSON.stringify({ error: 'Invalid API response', raw: responseText }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('📨 SMS-Activate parsed response:', data)

    // Réponse:
    // {
    //   "status": "success",
    //   "quantity": "2",
    //   "values": {
    //     "0": {
    //       "phoneFrom": "79180230628",
    //       "text": "Your code is 12345",
    //       "service": "wa",
    //       "date": "2020-01-30 14:31:58"
    //     }
    //   }
    // }

    // Gérer les cas où la location est terminée ou annulée
    if (data.status === 'error') {
      const errorMessage = data.message || data.errorMsg || ''
      
      // STATUS_FINISH = Location terminée
      // STATUS_CANCEL = Location annulée
      if (errorMessage.includes('STATUS_FINISH') || errorMessage.includes('FINISH')) {
        console.log('✅ Rental finished (STATUS_FINISH) - fetching messages from DB')
        
        // Mettre à jour le statut en DB
        await supabase
          .from('rentals')
          .update({ status: 'finished', updated_at: new Date().toISOString() })
          .eq('id', rental.id)
        
        // Récupérer les messages depuis la DB
        const { data: savedMessages, error: msgError } = await supabase
          .from('rental_messages')
          .select('*')
          .eq('rental_id', rental.id)
          .order('received_at', { ascending: false })
        
        if (msgError) {
          console.log('⚠️ Could not fetch saved messages:', msgError.message)
        } else {
          console.log('📨 Found saved messages:', savedMessages?.length || 0)
        }

        await logRental(supabase, { rentId, rentalId: rental.rental_id, userId, action: 'get-rent-status', status: 'finished', payload: { messages: savedMessages?.length || 0 }, responseText: errorMessage })
        
        // Formater les messages pour correspondre au format attendu
        const messages = (savedMessages || []).map(msg => ({
          phoneFrom: msg.phone_from,
          text: msg.text,
          service: msg.service,
          date: msg.received_at
        }))
        
        return new Response(
          JSON.stringify({ 
            success: true,
            finished: true,
            quantity: messages.length || rental.message_count || 0,
            messages: messages,
            rental: { ...rental, status: 'finished' },
            message: 'Rental has finished'
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      if (errorMessage.includes('STATUS_CANCEL') || errorMessage.includes('CANCEL')) {
        console.log('⚠️ Rental cancelled (STATUS_CANCEL) - fetching messages from DB')
        
        // Mettre à jour le statut en DB
        await supabase
          .from('rentals')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', rental.id)
        
        // Récupérer les messages depuis la DB (au cas où il y en aurait)
        const { data: savedMessages, error: msgError } = await supabase
          .from('rental_messages')
          .select('*')
          .eq('rental_id', rental.id)
          .order('received_at', { ascending: false })
        
        if (msgError) {
          console.log('⚠️ Could not fetch saved messages:', msgError.message)
        }

        await logRental(supabase, { rentId, rentalId: rental.rental_id, userId, action: 'get-rent-status', status: 'cancelled', payload: { messages: savedMessages?.length || 0 }, responseText: errorMessage })
        
        // Formater les messages
        const messages = (savedMessages || []).map(msg => ({
          phoneFrom: msg.phone_from,
          text: msg.text,
          service: msg.service,
          date: msg.received_at
        }))
        
        return new Response(
          JSON.stringify({ 
            success: true,
            cancelled: true,
            quantity: messages.length,
            messages: messages,
            rental: { ...rental, status: 'cancelled' },
            message: 'Rental was cancelled'
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      if (errorMessage.includes('STATUS_REVOKE') || errorMessage.includes('REVOKE')) {
        console.log('⛔ Rental revoked by provider (STATUS_REVOKE)')

        const frozenAmount = rental.frozen_amount || 0
        let refundAmount = 0

        if (frozenAmount > 0) {
          console.log('🔓 [REVOKE-RENT] Refunding frozen via secure_unfreeze_balance', { frozenAmount })
          const { error: revokeRefundErr } = await supabase.rpc('secure_unfreeze_balance', {
            p_user_id: rental.user_id,
            p_rental_id: rental.id,
            p_refund_to_balance: true,
            p_refund_reason: 'STATUS_REVOKE from provider'
          })
          if (revokeRefundErr) {
            console.error('⚠️ secure_unfreeze_balance refund failed (STATUS_REVOKE):', revokeRefundErr.message)
            await logRental(supabase, { rentId, rentalId: rental.rental_id, userId, action: 'get-rent-status', status: 'revoke-refund-error', payload: { frozenAmount }, responseText: revokeRefundErr.message })
          } else {
            refundAmount = frozenAmount
            await logRental(supabase, { rentId, rentalId: rental.rental_id, userId, action: 'get-rent-status', status: 'revoke-refund', payload: { frozenAmount }, responseText: 'refunded' })
          }
        }

        await supabase
          .from('rentals')
          .update({
            status: 'cancelled',
            refund_amount: refundAmount,
            frozen_amount: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', rental.id)

        return new Response(
          JSON.stringify({
            success: true,
            revoked: true,
            refundAmount,
            rental: { ...rental, status: 'cancelled', refund_amount: refundAmount, frozen_amount: 0 },
            message: 'Rental revoked by provider'
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      // Autres erreurs
      console.log('⚠️ SMS-Activate error:', errorMessage)
      await logRental(supabase, { rentId, rentalId: rental.rental_id, userId, action: 'get-rent-status', status: 'sms-activate-error', payload: { rentId, userId }, responseText: errorMessage })
      return new Response(
        JSON.stringify({ 
          success: false,
          error: errorMessage,
          rental: rental
        }),
        { 
          status: 200, // Return 200 to avoid polling spam
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (data.status === 'success') {
      // Convertir l'objet values en array
      const messages = Object.values(data.values || {}).map((msg: any) => ({
        phoneFrom: msg.phoneFrom,
        text: msg.text,
        service: msg.service,
        date: msg.date
      }))
      
      // Sauvegarder les messages en DB pour persistance
      if (messages.length > 0) {
        console.log('💾 Saving messages to DB for persistence...')
        for (const msg of messages) {
          const { error: insertError } = await supabase
            .from('rental_messages')
            .upsert({
              rental_id: rental.id,
              rent_id: rentId,
              phone_from: msg.phoneFrom,
              text: msg.text,
              service: msg.service,
              received_at: msg.date
            }, {
              onConflict: 'rent_id,phone_from,text,received_at'
            })
          
          if (insertError) {
            console.log('⚠️ Could not save message (may already exist):', insertError.message)
          }
        }
        console.log('✅ Messages saved to DB')
      }
      
      // Si expiré, retourner avec flag expired
      if (isExpired) {
        return new Response(
          JSON.stringify({ 
            success: true,
            expired: true,
            quantity: parseInt(data.quantity || '0'),
            messages: messages,
            rental: { ...rental, status: 'expired' },
            message: 'Rental has expired'
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Mettre à jour le rental avec le dernier message
      if (messages.length > 0) {
        const latestMessage = messages[0] as any
        console.log('📝 Updating rental message_count:', { 
          rentalId: rental.id, 
          messageCount: parseInt(data.quantity || '0'),
          latestMessageDate: latestMessage.date
        })
        
        const { error: updateError } = await supabase
          .from('rentals')
          .update({
            last_message_date: latestMessage.date,
            message_count: parseInt(data.quantity || '0'),
            updated_at: new Date().toISOString()
          })
          .eq('id', rental.id) // Use the UUID we already found
        
        if (updateError) {
          console.error('❌ Failed to update rental message_count:', updateError)
        } else {
          console.log('✅ Rental message_count updated successfully')
        }
      }

      await logRental(supabase, { rentId, rentalId: rental.rental_id, userId, action: 'get-rent-status', status: 'success', payload: { messageCount: parseInt(data.quantity || '0') }, responseText: 'fetched' })

      return new Response(
        JSON.stringify({ 
          success: true,
          quantity: parseInt(data.quantity || '0'),
          messages: messages,
          rental: rental
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Fallback - ne devrait jamais arriver car tous les cas sont gérés ci-dessus
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Unknown API response format',
        rawData: data,
        rental: rental
      }),
      { 
        status: 200, // Return 200 to avoid polling spam
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Error in get-rent-status:', error)
    await logRental(null as any, { rentId: null, rentalId: null, userId: null, action: 'get-rent-status', status: 'exception', payload: null, responseText: (error as Error).message })
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
