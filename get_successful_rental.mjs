import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzI1Njc2MiwiZXhwIjoyMDQ4ODMyNzYyfQ.gWdXq5h3xNRsP0ViZRlVsEbmM6yx_QRNYR9vqfJ5LgI'
);

console.log('🔍 Récupération du rental qui a réussi (ID: 1f16e179-6dd8-4ace-9d29-2662186618bd)\n');

const { data, error } = await supabase
  .from('rentals')
  .select('*')
  .eq('id', '1f16e179-6dd8-4ace-9d29-2662186618bd')
  .single();

if (error) {
  console.log('❌ Erreur:', error.message);
  console.log('\n📋 Essayons de récupérer n\'importe quel rental...\n');
  
  const { data: anyRental, error: err2 } = await supabase
    .from('rentals')
    .select('*')
    .limit(1)
    .single();
  
  if (anyRental) {
    console.log('✅ Structure du rental trouvé:\n');
    Object.entries(anyRental).forEach(([key, val]) => {
      const display = typeof val === 'object' ? JSON.stringify(val).substring(0, 50) + '...' : val;
      console.log(`   ${key.padEnd(20)} = ${display}`);
    });
  } else {
    console.log('❌ Aucun rental trouvé:', err2?.message);
  }
} else {
  console.log('✅ Structure du rental réussi:\n');
  Object.entries(data).forEach(([key, val]) => {
    const display = typeof val === 'object' ? JSON.stringify(val).substring(0, 50) + '...' : val;
    console.log(`   ${key.padEnd(20)} = ${display}`);
  });
}
