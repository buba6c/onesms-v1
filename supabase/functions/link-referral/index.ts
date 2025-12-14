// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'missing auth' }), { status: 401, headers: corsHeaders })
    }

    const body = await req.json()
    const referralCode: string = (body?.referral_code || body?.code || '').trim().toLowerCase()

    if (!referralCode) {
      return new Response(JSON.stringify({ error: 'referral_code required' }), { status: 400, headers: corsHeaders })
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const userId = userData.user.id

    // Récupérer réglages pour self-referral et activation
    const { data: settingsRows } = await supabaseAdmin
      .from('system_settings')
      .select('key,value')
      .in('key', [
        'referral_enabled',
        'referral_self_referral_block',
        'referral_expiry_days'
      ])

    const settings = Object.fromEntries((settingsRows || []).map((r) => [r.key, r.value]))
    if (settings.referral_enabled === 'false') {
      return new Response(JSON.stringify({ error: 'program_disabled' }), { status: 400, headers: corsHeaders })
    }

    // Vérifier si déjà lié
    const { data: existing } = await supabaseAdmin
      .from('referrals')
      .select('id, status')
      .eq('referee_id', userId)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ status: 'already_linked', referral_id: existing.id }), { status: 200, headers: corsHeaders })
    }

    // Trouver le parrain via code
    const { data: referrer } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('referral_code', referralCode)
      .maybeSingle()

    if (!referrer) {
      return new Response(JSON.stringify({ error: 'invalid_code' }), { status: 404, headers: corsHeaders })
    }

    if (settings.referral_self_referral_block === 'true' && referrer.id === userId) {
      return new Response(JSON.stringify({ error: 'self_referral_blocked' }), { status: 400, headers: corsHeaders })
    }

    const expiryDays = parseInt(settings.referral_expiry_days || '14', 10)
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + (isNaN(expiryDays) ? 14 : expiryDays))

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('referrals')
      .insert({
        referrer_id: referrer.id,
        referee_id: userId,
        status: 'pending',
        expiry_date: expiryDate.toISOString(),
        metadata: { source: 'signup', code: referralCode }
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('referral insert error', insertError)
      return new Response(JSON.stringify({ error: 'insert_failed' }), { status: 400, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ status: 'linked', referral_id: inserted.id }), { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error('[link-referral] error', error)
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500, headers: corsHeaders })
  }
})
