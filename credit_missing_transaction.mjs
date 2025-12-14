/**
 * Crédite manuellement l'utilisateur pour la transaction b7b8efc0-af5a-486a-9d95-dacf9e472295
 * qui a été marquée "completed" mais dont le crédit n'a jamais été appliqué
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
const supabase = createClient(url, key)

async function main() {
  const txId = 'b7b8efc0-af5a-486a-9d95-dacf9e472295'
  const userId = 'dae7b6ad-aa2b-45ae-b523-a30c3de09563'
  const amountToCredit = 5 // 5 activations
  
  console.log('💰 Créditer manuellement la transaction manquée...\n')
  
  // 1. Vérifier l'état actuel
  const { data: user } = await supabase
    .from('users')
    .select('balance, email')
    .eq('id', userId)
    .single()
  
  console.log('👤 User:', user.email)
  console.log('   Balance avant:', user.balance, 'Ⓐ')
  
  const { data: tx } = await supabase
    .from('transactions')
    .select('amount, status, metadata')
    .eq('id', txId)
    .single()
  
  console.log('📋 Transaction:', txId.slice(0, 8))
  console.log('   Montant:', tx.amount, 'FCFA')
  console.log('   Status:', tx.status)
  console.log('   Activations:', tx.metadata?.activations || amountToCredit)
  
  // 2. Vérifier qu'il n'y a pas déjà une balance_operation
  const { data: existingOp } = await supabase
    .from('balance_operations')
    .select('id')
    .eq('user_id', userId)
    .eq('related_transaction_id', txId)
  
  if (existingOp && existingOp.length > 0) {
    console.log('\n⚠️  Une balance_operation existe déjà pour cette transaction!')
    console.log('   Operation ID:', existingOp[0].id)
    return
  }
  
  // 3. Créditer via admin_add_credit
  console.log(`\n💳 Ajout de ${amountToCredit}Ⓐ via admin_add_credit...`)
  
  const { data: result, error } = await supabase
    .rpc('admin_add_credit', {
      p_user_id: userId,
      p_amount: amountToCredit,
      p_admin_note: `Crédit manuel - Transaction MoneyFusion ${txId.slice(0, 8)} (webhook défaillant)`
    })
  
  if (error) {
    console.error('❌ Erreur:', error)
    return
  }
  
  console.log('✅ Crédit appliqué!')
  console.log('   Nouvelle balance:', result, 'Ⓐ')
  
  // 4. Vérifier le résultat
  const { data: updatedUser } = await supabase
    .from('users')
    .select('balance')
    .eq('id', userId)
    .single()
  
  const { data: newOp } = await supabase
    .from('balance_operations')
    .select('operation_type, amount, balance_before, balance_after')
    .eq('user_id', userId)
    .eq('operation_type', 'credit_admin')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  console.log('\n📊 Vérification:')
  console.log('   User balance:', updatedUser.balance, 'Ⓐ')
  console.log('   Balance operation:', newOp?.operation_type, `${newOp?.balance_before}→${newOp?.balance_after}`)
  
  console.log('\n✅ DONE! L\'utilisateur a été crédité des 5Ⓐ manquants.')
  console.log('   Les prochaines recharges MoneyFusion seront automatiques grâce au webhook corrigé.')
}

main().catch(console.error)
