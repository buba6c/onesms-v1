// Analyser l'erreur pour extraire la structure de la table

const errorDetails = 'Failing row contains (c7ee9108-a83b-4c95-bc3b-36569e1c761e, e108c02a-2012-4043-bbc2-fb09bb11f824, 30578197, 6282374663153, null, null, any, 2025-12-03 11:14:28.022006+00, null, null, null, null, 0.00, active, null, 0, 2025-12-03 11:14:28.022006+00, 2025-12-03 11:14:28.022006+00, null, 2025-12-03 15:14:27.99+00, 30578197, sms-activate, 0.00, hw, Alipay/Alibaba/1688, 6, 6282374663153, 5.00, [], {"rent_id": "30578197", "end_date": "2025-12-03T15:14:27.990Z", ...})';

console.log('🔍 ANALYSE DE L\'ERREUR PostgreSQL\n');
console.log('='.repeat(70));

// Extraire les valeurs
const match = errorDetails.match(/Failing row contains \((.*)\)/);
if (match) {
  const values = match[1].split(', ').map(v => v.trim());
  
  console.log('\n📋 VALEURS INSÉRÉES (ordre des colonnes de la table):\n');
  values.forEach((val, i) => {
    const isNull = val === 'null';
    const icon = isNull ? '❌' : '✅';
    const display = val.length > 50 ? val.substring(0, 47) + '...' : val;
    console.log(`   ${String(i + 1).padStart(2)}. ${icon} ${display}`);
  });
  
  console.log('\n⚠️  COLONNES NULL (potentiellement problématiques):\n');
  const nullColumns = [];
  values.forEach((val, i) => {
    if (val === 'null') {
      nullColumns.push(i + 1);
    }
  });
  
  console.log(`   Positions: ${nullColumns.join(', ')}`);
  console.log(`   Total: ${nullColumns.length} colonnes NULL sur ${values.length}`);
  
  console.log('\n💡 D\'après l\'erreur: "service_code" est à NULL');
  console.log('   Il faut identifier sa position et l\'ajouter au code.\n');
}

console.log('='.repeat(70));
console.log('\n📝 CE QUE LE CODE INSÈRE ACTUELLEMENT:\n');

const currentInsert = {
  1: 'id (auto)',
  2: 'user_id',
  3: 'rent_id',
  4: 'phone',
  5: '?',
  6: '?',
  7: '?',
  8: 'created_at',
  9: '?',
  10: '?',
  11: '?',
  12: '?',
  13: 'price (0.00?)',
  14: 'status (active)',
  15: '?',
  16: '?',
  17: 'created_at',
  18: 'updated_at',
  19: '?',
  20: 'expires_at',
  21: 'rental_id',
  22: 'provider (sms-activate)',
  23: '?',
  24: 'service (hw)',
  25: 'service_name',
  26: 'country (6)',
  27: 'phone_number',
  28: 'price (5.00)',
  29: 'sms_messages ([])',
  30: 'metadata'
};

console.log('   Besoin de voir le schéma exact de la table pour mapper correctement.\n');
