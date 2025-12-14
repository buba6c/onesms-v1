import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjIwNDY2MSwiZXhwIjoyMDYxNzgwNjYxfQ.U8BT8jppHFqE28s3052Lw0EWVjPNL2LPJRRI1Bqkfzk'
);

async function check() {
  // Trouver tous les utilisateurs avec frozen_balance > balance
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, balance, frozen_balance');

  console.log('=== UTILISATEURS AVEC FROZEN > BALANCE (PROBLÈME) ===');
  let count = 0;
  users?.forEach(u => {
    const disponible = u.balance - u.frozen_balance;
    if (disponible < 0) {
      count++;
      console.log(`Email: ${u.email}`);
      console.log(`  Balance: ${u.balance}`);
      console.log(`  Frozen: ${u.frozen_balance}`);
      console.log(`  Disponible: ${disponible} (NÉGATIF)`);
      console.log('');
    }
  });
  console.log(`Total: ${count} utilisateurs avec problème\n`);

  // Afficher aussi les utilisateurs avec un frozen_balance > 0
  console.log('=== UTILISATEURS AVEC FROZEN > 0 ===');
  users?.forEach(u => {
    if (u.frozen_balance > 0) {
      console.log(`Email: ${u.email} | Balance: ${u.balance} | Frozen: ${u.frozen_balance}`);
    }
  });
}

check().catch(console.error);
