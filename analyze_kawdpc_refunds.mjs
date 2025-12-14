#!/usr/bin/env node
/**
 * ANALYSE: Pourquoi le remboursement automatique ne se fait pas pour kawdpc@gmail.com
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

console.log('╔════════════════════════════════════════════════════════════════╗')
console.log('║  🔍 ANALYSE: Remboursement automatique kawdpc@gmail.com      ║')
console.log('╚════════════════════════════════════════════════════════════════╝\n')

async function main() {
  // 1. Trouver l'utilisateur
  const { data: user } = await sb
    .from('users')
    .select('*')
    .eq('email', 'kawdpc@gmail.com')
    .single()

  if (!user) {
    console.log('❌ Utilisateur non trouvé')
    return
  }

  console.log('👤 UTILISATEUR:\n')
  console.log(`ID: ${user.id}`)
  console.log(`Email: ${user.email}`)
  console.log(`Balance: ${user.balance}Ⓐ`)
  console.log(`Frozen: ${user.frozen_balance}Ⓐ`)
  console.log(`Disponible: ${user.balance - user.frozen_balance}Ⓐ\n`)

  // 2. Activations récentes
  console.log('📱 ACTIVATIONS RÉCENTES:\n')
  const { data: activations } = await sb
    .from('activations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const now = new Date()
  const problemActivations = []

  for (const act of activations || []) {
    const expiresAt = new Date(act.expires_at)
    const isExpired = now > expiresAt
    const time = act.created_at.slice(11, 19)
    
    console.log(`[${time}] ${act.id.slice(0,8)} | ${act.service_code} | ${act.status}`)
    console.log(`   Phone: ${act.phone}`)
    console.log(`   Price: ${act.price}Ⓐ | Frozen: ${act.frozen_amount}Ⓐ`)
    console.log(`   Expires: ${act.expires_at.slice(11, 19)}`)
    console.log(`   État: ${isExpired ? '⏰ EXPIRÉ' : '⏳ Actif'}`)
    
    if (isExpired && act.status === 'pending' && act.frozen_amount > 0) {
      console.log('   🚨 PROBLÈME: Expiré MAIS status=pending ET frozen_amount > 0!')
      problemActivations.push(act)
    }
    
    if (['timeout', 'cancelled', 'expired'].includes(act.status) && act.frozen_amount > 0) {
      console.log(`   🚨 PROBLÈME: status=${act.status} MAIS frozen_amount > 0!`)
      problemActivations.push(act)
    }
    
    // Vérifier les balance_operations
    const { data: freeze } = await sb
      .from('balance_operations')
      .select('*')
      .eq('activation_id', act.id)
      .eq('operation_type', 'freeze')
      .single()
    
    if (freeze) {
      console.log(`   ✅ FREEZE trouvé: ${freeze.amount}Ⓐ`)
      
      const { data: refund } = await sb
        .from('balance_operations')
        .select('*')
        .eq('activation_id', act.id)
        .eq('operation_type', 'refund')
        .single()
      
      if (refund) {
        console.log(`   ✅ REFUND trouvé: ${refund.amount}Ⓐ`)
      } else if (['timeout', 'cancelled', 'expired'].includes(act.status)) {
        console.log('   ❌ PAS DE REFUND - Frozen fantôme!')
      }
    }
    console.log('')
  }

  // 3. Rentals récents
  console.log('🏠 RENTALS RÉCENTS:\n')
  const { data: rentals } = await sb
    .from('rentals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const problemRentals = []

  for (const rental of rentals || []) {
    const expiresAt = new Date(rental.expires_at || rental.end_date)
    const isExpired = now > expiresAt
    const time = rental.created_at.slice(11, 19)
    
    console.log(`[${time}] ${rental.id.slice(0,8)} | ${rental.service_code} | ${rental.status}`)
    console.log(`   Phone: ${rental.phone}`)
    console.log(`   Price: ${rental.price}Ⓐ | Frozen: ${rental.frozen_amount}Ⓐ`)
    console.log(`   Expires: ${(rental.expires_at || rental.end_date).slice(11, 19)}`)
    console.log(`   État: ${isExpired ? '⏰ EXPIRÉ' : '⏳ Actif'}`)
    
    if (isExpired && rental.status === 'active' && rental.frozen_amount > 0) {
      console.log('   🚨 PROBLÈME: Expiré MAIS status=active ET frozen_amount > 0!')
      problemRentals.push(rental)
    }
    console.log('')
  }

  // 4. Diagnostic
  console.log('🔄 DIAGNOSTIC:\n')

  const expiredPending = activations?.filter(a => {
    const exp = new Date(a.expires_at)
    return now > exp && a.status === 'pending'
  }).length || 0

  const expiredRentals = rentals?.filter(r => {
    const exp = new Date(r.expires_at || r.end_date)
    return now > exp && r.status === 'active'
  }).length || 0

  console.log(`Activations pending + expirées: ${expiredPending}`)
  console.log(`Rentals active + expirés: ${expiredRentals}`)
  console.log(`Total items non traités: ${expiredPending + expiredRentals}\n`)

  if (expiredPending > 0 || expiredRentals > 0) {
    console.log('⚠️  LE CRON N\'A PAS TRAITÉ CES ITEMS EXPIRÉS!\n')
    console.log('CAUSES POSSIBLES:\n')
    console.log('1. ❌ Le cron ne tourne pas (vérifier Supabase Edge Functions)')
    console.log('2. ❌ Le cron a une erreur et crash (vérifier les logs)')
    console.log('3. ⚠️  Le cron prend seulement 50 items à la fois (limit)')
    console.log('4. ⚠️  Le déploiement du fix n\'a pas été pris en compte')
    console.log('5. ❌ Le cron n\'est pas configuré pour tourner automatiquement\n')
    
    console.log('SOLUTIONS:\n')
    console.log('A. Vérifier que le cron est activé dans Supabase Dashboard')
    console.log('B. Vérifier les logs du cron dans Edge Functions')
    console.log('C. Lancer manuellement le cron pour ces items')
    console.log('D. Créer un script de cleanup pour cet utilisateur\n')
  }

  // 5. Résumé
  console.log('📊 RÉSUMÉ:\n')
  console.log(`👤 User: ${user.email} (${user.id.slice(0, 8)})`)
  console.log(`💰 Balance: ${user.balance}Ⓐ | Frozen: ${user.frozen_balance}Ⓐ`)
  console.log(`🚨 Activations problématiques: ${problemActivations.length}`)
  console.log(`🚨 Rentals problématiques: ${problemRentals.length}`)
  
  if (problemActivations.length > 0 || problemRentals.length > 0) {
    console.log('\n⚠️  CET UTILISATEUR A DES FROZEN FANTÔMES!')
    console.log(`💸 Fonds bloqués: ${user.frozen_balance}Ⓐ`)
  }
}

main().catch(console.error)
