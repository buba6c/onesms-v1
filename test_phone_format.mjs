// Copie de la fonction pour test standalone
function formatPhoneNumber(phone) {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10) return phone;
  
  let countryCode = '';
  let remaining = '';
  
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    countryCode = '1';
    remaining = cleaned.slice(1);
  } else if (cleaned.startsWith('62') && cleaned.length >= 11) {
    countryCode = '62';
    remaining = cleaned.slice(2);
  } else if (cleaned.startsWith('33') && cleaned.length === 11) {
    countryCode = '33';
    remaining = cleaned.slice(2);
  } else if (cleaned.startsWith('44') && cleaned.length === 12) {
    countryCode = '44';
    remaining = cleaned.slice(2);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    countryCode = '91';
    remaining = cleaned.slice(2);
  } else if (cleaned.startsWith('7') && cleaned.length === 11) {
    countryCode = '7';
    remaining = cleaned.slice(1);
  } else if (cleaned.startsWith('55') && cleaned.length >= 12) {
    countryCode = '55';
    remaining = cleaned.slice(2);
  } else if (cleaned.startsWith('86') && cleaned.length === 13) {
    countryCode = '86';
    remaining = cleaned.slice(2);
  } else {
    if (cleaned.length >= 12) {
      countryCode = cleaned.slice(0, 2);
      remaining = cleaned.slice(2);
    } else {
      countryCode = cleaned.slice(0, 1);
      remaining = cleaned.slice(1);
    }
  }
  
  if (remaining.length >= 9) {
    const part1 = remaining.slice(0, 3);
    const part2 = remaining.slice(3, 6);
    const part3 = remaining.slice(6, 9);
    const part4 = remaining.slice(9);
    
    return `+${countryCode} (${part1}) ${part2} ${part3}${part4 ? ' ' + part4 : ''}`;
  } else if (remaining.length >= 6) {
    const part1 = remaining.slice(0, 3);
    const part2 = remaining.slice(3, 6);
    const part3 = remaining.slice(6);
    
    return `+${countryCode} (${part1}) ${part2}${part3 ? ' ' + part3 : ''}`;
  } else {
    return `+${countryCode} ${remaining}`;
  }
}

console.log('📞 TEST DE FORMATAGE DES NUMÉROS DE TÉLÉPHONE\n')
console.log('═══════════════════════════════════════════════════════════\n')

const testCases = [
  { country: 'Indonésie', raw: '6289518249636', expected: '+62 (895) 182 496 36' },
  { country: 'Indonésie', raw: '6283187992499', expected: '+62 (831) 879 924 99' },
  { country: 'USA', raw: '12025551234', expected: '+1 (202) 555 123 4' },
  { country: 'France', raw: '33612345678', expected: '+33 (612) 345 678' },
  { country: 'UK', raw: '447911123456', expected: '+44 (791) 112 345 6' },
  { country: 'Russie', raw: '79161234567', expected: '+7 (916) 123 456 7' },
  { country: 'Brésil', raw: '5511987654321', expected: '+55 (119) 876 543 21' },
  { country: 'Inde', raw: '919876543210', expected: '+91 (987) 654 321 0' },
  { country: 'Chine', raw: '8613812345678', expected: '+86 (138) 123 456 78' },
]

console.log('Tests de formatage:\n')
testCases.forEach((test, i) => {
  const formatted = formatPhoneNumber(test.raw)
  const passed = formatted === test.expected
  
  console.log(`${i + 1}. ${test.country}`)
  console.log(`   Brut:     ${test.raw}`)
  console.log(`   Formaté:  ${formatted}`)
  console.log(`   Attendu:  ${test.expected}`)
  console.log(`   ${passed ? '✅ PASS' : '❌ FAIL'}`)
  console.log('')
})

console.log('═══════════════════════════════════════════════════════════\n')
console.log('🎯 Exemple d\'affichage final:\n')
console.log('   ' + formatPhoneNumber('6289518249636'))
console.log('   ' + formatPhoneNumber('6283187992499'))
console.log('')
