import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const SMS_ACTIVATE_BASE_URL = 'https://hero-sms.com/stubs/handler_api.php'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Extract verification code from SMS text
function extractCode(text: string): string | null {
  if (!text) return null
  // Try various patterns: 6 digits, 4 digits, code: XXXX, etc.
  const patterns = [
    /\b(\d{6})\b/,           // 6 digits
    /\b(\d{5})\b/,           // 5 digits
    /\b(\d{4})\b/,           // 4 digits
    /code[:\s]+(\d+)/i,      // code: XXXXX
    /\b([A-Z0-9]{6,8})\b/    // Alphanumeric 6-8 chars
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[1]
  }
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use SERVICE_ROLE_KEY to bypass RLS for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { rentalId, userId } = await req.json()

    console.log('📬 [GET-SMS-ACTIVATE-INBOX] Request:', { rentalId, userId })

    // 1. Get rental from database
    const { data: rental, error: rentalError } = await supabaseClient
      .from('rentals')
      .select('*')
      .eq('id', rentalId)
      .eq('user_id', userId)
      .single()

    if (rentalError || !rental) {
      throw new Error('Rental not found or unauthorized')
    }

    // 2. Check rental status on SMS-Activate
    // Support multiple column names for SMS-Activate rent ID
    const smsActivateRentId = rental.order_id || rental.rent_id || rental.rental_id
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentStatus&id=${smsActivateRentId}`
    console.log('🌐 [GET-SMS-ACTIVATE-INBOX] API Call:', apiUrl.replace(SMS_ACTIVATE_API_KEY!, 'KEY_HIDDEN'))

    const response = await fetch(apiUrl)
    const data = await response.json()

    console.log('📥 [GET-SMS-ACTIVATE-INBOX] API Response:', JSON.stringify(data))

    // Response format varies:
    // - When waiting: { status: "error", message: "STATUS_WAIT_CODE", errorMsg: "..." }
    // - When has SMS: { status: "success", phone: "...", values: [{phoneFrom, text, service, date}] }
    // - When finished: { status: "finish", phone: "...", values: [...] }
    
    let messages: any[] = []
    let rentalStatus = 'active'
    
    if (data.status === 'error' && data.message === 'STATUS_WAIT_CODE') {
      // No messages yet, rental still active
      messages = []
      rentalStatus = 'active'
    } else if (data.status === 'success' || data.status === 'finish') {
      messages = data.values || []
      rentalStatus = data.status === 'finish' ? 'expired' : 'active'
    } else if (data.status === 'error') {
      // Could be expired/cancelled
      console.warn('⚠️ [GET-SMS-ACTIVATE-INBOX] Unexpected error:', data)
      rentalStatus = 'error'
    }

    // Update rental status if changed
    if (rentalStatus === 'expired' && rental.status === 'active') {
      await supabaseClient
        .from('rentals')
        .update({ status: 'expired' })
        .eq('id', rentalId)
    }

    // Parse messages
    const parsedMessages = messages.map((msg: any) => ({
      text: msg.text,
      code: extractCode(msg.text), // Extract code from text if not provided
      service: msg.service || msg.phoneFrom || 'Unknown',
      date: msg.date || new Date().toISOString()
    }))

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          rental_id: rental.id,
          phone: rental.phone,
          status: rentalStatus === 'error' ? rental.status : rentalStatus,
          end_date: rental.end_date,
          messages: parsedMessages,
          total_messages: parsedMessages.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ [GET-SMS-ACTIVATE-INBOX] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
