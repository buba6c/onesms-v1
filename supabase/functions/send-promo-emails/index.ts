// Edge Function: send-promo-emails
// Envoie des emails promotionnels en masse à tous les utilisateurs ou un segment

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Vérifier que c'est un admin qui appelle
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header:', authHeader ? 'Present' : 'Missing')

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized - No auth header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Vérifier le token
    const token = authHeader.replace('Bearer ', '')
    console.log('Token:', token.substring(0, 20) + '...')

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    console.log('Auth result:', {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      error: authError?.message
    })

    if (authError || !user) {
      return new Response(JSON.stringify({
        error: 'Invalid token',
        details: authError?.message
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Vérifier que c'est un admin
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    console.log('Profile check:', { role: profile?.role, error: profileError?.message })

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({
        error: 'Admin only',
        role: profile?.role
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const {
      title,
      message,
      promoCode,
      discount,
      emailType = 'operational',
      filter = {},
      skipCampaignLog = false // New param to control DB logging
    } = await req.json()

    // ... (rest of validation) ...

    // ... (inside the code) ...

    // Logger la campagne AVANT l'envoi (condionnel)
    let campaignId: string | null = null
    if (!skipCampaignLog) {
      try {
        const campaignData: any = {
          // ... (existing logging logic) ...
          name: `${title} (${emailType})`,
          subject: `${title} - One SMS`,
          title,
          message,
          status: 'in_progress',
          total_recipients: targetUsers.length,
          sent_count: 0,
          created_by: user.id,
          sent_at: new Date().toISOString(),
        }
        if (promoCode) campaignData.promo_code = promoCode
        if (discount) campaignData.discount = discount

        const { data: campaign } = await supabase
          .from('email_campaigns')
          .insert(campaignData)
          .select('id')
          .single()

        if (campaign?.id) campaignId = campaign.id
      } catch (logError) {
        console.error('⚠️ Failed to pre-log campaign:', logError)
      }
    }

    // ... (sending logic) ...

    // Mettre à jour la campagne (condionnel)
    if (!skipCampaignLog && campaignId) {
      // ... (existing update logic) ...
      try {
        await supabase.from('email_campaigns').update({
          status: 'sent',
          sent_count: results.sent,
          failed_count: results.failed,
        }).eq('id', campaignId)
      } catch (e) { console.error(e) }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: targetUsers.length,
        sent: results.sent,
        failed: results.failed,
        errors: results.errors.slice(0, 10), // Limiter les erreurs retournées
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Promo email error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
