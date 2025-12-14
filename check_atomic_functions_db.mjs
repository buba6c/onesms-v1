import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzI1Njc2MiwiZXhwIjoyMDQ4ODMyNzYyfQ.gWdXq5h3xNRsP0ViZRlVsEbmM6yx_QRNYR9vqfJ5LgI'
);

console.log('🔍 VÉRIFICATION DES FONCTIONS ATOMIQUES DANS SUPABASE\n');
console.log('='.repeat(80));

const functionsToCheck = [
  'atomic_freeze',
  'atomic_commit', 
  'atomic_refund',
  'atomic_refund_direct',
  'check_refund_rate_limit',
  'protect_frozen_balance',
  'diagnose_frozen_health'
];

console.log('\n📊 TEST DES FONCTIONS RPC:\n');

for (const funcName of functionsToCheck) {
  try {
    // Test avec des paramètres par défaut
    const { data, error } = await supabase.rpc(funcName, {});
    
    if (error) {
      if (error.code === '42883') {
        console.log(`❌ ${funcName.padEnd(30)} - N'EXISTE PAS`);
      } else if (error.message.includes('required')) {
        console.log(`✅ ${funcName.padEnd(30)} - EXISTE (paramètres requis)`);
      } else {
        console.log(`⚠️  ${funcName.padEnd(30)} - EXISTE mais erreur: ${error.message.substring(0, 40)}...`);
      }
    } else {
      console.log(`✅ ${funcName.padEnd(30)} - EXISTE et fonctionne`);
    }
  } catch (e) {
    console.log(`❓ ${funcName.padEnd(30)} - Erreur réseau: ${e.message.substring(0, 30)}...`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('\n💡 ACTIONS REQUISES:\n');
console.log('   Si ❌ N\'EXISTE PAS : La fonction doit être déployée');
console.log('   Si ✅ EXISTE : La fonction est active dans Supabase');
console.log('   Si ⚠️  ERREUR : La fonction existe mais a un problème\n');

