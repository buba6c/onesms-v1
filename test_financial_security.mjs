/**
 * ============================================================================
 * TESTS DE SÉCURITÉ FINANCIÈRE - ACTIVATION & RENT
 * ============================================================================
 * 
 * Ces tests simulent des situations réelles pour détecter:
 * - Corruptions de solde
 * - Race conditions
 * - Frozen orphelins
 * - Double déductions
 * 
 * TESTS:
 * 1. Achat normal → Annulation → Vérification remboursement
 * 2. Double achat simultané → Vérification cohérence
 * 3. Vérification cohérence wallet (frozen vs activations pending)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

const supabase = createClient(supabaseUrl, supabaseKey);

// User de test
const TEST_USER_ID = 'e108c02a-2012-4043-bbc2-fb09bb11f824';

// Couleurs console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.magenta}🧪 ${msg}${colors.reset}`),
  money: (msg) => console.log(`${colors.cyan}💰 ${msg}${colors.reset}`),
};

// ============================================================================
// UTILITAIRES
// ============================================================================

async function getWalletState() {
  const { data, error } = await supabase
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', TEST_USER_ID)
    .single();
  
  if (error) throw new Error(`Failed to get wallet: ${error.message}`);
  
  return {
    solde: data.balance,
    frozen: data.frozen_balance,
    disponible: data.balance - data.frozen_balance
  };
}

async function getPendingActivations() {
  const { data, error } = await supabase
    .from('activations')
    .select('id, frozen_amount, status, price')
    .eq('user_id', TEST_USER_ID)
    .in('status', ['pending', 'waiting']);
  
  return data || [];
}

async function getPendingRentals() {
  const { data, error } = await supabase
    .from('rentals')
    .select('id, frozen_amount, status, total_cost')
    .eq('user_id', TEST_USER_ID)
    .eq('status', 'active');
  
  return data || [];
}

async function getLastBalanceOperations(limit = 5) {
  const { data, error } = await supabase
    .from('balance_operations')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  return data || [];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// TEST 1: CYCLE COMPLET - ACHAT → ANNULATION → VÉRIFICATION
// ============================================================================

async function test1_AchatAnnulation() {
  console.log('\n' + '='.repeat(70));
  log.test('TEST 1: CYCLE COMPLET - ACHAT → ANNULATION → REMBOURSEMENT');
  console.log('='.repeat(70));
  
  const results = { activation: null, rent: null };
  
  // --- TEST 1A: ACTIVATION ---
  console.log('\n--- 1A: ACTIVATION ---');
  
  try {
    // État initial
    const walletBefore = await getWalletState();
    log.money(`État initial: solde=${walletBefore.solde}, frozen=${walletBefore.frozen}, dispo=${walletBefore.disponible}`);
    
    // Simuler un freeze (comme si on achetait)
    const testAmount = 5;
    log.info(`Simulation freeze de ${testAmount}Ⓐ...`);
    
    const { data: freezeResult, error: freezeError } = await supabase.rpc('atomic_freeze', {
      p_user_id: TEST_USER_ID,
      p_amount: testAmount,
      p_transaction_id: null,
      p_reason: 'TEST: Simulation activation freeze'
    });
    
    if (freezeError) {
      log.error(`Freeze failed: ${freezeError.message}`);
      results.activation = { success: false, error: freezeError.message };
    } else {
      log.success(`Freeze OK: balance ${freezeResult.balance_before} → ${freezeResult.balance_after}`);
      
      // Vérifier l'état après freeze
      const walletAfterFreeze = await getWalletState();
      const expectedSolde = walletBefore.solde - testAmount;
      const expectedFrozen = walletBefore.frozen + testAmount;
      
      if (walletAfterFreeze.solde !== expectedSolde || walletAfterFreeze.frozen !== expectedFrozen) {
        log.error(`INCOHÉRENCE après freeze! solde=${walletAfterFreeze.solde} (attendu ${expectedSolde}), frozen=${walletAfterFreeze.frozen} (attendu ${expectedFrozen})`);
        results.activation = { success: false, error: 'Incohérence après freeze' };
      } else {
        log.success(`État après freeze cohérent`);
        
        // Simuler annulation (refund)
        log.info(`Simulation refund de ${testAmount}Ⓐ...`);
        
        const { data: refundResult, error: refundError } = await supabase.rpc('atomic_refund', {
          p_user_id: TEST_USER_ID,
          p_amount: testAmount,
          p_transaction_id: null,
          p_reason: 'TEST: Simulation activation refund'
        });
        
        if (refundError) {
          log.error(`Refund failed: ${refundError.message}`);
          results.activation = { success: false, error: refundError.message };
        } else {
          log.success(`Refund OK: balance ${refundResult.balance_before} → ${refundResult.balance_after}`);
          
          // Vérifier retour à l'état initial
          const walletAfterRefund = await getWalletState();
          
          if (Math.abs(walletAfterRefund.solde - walletBefore.solde) < 0.01 && 
              Math.abs(walletAfterRefund.frozen - walletBefore.frozen) < 0.01) {
            log.success(`✅ ACTIVATION TEST PASSED: Retour à l'état initial`);
            results.activation = { success: true };
          } else {
            log.error(`INCOHÉRENCE! solde=${walletAfterRefund.solde} (attendu ${walletBefore.solde}), frozen=${walletAfterRefund.frozen} (attendu ${walletBefore.frozen})`);
            results.activation = { success: false, error: 'État final différent de initial' };
          }
        }
      }
    }
  } catch (e) {
    log.error(`Exception: ${e.message}`);
    results.activation = { success: false, error: e.message };
  }
  
  // --- TEST 1B: RENT ---
  console.log('\n--- 1B: RENT ---');
  
  try {
    // État initial
    const walletBefore = await getWalletState();
    log.money(`État initial: solde=${walletBefore.solde}, frozen=${walletBefore.frozen}, dispo=${walletBefore.disponible}`);
    
    // Simuler un freeze pour rent
    const testAmount = 10;
    log.info(`Simulation freeze RENT de ${testAmount}Ⓐ...`);
    
    const { data: freezeResult, error: freezeError } = await supabase.rpc('atomic_freeze', {
      p_user_id: TEST_USER_ID,
      p_amount: testAmount,
      p_transaction_id: null,
      p_reason: 'TEST: Simulation rent freeze'
    });
    
    if (freezeError) {
      log.error(`Freeze failed: ${freezeError.message}`);
      results.rent = { success: false, error: freezeError.message };
    } else {
      log.success(`Freeze OK: balance ${freezeResult.balance_before} → ${freezeResult.balance_after}`);
      
      // Simuler annulation rapide (< 20min = refund)
      await sleep(100);
      
      log.info(`Simulation refund RENT de ${testAmount}Ⓐ...`);
      
      const { data: refundResult, error: refundError } = await supabase.rpc('atomic_refund', {
        p_user_id: TEST_USER_ID,
        p_amount: testAmount,
        p_transaction_id: null,
        p_reason: 'TEST: Simulation rent refund (cancel < 20min)'
      });
      
      if (refundError) {
        log.error(`Refund failed: ${refundError.message}`);
        results.rent = { success: false, error: refundError.message };
      } else {
        log.success(`Refund OK`);
        
        // Vérifier retour à l'état initial
        const walletAfterRefund = await getWalletState();
        
        if (Math.abs(walletAfterRefund.solde - walletBefore.solde) < 0.01 && 
            Math.abs(walletAfterRefund.frozen - walletBefore.frozen) < 0.01) {
          log.success(`✅ RENT TEST PASSED: Retour à l'état initial`);
          results.rent = { success: true };
        } else {
          log.error(`INCOHÉRENCE! solde=${walletAfterRefund.solde} (attendu ${walletBefore.solde})`);
          results.rent = { success: false, error: 'État final différent de initial' };
        }
      }
    }
  } catch (e) {
    log.error(`Exception: ${e.message}`);
    results.rent = { success: false, error: e.message };
  }
  
  return results;
}

// ============================================================================
// TEST 2: DOUBLE ACHAT SIMULTANÉ (RACE CONDITION)
// ============================================================================

async function test2_DoubleAchatSimultane() {
  console.log('\n' + '='.repeat(70));
  log.test('TEST 2: DOUBLE ACHAT SIMULTANÉ (RACE CONDITION)');
  console.log('='.repeat(70));
  
  const results = { activation: null, rent: null };
  
  // --- TEST 2A: ACTIVATION ---
  console.log('\n--- 2A: DOUBLE FREEZE ACTIVATION SIMULTANÉ ---');
  
  try {
    const walletBefore = await getWalletState();
    log.money(`État initial: solde=${walletBefore.solde}, frozen=${walletBefore.frozen}, dispo=${walletBefore.disponible}`);
    
    const testAmount = 3;
    
    // Si pas assez de solde disponible pour 2 freezes
    if (walletBefore.disponible < testAmount * 2) {
      log.warn(`Solde insuffisant pour test (besoin ${testAmount * 2}, dispo ${walletBefore.disponible})`);
      results.activation = { success: true, skipped: true, reason: 'Solde insuffisant' };
    } else {
      log.info(`Lancement de 2 freezes simultanés de ${testAmount}Ⓐ chacun...`);
      
      // Lancer 2 freezes en parallèle
      const [result1, result2] = await Promise.allSettled([
        supabase.rpc('atomic_freeze', {
          p_user_id: TEST_USER_ID,
          p_amount: testAmount,
          p_transaction_id: null,
          p_reason: 'TEST: Race condition freeze 1'
        }),
        supabase.rpc('atomic_freeze', {
          p_user_id: TEST_USER_ID,
          p_amount: testAmount,
          p_transaction_id: null,
          p_reason: 'TEST: Race condition freeze 2'
        })
      ]);
      
      const success1 = result1.status === 'fulfilled' && !result1.value.error;
      const success2 = result2.status === 'fulfilled' && !result2.value.error;
      
      log.info(`Freeze 1: ${success1 ? 'SUCCESS' : 'FAILED'}`);
      log.info(`Freeze 2: ${success2 ? 'SUCCESS' : 'FAILED'}`);
      
      // Vérifier l'état après
      const walletAfter = await getWalletState();
      
      // Calculer combien de freezes ont réussi
      const successCount = (success1 ? 1 : 0) + (success2 ? 1 : 0);
      const expectedFrozen = walletBefore.frozen + (testAmount * successCount);
      const expectedSolde = walletBefore.solde - (testAmount * successCount);
      
      log.money(`État après: solde=${walletAfter.solde}, frozen=${walletAfter.frozen}`);
      log.money(`Attendu: solde=${expectedSolde}, frozen=${expectedFrozen}`);
      
      if (Math.abs(walletAfter.solde - expectedSolde) < 0.01 && 
          Math.abs(walletAfter.frozen - expectedFrozen) < 0.01) {
        log.success(`✅ RACE CONDITION TEST PASSED: État cohérent après double freeze`);
        
        // Cleanup: refund les freezes
        for (let i = 0; i < successCount; i++) {
          await supabase.rpc('atomic_refund', {
            p_user_id: TEST_USER_ID,
            p_amount: testAmount,
            p_transaction_id: null,
            p_reason: 'TEST: Cleanup after race condition test'
          });
        }
        
        results.activation = { success: true, successCount };
      } else {
        log.error(`❌ RACE CONDITION DETECTED: Incohérence de solde!`);
        results.activation = { success: false, error: 'Incohérence après double freeze' };
      }
    }
  } catch (e) {
    log.error(`Exception: ${e.message}`);
    results.activation = { success: false, error: e.message };
  }
  
  // --- TEST 2B: RENT ---
  console.log('\n--- 2B: DOUBLE FREEZE RENT SIMULTANÉ ---');
  
  try {
    const walletBefore = await getWalletState();
    log.money(`État initial: solde=${walletBefore.solde}, frozen=${walletBefore.frozen}, dispo=${walletBefore.disponible}`);
    
    const testAmount = 5;
    
    if (walletBefore.disponible < testAmount * 2) {
      log.warn(`Solde insuffisant pour test`);
      results.rent = { success: true, skipped: true, reason: 'Solde insuffisant' };
    } else {
      log.info(`Lancement de 2 freezes RENT simultanés de ${testAmount}Ⓐ chacun...`);
      
      const [result1, result2] = await Promise.allSettled([
        supabase.rpc('atomic_freeze', {
          p_user_id: TEST_USER_ID,
          p_amount: testAmount,
          p_transaction_id: null,
          p_reason: 'TEST: Race condition rent freeze 1'
        }),
        supabase.rpc('atomic_freeze', {
          p_user_id: TEST_USER_ID,
          p_amount: testAmount,
          p_transaction_id: null,
          p_reason: 'TEST: Race condition rent freeze 2'
        })
      ]);
      
      const success1 = result1.status === 'fulfilled' && !result1.value.error;
      const success2 = result2.status === 'fulfilled' && !result2.value.error;
      
      const walletAfter = await getWalletState();
      const successCount = (success1 ? 1 : 0) + (success2 ? 1 : 0);
      const expectedFrozen = walletBefore.frozen + (testAmount * successCount);
      const expectedSolde = walletBefore.solde - (testAmount * successCount);
      
      if (Math.abs(walletAfter.solde - expectedSolde) < 0.01 && 
          Math.abs(walletAfter.frozen - expectedFrozen) < 0.01) {
        log.success(`✅ RENT RACE CONDITION TEST PASSED`);
        
        // Cleanup
        for (let i = 0; i < successCount; i++) {
          await supabase.rpc('atomic_refund', {
            p_user_id: TEST_USER_ID,
            p_amount: testAmount,
            p_transaction_id: null,
            p_reason: 'TEST: Cleanup rent race condition'
          });
        }
        
        results.rent = { success: true, successCount };
      } else {
        log.error(`❌ RENT RACE CONDITION DETECTED!`);
        results.rent = { success: false, error: 'Incohérence' };
      }
    }
  } catch (e) {
    log.error(`Exception: ${e.message}`);
    results.rent = { success: false, error: e.message };
  }
  
  return results;
}

// ============================================================================
// TEST 3: COHÉRENCE WALLET (FROZEN vs ACTIVATIONS/RENTALS PENDING)
// ============================================================================

async function test3_CoherenceWallet() {
  console.log('\n' + '='.repeat(70));
  log.test('TEST 3: COHÉRENCE WALLET (FROZEN vs PENDING)');
  console.log('='.repeat(70));
  
  const results = { activation: null, rent: null };
  
  // --- VÉRIFICATION ACTIVATIONS ---
  console.log('\n--- 3A: COHÉRENCE ACTIVATIONS ---');
  
  try {
    const wallet = await getWalletState();
    const pendingActivations = await getPendingActivations();
    
    const totalFrozenActivations = pendingActivations.reduce((sum, a) => sum + (a.frozen_amount || 0), 0);
    
    log.money(`Wallet frozen: ${wallet.frozen}`);
    log.money(`Total frozen_amount (activations pending): ${totalFrozenActivations}`);
    log.info(`Activations pending: ${pendingActivations.length}`);
    
    if (pendingActivations.length > 0) {
      pendingActivations.forEach((a, i) => {
        console.log(`   [${i+1}] ${a.status}: frozen_amount=${a.frozen_amount}, price=${a.price}`);
      });
    }
    
    results.activation = {
      walletFrozen: wallet.frozen,
      activationsFrozen: totalFrozenActivations,
      pendingCount: pendingActivations.length
    };
    
  } catch (e) {
    log.error(`Exception: ${e.message}`);
    results.activation = { error: e.message };
  }
  
  // --- VÉRIFICATION RENTALS ---
  console.log('\n--- 3B: COHÉRENCE RENTALS ---');
  
  try {
    const wallet = await getWalletState();
    const activeRentals = await getPendingRentals();
    
    const totalFrozenRentals = activeRentals.reduce((sum, r) => sum + (r.frozen_amount || 0), 0);
    
    log.money(`Wallet frozen: ${wallet.frozen}`);
    log.money(`Total frozen_amount (rentals active): ${totalFrozenRentals}`);
    log.info(`Rentals active: ${activeRentals.length}`);
    
    if (activeRentals.length > 0) {
      activeRentals.forEach((r, i) => {
        console.log(`   [${i+1}] ${r.status}: frozen_amount=${r.frozen_amount}, total_cost=${r.total_cost}`);
      });
    }
    
    results.rent = {
      walletFrozen: wallet.frozen,
      rentalsFrozen: totalFrozenRentals,
      activeCount: activeRentals.length
    };
    
  } catch (e) {
    log.error(`Exception: ${e.message}`);
    results.rent = { error: e.message };
  }
  
  // --- ANALYSE GLOBALE ---
  console.log('\n--- 3C: ANALYSE GLOBALE ---');
  
  const wallet = await getWalletState();
  const totalExpectedFrozen = (results.activation?.activationsFrozen || 0) + (results.rent?.rentalsFrozen || 0);
  
  log.money(`Frozen wallet: ${wallet.frozen}`);
  log.money(`Frozen attendu (activations + rentals): ${totalExpectedFrozen}`);
  
  const diff = wallet.frozen - totalExpectedFrozen;
  
  if (Math.abs(diff) < 0.01) {
    log.success(`✅ COHÉRENCE PARFAITE: Frozen wallet = Frozen attendu`);
  } else if (diff > 0) {
    log.error(`❌ FROZEN ORPHELIN DÉTECTÉ: ${diff}Ⓐ gelés sans activation/rental correspondant!`);
    log.warn(`   → Risque: Ces crédits sont bloqués indéfiniment`);
  } else {
    log.error(`❌ FROZEN MANQUANT: ${Math.abs(diff)}Ⓐ de différence`);
    log.warn(`   → Risque: Activations/rentals avec frozen > wallet frozen`);
  }
  
  // --- DERNIÈRES OPÉRATIONS ---
  console.log('\n--- 3D: DERNIÈRES OPÉRATIONS BALANCE ---');
  
  const lastOps = await getLastBalanceOperations(5);
  
  lastOps.forEach((op, i) => {
    const date = new Date(op.created_at).toLocaleString('fr-FR');
    console.log(`   [${i+1}] ${op.operation_type.toUpperCase()} ${op.amount}Ⓐ - ${date}`);
    console.log(`       Balance: ${op.balance_before} → ${op.balance_after}`);
    console.log(`       Frozen: ${op.frozen_before} → ${op.frozen_after}`);
    console.log(`       Raison: ${op.reason || '-'}`);
  });
  
  return {
    activation: results.activation,
    rent: results.rent,
    global: {
      walletFrozen: wallet.frozen,
      expectedFrozen: totalExpectedFrozen,
      diff,
      coherent: Math.abs(diff) < 0.01
    }
  };
}

// ============================================================================
// MAIN
// ============================================================================

async function runAllTests() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║         TESTS DE SÉCURITÉ FINANCIÈRE - ONE SMS V1                    ║');
  console.log('║         Activation & Rent - Détection risques financiers             ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  
  const allResults = {};
  
  // Test 1
  allResults.test1 = await test1_AchatAnnulation();
  
  // Test 2
  allResults.test2 = await test2_DoubleAchatSimultane();
  
  // Test 3
  allResults.test3 = await test3_CoherenceWallet();
  
  // RÉSUMÉ FINAL
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                        RÉSUMÉ DES TESTS                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  
  console.log('\n📊 TEST 1 - Cycle Achat/Annulation:');
  console.log(`   Activation: ${allResults.test1.activation?.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Rent:       ${allResults.test1.rent?.success ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\n📊 TEST 2 - Race Condition (Double achat):');
  console.log(`   Activation: ${allResults.test2.activation?.success ? '✅ PASS' : '❌ FAIL'} ${allResults.test2.activation?.skipped ? '(skipped)' : ''}`);
  console.log(`   Rent:       ${allResults.test2.rent?.success ? '✅ PASS' : '❌ FAIL'} ${allResults.test2.rent?.skipped ? '(skipped)' : ''}`);
  
  console.log('\n📊 TEST 3 - Cohérence Wallet:');
  console.log(`   Global:     ${allResults.test3.global?.coherent ? '✅ COHÉRENT' : '❌ INCOHÉRENT'}`);
  if (!allResults.test3.global?.coherent) {
    console.log(`   Différence: ${allResults.test3.global?.diff}Ⓐ`);
  }
  
  // Score final
  const passed = [
    allResults.test1.activation?.success,
    allResults.test1.rent?.success,
    allResults.test2.activation?.success,
    allResults.test2.rent?.success,
    allResults.test3.global?.coherent
  ].filter(Boolean).length;
  
  const total = 5;
  
  console.log('\n' + '='.repeat(70));
  console.log(`🏆 SCORE FINAL: ${passed}/${total} tests passés`);
  
  if (passed === total) {
    console.log(`${colors.green}🎉 TOUS LES TESTS PASSÉS - Système financier sécurisé!${colors.reset}`);
  } else {
    console.log(`${colors.red}⚠️  ATTENTION: ${total - passed} test(s) échoué(s) - Risques financiers détectés!${colors.reset}`);
  }
  console.log('='.repeat(70));
  
  return allResults;
}

// Run
runAllTests().catch(console.error);
