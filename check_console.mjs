#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('🔍 ANALYSE DES ACTIVATIONS EN COURS')
console.log('='.repeat(50))

try {
  // Authentifier avec l'utilisateur test
  await supabase.auth.signInWithPassword({
    email: 'test@example.com', 
    password: 'testpassword123'
  })

  const { data: activations, error } = await supabase
    .from('activations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('❌ Erreur:', error.message)
  } else {
    console.log(`📊 Trouvé ${activations.length} activations:`)
    console.log('')
    
    activations.forEach((act, i) => {
      const age = Math.round((Date.now() - new Date(act.created_at).getTime()) / 1000 / 60)
      const isExpired = new Date(act.expires_at) < new Date()
      
      console.log(`${i + 1}. 📞 ${act.phone} (${act.order_id})`)
      console.log(`   Status: ${act.status} ${isExpired ? '⏰ EXPIRÉ' : '✅ Actif'}`)
      console.log(`   SMS: ${act.sms_code || 'Aucun'}`)
      console.log(`   Service: ${act.service_code} (${act.country_code})`)
      console.log(`   Âge: ${age} minutes`)
      console.log(`   Expire: ${act.expires_at}`)
      
      if (act.status === 'pending' && !isExpired) {
        console.log('   🔄 CONTINUE À CHERCHER DES SMS')
      } else if (act.status === 'pending' && isExpired) {
        console.log('   ⚠️  DEVRAIT ÊTRE ANNULÉ (EXPIRÉ)')
      }
      console.log('')
    })
    
    const pendingCount = activations.filter(a => a.status === 'pending').length
    const expiredCount = activations.filter(a => new Date(a.expires_at) < new Date()).length
    const withSmsCount = activations.filter(a => a.sms_code).length
    
    console.log('📈 RÉSUMÉ:')
    console.log(`   • Activations en attente: ${pendingCount}`)
    console.log(`   • Activations expirées: ${expiredCount}`)
    console.log(`   • Avec SMS reçus: ${withSmsCount}`)
    
    // Vérifier spécifiquement les activations qui devraient être annulées
    const shouldBeCancelled = activations.filter(a => 
      a.status === 'pending' && new Date(a.expires_at) < new Date()
    )
    
    if (shouldBeCancelled.length > 0) {
      console.log('')
      console.log('⚠️  PROBLÈME DÉTECTÉ:')
      console.log(`${shouldBeCancelled.length} activations expirées continuent à chercher des SMS`)
      shouldBeCancelled.forEach(act => {
        console.log(`   • ${act.phone} (expiré depuis ${Math.round((Date.now() - new Date(act.expires_at).getTime()) / 1000 / 60)} minutes)`)
      })
    }
  }
} catch (error) {
  console.error('❌ Erreur:', error.message)
  console.error(error.stack)
}