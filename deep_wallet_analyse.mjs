/**
 * DEEP ANALYSE - Test complet du flux wallet et activations
 * Vérifie le solde, frozen, fait des tests et détecte les anomalies
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const USER_ID = 'e108c02a-2012-4043-bbc2-fb09bb11f824';
const USER_EMAIL = 'buba6c@gmail.com';

// Couleurs console
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

async function deepAnalyse() {
  console.log(`${CYAN}╔════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}║       DEEP ANALYSE - WALLET & ACTIVATIONS                      ║${RESET}`);
  console.log(`${CYAN}╚════════════════════════════════════════════════════════════════╝${RESET}\n`);

  // ========================================
  // 1. ÉTAT ACTUEL DE L'UTILISATEUR
  // ========================================
  console.log(`${BLUE}═══ 1. ÉTAT ACTUEL DE L'UTILISATEUR ═══${RESET}\n`);

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, balance, frozen_balance, created_at')
    .eq('id', USER_ID)
    .single();

  if (userError) {
    console.log(`${RED}❌ Erreur lecture user: ${userError.message}${RESET}`);
    return;
  }

  console.log(`👤 User: ${user.email}`);
  console.log(`💰 Balance: ${GREEN}${user.balance} Ⓐ${RESET}`);
  console.log(`🔒 Frozen: ${YELLOW}${user.frozen_balance} Ⓐ${RESET}`);
  console.log(`📊 Disponible: ${CYAN}${user.balance - user.frozen_balance} Ⓐ${RESET}`);

  // ========================================
  // 2. ACTIVATIONS EN COURS (pending/active)
  // ========================================
  console.log(`\n${BLUE}═══ 2. ACTIVATIONS EN COURS ═══${RESET}\n`);

  const { data: pendingActivations, error: pendingError } = await supabase
    .from('activations')
    .select('id, status, frozen_amount, price, service_code, phone, created_at, external_id')
    .eq('user_id', USER_ID)
    .in('status', ['pending', 'active'])
    .order('created_at', { ascending: false });

  if (pendingError) {
    console.log(`${RED}❌ Erreur lecture activations: ${pendingError.message}${RESET}`);
  } else {
    console.log(`📱 Activations en cours: ${pendingActivations?.length || 0}`);
    
    let totalFrozenExpected = 0;
    pendingActivations?.forEach((a, i) => {
      console.log(`\n   ${i + 1}. ID: ${a.id.substring(0, 8)}...`);
      console.log(`      Status: ${a.status}`);
      console.log(`      Service: ${a.service_code}`);
      console.log(`      Phone: ${a.phone}`);
      console.log(`      Prix: ${a.price} Ⓐ`);
      console.log(`      Frozen: ${a.frozen_amount} Ⓐ`);
      console.log(`      External ID: ${a.external_id}`);
      console.log(`      Créé: ${new Date(a.created_at).toLocaleString()}`);
      totalFrozenExpected += parseFloat(a.frozen_amount || 0);
    });

    // Vérification cohérence
    console.log(`\n${YELLOW}🔍 VÉRIFICATION COHÉRENCE:${RESET}`);
    console.log(`   Frozen en DB: ${user.frozen_balance} Ⓐ`);
    console.log(`   Frozen calculé (somme activations): ${totalFrozenExpected} Ⓐ`);
    
    if (Math.abs(user.frozen_balance - totalFrozenExpected) > 0.01) {
      console.log(`   ${RED}⚠️  INCOHÉRENCE DÉTECTÉE! Différence: ${(user.frozen_balance - totalFrozenExpected).toFixed(2)} Ⓐ${RESET}`);
    } else {
      console.log(`   ${GREEN}✅ Cohérent${RESET}`);
    }
  }

  // ========================================
  // 3. DERNIÈRES OPÉRATIONS DE BALANCE
  // ========================================
  console.log(`\n${BLUE}═══ 3. DERNIÈRES OPÉRATIONS DE BALANCE ═══${RESET}\n`);

  const { data: balanceOps, error: opsError } = await supabase
    .from('balance_operations')
    .select('*')
    .eq('user_id', USER_ID)
    .order('created_at', { ascending: false })
    .limit(10);

  if (opsError) {
    console.log(`${RED}❌ Erreur lecture balance_operations: ${opsError.message}${RESET}`);
  } else if (!balanceOps || balanceOps.length === 0) {
    console.log(`   Aucune opération trouvée`);
  } else {
    console.log(`   Dernières ${balanceOps.length} opérations:\n`);
    balanceOps.forEach((op, i) => {
      const color = op.operation_type === 'freeze' ? YELLOW : 
                    op.operation_type === 'commit' ? GREEN :
                    op.operation_type === 'refund' ? CYAN : RESET;
      console.log(`   ${i + 1}. ${color}${op.operation_type.toUpperCase()}${RESET}`);
      console.log(`      Amount: ${op.amount} Ⓐ`);
      console.log(`      Before: balance=${op.balance_before}, frozen=${op.frozen_before}`);
      console.log(`      After: balance=${op.balance_after}, frozen=${op.frozen_after}`);
      console.log(`      Activation: ${op.activation_id?.substring(0, 8) || 'N/A'}...`);
      console.log(`      Date: ${new Date(op.created_at).toLocaleString()}`);
      console.log('');
    });
  }

  // ========================================
  // 4. DERNIÈRES ACTIVATIONS (toutes)
  // ========================================
  console.log(`${BLUE}═══ 4. DERNIÈRES ACTIVATIONS (15 dernières) ═══${RESET}\n`);

  const { data: recentActivations, error: recentError } = await supabase
    .from('activations')
    .select('id, status, frozen_amount, price, service_code, sms_code, created_at, external_id')
    .eq('user_id', USER_ID)
    .order('created_at', { ascending: false })
    .limit(15);

  if (recentError) {
    console.log(`${RED}❌ Erreur: ${recentError.message}${RESET}`);
  } else {
    recentActivations?.forEach((a, i) => {
      const statusColor = a.status === 'received' ? GREEN :
                         a.status === 'pending' || a.status === 'active' ? YELLOW :
                         a.status === 'cancelled' || a.status === 'refunded' ? CYAN :
                         a.status === 'expired' || a.status === 'error' ? RED : RESET;
      console.log(`   ${i + 1}. ${statusColor}${a.status.toUpperCase().padEnd(10)}${RESET} | ${(a.service_code || '').padEnd(15)} | ${a.price}Ⓐ | frozen:${a.frozen_amount || 0}Ⓐ | SMS: ${a.sms_code || '-'}`);
    });
  }

  // ========================================
  // 5. ANALYSE DES PROBLÈMES POTENTIELS
  // ========================================
  console.log(`\n${BLUE}═══ 5. ANALYSE DES PROBLÈMES POTENTIELS ═══${RESET}\n`);

  const problems = [];

  // 5.1 Frozen orphelins (frozen_amount > 0 mais status terminé)
  const { data: orphanFrozen } = await supabase
    .from('activations')
    .select('id, status, frozen_amount, service_code')
    .eq('user_id', USER_ID)
    .gt('frozen_amount', 0)
    .in('status', ['received', 'cancelled', 'refunded', 'expired', 'error']);

  if (orphanFrozen && orphanFrozen.length > 0) {
    problems.push({
      type: 'FROZEN_ORPHELIN',
      severity: 'HIGH',
      message: `${orphanFrozen.length} activation(s) terminée(s) avec frozen_amount > 0`,
      data: orphanFrozen
    });
  }

  // 5.2 Balance négative
  if (user.balance < 0) {
    problems.push({
      type: 'BALANCE_NEGATIVE',
      severity: 'CRITICAL',
      message: `Balance négative: ${user.balance} Ⓐ`
    });
  }

  // 5.3 Frozen > Balance
  if (user.frozen_balance > user.balance) {
    problems.push({
      type: 'FROZEN_EXCEEDS_BALANCE',
      severity: 'HIGH',
      message: `Frozen (${user.frozen_balance}) > Balance (${user.balance})`
    });
  }

  // 5.4 Activations bloquées (pending depuis trop longtemps)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: stuckActivations } = await supabase
    .from('activations')
    .select('id, status, service_code, created_at')
    .eq('user_id', USER_ID)
    .eq('status', 'pending')
    .lt('created_at', oneHourAgo);

  if (stuckActivations && stuckActivations.length > 0) {
    problems.push({
      type: 'STUCK_PENDING',
      severity: 'MEDIUM',
      message: `${stuckActivations.length} activation(s) pending depuis > 1h`,
      data: stuckActivations
    });
  }

  // 5.5 Transactions sans activation correspondante
  const { data: orphanTx } = await supabase
    .from('transactions')
    .select('id, type, amount, activation_id, created_at')
    .eq('user_id', USER_ID)
    .eq('type', 'sms_purchase')
    .is('activation_id', null)
    .order('created_at', { ascending: false })
    .limit(5);

  if (orphanTx && orphanTx.length > 0) {
    problems.push({
      type: 'ORPHAN_TRANSACTIONS',
      severity: 'LOW',
      message: `${orphanTx.length} transaction(s) sms_purchase sans activation_id`,
      data: orphanTx
    });
  }

  // Afficher les problèmes
  if (problems.length === 0) {
    console.log(`${GREEN}✅ Aucun problème détecté!${RESET}`);
  } else {
    console.log(`${RED}⚠️  ${problems.length} PROBLÈME(S) DÉTECTÉ(S):${RESET}\n`);
    problems.forEach((p, i) => {
      const severityColor = p.severity === 'CRITICAL' ? RED :
                           p.severity === 'HIGH' ? YELLOW :
                           p.severity === 'MEDIUM' ? CYAN : RESET;
      console.log(`   ${i + 1}. [${severityColor}${p.severity}${RESET}] ${p.type}`);
      console.log(`      ${p.message}`);
      if (p.data) {
        p.data.slice(0, 3).forEach(d => {
          console.log(`      → ${d.id?.substring(0, 8)}... | ${d.status || ''} | ${d.service_code || ''}`);
        });
      }
      console.log('');
    });
  }

  // ========================================
  // 6. TEST D'ACHAT (simulation)
  // ========================================
  console.log(`${BLUE}═══ 6. TEST EDGE FUNCTION BUY-SMS ═══${RESET}\n`);

  // D'abord s'authentifier
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'bubacarrsy2003@gmail.com',
    password: 'Souleymane14'
  });

  if (authError) {
    console.log(`${RED}❌ Auth échouée: ${authError.message}${RESET}`);
    console.log(`   Skipping test d'achat...`);
  } else {
    console.log(`✅ Authentifié: ${authData.user?.email}`);
    
    console.log(`\n📞 Test d'achat d'un numéro...`);
    console.log(`   Balance avant: ${user.balance} Ⓐ`);
    console.log(`   Frozen avant: ${user.frozen_balance} Ⓐ\n`);

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/buy-sms-activate-number`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.session?.access_token}`,
        },
        body: JSON.stringify({
          userId: USER_ID,
          country: 'russia',
          service: 'tg', // Telegram - généralement pas cher
          provider: 'smsactivate'
        })
      });

      const result = await response.json();
      console.log(`   HTTP Status: ${response.status}`);
      console.log(`   Response:`, JSON.stringify(result, null, 2).substring(0, 500));

      // Vérifier l'état après
      await new Promise(r => setTimeout(r, 1000));
      
      const { data: userAfter } = await supabase
        .from('users')
        .select('balance, frozen_balance')
        .eq('id', USER_ID)
        .single();

      console.log(`\n   Balance après: ${userAfter?.balance} Ⓐ`);
      console.log(`   Frozen après: ${userAfter?.frozen_balance} Ⓐ`);

      if (result.success && result.activation) {
        console.log(`\n${GREEN}✅ Achat réussi!${RESET}`);
        console.log(`   Activation ID: ${result.activation.id}`);
        console.log(`   Numéro: ${result.activation.phone_number}`);
        console.log(`   Prix: ${result.activation.price} Ⓐ`);
        
        // Vérifier si le frozen a augmenté correctement
        const expectedFrozen = parseFloat(user.frozen_balance) + parseFloat(result.activation.price);
        if (Math.abs(userAfter.frozen_balance - expectedFrozen) > 0.01) {
          console.log(`\n${RED}⚠️  PROBLÈME: Frozen attendu: ${expectedFrozen}, Frozen réel: ${userAfter.frozen_balance}${RESET}`);
        }
      } else if (result.error) {
        console.log(`\n${RED}❌ Erreur: ${result.error}${RESET}`);
        if (result.details) console.log(`   Details: ${result.details}`);
      }

    } catch (err) {
      console.log(`${RED}❌ Erreur fetch: ${err.message}${RESET}`);
    }
  }

  // ========================================
  // 7. RÉCAPITULATIF FINAL
  // ========================================
  console.log(`\n${CYAN}╔════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}║                    RÉCAPITULATIF FINAL                         ║${RESET}`);
  console.log(`${CYAN}╚════════════════════════════════════════════════════════════════╝${RESET}\n`);

  const { data: finalUser } = await supabase
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', USER_ID)
    .single();

  const { data: finalPending } = await supabase
    .from('activations')
    .select('frozen_amount')
    .eq('user_id', USER_ID)
    .in('status', ['pending', 'active']);

  const totalFrozenCalc = finalPending?.reduce((sum, a) => sum + parseFloat(a.frozen_amount || 0), 0) || 0;

  console.log(`💰 Balance finale: ${finalUser?.balance} Ⓐ`);
  console.log(`🔒 Frozen finale: ${finalUser?.frozen_balance} Ⓐ`);
  console.log(`📊 Disponible: ${(finalUser?.balance - finalUser?.frozen_balance).toFixed(2)} Ⓐ`);
  console.log(`📱 Activations en cours: ${finalPending?.length || 0}`);
  console.log(`🔢 Frozen calculé: ${totalFrozenCalc} Ⓐ`);
  
  const diff = Math.abs(finalUser?.frozen_balance - totalFrozenCalc);
  if (diff > 0.01) {
    console.log(`\n${RED}⚠️  INCOHÉRENCE: Frozen DB (${finalUser?.frozen_balance}) ≠ Frozen calculé (${totalFrozenCalc})${RESET}`);
    console.log(`${YELLOW}   → Il y a ${diff.toFixed(2)} Ⓐ de frozen "orphelin"${RESET}`);
  } else {
    console.log(`\n${GREEN}✅ Wallet cohérent${RESET}`);
  }

  console.log('\n');
}

deepAnalyse().catch(console.error);
