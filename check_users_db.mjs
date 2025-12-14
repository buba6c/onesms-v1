import { createClient } from '@supabase/supabase-js';

console.log('👥 VÉRIFICATION UTILISATEURS DB');
console.log('=' + '='.repeat(40));

async function checkUsers() {
  const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
  const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';
  
  const client = createClient(supabaseUrl, serviceRoleKey);
  
  try {
    // Vérifier les utilisateurs dans auth.users
    const { data: users, error: usersError } = await client
      .from('auth.users')
      .select('id, email, created_at')
      .limit(5);
      
    if (usersError) {
      console.error('❌ Erreur récupération users:', usersError.message);
    } else {
      console.log('👥 Utilisateurs trouvés:', users.length);
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.id})`);
      });
    }
    
    // Alternative : essayer avec rpc pour lister les utilisateurs
    const { data: rpcUsers, error: rpcError } = await client
      .rpc('get_users_list');
      
    if (rpcError) {
      console.log('ℹ️ RPC get_users_list non disponible');
    } else {
      console.log('👥 Utilisateurs via RPC:', rpcUsers.length);
    }
    
    // Vérifier table users dans public schema si elle existe
    const { data: publicUsers, error: publicError } = await client
      .from('users')
      .select('*')
      .limit(5);
      
    if (publicError) {
      console.log('ℹ️ Table public.users non trouvée ou inaccessible');
    } else {
      console.log('👥 Utilisateurs public.users:', publicUsers.length);
      publicUsers.forEach(user => {
        console.log(`  - ID: ${user.id}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Erreur générale:', error.message);
  }
}

checkUsers();