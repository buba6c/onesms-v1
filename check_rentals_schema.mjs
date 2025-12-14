import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzI1Njc2MiwiZXhwIjoyMDQ4ODMyNzYyfQ.gWdXq5h3xNRsP0ViZRlVsEbmM6yx_QRNYR9vqfJ5LgI'
);

console.log('📋 Structure de la table rentals:\n');

// Récupérer via une query normale
const { data, error } = await supabase
  .from('rentals')
  .select('*')
  .limit(1);

if (error) {
  console.error('❌ Erreur:', error);
} else if (data && data.length > 0) {
  console.log('✅ Colonnes trouvées:', Object.keys(data[0]));
} else {
  console.log('⚠️ Table vide, impossible de déterminer les colonnes');
  console.log('💡 Essayons une insertion test...');
  
  const { error: insertError } = await supabase
    .from('rentals')
    .insert({
      user_id: 'e108c02a-2012-4043-bbc2-fb09bb11f824',
      rental_id: 'TEST123',
      phone: 'TEST',
      service: 'test',
      service_name: 'Test',
      country: 'test'
    })
    .select();
  
  console.log('\n�� Erreur d\'insertion (révèle les colonnes manquantes):');
  console.log(insertError);
}
