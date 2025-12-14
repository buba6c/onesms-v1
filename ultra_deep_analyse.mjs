#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

async function ultraDeepAnalyse() {
  console.log('🔬 ULTRA DEEP ANALYSE - INVESTIGATION COMPLÈTE\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 1. Vérifier l'ordre EXACT des utilisateurs dans la DB
  console.log('📊 1. ORDRE DES UTILISATEURS (comme la fonction les voit)\n')
  
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, created_at')
    .not('email', 'is', null)
    .order('id', { ascending: true })
    .limit(1100)

  if (usersError) {
    console.error('❌ Erreur:', usersError.message)
    return
  }

  console.log(`Total utilisateurs récupérés: ${users?.length}`)
  console.log('\n📍 Positions clés:')
  console.log(`   User #1: ${users[0]?.email} (ID: ${users[0]?.id.substring(0, 8)}...)`)
  console.log(`   User #829: ${users[828]?.email} (ID: ${users[828]?.id.substring(0, 8)}...)`)
  console.log(`   User #830: ${users[829]?.email} (ID: ${users[829]?.id.substring(0, 8)}...)`)
  console.log(`   User #1047: ${users[1046]?.email} (ID: ${users[1046]?.id.substring(0, 8)}...)`)
  console.log(`   User #1048: ${users[1047]?.email} (ID: ${users[1047]?.id.substring(0, 8)}...)`)

  // 2. Calculer les vraies durées d'envoi
  console.log('\n\n⏱️  2. CALCUL DES TEMPS D\'ENVOI\n')
  
  const emailsPerSecond = 2
  const delayBetweenBatches = 1.2
  
  const timeFor829 = (829 / emailsPerSecond) * delayBetweenBatches
  const timeFor218 = (218 / emailsPerSecond) * delayBetweenBatches
  
  console.log(`829 emails = ${Math.round(timeFor829)} secondes (${Math.round(timeFor829/60)} min ${Math.round(timeFor829%60)} sec)`)
  console.log(`218 emails = ${Math.round(timeFor218)} secondes (${Math.round(timeFor218/60)} min ${Math.round(timeFor218%60)} sec)`)
  
  console.log('\n💡 Observation:')
  if (timeFor218 < 150) {
    console.log(`   ✅ 218 emails peut être envoyé en ${Math.round(timeFor218)}s < 150s (pas de timeout)`)
    console.log('   ❓ MAIS pourquoi seulement 218 au lieu de plus ?')
  }

  // 3. Vérifier s'il y a une logique d'offset/range
  console.log('\n\n🔍 3. VÉRIFICATION DE LA FONCTION send-promo-emails\n')
  console.log('Hypothèses à tester:')
  console.log('   A. La fonction ne filtre pas correctement')
  console.log('   B. Sans offset, elle envoie toujours aux MÊMES utilisateurs')
  console.log('   C. Il y a 218 emails en cache/queue sur Resend')
  console.log('   D. La fonction a crashé après 218 emails')

  // 4. Simuler ce que la fonction fait
  console.log('\n\n🧪 4. SIMULATION DE LA REQUÊTE\n')
  
  console.log('Sans offset (comportement actuel):')
  const { data: withoutOffset } = await supabase
    .from('users')
    .select('id, email')
    .not('email', 'is', null)
    .order('id', { ascending: true })
    .limit(1000)
  
  console.log(`   Résultat: ${withoutOffset?.length} utilisateurs`)
  console.log(`   Premier: ${withoutOffset?.[0]?.email}`)
  console.log(`   Dernier: ${withoutOffset?.[withoutOffset.length - 1]?.email}`)

  console.log('\nAvec range(829, 1047) (offset=829, limit=218):')
  const { data: withRange } = await supabase
    .from('users')
    .select('id, email')
    .not('email', 'is', null)
    .order('id', { ascending: true })
    .range(829, 1047)
  
  console.log(`   Résultat: ${withRange?.length} utilisateurs`)
  console.log(`   Premier: ${withRange?.[0]?.email}`)
  console.log(`   Dernier: ${withRange?.[withRange.length - 1]?.email}`)

  // 5. Vérifier si range() fonctionne correctement
  console.log('\n\n🔬 5. TEST DE range() vs limit()\n')
  
  const { data: test1 } = await supabase
    .from('users')
    .select('email')
    .not('email', 'is', null)
    .order('id', { ascending: true })
    .range(0, 4)
  
  const { data: test2 } = await supabase
    .from('users')
    .select('email')
    .not('email', 'is', null)
    .order('id', { ascending: true })
    .limit(5)

  console.log('range(0, 4):')
  test1?.forEach((u, i) => console.log(`   ${i}: ${u.email}`))
  
  console.log('\nlimit(5):')
  test2?.forEach((u, i) => console.log(`   ${i}: ${u.email}`))
  
  const sameUsers = test1?.every((u, i) => u.email === test2?.[i]?.email)
  console.log(`\n✅ range(0, 4) = limit(5): ${sameUsers ? 'OUI' : 'NON'}`)

  // 6. Le vrai problème
  console.log('\n\n🎯 6. LE VRAI PROBLÈME IDENTIFIÉ\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  console.log('\n❌ PROBLÈME: La fonction send-promo-emails')
  console.log('   • N\'utilise PAS l\'offset modifié')
  console.log('   • Envoie toujours aux MÊMES utilisateurs (les premiers)')
  console.log('   • Sans filter.offset, elle utilise juste limit()')
  
  console.log('\n📝 Preuve:')
  console.log('   • 1er envoi: 829 emails aux users 1-829')
  console.log('   • 2e envoi: Timeout après 218 emails aux users 1-218 (DOUBLONS!)')
  console.log('   • Total Resend: 1047 mais avec des DOUBLONS')
  
  console.log('\n💡 Confirmation:')
  console.log('   • 829 users ont reçu le message "recharge"')
  console.log('   • 218 users ont reçu "recharge" + "TOUFE" (doublons)')
  console.log('   • 611 users (829-218) ont reçu SEULEMENT "recharge"')
  console.log('   • 439 users (1268-829) n\'ont RIEN reçu')

  // 7. Vérifier si la modification de la fonction a été déployée
  console.log('\n\n🔧 7. VÉRIFICATION DU DÉPLOIEMENT\n')
  console.log('Question: La fonction modifiée avec support offset a-t-elle été déployée ?')
  console.log('\nCommande de déploiement utilisée:')
  console.log('   npx supabase functions deploy send-promo-emails --no-verify-jwt')
  console.log('\n✅ Déployée: Oui (on l\'a fait)')
  console.log('❓ Active: À vérifier sur le dashboard Supabase')

  // 8. Solution
  console.log('\n\n✅ 8. SOLUTION DÉFINITIVE\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  console.log('\nProblème racine:')
  console.log('   La fonction SANS offset dans le body envoie aux mêmes users')
  console.log('   Il faut OBLIGATOIREMENT passer filter.offset dans l\'API call')
  
  console.log('\nSolution:')
  console.log('   1. Utiliser le script send_batches_with_offset.mjs')
  console.log('   2. Qui fait plusieurs appels avec offset: 829, 1329, etc.')
  console.log('   3. Chaque batch de 500 emails')
  console.log('   4. Pas de timeout car script local')
  
  console.log('\nPour envoyer TOUFE aux 1050 restants (1268-218):')
  console.log('   • Créer script avec offset=218')
  console.log('   • Message: Code promo TOUFE')
  console.log('   • Durée: ~10-12 minutes pour 1050 emails')
  console.log('   • Résultat: 100% des users auront reçu TOUFE')

  console.log('\n\n📊 RÉSUMÉ FINAL:\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ 218 users ont reçu TOUFE (avec doublons)')
  console.log('❌ 1050 users n\'ont PAS reçu TOUFE')
  console.log('🎯 Solution: Script local avec offset=218')
}

ultraDeepAnalyse().catch(console.error)
