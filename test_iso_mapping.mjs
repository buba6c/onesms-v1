// Test du fix pour rent-X
const SMS_ACTIVATE_ID_TO_ISO = { '6': 'id', '78': 'fr', '187': 'us' };
const COUNTRY_TO_ISO = { 'indonesia': 'id', 'france': 'fr' };
const VALID_ISO_CODES = new Set(['id', 'fr', 'us', 're', 'gb']);

function resolveToIso(countryCode) {
  if (!countryCode) return '';
  let code = countryCode.toLowerCase().replace(/\s+/g, '');
  
  // 0. Gérer le préfixe 'rent-'
  if (code.startsWith('rent-')) {
    code = code.replace('rent-', '');
  }
  
  if (SMS_ACTIVATE_ID_TO_ISO[code]) return SMS_ACTIVATE_ID_TO_ISO[code];
  if (COUNTRY_TO_ISO[code]) return COUNTRY_TO_ISO[code];
  if (code.length === 2 && VALID_ISO_CODES.has(code)) return code;
  
  // Fallback seulement si pas numérique
  if (!/^\d+$/.test(code)) {
    const twoChars = code.substring(0, 2);
    if (VALID_ISO_CODES.has(twoChars)) return twoChars;
  }
  
  return '';
}

console.log('Test resolveToIso avec fix rent-:');
console.log('  "rent-6" →', resolveToIso('rent-6'), '(attendu: id)');
console.log('  "rent-78" →', resolveToIso('rent-78'), '(attendu: fr)');
console.log('  "6" →', resolveToIso('6'), '(attendu: id)');
console.log('  "indonesia" →', resolveToIso('indonesia'), '(attendu: id)');
console.log('  "999" →', resolveToIso('999'), '(attendu: vide - ID inconnu)');
console.log('  "re" →', resolveToIso('re'), '(attendu: re - Réunion)');
