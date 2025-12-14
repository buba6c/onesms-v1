/**
 * TEST ACHAT COMPLET - Vérifie le flux wallet
 * 
 * Ce script:
 * 1. Note l'état AVANT
 * 2. Fait un achat via Edge Function
 * 3. Note l'état APRÈS
 * 4. Vérifie la cohérence
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const USER_ID = 'e108c02a-2012-4043-bbc2-fb09bb11f824';

// Couleurs
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

async function getState() {
  const { data: user } = await supabase
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', USER_ID)
    .single();
  
  const { data: pending } = await supabase
    .from('activations')
    .select('id, frozen_amount, service_code, status')
    .eq('user_id', USER_ID)
    .in('status', ['pending', 'active']);
  
  const totalFrozen = pending?.reduce((sum, a) => sum + parseFloat(a.frozen_amount || 0), 0) || 0;
  
  return {
    balance: user?.balance || 0,
    frozen: user?.frozen_balance || 0,
    available: (user?.balance || 0) - (user?.frozen_balance || 0),
    pendingCount: pending?.length || 0,
    calculatedFrozen: totalFrozen,
    coherent: Math.abs((user?.frozen_balance || 0) - totalFrozen) < 0.01
  };
}

async function testPurchase() {
  console.log(`${CYAN}╔════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}║            TEST ACHAT COMPLET - VÉRIFICATION WALLET            ║${RESET}`);
  console.log(`${CYAN}╚════════════════════════════════════════════════════════════════╝${RESET}\n`);

  // 1. ÉTAT AVANT
  console.log(`${YELLOW}═══ 1. ÉTAT AVANT ACHAT ═══${RESET}\n`);
  const before = await getState();
  console.log(`   Balance: ${before.balance} Ⓐ`);
  console.log(`   Frozen: ${before.frozen} Ⓐ`);
  console.log(`   Disponible: ${before.available.toFixed(2)} Ⓐ`);
  console.log(`   Activations pending: ${before.pendingCount}`);
  console.log(`   Cohérence: ${before.coherent ? GREEN + '✅' : RED + '❌'} (frozen DB: ${before.frozen}, calculé: ${before.calculatedFrozen})${RESET}`);

  // 2. S'authentifier
  console.log(`\n${YELLOW}═══ 2. AUTHENTIFICATION ═══${RESET}\n`);
  
  // Essayer plusieurs comptes
  const credentials = [
    { email: 'buba6c@gmail.com', password: 'Souleymane14' },
    { email: 'bubacarrsy2003@gmail.com', password: 'Souleymane14' },
  ];
  
  let authToken = null;
  let authUser = null;
  
  for (const cred of credentials) {
    const { data, error } = await supabase.auth.signInWithPassword(cred);
    if (!error && data.session) {
      authToken = data.session.access_token;
      authUser = data.user;
      console.log(`   ${GREEN}✅ Connecté: ${cred.email}${RESET}`);
      break;
    }
  }
  
  if (!authToken) {
    console.log(`   ${RED}❌ Impossible de s'authentifier${RESET}`);
    console.log(`\n   ${YELLOW}→ Faites le test manuellement sur la plateforme:${RESET}`);
    console.log(`   1. Connectez-vous sur https://onesms-sn.com`);
    console.log(`   2. Achetez un numéro (ex: Telegram, Russie)`);
    console.log(`   3. Vérifiez que le solde diminue correctement`);
    console.log(`   4. Annulez le numéro et vérifiez le remboursement`);
    return;
  }

  // 3. FAIRE L'ACHAT
  console.log(`\n${YELLOW}═══ 3. ACHAT D'UN NUMÉRO ═══${RESET}\n`);
  console.log(`   Service: Telegram (tg)`);
  console.log(`   Pays: Russie (0)`);
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/buy-sms-activate-number`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        userId: authUser.id,
        country: 'russia',
        service: 'tg',
        provider: 'smsactivate'
      })
    });

    const result = await response.json();
    console.log(`   HTTP Status: ${response.status}`);
    
    if (result.success && result.activation) {
      console.log(`   ${GREEN}✅ ACHAT RÉUSSI!${RESET}`);
      console.log(`   Activation ID: ${result.activation.id}`);
      console.log(`   Numéro: ${result.activation.phone_number || result.activation.phone}`);
      console.log(`   Prix: ${result.activation.price} Ⓐ`);
      
      const purchasePrice = parseFloat(result.activation.price);
      
      // 4. ÉTAT APRÈS
      console.log(`\n${YELLOW}═══ 4. ÉTAT APRÈS ACHAT ═══${RESET}\n`);
      
      // Attendre un peu pour la propagation
      await new Promise(r => setTimeout(r, 1000));
      
      const after = await getState();
      console.log(`   Balance: ${after.balance} Ⓐ (avant: ${before.balance})`);
      console.log(`   Frozen: ${after.frozen} Ⓐ (avant: ${before.frozen})`);
      console.log(`   Disponible: ${after.available.toFixed(2)} Ⓐ`);
      console.log(`   Activations pending: ${after.pendingCount} (avant: ${before.pendingCount})`);
      console.log(`   Cohérence: ${after.coherent ? GREEN + '✅' : RED + '❌'}${RESET}`);
      
      // 5. VÉRIFICATIONS
      console.log(`\n${YELLOW}═══ 5. VÉRIFICATIONS ═══${RESET}\n`);
      
      const balanceDiff = before.balance - after.balance;
      const frozenDiff = after.frozen - before.frozen;
      
      console.log(`   Δ Balance: ${balanceDiff.toFixed(2)} Ⓐ (attendu: ${purchasePrice})`);
      console.log(`   Δ Frozen: +${frozenDiff.toFixed(2)} Ⓐ (attendu: +${purchasePrice})`);
      
      const balanceOk = Math.abs(balanceDiff - purchasePrice) < 0.01;
      const frozenOk = Math.abs(frozenDiff - purchasePrice) < 0.01;
      
      if (balanceOk && frozenOk && after.coherent) {
        console.log(`\n   ${GREEN}✅ TOUT EST CORRECT!${RESET}`);
        console.log(`   Le système wallet fonctionne parfaitement.`);
      } else {
        console.log(`\n   ${RED}⚠️ ANOMALIES DÉTECTÉES:${RESET}`);
        if (!balanceOk) console.log(`   - Balance: ${balanceDiff} au lieu de ${purchasePrice}`);
        if (!frozenOk) console.log(`   - Frozen: ${frozenDiff} au lieu de ${purchasePrice}`);
        if (!after.coherent) console.log(`   - Incohérence frozen DB vs calculé`);
      }
      
      // 6. Option: Annuler pour tester le refund
      console.log(`\n${YELLOW}═══ 6. TEST ANNULATION (optionnel) ═══${RESET}\n`);
      console.log(`   Pour tester le refund, annulez ce numéro sur la plateforme`);
      console.log(`   ou exécutez: node -e "... cancel activation ${result.activation.id}"`);
      
    } else {
      console.log(`   ${RED}❌ Erreur: ${result.error || JSON.stringify(result)}${RESET}`);
      if (result.details) console.log(`   Details: ${result.details}`);
    }
    
  } catch (err) {
    console.log(`   ${RED}❌ Erreur: ${err.message}${RESET}`);
  }

  // Déconnexion
  await supabase.auth.signOut();
  
  console.log(`\n${CYAN}════════════════════════════════════════════════════════════════${RESET}\n`);
}

testPurchase().catch(console.error);
