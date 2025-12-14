// Analyser l'erreur complète pour mapper TOUTES les colonnes

const errorDetails = 'Failing row contains (af44f1ff-e619-4d16-a643-564b7a09c25e, e108c02a-2012-4043-bbc2-fb09bb11f824, 30578377, 447435673458, fb, 16, any, 2025-12-03 11:20:58.552762+00, null, null, null, null, 0.00, active, null, 0, 2025-12-03 11:20:58.552762+00, 2025-12-03 11:20:58.552762+00, null, 2025-12-03 15:20:58.517+00, 30578377, sms-activate, 0.00, fb, facebook, 16, 447435673458, 5.00, [], {"rent_id": "30578377", "end_date": "2025-12-03T15:20:58.517Z", ...})';

console.log('🔍 MAPPING COMPLET DES COLONNES\n');
console.log('='.repeat(80));

const match = errorDetails.match(/Failing row contains \((.*)\)/);
if (!match) {
  console.log('❌ Impossible d\'extraire les valeurs');
  process.exit(1);
}

// Parser intelligemment (gérer les virgules dans les JSON)
let values = [];
let current = '';
let inJson = false;
const fullString = match[1];

for (let i = 0; i < fullString.length; i++) {
  const char = fullString[i];
  
  if (char === '{') inJson = true;
  if (char === '}') inJson = false;
  
  if (char === ',' && !inJson && fullString[i + 1] === ' ') {
    values.push(current.trim());
    current = '';
    i++; // Skip space
  } else {
    current += char;
  }
}
values.push(current.trim()); // Dernier élément

console.log(`\n📊 Total: ${values.length} colonnes détectées\n`);

// Mapping basé sur les valeurs connues
const knownMapping = {
  1: { name: 'id', value: values[0], type: 'UUID' },
  2: { name: 'user_id', value: values[1], type: 'UUID' },
  3: { name: 'rent_id', value: values[2], type: 'TEXT' },
  4: { name: 'phone', value: values[3], type: 'TEXT' },
  5: { name: 'service_code', value: values[4], type: 'TEXT' },
  6: { name: 'country_code', value: values[5], type: 'TEXT' },
  7: { name: '?type?', value: values[6], type: 'TEXT' },
  8: { name: 'created_at', value: values[7], type: 'TIMESTAMP' },
  9: { name: '?NULL?', value: values[8], type: '?' },
  10: { name: '?NULL?', value: values[9], type: '?' },
  11: { name: '?NULL?', value: values[10], type: '?' },
  12: { name: '?NULL?', value: values[11], type: '?' },
  13: { name: '?price?', value: values[12], type: 'DECIMAL' },
  14: { name: 'status', value: values[13], type: 'TEXT' },
  15: { name: '?NULL?', value: values[14], type: '?' },
  16: { name: '?count?', value: values[15], type: 'INTEGER' },
  17: { name: 'created_at_2?', value: values[16], type: 'TIMESTAMP' },
  18: { name: 'updated_at', value: values[17], type: 'TIMESTAMP' },
  19: { name: '?NULL?', value: values[18], type: '?' },
  20: { name: 'expires_at', value: values[19], type: 'TIMESTAMP' },
  21: { name: 'rental_id', value: values[20], type: 'TEXT' },
  22: { name: 'provider', value: values[21], type: 'TEXT' },
  23: { name: '?cost?', value: values[22], type: 'DECIMAL' },
  24: { name: 'service', value: values[23], type: 'TEXT' },
  25: { name: 'service_name', value: values[24], type: 'TEXT' },
  26: { name: 'country', value: values[25], type: 'TEXT' },
  27: { name: 'phone_number', value: values[26], type: 'TEXT' },
  28: { name: 'price', value: values[27], type: 'DECIMAL' },
  29: { name: 'sms_messages', value: values[28], type: 'JSONB' },
  30: { name: 'metadata', value: values[29], type: 'JSONB' }
};

console.log('COLONNE'.padEnd(5) + 'NOM'.padEnd(20) + 'VALEUR'.padEnd(40) + 'TYPE\n');
console.log('-'.repeat(80));

Object.entries(knownMapping).forEach(([pos, info]) => {
  const isNull = info.value === 'null';
  const icon = isNull ? '❌' : '✅';
  const display = info.value?.length > 35 ? info.value.substring(0, 32) + '...' : info.value;
  console.log(`${icon} ${pos.padEnd(3)} ${info.name.padEnd(20)} ${display.padEnd(40)} ${info.type}`);
});

console.log('\n' + '='.repeat(80));
console.log('\n❌ COLONNES NULL (doivent être remplies):\n');

const nullColumns = [];
Object.entries(knownMapping).forEach(([pos, info]) => {
  if (info.value === 'null') {
    nullColumns.push({ pos, name: info.name });
  }
});

nullColumns.forEach(col => {
  console.log(`   Position ${col.pos}: ${col.name}`);
});

console.log('\n💡 D\'après l\'erreur actuelle: "end_date" est NULL');
console.log('   Mais "expires_at" (pos 20) contient: 2025-12-03 15:20:58.517+00');
console.log('   → Il y a peut-être une colonne "end_date" distincte!\n');

console.log('📝 VALEURS DANS METADATA:');
const metadataStr = values[29] || '';
console.log(`   ${metadataStr}\n`);

console.log('🎯 SUGGESTION: La colonne "end_date" doit être ajoutée avec:');
console.log('   end_date: calculatedEndDate (même valeur que expires_at)\n');

