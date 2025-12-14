// Edge Function: receive-email
// Reçoit les emails entrants via webhook Resend et les traite

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📧 Received email webhook')
    
    const event = await req.json()
    console.log('Event type:', event.type)

    // Vérifier que c'est bien un email reçu
    if (event.type !== 'email.received') {
      return new Response(
        JSON.stringify({ message: 'Event type not handled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailData = event.data
    console.log('Email ID:', emailData.email_id)
    console.log('From:', emailData.from)
    console.log('Subject:', emailData.subject)
    console.log('Available fields:', Object.keys(emailData))

    // Resend webhook doesn't include body in the initial payload
    // We need to fetch it from the API
    let messageText = '';
    
    try {
      const contentResponse = await fetch(
        `https://api.resend.com/emails/${emailData.email_id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
        }
      )

      if (contentResponse.ok) {
        const emailDetails = await contentResponse.json()
        console.log('Email details retrieved, keys:', Object.keys(emailDetails))
        messageText = emailDetails.text || emailDetails.html || emailDetails.body || ''
      } else {
        console.error('Failed to fetch email:', contentResponse.status)
      }
    } catch (fetchError) {
      console.error('Error fetching email:', fetchError)
    }
    
    // Si on a du HTML, essayer de le simplifier
    if (messageText.includes('<html') || messageText.includes('</')) {
      // Retirer les balises HTML basiques pour un affichage texte
      messageText = messageText
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    if (!messageText) {
      messageText = 'Email sans contenu texte';
    }

    // Extraire les infos de l'expéditeur
    const fromMatch = emailData.from.match(/(.*?)\s*<(.+?)>/) || [null, emailData.from, emailData.from]
    const senderName = fromMatch[1]?.trim() || fromMatch[2].split('@')[0]
    const senderEmail = fromMatch[2]

    // Sauvegarder dans contact_messages
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    const { data: message, error: insertError } = await supabase
      .from('contact_messages')
      .insert({
        name: senderName,
        email: senderEmail,
        subject: emailData.subject || 'Sans objet',
        message: messageText,
        status: 'new',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting message:', insertError)
      throw insertError
    }

    console.log('✅ Message saved to database:', message.id)

    // NOTE: Ne PAS envoyer de notification email ici pour éviter une boucle infinie
    // (l'email de notification serait lui-même reçu et créerait un nouveau message)
    // L'admin verra les messages dans le panel admin: /admin/contact-messages

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email received and processed',
        messageId: message.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing email webhook:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to process received email'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
