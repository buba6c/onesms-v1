#!/usr/bin/env node
/**
 * CLEANUP: Libère les 30Ⓐ gelés fantômes
 * 
 * PROBLÈME:
 * - cron-check-pending-sms ne call pas atomic_refund
 * - 8 activations timeout/cancelled avec freeze mais sans refund
 * - frozen_balance = 35Ⓐ au lieu de 5Ⓐ
 * 
 * SOLUTION:
 * - Appelle atomic_refund() pour chaque activation identifiée
 * - Libère les 30Ⓐ bloqués
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const USER_ID = 'e108c02a-2012-4043-bbc2-fb09bb11f824'

console.log('╔════════════════════════════════════════════════════════════════╗')
console.log('║  🧹 CLEANUP: Frozen Phantom Funds (30Ⓐ)                      ║')
console.log('╚════════════════════════════════════════════════════════════════╝\n')

async function main() {
  // 1. État initial
  console.log('📊 ÉTAT INITIAL:\n')
  
  const { data: userBefore } = await sb
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', USER_ID)
    .single()
  
  console.log(`Balance: ${userBefore.balance}Ⓐ`)
  console.log(`Frozen: ${userBefore.frozen_balance}Ⓐ`)
  console.log(`Disponible: ${userBefore.balance - userBefore.frozen_balance}Ⓐ\n`)

  // 2. Identifier les freeze sans refund
  console.log('🔍 IDENTIFICATION DES FREEZE SANS REFUND:\n')
  
  const { data: freezes } = await sb
    .from('balance_operations')
    .select('*')
    .eq('user_id', USER_ID)
    .eq('operation_type', 'freeze')
    .order('created_at', { ascending: false })
    .limit(20)

  const orphanedFreezes = []

  for (const freeze of freezes || []) {
    if (!freeze.activation_id && !freeze.rental_id) {
      continue
    }

    // Chercher le refund correspondant
    const { data: refund } = await sb
      .from('balance_operations')
      .select('*')
      .eq('user_id', USER_ID)
      .eq('operation_type', 'refund')
      .eq('activation_id', freeze.activation_id || null)
      .eq('rental_id', freeze.rental_id || null)
      .single()

    if (!refund) {
      // Vérifier l'état de l'activation/rental
      if (freeze.activation_id) {
        const { data: activation } = await sb
          .from('activations')
          .select('id, service_code, status, frozen_amount, price')
          .eq('id', freeze.activation_id)
          .single()

        if (activation && ['timeout', 'cancelled', 'expired', 'failed'].includes(activation.status)) {
          orphanedFreezes.push({
            type: 'activation',
            freeze,
            entity: activation,
            reason: `Activation ${activation.status}`
          })
          
          const time = freeze.created_at.slice(11, 19)
          console.log(`[${time}] FREEZE ${freeze.amount}Ⓐ | Activation ${activation.id.slice(0, 8)} | ${activation.service_code} | ${activation.status}`)
          console.log(`   ❌ PAS DE REFUND - frozen_amount: ${activation.frozen_amount}Ⓐ`)
        }
      } else if (freeze.rental_id) {
        const { data: rental } = await sb
          .from('rentals')
          .select('id, service_code, status, frozen_amount, price')
          .eq('id', freeze.rental_id)
          .single()

        if (rental && ['timeout', 'cancelled', 'expired', 'failed'].includes(rental.status)) {
          orphanedFreezes.push({
            type: 'rental',
            freeze,
            entity: rental,
            reason: `Rental ${rental.status}`
          })
          
          const time = freeze.created_at.slice(11, 19)
          console.log(`[${time}] FREEZE ${freeze.amount}Ⓐ | Rental ${rental.id.slice(0, 8)} | ${rental.service_code} | ${rental.status}`)
          console.log(`   ❌ PAS DE REFUND - frozen_amount: ${rental.frozen_amount}Ⓐ`)
        }
      }
    }
  }

  console.log(`\n📈 TOTAL: ${orphanedFreezes.length} freeze(s) sans refund trouvé(s)\n`)

  if (orphanedFreezes.length === 0) {
    console.log('✅ Aucun frozen fantôme trouvé!')
    return
  }

  // 3. Appeler atomic_refund pour chaque
  console.log('💰 LIBÉRATION DES FONDS:\n')

  let totalRefunded = 0
  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const item of orphanedFreezes) {
    const entityId = item.entity.id
    const entityType = item.type
    const shortId = entityId.slice(0, 8)

    console.log(`\n🔓 [${successCount + skipCount + errorCount + 1}/${orphanedFreezes.length}] ${entityType} ${shortId}...`)

    try {
      // Appeler atomic_refund avec p_amount
      const { data: refundResult, error: refundErr } = await sb.rpc('atomic_refund', {
        p_user_id: USER_ID,
        p_amount: item.freeze.amount,
        p_activation_id: entityType === 'activation' ? entityId : null,
        p_rental_id: entityType === 'rental' ? entityId : null,
        p_reason: `Cleanup phantom frozen: ${item.reason}`
      })

      if (refundErr) {
        console.error(`   ❌ ERROR: ${refundErr.message}`)
        errorCount++
        continue
      }

      if (refundResult?.idempotent) {
        console.log(`   ⚠️  IDEMPOTENT: Déjà remboursé (frozen_amount=0)`)
        skipCount++
        continue
      }

      if (refundResult?.success) {
        const refunded = refundResult.refunded || item.freeze.amount
        totalRefunded += refunded
        successCount++
        console.log(`   ✅ REFUND SUCCESS: ${refunded}Ⓐ libérés`)
      } else {
        console.error(`   ❌ FAILED: ${refundResult?.error || 'Unknown error'}`)
        errorCount++
      }

    } catch (err) {
      console.error(`   ❌ EXCEPTION: ${err.message}`)
      errorCount++
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  // 4. État final
  console.log('\n' + '═'.repeat(70))
  console.log('\n📊 RÉSUMÉ DU CLEANUP:\n')

  const { data: userAfter } = await sb
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', USER_ID)
    .single()

  console.log(`✅ Refunds réussis: ${successCount}`)
  console.log(`⚠️  Déjà traités: ${skipCount}`)
  console.log(`❌ Erreurs: ${errorCount}`)
  console.log(`💰 Total libéré: ${totalRefunded}Ⓐ\n`)

  console.log('AVANT:')
  console.log(`  Balance: ${userBefore.balance}Ⓐ`)
  console.log(`  Frozen: ${userBefore.frozen_balance}Ⓐ`)
  console.log(`  Disponible: ${userBefore.balance - userBefore.frozen_balance}Ⓐ\n`)

  console.log('APRÈS:')
  console.log(`  Balance: ${userAfter.balance}Ⓐ`)
  console.log(`  Frozen: ${userAfter.frozen_balance}Ⓐ`)
  console.log(`  Disponible: ${userAfter.balance - userAfter.frozen_balance}Ⓐ\n`)

  const frozenDiff = userBefore.frozen_balance - userAfter.frozen_balance
  const availableDiff = (userAfter.balance - userAfter.frozen_balance) - (userBefore.balance - userBefore.frozen_balance)

  console.log('DIFFÉRENCE:')
  console.log(`  Frozen libéré: ${frozenDiff}Ⓐ`)
  console.log(`  Disponible gagné: +${availableDiff}Ⓐ\n`)

  if (userAfter.frozen_balance === 5) {
    console.log('🎉 SUCCÈS TOTAL! frozen_balance = 5Ⓐ (1 rental actif)')
  } else if (frozenDiff > 0) {
    console.log(`✅ SUCCÈS PARTIEL: ${frozenDiff}Ⓐ libérés (reste ${userAfter.frozen_balance}Ⓐ frozen)`)
  } else {
    console.log('⚠️  Aucun frozen libéré. Vérifier les logs ci-dessus.')
  }
}

main().catch(console.error)
