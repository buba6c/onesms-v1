import { createClient } from '@supabase/supabase-js';

console.log('🔍 ANALYSE STRUCTURE TABLE USERS');
console.log('=' + '='.repeat(50));

async function analyzeUserTable() {
  const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
  const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';
  
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  
  try {
    console.log('📊 Structure de la table users:');
    
    // Récupérer quelques utilisateurs pour voir la structure
    const { data: users, error: usersError } = await adminClient
      .from('users')
      .select('*')
      .limit(3);
    
    if (usersError) {
      console.error('❌ Erreur récupération users:', usersError);
    } else {
      console.log(`✅ ${users.length} utilisateurs trouvés:\n`);
      users.forEach((user, i) => {
        console.log(`${i + 1}. Utilisateur:`, JSON.stringify(user, null, 2));
        console.log('');
      });
      
      if (users.length > 0) {
        console.log('📋 Colonnes disponibles:');
        Object.keys(users[0]).forEach(col => {
          console.log(`  - ${col}`);
        });
      }
    }
    
    // Chercher des tables de balance/solde
    console.log('\n🔍 Recherche de tables de balance...');
    
    // Essayer table balances
    const { data: balances, error: balanceError } = await adminClient
      .from('balances')
      .select('*')
      .limit(3);
    
    if (!balanceError) {
      console.log('✅ Table balances trouvée:', balances.length, 'entrées');
      if (balances.length > 0) {
        console.log('Structure:', JSON.stringify(balances[0], null, 2));
      }
    } else {
      console.log('❌ Table balances non trouvée');
    }
    
    // Essayer table user_balances
    const { data: userBalances, error: userBalanceError } = await adminClient
      .from('user_balances')
      .select('*')
      .limit(3);
    
    if (!userBalanceError) {
      console.log('✅ Table user_balances trouvée:', userBalances.length, 'entrées');
      if (userBalances.length > 0) {
        console.log('Structure:', JSON.stringify(userBalances[0], null, 2));
      }
    } else {
      console.log('❌ Table user_balances non trouvée');
    }
    
    // Essayer table wallets
    const { data: wallets, error: walletsError } = await adminClient
      .from('wallets')
      .select('*')
      .limit(3);
    
    if (!walletsError) {
      console.log('✅ Table wallets trouvée:', wallets.length, 'entrées');
      if (wallets.length > 0) {
        console.log('Structure:', JSON.stringify(wallets[0], null, 2));
      }
    } else {
      console.log('❌ Table wallets non trouvée');
    }
    
  } catch (error) {
    console.error('💥 Erreur générale:', error.message);
  }
}

analyzeUserTable();