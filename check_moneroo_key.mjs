#!/usr/bin/env node
/**
 * Vérifier quelle clé Moneroo est utilisée
 */

const SECRET_KEY = '912a557b1ea781a38b0968d8e208603c8e7abc0f6365cbf9d3e7ab95d5174639';

console.log('🔑 Analyse de la clé secrète Moneroo:\n');
console.log('Clé:', SECRET_KEY);
console.log('Longueur:', SECRET_KEY.length, 'caractères');

// Les clés Moneroo ont généralement un préfixe
if (SECRET_KEY.startsWith('sk_test_')) {
  console.log('\n⚠️ MODE SANDBOX - Clé de test détectée');
  console.log('Préfixe: sk_test_');
} else if (SECRET_KEY.startsWith('sk_live_') || SECRET_KEY.startsWith('sk_prod_')) {
  console.log('\n✅ MODE PRODUCTION - Clé live détectée');
  console.log('Préfixe: sk_live_ ou sk_prod_');
} else {
  console.log('\n⚠️ Clé sans préfixe standard');
  console.log('Cette clé semble être une clé SANDBOX (pas de préfixe sk_live_)');
  console.log('\n📝 Pour passer en production:');
  console.log('1. Allez sur https://app.moneroo.io/');
  console.log('2. Dans Settings > API Keys');
  console.log('3. Copiez la clé LIVE/PRODUCTION (commence par sk_live_)');
  console.log('4. Mettez-la dans les secrets Supabase:');
  console.log('   npx supabase secrets set MONEROO_SECRET_KEY="sk_live_..."');
}

console.log('\n💡 Note: Les clés Moneroo déterminent automatiquement le mode:');
console.log('   - sk_test_xxx → Sandbox');
console.log('   - sk_live_xxx → Production');
