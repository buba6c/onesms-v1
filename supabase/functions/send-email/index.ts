// Edge Function: send-email
// Envoie des emails via Resend (recharge, promo, notifications)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Templates d'emails
const templates = {
  // Email de confirmation de recharge
  recharge_success: (data: { name: string; amount: number; balance: number; date: string }) => ({
    subject: `Recharge de ${data.amount} credits confirmee - One SMS`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #06b6d4, #3b82f6); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: 600; margin-bottom: 20px; }
    .amount-box { background: linear-gradient(135deg, #06b6d4, #3b82f6); color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
    .amount { font-size: 36px; font-weight: bold; }
    .balance-info { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
    .btn { background: linear-gradient(135deg, #06b6d4, #3b82f6); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>One SMS - Confirmation de recharge</h1>
      <p style="color: white; margin: 5px 0 0 0; font-size: 14px;">Service de réception SMS temporaires</p>
    </div>
    <div class="content">
      <span class="success-badge">✅ Recharge réussie</span>
      <p>Bonjour <strong>${data.name}</strong>,</p>
      <p>Nous vous confirmons que votre recharge de credits sur la plateforme One SMS a été effectuée avec succès.</p>
      <p>Vous pouvez maintenant utiliser vos credits pour acheter des numéros temporaires et recevoir des SMS de vérification.</p>
      
      <div class="amount-box">
        <div style="font-size: 14px; opacity: 0.9;">Montant crédité</div>
        <div class="amount">+${data.amount}Ⓐ</div>
      </div>
      
      <div class="balance-info">
        <strong>💰 Nouveau solde :</strong> ${data.balance}Ⓐ<br>
        <strong>📅 Date :</strong> ${data.date}
      </div>
      
      <p style="text-align: center;">
        <a href="https://onesms-sn.com/services" class="btn">Acheter des numéros →</a>
      </p>
    </div>
    <div class="footer">
      <p>Merci de votre confiance ! Cet email confirme votre transaction sur notre plateforme One SMS.</p>
      <p><strong>One SMS</strong> - Service de réception SMS temporaires</p>
      <p>Adresse: Dakar, Sénégal | Email: support@onesms-sn.com</p>
      <p>© 2025 One SMS - Tous droits réservés</p>
      <p style="font-size: 10px;"><a href="https://onesms-sn.com/unsubscribe" style="color: #64748b;">Se désabonner</a></p>
    </div>
  </div>
</body>
</html>
    `,
  }),

  // Email promo
  promo: (data: { name: string; title: string; message: string; code?: string; discount?: string }) => ({
    subject: `🎁 ${data.title} - One SMS`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #8b5cf6, #ec4899); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .promo-badge { background: #fef3c7; color: #d97706; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: 600; margin-bottom: 20px; }
    .promo-box { background: linear-gradient(135deg, #8b5cf6, #ec4899); color: white; padding: 25px; border-radius: 12px; text-align: center; margin: 20px 0; }
    .code-box { background: white; color: #8b5cf6; padding: 15px 25px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 2px; display: inline-block; margin-top: 15px; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
    .btn { background: linear-gradient(135deg, #8b5cf6, #ec4899); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎁 Offre Spéciale</h1>
    </div>
    <div class="content">
      <span class="promo-badge">🔥 Promotion</span>
      <p>Bonjour <strong>${data.name}</strong>,</p>
      
      <div class="promo-box">
        <div style="font-size: 20px; font-weight: bold;">${data.title}</div>
        <p style="margin: 15px 0; opacity: 0.95;">${data.message}</p>
        ${data.discount ? `<div style="font-size: 32px; font-weight: bold;">${data.discount}</div>` : ''}
        ${data.code ? `<div class="code-box">${data.code}</div>` : ''}
      </div>
      
      <p style="text-align: center;">
        <a href="https://onesms-sn.com/top-up" class="btn">Profiter de l'offre →</a>
      </p>
    </div>
    <div class="footer">
      <p>Vous recevez cet email car vous êtes inscrit sur One SMS.</p>
      <p>© 2025 One SMS - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>
    `,
  }),

  // Email de bienvenue
  welcome: (data: { name: string; referralCode: string }) => ({
    subject: `🎉 Bienvenue sur One SMS !`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #06b6d4, #3b82f6); padding: 40px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { padding: 30px; }
    .feature { display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
    .feature-icon { font-size: 24px; margin-right: 15px; }
    .referral-box { background: #f0fdf4; border: 2px dashed #10b981; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
    .referral-code { font-size: 24px; font-weight: bold; color: #10b981; letter-spacing: 2px; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
    .btn { background: linear-gradient(135deg, #06b6d4, #3b82f6); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Bienvenue !</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${data.name}</strong>,</p>
      <p>Bienvenue sur <strong>One SMS</strong> ! Votre compte est maintenant actif.</p>
      
      <h3>Ce que vous pouvez faire :</h3>
      <div class="feature">
        <span class="feature-icon">📱</span>
        <span>Recevoir des SMS de vérification pour +500 services</span>
      </div>
      <div class="feature">
        <span class="feature-icon">🌍</span>
        <span>Numéros de +180 pays disponibles</span>
      </div>
      <div class="feature">
        <span class="feature-icon">⚡</span>
        <span>Réception instantanée des SMS</span>
      </div>
      
      <div class="referral-box">
        <div style="margin-bottom: 10px;">🎁 Parrainez vos amis et gagnez 5Ⓐ !</div>
        <div>Votre code :</div>
        <div class="referral-code">${data.referralCode}</div>
      </div>
      
      <p style="text-align: center;">
        <a href="https://onesms-sn.com/services" class="btn">Commencer →</a>
      </p>
    </div>
    <div class="footer">
      <p>Des questions ? Contactez-nous sur support@onesms-sn.com</p>
      <p>© 2025 One SMS - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>
    `,
  }),

  // Email de notification pour l'admin quand un user envoie un message
  admin_contact_notification: (data: { userName: string; userEmail: string; subject: string; message: string }) => ({
    subject: `🔔 Nouveau message de ${data.userName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .urgent-badge { background: #ef4444; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: 600; margin-bottom: 20px; }
    .info-box { background: #f0f9ff; border: 1px solid #bae6fd; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .message-box { background: #fef3c7; border-left: 4px solid #fbbf24; padding: 20px; border-radius: 4px; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
    .btn { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 15px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📧 Nouveau message de contact</h1>
      <p style="color: white; margin: 5px 0 0 0; font-size: 14px;">Un utilisateur a envoyé un message</p>
    </div>
    <div class="content">
      <span class="urgent-badge">⚡ Nouveau</span>
      
      <div class="info-box">
        <p style="margin: 0;"><strong>👤 De :</strong> ${data.userName}</p>
        <p style="margin: 5px 0 0 0;"><strong>📧 Email :</strong> <a href="mailto:${data.userEmail}">${data.userEmail}</a></p>
        <p style="margin: 5px 0 0 0;"><strong>📋 Sujet :</strong> ${data.subject}</p>
      </div>

      <div class="message-box">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #92400e;">💬 Message :</p>
        <p style="margin: 0; color: #78350f; white-space: pre-wrap;">${data.message}</p>
      </div>

      <p style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 8px; margin: 20px 0; color: #1e40af;">
        <strong>💡 Action requise :</strong><br>
        Connectez-vous au panneau d'administration pour répondre à ce message.
      </p>

      <div style="text-align: center;">
        <a href="https://onesms-sn.com/admin/contact-messages" class="btn">Voir dans l'admin</a>
      </div>
    </div>
    <div class="footer">
      <p><strong>ONE SMS Admin</strong></p>
      <p>© 2025 One SMS - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>
    `,
  }),

  // Email de confirmation de message de contact
  contact_confirmation: (data: { name: string; subject: string }) => ({
    subject: `Message reçu - ${data.subject}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: 600; margin-bottom: 20px; }
    .info-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
    .icon { font-size: 48px; text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ONE SMS - Message reçu</h1>
      <p style="color: white; margin: 5px 0 0 0; font-size: 14px;">Service de réception SMS temporaires</p>
    </div>
    <div class="content">
      <div class="icon">✅</div>
      <span class="success-badge">Message bien reçu</span>
      <p>Bonjour <strong>${data.name}</strong>,</p>
      <p>Nous avons bien reçu votre message concernant :</p>

      <div class="info-box">
        <strong>📋 Sujet :</strong> ${data.subject}
      </div>

      <p>Notre équipe support le traitera dans les plus brefs délais.</p>

      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; font-weight: 600; color: #1e40af;">⏱️ Délai de réponse habituel</p>
        <p style="margin: 5px 0 0 0; color: #1e40af;">Nous répondons généralement sous 24 heures (jours ouvrés).</p>
      </div>

      <p style="font-size: 14px; color: #64748b;">Si votre demande est urgente, vous pouvez également nous contacter via WhatsApp au <strong>+1 683 777 0410</strong>.</p>
    </div>
    <div class="footer">
      <p>Merci de votre confiance !</p>
      <p><strong>ONE SMS</strong> - Service de réception SMS temporaires</p>
      <p>Adresse: Dakar, Sénégal | Email: support@onesms-sn.com</p>
      <p>© 2025 One SMS - Tous droits réservés</p>
      <p style="font-size: 10px;"><a href="https://onesms-sn.com/unsubscribe" style="color: #64748b;">Se désabonner</a></p>
    </div>
  </div>
</body>
</html>
    `,
  }),

  // Email de réponse admin à un message de contact
  admin_reply: (data: { name: string; originalSubject: string; replyMessage: string }) => ({
    subject: `Re: ${data.originalSubject}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .reply-box { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ONE SMS - Support</h1>
      <p style="color: white; margin: 5px 0 0 0; font-size: 14px;">Réponse à votre message</p>
    </div>
    <div class="content">
      <p>Bonjour <strong>${data.name}</strong>,</p>
      <p>Merci d'avoir contacté ONE SMS. Voici notre réponse concernant votre demande :</p>

      <div class="reply-box">
        <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${data.replyMessage}</p>
      </div>

      <p>Si vous avez d'autres questions, n'hésitez pas à nous recontacter.</p>

      <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
        <strong>Autres moyens de contact :</strong><br>
        📧 Email: support@onesms-sn.com<br>
        💬 WhatsApp: +1 683 777 0410<br>
        🌐 Site web: https://onesms-sn.com
      </p>
    </div>
    <div class="footer">
      <p>Cordialement,<br><strong>L'équipe ONE SMS</strong></p>
      <p>Service de réception SMS temporaires</p>
      <p>Adresse: Dakar, Sénégal | Email: support@onesms-sn.com</p>
      <p>© 2025 One SMS - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>
    `,
  }),
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ONE SMS <support@onesms-sn.com>',
      to: [to],
      subject,
      html,
      reply_to: 'support@onesms-sn.com',
      headers: {
        'X-Entity-Ref-ID': Math.random().toString(36).substring(7),
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Resend error: ${error}`)
  }

  return await response.json()
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, email, data, userId } = await req.json()

    // Validation
    if (!type || !email) {
      return new Response(
        JSON.stringify({ error: 'type and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let emailContent: { subject: string; html: string }

    switch (type) {
      case 'recharge_success':
        emailContent = templates.recharge_success(data)
        break
      case 'promo':
        emailContent = templates.promo(data)
        break
      case 'welcome':
        emailContent = templates.welcome(data)
        break
      case 'contact_confirmation':
        emailContent = templates.contact_confirmation(data)
        break
      case 'admin_contact_notification':
        emailContent = templates.admin_contact_notification(data)
        break
      case 'admin_reply':
        emailContent = templates.admin_reply(data)
        break
      default:
        return new Response(
          JSON.stringify({ error: `Unknown email type: ${type}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Envoyer l'email
    const result = await sendEmail(email, emailContent.subject, emailContent.html)

    // Logger l'envoi (optionnel)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    await supabase.from('email_logs').insert({
      user_id: userId || null,
      email,
      type,
      subject: emailContent.subject,
      status: 'sent',
      resend_id: result.id,
      created_at: new Date().toISOString(),
    }).catch(() => {}) // Ignore if table doesn't exist

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Send email error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
