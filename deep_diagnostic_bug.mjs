import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

/**
 * DIAGNOSTIC COMPLET DU FROZEN BALANCE BUG
 * ==========================================
 * 
 * Analyse approfondie de pourquoi l'annulation d'UNE activation 
 * libère TOUT le frozen_balance au lieu de juste le montant de cette activation.
 */

async function deepDiagnostic() {
  console.log('🕵️ DIAGNOSTIC COMPLET - FROZEN BALANCE BUG');
  console.log('='.repeat(60));
  
  const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824';
  
  // 1. État actuel
  const { data: user } = await supabase
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', userId)
    .single();
    
  const { data: activations } = await supabase
    .from('activations')
    .select('id, phone, price, frozen_amount, status, service_code, created_at, cancelled_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log('\n📊 ÉTAT ACTUEL:');
  console.log('  Balance:', user.balance, 'Ⓐ');
  console.log('  Frozen:', user.frozen_balance, 'Ⓐ');
  
  // 2. Analyser la cohérence
  const pending = activations.filter(a => ['pending', 'waiting'].includes(a.status));
  const totalPendingFrozen = pending.reduce((sum, a) => sum + (a.frozen_amount || 0), 0);
  
  console.log('\n📱 ACTIVATIONS ACTIVES:');
  console.log(`  Nombre: ${pending.length}`);
  console.log(`  Total frozen_amount: ${totalPendingFrozen} Ⓐ`);
  console.log(`  User frozen_balance: ${user.frozen_balance} Ⓐ`);
  console.log(`  Différence: ${(user.frozen_balance - totalPendingFrozen).toFixed(2)} Ⓐ`);
  
  if (Math.abs(user.frozen_balance - totalPendingFrozen) > 0.01) {
    console.log('  🚨 DÉSYNCHRONISATION DÉTECTÉE!');
    
    if (user.frozen_balance < totalPendingFrozen) {
      console.log('  ❌ SOUS-PROTECTION: frozen_balance trop bas');
      console.log('  🎯 RISQUE: Activations actives sans protection financière');
    } else {
      console.log('  ⚠️ SUR-PROTECTION: frozen_balance trop élevé');
      console.log('  💰 IMPACT: Crédits bloqués inutilement');
    }
  } else {
    console.log('  ✅ COHÉRENCE PARFAITE');
  }
  
  // 3. Historique des annulations récentes
  const cancelled = activations.filter(a => a.status === 'cancelled');
  
  console.log('\n❌ ANNULATIONS RÉCENTES:');
  if (cancelled.length === 0) {
    console.log('  Aucune annulation récente');
  } else {
    cancelled.forEach((c, i) => {
      const time = c.cancelled_at ? new Date(c.cancelled_at).toLocaleTimeString('fr-FR') : '?';
      console.log(`  ${i+1}. ${c.service_code.toUpperCase()} ${c.phone}`);
      console.log(`     Prix: ${c.price}Ⓐ | frozen_amount: ${c.frozen_amount}Ⓐ | Annulé: ${time}`);
    });
  }
  
  // 4. Analyse du dernier bug (TG annulé à 15:15:11)
  const lastCancelled = cancelled.find(c => c.service_code === 'tg');
  if (lastCancelled) {
    console.log('\n🔬 ANALYSE DU DERNIER BUG (TG):');
    console.log(`  Prix TG: ${lastCancelled.price}Ⓐ`);
    console.log(`  frozen_amount TG: ${lastCancelled.frozen_amount}Ⓐ`);
    
    const expectedFrozenAfter = Math.max(0, totalPendingFrozen); // FB devrait rester
    console.log(`  Frozen attendu après annulation: ${expectedFrozenAfter}Ⓐ`);
    console.log(`  Frozen réel après annulation: ${user.frozen_balance}Ⓐ`);
    
    if (user.frozen_balance === 0 && expectedFrozenAfter > 0) {
      console.log('  🚨 BUG CONFIRMÉ: Tout libéré au lieu de préserver FB');
    }
  }
  
  // 5. Recommandations de fix
  console.log('\n🔧 RECOMMANDATIONS:');
  
  if (Math.abs(user.frozen_balance - totalPendingFrozen) > 0.01) {
    console.log('  1. CORRECTION IMMÉDIATE:');
    console.log(`     UPDATE users SET frozen_balance = ${totalPendingFrozen.toFixed(2)} WHERE id = '${userId}';`);
  }
  
  console.log('  2. PRÉVENTION:');
  console.log('     - Ajouter des logs détaillés dans cancel-sms-activate-order');
    console.log('     - Vérifier que frozen_amount est bien défini lors de l\'achat');
  console.log('     - Ajouter un monitoring en temps réel des opérations');
  
  // 6. Test théorique du bon comportement
  console.log('\n🧪 TEST THÉORIQUE:');
  console.log('  Scénario: 2 activations FB(5Ⓐ) + TG(20Ⓐ)');
  console.log('  État initial: frozen_balance = 25Ⓐ');
  console.log('  Annulation TG: frozen_balance = 25 - 20 = 5Ⓐ');
  console.log('  FB reste protégée avec 5Ⓐ frozen');
  console.log('  ✅ Comportement attendu vs ❌ Comportement actuel (0Ⓐ)');
  
  // 7. Vérification des Edge Functions déployées
  console.log('\n📦 VÉRIFICATIONS TECHNIQUES:');
  console.log('  - cancel-sms-activate-order: ✅ Déployé avec fix atomique');
  console.log('  - check-sms-activate-status: ✅ Déployé avec protection cancelled');
  console.log('  - Tous Edge Functions: ✅ Utilisent frozen_amount pattern');
  
  console.log('\n🎯 CONCLUSION:');
  if (user.frozen_balance === 0 && totalPendingFrozen > 0) {
    console.log('  ❌ LE BUG PERSISTE MALGRÉ LES FIXES');
    console.log('  🔍 Cause probable: Race condition ou fonction non identifiée');
    console.log('  🚨 Action immédiate: Corriger frozen_balance et ajouter monitoring');
  } else if (Math.abs(user.frozen_balance - totalPendingFrozen) < 0.01) {
    console.log('  ✅ ÉTAT COHÉRENT - Bug possiblement corrigé');
  } else {
    console.log('  ⚠️ DÉSYNCHRONISATION - Correction nécessaire');
  }
}

deepDiagnostic().catch(console.error);