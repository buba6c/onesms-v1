#!/usr/bin/env node

/**
 * Cleanup Orphaned Frozen Balance
 * 
 * Ce script nettoie les frozen_balance qui sont restés bloqués
 * à cause d'activations expirées/annulées sans libération correcte.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function cleanupFrozenBalances() {
  console.log('🔍 Recherche des utilisateurs avec frozen_balance > 0...\n')

  // 1. Récupérer tous les utilisateurs avec frozen_balance > 0
  const { data: usersWithFrozen, error: usersError } = await supabase
    .from('users')
    .select('id, email, balance, frozen_balance')
    .gt('frozen_balance', 0)

  if (usersError) {
    console.error('❌ Erreur récupération users:', usersError)
    return
  }

  if (!usersWithFrozen || usersWithFrozen.length === 0) {
    console.log('✅ Aucun utilisateur avec frozen_balance > 0')
    return
  }

  console.log(`📊 ${usersWithFrozen.length} utilisateur(s) avec frozen_balance > 0:\n`)

  for (const user of usersWithFrozen) {
    console.log(`\n👤 ${user.email || user.id}`)
    console.log(`   Balance: ${user.balance}Ⓐ, Frozen: ${user.frozen_balance}Ⓐ`)

    // 2. Récupérer les activations pending de cet utilisateur
    const { data: pendingActivations, error: actError } = await supabase
      .from('activations')
      .select('id, phone, service_code, price, status, expires_at, created_at')
      .eq('user_id', user.id)
      .in('status', ['pending', 'waiting'])
      .order('created_at', { ascending: false })

    if (actError) {
      console.error('   ❌ Erreur récupération activations:', actError)
      continue
    }

    // 3. Calculer le montant qui DEVRAIT être frozen
    let shouldBeFrozen = 0
    const now = new Date()
    const expiredActivations = []
    const validActivations = []

    for (const act of pendingActivations || []) {
      const expiresAt = new Date(act.expires_at)
      
      if (expiresAt > now) {
        // Activation encore valide
        shouldBeFrozen += act.price
        validActivations.push(act)
      } else {
        // Activation expirée mais pas marquée comme timeout
        expiredActivations.push(act)
      }
    }

    console.log(`   📋 Activations pending valides: ${validActivations.length} (total: ${shouldBeFrozen}Ⓐ)`)
    console.log(`   ⏰ Activations expirées non traitées: ${expiredActivations.length}`)

    // 4. Montant frozen orphelin
    const orphanedFrozen = user.frozen_balance - shouldBeFrozen

    if (orphanedFrozen > 0) {
      console.log(`   🔴 Frozen orphelin: ${orphanedFrozen}Ⓐ (à libérer)`)
    } else if (orphanedFrozen < 0) {
      console.log(`   ⚠️  Anomalie: frozen_balance (${user.frozen_balance}) < somme activations (${shouldBeFrozen})`)
    } else {
      console.log(`   ✅ Frozen balance correct`)
    }

    // 5. Traiter les activations expirées
    for (const act of expiredActivations) {
      console.log(`\n   🔧 Traitement activation expirée: ${act.id}`)
      console.log(`      Phone: ${act.phone}, Service: ${act.service_code}, Prix: ${act.price}Ⓐ`)
      console.log(`      Expirée le: ${act.expires_at}`)

      // Marquer comme timeout
      const { error: updateError } = await supabase
        .from('activations')
        .update({ status: 'timeout' })
        .eq('id', act.id)

      if (updateError) {
        console.log(`      ❌ Erreur mise à jour activation: ${updateError.message}`)
      } else {
        console.log(`      ✅ Activation marquée comme timeout`)
      }

      // Mettre à jour transaction si existe
      const { data: txn } = await supabase
        .from('transactions')
        .select('id, status')
        .eq('related_activation_id', act.id)
        .single()

      if (txn && txn.status === 'pending') {
        await supabase
          .from('transactions')
          .update({ status: 'refunded' })
          .eq('id', txn.id)
        console.log(`      ✅ Transaction ${txn.id} marquée comme refunded`)
      }
    }

    // 6. Corriger le frozen_balance si nécessaire
    if (orphanedFrozen > 0 || expiredActivations.length > 0) {
      const newFrozenBalance = Math.max(0, shouldBeFrozen)
      
      console.log(`\n   💰 Correction frozen_balance: ${user.frozen_balance} → ${newFrozenBalance}`)
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ frozen_balance: newFrozenBalance })
        .eq('id', user.id)

      if (updateError) {
        console.log(`   ❌ Erreur mise à jour user: ${updateError.message}`)
      } else {
        console.log(`   ✅ Frozen balance corrigé!`)
        console.log(`   💰 Crédits libérés: ${user.frozen_balance - newFrozenBalance}Ⓐ`)
      }
    }
  }

  console.log('\n\n✅ Nettoyage terminé!')
}

// Exécuter
cleanupFrozenBalances().catch(console.error)
