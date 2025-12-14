import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMyNTY3NjIsImV4cCI6MjA0ODgzMjc2Mn0.yldy59mM84Rte5MtYcDGnmrgVN-4YodIpBkWpoyVt28'
);

console.log('🔍 ANALYSE COMPLÈTE : Table rentals vs Code\n');
console.log('='.repeat(70));

// 1. Récupérer un rental existant pour voir la structure
console.log('\n📋 1. STRUCTURE ACTUELLE (colonnes existantes dans la table):\n');
const { data: rentals, error } = await supabase
  .from('rentals')
  .select('*')
  .limit(1);

if (rentals && rentals.length > 0) {
  const columns = Object.keys(rentals[0]);
  console.log('✅ Colonnes trouvées dans la table:', columns.length);
  columns.forEach((col, i) => {
    console.log(`   ${i + 1}. ${col}`);
  });
} else {
  console.log('⚠️  Table vide ou erreur:', error?.message);
}

// 2. Ce que le code essaie d'insérer
console.log('\n📝 2. CE QUE LE CODE INSÈRE (buy-sms-activate-rent/index.ts):\n');
const codeInserts = {
  user_id: 'UUID',
  rent_id: 'STRING (rentId.toString())',
  rental_id: 'STRING (rentId.toString())',
  phone: 'STRING',
  phone_number: 'STRING',
  service: 'STRING (product)',
  service_name: 'STRING (serviceName)',
  country: 'STRING',
  price: 'DECIMAL (roundedPrice)',
  status: 'STRING (active)',
  expires_at: 'TIMESTAMP (calculatedEndDate)',
  sms_messages: 'JSONB ([])',
  metadata: 'JSONB ({rent_id, service_code, country_code...})'
};

Object.entries(codeInserts).forEach(([col, type], i) => {
  console.log(`   ${i + 1}. ${col.padEnd(20)} → ${type}`);
});

// 3. Faire une insertion test pour voir ce qui manque
console.log('\n🧪 3. TEST D\'INSERTION (pour révéler les NOT NULL manquantes):\n');
const testInsert = await supabase
  .from('rentals')
  .insert({
    user_id: 'e108c02a-2012-4043-bbc2-fb09bb11f824',
    rent_id: 'TEST123',
    rental_id: 'TEST123',
    phone: '1234567890',
    phone_number: '1234567890',
    service: 'test',
    service_name: 'Test Service',
    country: 'test',
    price: 5.00,
    status: 'active',
    expires_at: new Date().toISOString(),
    sms_messages: [],
    metadata: {}
  })
  .select();

if (testInsert.error) {
  console.log('❌ Erreur d\'insertion:');
  console.log('   Code:', testInsert.error.code);
  console.log('   Message:', testInsert.error.message);
  console.log('   Details:', testInsert.error.details);
  
  // Extraire les colonnes NOT NULL manquantes
  if (testInsert.error.message.includes('null value in column')) {
    const match = testInsert.error.message.match(/column "(\w+)"/);
    if (match) {
      console.log('\n⚠️  COLONNE NOT NULL MANQUANTE:', match[1]);
    }
  }
} else {
  console.log('✅ Insertion réussie! ID:', testInsert.data[0].id);
  
  // Nettoyer le test
  await supabase
    .from('rentals')
    .delete()
    .eq('id', testInsert.data[0].id);
  console.log('🗑️  Test nettoyé');
}

console.log('\n' + '='.repeat(70));
console.log('\n💡 CONCLUSION:');
console.log('   Comparez les colonnes ci-dessus pour voir ce qui manque.');
console.log('   Les erreurs NOT NULL indiquent les colonnes à ajouter au code.\n');
