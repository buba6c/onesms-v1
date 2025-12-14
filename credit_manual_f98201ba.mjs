/**
 * Script de Crédit Manuel pour Transaction f98201ba-531b-4803-b21e-ebb9278514e2
 * 
 * CONTEXTE:
 * - User: buba6c@gmail.com
 * - Montant: 5Ⓐ (500 FCFA)
 * - Webhook MoneyFusion non reçu
 * 
 * CE SCRIPT:
 * 1. Crédite le user via admin_add_credit
 * 2. Met à jour la transaction en "completed"
 * 3. Vérifie le résultat
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const TRANSACTION_ID = 'f98201ba-531b-4803-b21e-ebb9278514e2'
const USER_ID = 'e108c02a-2012-4043-bbc2-fb09bb11f824'
const AMOUNT = 5
const MONEYFUSION_TOKEN = '69336afc8ce3cea0b4c4e22d'

async function main() {
  // Initialize Supabase with SERVICE_ROLE_KEY (bypasses RLS and auth checks)
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  console.log('🔧 CRÉDIT MANUEL TRANSACTION\n')
  console.log('═'.repeat(80))
  console.log(`Transaction: ${TRANSACTION_ID}`)
  console.log(`User: ${USER_ID}`)
  console.log(`Montant: ${AMOUNT}Ⓐ`)
  console.log('═'.repeat(80) + '\n')

  // 1. État avant
  console.log('📊 ÉTAT AVANT:')
  const { data: userBefore, error: userBeforeErr } = await supabase
    .from('users')
    .select('email, balance, frozen_balance')
    .eq('id', USER_ID)
    .single()

  if (userBeforeErr) {
    console.error('❌ Erreur lecture user:', userBeforeErr)
    process.exit(1)
  }

  console.log(`   Email: ${userBefore.email}`)
  console.log(`   Balance: ${userBefore.balance}Ⓐ`)
  console.log(`   Frozen: ${userBefore.frozen_balance}Ⓐ`)

  const { data: txBefore } = await supabase
    .from('transactions')
    .select('status, balance_before, balance_after')
    .eq('id', TRANSACTION_ID)
    .single()

  console.log(`   Transaction Status: ${txBefore?.status || 'not found'}`)

  // 2. Confirmer
  console.log('\n⚠️  CONFIRMATION:')
  console.log(`   Vous allez créditer ${AMOUNT}Ⓐ à ${userBefore.email}`)
  console.log(`   Balance passera de ${userBefore.balance}Ⓐ à ${userBefore.balance + AMOUNT}Ⓐ`)
  console.log('')

  // En production, ajouter une confirmation
  // const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout })
  // const answer = await new Promise(resolve => readline.question('Continuer? (y/n) ', resolve))
  // if (answer !== 'y') { console.log('Annulé'); process.exit(0) }

  // 3. Créditer via admin_add_credit
  console.log('💰 Crédit en cours...')
  
  const { data: creditResult, error: creditError } = await supabase.rpc('admin_add_credit', {
    p_user_id: USER_ID,
    p_amount: AMOUNT,
    p_admin_note: `Manual credit - MoneyFusion payment ${MONEYFUSION_TOKEN} completed but webhook not received. Manually processed on 2025-12-05.`
  })

  if (creditError) {
    console.error('❌ Erreur admin_add_credit:', creditError)
    console.error('   Message:', creditError.message)
    console.error('   Details:', creditError.details)
    console.error('   Hint:', creditError.hint)
    process.exit(1)
  }

  console.log('✅ Crédit réussi:', creditResult)

  // 4. Mettre à jour la transaction
  console.log('\n📝 Mise à jour transaction...')
  
  const { data: userAfter } = await supabase
    .from('users')
    .select('balance')
    .eq('id', USER_ID)
    .single()

  const { error: txUpdateError } = await supabase
    .from('transactions')
    .update({
      status: 'completed',
      balance_after: userAfter.balance,
      updated_at: new Date().toISOString(),
      metadata: {
        ...txBefore.metadata,
        manually_completed: true,
        manually_completed_at: new Date().toISOString(),
        manually_completed_by: 'admin_script',
        moneyfusion_status: 'paid',
        completion_note: 'Webhook not received - manually completed'
      }
    })
    .eq('id', TRANSACTION_ID)

  if (txUpdateError) {
    console.error('❌ Erreur update transaction:', txUpdateError)
  } else {
    console.log('✅ Transaction mise à jour')
  }

  // 5. Vérifications finales
  console.log('\n📊 ÉTAT APRÈS:')
  
  const { data: userAfterFinal } = await supabase
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', USER_ID)
    .single()

  console.log(`   Balance: ${userAfterFinal.balance}Ⓐ (était ${userBefore.balance}Ⓐ)`)
  console.log(`   Changement: +${(userAfterFinal.balance - userBefore.balance).toFixed(2)}Ⓐ`)
  console.log(`   Frozen: ${userAfterFinal.frozen_balance}Ⓐ`)

  const { data: txAfter } = await supabase
    .from('transactions')
    .select('status, balance_after')
    .eq('id', TRANSACTION_ID)
    .single()

  console.log(`   Transaction Status: ${txAfter.status}`)
  console.log(`   Transaction Balance After: ${txAfter.balance_after}Ⓐ`)

  // 6. Vérifier balance_operations
  const { data: balanceOps } = await supabase
    .from('balance_operations')
    .select('operation_type, amount, balance_after, reason, created_at')
    .eq('user_id', USER_ID)
    .order('created_at', { ascending: false })
    .limit(3)

  console.log('\n💰 Dernières balance_operations:')
  if (balanceOps && balanceOps.length > 0) {
    balanceOps.forEach((op, i) => {
      console.log(`   ${i + 1}. ${op.operation_type} | ${op.amount}Ⓐ | balance=${op.balance_after}Ⓐ`)
      console.log(`      Reason: ${op.reason}`)
      console.log(`      Date: ${op.created_at}`)
    })
  }

  // 7. Résumé
  console.log('\n' + '═'.repeat(80))
  console.log('✅ CRÉDIT MANUEL TERMINÉ')
  console.log('═'.repeat(80))
  console.log(`   User crédité: +${AMOUNT}Ⓐ`)
  console.log(`   Nouvelle balance: ${userAfterFinal.balance}Ⓐ`)
  console.log(`   Transaction: ${txAfter.status}`)
  console.log('═'.repeat(80))

  // 8. Recommandations
  console.log('\n🔍 PROCHAINES ÉTAPES:')
  console.log('   1. Vérifier dashboard MoneyFusion pour ce paiement')
  console.log('   2. Confirmer que le webhook est bien configuré')
  console.log('   3. Tester le webhook manuellement')
  console.log('   4. Créer un système de réconciliation automatique')
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err)
  process.exit(1)
})
