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
      emailType = 'operational', // Type d'email : operational, maintenance, incident, new_feature, promo, etc.
      filter = {} // { minBalance, maxBalance, inactiveDays, limit, offset }
    } = await req.json()

    if (!title || !message) {
      return new Response(JSON.stringify({ error: 'title and message are required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Déterminer le style selon le type (sans emoji)
    const emailStyles = {
      operational: { color: '#10b981', bgColor: '#10b98114' },
      maintenance: { color: '#f59e0b', bgColor: '#f59e0b14' },
      incident: { color: '#3b82f6', bgColor: '#3b82f614' },
      new_feature: { color: '#8b5cf6', bgColor: '#8b5cf614' },
      welcome_back: { color: '#06b6d4', bgColor: '#06b6d414' },
      security: { color: '#ef4444', bgColor: '#ef444414' },
      promo: { color: '#10b981', bgColor: '#10b98114' },
      custom: { color: '#3b82f6', bgColor: '#3b82f614' },
    }
    const style = emailStyles[emailType as keyof typeof emailStyles] || emailStyles.operational

    // Construire la requête pour récupérer les utilisateurs
    let query = supabase
      .from('users')
      .select('id, email, name, balance, updated_at')
      .not('email', 'is', null)
      .order('id', { ascending: true }) // Ordre cohérent pour offset

    if (filter.minBalance !== undefined) {
      query = query.gte('balance', filter.minBalance)
    }
    if (filter.maxBalance !== undefined) {
      query = query.lte('balance', filter.maxBalance)
    }
    if (filter.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 500) - 1)
    } else if (filter.limit) {
      query = query.limit(filter.limit)
    }

    const { data: users, error: usersError } = await query

    if (usersError) {
      throw usersError
    }

    // Filtrer par inactivité si demandé
    let targetUsers = users || []
    if (filter.inactiveDays) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - filter.inactiveDays)
      targetUsers = targetUsers.filter(u => new Date(u.updated_at) < cutoff)
    }

    console.log(`📧 Sending promo to ${targetUsers.length} users`)

    // Logger la campagne AVANT l'envoi (pour éviter perte si timeout)
    let campaignId: string | null = null
    try {
      const campaignData: any = {
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
      
      const { data: campaign, error: campaignError } = await supabase
        .from('email_campaigns')
        .insert(campaignData)
        .select('id')
        .single()
      
      if (campaign?.id) {
        campaignId = campaign.id
        console.log('✅ Campaign logged (in_progress):', campaignId)
      }
    } catch (logError) {
      console.error('⚠️ Failed to pre-log campaign:', logError)
    }

    // Template HTML optimisé anti-spam avec type dynamique
    const generateEmailHTML = (userName: string, userEmail: string) => `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f5f5f5">
<div style="max-width:600px;margin:0 auto;padding:20px">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden">
<tr>
<td style="background-color:#3B82F6;padding:24px;text-align:center">
<h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:normal">One SMS</h1>
<p style="margin:8px 0 0;color:#dbeafe;font-size:14px">Service de reception SMS temporaires</p>
</td>
</tr>
<tr>
<td style="padding:32px 24px">
<p style="margin:0 0 16px;color:#000000;font-size:16px">Bonjour ${userName},</p>
<p style="margin:0 0 24px;color:#333333;font-size:15px;line-height:1.6;white-space:pre-wrap">${message}</p>
${(promoCode || discount) ? `
<div style="background-color:${style.bgColor};border-left:4px solid ${style.color};padding:16px;margin:24px 0;text-align:center">
<p style="margin:0 0 8px;color:${style.color};font-size:18px;font-weight:bold">${title}</p>
${discount ? `<p style="margin:0;color:${style.color};font-size:16px;font-weight:bold">${discount}</p>` : ''}
${promoCode ? `<p style="margin:12px 0 0;color:${style.color};font-size:14px">Code: <strong style="font-size:18px;letter-spacing:2px">${promoCode}</strong></p>` : ''}
</div>
` : `
<div style="background-color:${style.bgColor};border-left:4px solid ${style.color};padding:16px;margin:24px 0">
<p style="margin:0;color:${style.color};font-size:16px;font-weight:bold">${title}</p>
</div>
`}
<div style="text-align:center;margin:32px 0">
<a href="https://onesms-sn.com/dashboard" style="display:inline-block;background-color:#3B82F6;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:4px;font-size:16px;font-weight:bold">Acceder a mon compte</a>
</div>
<p style="margin:24px 0 8px;color:#666666;font-size:13px">Merci de votre confiance.</p>
<p style="margin:0;color:#666666;font-size:13px">L'equipe One SMS</p>
</td>
</tr>
<tr>
<td style="background-color:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb">
<p style="margin:0;color:#666666;font-size:12px">One SMS - Service de reception SMS</p>
<p style="margin:8px 0;color:#666666;font-size:12px">support@onesms-sn.com - Dakar, Senegal</p>
<p style="margin:12px 0 0;color:#999999;font-size:11px">
<a href="https://onesms-sn.com/unsubscribe?email=${encodeURIComponent(userEmail)}" style="color:#999999;text-decoration:underline">Se desinscrire</a>
</p>
</td>
</tr>
</table>
</div>
</body>
</html>
`

    // Envoyer les emails par batch de 2 (limite Resend: 2/sec)
    const results = { sent: 0, failed: 0, errors: [] as string[] }
    const batchSize = 2

    for (let i = 0; i < targetUsers.length; i += batchSize) {
      const batch = targetUsers.slice(i, i + batchSize)
      
      await Promise.all(batch.map(async (user) => {
        try {
          const userName = user.name || user.email?.split('@')[0] || 'Client'
          const htmlContent = generateEmailHTML(userName, user.email)
          
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: 'support@onesms-sn.com',
              to: user.email,
              subject: `${title} - One SMS`,
              html: htmlContent,
              headers: {
                'X-Entity-Ref-ID': `promo-${Date.now()}-${user.id}`,
                'List-Unsubscribe': `<https://onesms-sn.com/unsubscribe?email=${encodeURIComponent(user.email)}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
              },
            }),
          })

          if (response.ok) {
            results.sent++
          } else {
            results.failed++
            const error = await response.text()
            results.errors.push(`${user.email}: ${error}`)
          }
        } catch (err) {
          results.failed++
          results.errors.push(`${user.email}: ${err.message}`)
        }
      }))

      // Délai de 1 seconde entre batches (limite Resend: 2 emails/sec)
      if (i + batchSize < targetUsers.length) {
        await new Promise(resolve => setTimeout(resolve, 1200))
      }
    }

    // Mettre à jour la campagne avec les résultats finaux
    if (campaignId) {
      try {
        await supabase
          .from('email_campaigns')
          .update({
            status: 'sent',
            sent_count: results.sent,
            failed_count: results.failed,
          })
          .eq('id', campaignId)
        
        console.log('✅ Campaign updated with final results:', campaignId)
      } catch (updateError) {
        console.error('⚠️ Failed to update campaign:', updateError)
      }
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
