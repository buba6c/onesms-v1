#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('🧹 NETTOYAGE DES ACTIVATIONS EXPIRÉES')
console.log('='.repeat(50))

try {
  // Authentifier avec l'utilisateur test
  await supabase.auth.signInWithPassword({
    email: 'test@example.com', 
    password: 'testpassword123'
  })

  // Trouver toutes les activations expirées avec status 'pending'
  const { data: expiredActivations, error: fetchError } = await supabase
    .from('activations')
    .select('*')
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())

  if (fetchError) {
    console.error('❌ Erreur lors de la récupération:', fetchError.message)
    process.exit(1)
  }

  console.log(`📊 Trouvé ${expiredActivations.length} activations expirées à nettoyer`)

  if (expiredActivations.length === 0) {
    console.log('✅ Aucune activation expirée à nettoyer')
    process.exit(0)
  }

  // Nettoyer chaque activation expirée
  for (const activation of expiredActivations) {
    console.log(`\n🔧 Nettoyage de ${activation.phone} (${activation.order_id})`)
    
    try {
      // 1. Annuler sur SMS-Activate
      const cancelUrl = `https://api.sms-activate.io/stubs/handler_api.php?api_key=${process.env.SMS_ACTIVATE_API_KEY}&action=setStatus&id=${activation.order_id}&status=8`
      
      console.log('   📞 Annulation sur SMS-Activate...')
      const cancelResponse = await fetch(cancelUrl)
      const cancelResult = await cancelResponse.text()
      console.log(`   📞 Réponse SMS-Activate: ${cancelResult}`)

      // 2. Mettre à jour le status dans la base de données
      console.log('   💾 Mise à jour de la base de données...')
      const { error: updateError } = await supabase
        .from('activations')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', activation.id)

      if (updateError) {
        console.error(`   ❌ Erreur de mise à jour: ${updateError.message}`)
      } else {
        console.log('   ✅ Status mis à jour vers "expired"')
      }

      // 3. Mettre à jour la transaction si elle existe
      const { error: transactionError } = await supabase
        .from('transactions')
        .update({ status: 'cancelled' })
        .eq('related_activation_id', activation.id)
        .eq('status', 'pending')

      if (!transactionError) {
        console.log('   ✅ Transaction annulée')
      }

      console.log(`   ✅ Nettoyage terminé pour ${activation.phone}`)

    } catch (error) {
      console.error(`   ❌ Erreur lors du nettoyage de ${activation.phone}:`, error.message)
    }
  }

  console.log('\n📊 NETTOYAGE TERMINÉ')
  console.log(`✅ ${expiredActivations.length} activations nettoyées`)

} catch (error) {
  console.error('❌ Erreur générale:', error.message)
  console.error(error.stack)
}