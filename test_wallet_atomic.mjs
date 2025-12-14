#!/usr/bin/env node

/**
 * Script pour tester les fonctions RPC atomiques wallet
 * Test freeze, commit et refund avec vérifications
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Erreur: Variables d\'environnement manquantes')
  console.error('VITE_SUPABASE_URL:', SUPABASE_URL ? 'OK' : 'MANQUANT')
  console.error('SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? 'OK' : 'MANQUANT')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const TEST_USER_ID = 'e108c02a-2012-4043-bbc2-fb09bb11f824' // buba6c@gmail.com
const TEST_AMOUNT = 5

async function main() {
  console.log('🧪 TEST WALLET ATOMIC FUNCTIONS')
  console.log('=' .repeat(60))
  
  try {
    // ========================================================================
    // 1. ÉTAT INITIAL
    // ========================================================================
    console.log('\n📊 ÉTAT INITIAL')
    const { data: initialUser, error: initialError } = await supabase
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', TEST_USER_ID)
      .single()
    
    if (initialError) throw initialError
    
    console.log(`Balance: ${initialUser.balance}Ⓐ`)
    console.log(`Frozen: ${initialUser.frozen_balance}Ⓐ`)
    console.log(`Available: ${initialUser.balance - initialUser.frozen_balance}Ⓐ`)
    
    const initialBalance = initialUser.balance
    const initialFrozen = initialUser.frozen_balance
    
    // ========================================================================
    // 2. TEST FREEZE
    // ========================================================================
    console.log('\n🔒 TEST 1: FREEZE')
    
    // Créer transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: TEST_USER_ID,
        amount: -TEST_AMOUNT,
        type: 'purchase',
        status: 'pending',
        description: 'Test atomic freeze'
      })
      .select()
      .single()
    
    if (txError) throw txError
    console.log(`✓ Transaction créée: ${transaction.id}`)
    
    // Appeler atomic_freeze
    const { data: freezeResult, error: freezeError } = await supabase
      .rpc('atomic_freeze', {
        p_user_id: TEST_USER_ID,
        p_amount: TEST_AMOUNT,
        p_transaction_id: transaction.id,
        p_reason: 'Test freeze'
      })
    
    if (freezeError) {
      console.error('❌ Freeze error:', freezeError)
      throw freezeError
    }
    
    console.log('✓ Freeze result:', freezeResult)
    
    // Vérifier
    const { data: afterFreeze } = await supabase
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', TEST_USER_ID)
      .single()
    
    console.log(`Balance: ${initialBalance} → ${afterFreeze.balance} (${initialBalance - afterFreeze.balance}Ⓐ)`)
    console.log(`Frozen: ${initialFrozen} → ${afterFreeze.frozen_balance} (+${afterFreeze.frozen_balance - initialFrozen}Ⓐ)`)
    
    if (afterFreeze.balance !== initialBalance - TEST_AMOUNT) {
      throw new Error(`Balance incorrect: attendu ${initialBalance - TEST_AMOUNT}, reçu ${afterFreeze.balance}`)
    }
    if (afterFreeze.frozen_balance !== initialFrozen + TEST_AMOUNT) {
      throw new Error(`Frozen incorrect: attendu ${initialFrozen + TEST_AMOUNT}, reçu ${afterFreeze.frozen_balance}`)
    }
    
    console.log('✅ FREEZE OK')
    
    // ========================================================================
    // 3. TEST COMMIT (Scenario 1: Success)
    // ========================================================================
    console.log('\n✅ TEST 2: COMMIT (Success)')
    
    // Créer activation test
    const { data: activation, error: activationError } = await supabase
      .from('activations')
      .insert({
        user_id: TEST_USER_ID,
        phone: '+33612345678',
        service_code: 'test',
        country_code: 'fr',
        price: TEST_AMOUNT,
        frozen_amount: TEST_AMOUNT,
        status: 'waiting'
      })
      .select()
      .single()
    
    if (activationError) throw activationError
    console.log(`✓ Activation créée: ${activation.id}`)
    
    // Appeler atomic_commit
    const { data: commitResult, error: commitError } = await supabase
      .rpc('atomic_commit', {
        p_user_id: TEST_USER_ID,
        p_activation_id: activation.id,
        p_transaction_id: transaction.id,
        p_reason: 'Test commit'
      })
    
    if (commitError) {
      console.error('❌ Commit error:', commitError)
      throw commitError
    }
    
    console.log('✓ Commit result:', commitResult)
    
    // Vérifier
    const { data: afterCommit } = await supabase
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', TEST_USER_ID)
      .single()
    
    console.log(`Balance: ${afterFreeze.balance} → ${afterCommit.balance} (inchangé ✓)`)
    console.log(`Frozen: ${afterFreeze.frozen_balance} → ${afterCommit.frozen_balance} (-${afterFreeze.frozen_balance - afterCommit.frozen_balance}Ⓐ)`)
    
    if (afterCommit.balance !== afterFreeze.balance) {
      throw new Error(`Balance ne devrait pas changer: attendu ${afterFreeze.balance}, reçu ${afterCommit.balance}`)
    }
    if (afterCommit.frozen_balance !== initialFrozen) {
      throw new Error(`Frozen devrait revenir à ${initialFrozen}, reçu ${afterCommit.frozen_balance}`)
    }
    
    console.log('✅ COMMIT OK')
    
    // ========================================================================
    // 4. TEST REFUND (Scenario 2: Cancel)
    // ========================================================================
    console.log('\n🔙 TEST 3: REFUND (Cancel)')
    
    // Nouveau freeze pour tester refund
    const { data: transaction2, error: txError2 } = await supabase
      .from('transactions')
      .insert({
        user_id: TEST_USER_ID,
        amount: -TEST_AMOUNT,
        type: 'purchase',
        status: 'pending',
        description: 'Test atomic refund'
      })
      .select()
      .single()
    
    if (txError2) throw txError2
    
    const { error: freezeError2 } = await supabase
      .rpc('atomic_freeze', {
        p_user_id: TEST_USER_ID,
        p_amount: TEST_AMOUNT,
        p_transaction_id: transaction2.id,
        p_reason: 'Test freeze for refund'
      })
    
    if (freezeError2) throw freezeError2
    console.log('✓ Nouveau freeze effectué')
    
    const { data: beforeRefund } = await supabase
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', TEST_USER_ID)
      .single()
    
    // Créer activation pour refund
    const { data: activation2, error: activationError2 } = await supabase
      .from('activations')
      .insert({
        user_id: TEST_USER_ID,
        phone: '+33612345679',
        service_code: 'test',
        country_code: 'fr',
        price: TEST_AMOUNT,
        frozen_amount: TEST_AMOUNT,
        status: 'pending'
      })
      .select()
      .single()
    
    if (activationError2) throw activationError2
    
    // Appeler atomic_refund
    const { data: refundResult, error: refundError } = await supabase
      .rpc('atomic_refund', {
        p_user_id: TEST_USER_ID,
        p_activation_id: activation2.id,
        p_transaction_id: transaction2.id,
        p_reason: 'Test refund'
      })
    
    if (refundError) {
      console.error('❌ Refund error:', refundError)
      throw refundError
    }
    
    console.log('✓ Refund result:', refundResult)
    
    // Vérifier
    const { data: afterRefund } = await supabase
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', TEST_USER_ID)
      .single()
    
    console.log(`Balance: ${beforeRefund.balance} → ${afterRefund.balance} (+${afterRefund.balance - beforeRefund.balance}Ⓐ)`)
    console.log(`Frozen: ${beforeRefund.frozen_balance} → ${afterRefund.frozen_balance} (-${beforeRefund.frozen_balance - afterRefund.frozen_balance}Ⓐ)`)
    
    if (afterRefund.balance !== beforeRefund.balance + TEST_AMOUNT) {
      throw new Error(`Balance incorrect après refund: attendu ${beforeRefund.balance + TEST_AMOUNT}, reçu ${afterRefund.balance}`)
    }
    if (afterRefund.frozen_balance !== beforeRefund.frozen_balance - TEST_AMOUNT) {
      throw new Error(`Frozen incorrect après refund: attendu ${beforeRefund.frozen_balance - TEST_AMOUNT}, reçu ${afterRefund.frozen_balance}`)
    }
    
    console.log('✅ REFUND OK')
    
    // ========================================================================
    // 5. VÉRIFIER BALANCE_OPERATIONS
    // ========================================================================
    console.log('\n📋 VÉRIFIER LOGS (balance_operations)')
    
    const { data: operations, error: opsError } = await supabase
      .from('balance_operations')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (opsError) {
      console.warn('⚠️ Table balance_operations non accessible:', opsError.message)
    } else if (operations && operations.length > 0) {
      console.log(`✓ ${operations.length} opérations enregistrées`)
      operations.forEach(op => {
        console.log(`  - ${op.operation_type}: ${op.amount}Ⓐ (balance ${op.balance_before} → ${op.balance_after}, frozen ${op.frozen_before} → ${op.frozen_after})`)
      })
    } else {
      console.warn('⚠️ Aucune opération trouvée dans balance_operations')
    }
    
    // ========================================================================
    // 6. RÉSULTAT FINAL
    // ========================================================================
    console.log('\n' + '='.repeat(60))
    console.log('✅ TOUS LES TESTS RÉUSSIS')
    console.log('='.repeat(60))
    
    const { data: finalUser } = await supabase
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', TEST_USER_ID)
      .single()
    
    console.log('\n📊 ÉTAT FINAL')
    console.log(`Balance: ${initialBalance}Ⓐ → ${finalUser.balance}Ⓐ (${finalUser.balance - initialBalance >= 0 ? '+' : ''}${finalUser.balance - initialBalance}Ⓐ)`)
    console.log(`Frozen: ${initialFrozen}Ⓐ → ${finalUser.frozen_balance}Ⓐ (${finalUser.frozen_balance - initialFrozen >= 0 ? '+' : ''}${finalUser.frozen_balance - initialFrozen}Ⓐ)`)
    
    if (finalUser.balance === initialBalance && finalUser.frozen_balance === initialFrozen) {
      console.log('✅ Balance et frozen revenus à l\'état initial')
    } else {
      console.warn('⚠️ État final différent de l\'état initial')
    }
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message)
    console.error(error)
    process.exit(1)
  }
}

main()
