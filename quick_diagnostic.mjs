import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

console.log('🔍 DIAGNOSTIC EXPIRATION - Identification de la cause...\n');

try {
  // Test 1: Activations bloquées
  const { data: blocked, error: blockedError } = await supabase
    .from('activations')
    .select('id, user_id, service_code, phone, status, frozen_amount, expires_at, created_at, provider')
    .lt('expires_at', new Date().toISOString())
    .gt('frozen_amount', 0)
    .not('status', 'in', '(received,completed,refunded)');

  if (blockedError) {
    console.log('❌ Erreur requête activations:', blockedError.message);
  } else {
    console.log('1️⃣ Activations EXPIRÉES avec tokens gelés:', blocked?.length || 0);
    
    if (blocked && blocked.length > 0) {
      console.log('\n📋 Détails des activations bloquées:\n');
      let totalBlocked = 0;
      
      blocked.forEach(a => {
        const expired = Math.floor((Date.now() - new Date(a.expires_at).getTime()) / 60000);
        console.log(`   🔒 ID: ${a.id.substring(0, 8)}...`);
        console.log(`      Service: ${a.service_code}, Phone: ${a.phone || 'N/A'}`);
        console.log(`      Status: ${a.status}, Frozen: ${a.frozen_amount} Ⓐ`);
        console.log(`      Provider: ${a.provider || 'unknown'}`);
        console.log(`      Expiré depuis: ${expired} minutes`);
        console.log('');
        totalBlocked += parseFloat(a.frozen_amount);
      });
      
      console.log(`   💰 TOTAL BLOQUÉ: ${totalBlocked} Ⓐ\n`);
    }
  }

  // Test 2: Balance Health
  const { data: health, error: healthError } = await supabase
    .from('v_frozen_balance_health')
    .select('*');

  if (healthError) {
    console.log('⚠️ View health non disponible:', healthError.message);
  } else if (health && health[0]) {
    const h = health[0];
    console.log('2️⃣ Santé des Balances:');
    console.log(`   Total Frozen Activations: ${h.total_frozen_activations} Ⓐ`);
    console.log(`   Total User Frozen: ${h.total_user_frozen} Ⓐ`);
    console.log(`   Discrepancy: ${h.total_discrepancy} Ⓐ ${h.total_discrepancy === 0 ? '✅' : '❌'}`);
  }

  // Test 3: Test manuel d'expiration
  console.log('\n3️⃣ Test de process_expired_activations()...');
  const { data: processResult, error: processError } = await supabase
    .rpc('process_expired_activations');

  if (processError) {
    console.log(`   ❌ Fonction échoue: ${processError.message}`);
    console.log('   💡 Cause probable: Fonction SQL non déployée');
  } else {
    console.log(`   ✅ Fonction exécutée: ${processResult} activations traitées`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 CONCLUSION:');
  
  if (blocked && blocked.length > 0) {
    console.log(`\n❌ PROBLÈME CONFIRMÉ: ${blocked.length} activations avec tokens bloqués`);
    console.log('\n💡 SOLUTIONS POSSIBLES:');
    console.log('   1. CRON jobs non configurés → Exécuter SETUP_CRON_JOBS.sql');
    console.log('   2. Fonction manquante → Déployer secure_frozen_balance_system.sql');
    console.log('   3. Fix immédiat → Exécuter: SELECT process_expired_activations();');
  } else {
    console.log('\n✅ Aucune activation bloquée détectée');
    console.log('   Le système fonctionne correctement');
  }
  
} catch (err) {
  console.error('❌ Erreur:', err.message);
}
