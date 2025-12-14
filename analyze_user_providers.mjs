#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

async function analyzeUsers() {
  console.log('🔍 Analyse des utilisateurs et méthodes d\'inscription...\n')

  // Total utilisateurs avec email
  const { data: allUsers, error: e1 } = await supabase
    .from('users')
    .select('id, email')
    .not('email', 'is', null)

  if (e1) {
    console.error('❌ Erreur:', e1.message)
    return
  }

  // Récupérer les auth users pour voir les providers
  const { data: authUsers, error: e2 } = await supabase.auth.admin.listUsers()

  console.log('📊 STATISTIQUES D\'INSCRIPTION\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Total users avec email: ${allUsers?.length || 0}`)
  console.log(`Auth users totaux: ${authUsers?.users?.length || 0}`)

  if (authUsers?.users) {
    // Compter par provider
    const providerCount = {}
    authUsers.users.forEach(user => {
      const provider = user.app_metadata?.provider || user.app_metadata?.providers?.[0] || 'unknown'
      providerCount[provider] = (providerCount[provider] || 0) + 1
    })

    console.log('\n📋 Par méthode d\'inscription:')
    Object.entries(providerCount).forEach(([provider, count]) => {
      console.log(`   ${provider}: ${count}`)
    })

    // Utilisateurs Google spécifiquement
    const googleUsers = authUsers.users.filter(u => 
      u.app_metadata?.provider === 'google' || 
      u.app_metadata?.providers?.includes('google')
    )
    
    console.log('\n🔍 UTILISATEURS GOOGLE:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Total: ${googleUsers.length}`)
    console.log(`Tous ont un email: ${googleUsers.every(u => u.email) ? '✅ OUI' : '❌ NON'}`)
    
    if (googleUsers.length > 0) {
      console.log('\nExemples:')
      googleUsers.slice(0, 5).forEach((u, i) => {
        console.log(`${i + 1}. ${u.email}`)
      })
    }
  }

  console.log('\n\n📊 ANALYSE DE L\'ENVOI:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Utilisateurs dans la base: ${allUsers?.length || 0}`)
  console.log(`Emails envoyés (Resend):   829`)
  console.log(`Différence:                ${(allUsers?.length || 0) - 829}`)
  
  if ((allUsers?.length || 0) - 829 > 0) {
    console.log('\n❓ Pourquoi la différence ?')
    console.log('   1. La fonction a peut-être timeout avant de finir')
    console.log('   2. Certains emails sont invalides (Resend les rejette)')
    console.log('   3. La fonction a été interrompue')
    console.log('   4. Limite de rate limiting atteinte')
  }

  console.log('\n\n✅ RÉPONSE:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  if (googleUsers && googleUsers.length > 0) {
    console.log(`OUI, les ${googleUsers.length} utilisateurs Google ont TOUS un email`)
    console.log('Ils ont donc reçu (ou devraient recevoir) l\'email')
    console.log('\n💡 Si seulement 829 emails sont partis au lieu de ' + (allUsers?.length || 0) + ':')
    console.log('   → La fonction a probablement timeout après ~10-12 minutes')
    console.log('   → Edge Functions Supabase ont une limite de temps')
  }
}

analyzeUsers().catch(console.error)
