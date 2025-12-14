import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

async function checkPolicies() {
  console.log('=== POLITIQUES RLS SUR RENTALS ===\n');
  
  const { data, error } = await supabase.rpc('exec_sql', { 
    query: "SELECT policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'rentals' ORDER BY policyname"
  });
  
  if (error) {
    // Essayer directement via SQL
    const { data: policies, error: err2 } = await supabase
      .from('pg_policies')
      .select('policyname, permissive, roles, cmd, qual, with_check')
      .eq('tablename', 'rentals');
    
    if (err2) {
      console.log('pg_policies pas accessible, utilisant raw SQL...');
      
      // Hack: create temp function
      const rawQuery = `
        SELECT json_agg(row_to_json(t)) 
        FROM (
          SELECT policyname, permissive, roles, cmd, qual, with_check 
          FROM pg_policies 
          WHERE tablename = 'rentals'
        ) t
      `;
      
      console.log('Impossible de lire pg_policies. Vérifions via la console Supabase.');
      console.log('Alternativement, voici ce que le frontend voit:');
    } else {
      console.log('Politiques:', JSON.stringify(policies, null, 2));
    }
  } else {
    console.log('Politiques:', JSON.stringify(data, null, 2));
  }
  
  // Check table config
  console.log('\n=== RLS STATUS ===');
  const { count: totalWithServiceRole } = await supabase
    .from('rentals')
    .select('*', { count: 'exact', head: true });
  
  console.log('Total rentals (service_role):', totalWithServiceRole);
  
  // Simuler un user authentifié en vérifiant si le user admin peut voir
  console.log('\n=== TEST AVEC USER ADMIN ===');
  const adminId = 'e108c02a-2012-4043-bbc2-fb09bb11f824';
  
  const { data: adminRentals, count } = await supabase
    .from('rentals')
    .select('*', { count: 'exact' })
    .eq('user_id', adminId);
  
  console.log(`Rentals de l'admin: ${count}`);
}

checkPolicies().catch(console.error);
