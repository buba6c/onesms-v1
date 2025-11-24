import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🔍 ANALYSE APPROFONDIE DES PROBLÈMES\n');
console.log('='.repeat(60));

// PROBLÈME 1: POPULARITY_SCORE
console.log('\n📊 PROBLÈME 1: POPULARITY_SCORE (Tri des services)\n');

const { data: services } = await supabase
  .from('services')
  .select('code, name, popularity_score, total_available')
  .eq('active', true)
  .order('total_available', { ascending: false })
  .limit(15);

console.log('Services triés par STOCK (réalité):');
services?.forEach((s, i) => {
  console.log(`   ${(i+1).toString().padStart(2)}. ${s.code.padEnd(15)} | Pop: ${String(s.popularity_score || 0).padStart(3)} | Stock: ${s.total_available || 0}`);
});

console.log('\n❌ PROBLÈME IDENTIFIÉ:');
console.log('   - Les services sont triés par popularity_score (manuel)');
console.log('   - Mais le popularity_score ne reflète PAS les vraies performances');
console.log('   - Exemple: AOL a popularity_score=0 mais 2.5M de numéros!');
console.log('   - Microsoft a 2.8M numéros mais popularity_score=60');

console.log('\n💡 SOLUTION:');
console.log('   Calculer popularity_score automatiquement basé sur:');
console.log('   1. Stock disponible (total_available)');
console.log('   2. Taux de succès réel (delivery_rate moyen)');
console.log('   3. Nombre de commandes réussies (historique)');

// PROBLÈME 2: CONVERSION PRIX
console.log('\n\n💰 PROBLÈME 2: CONVERSION PRIX (₽ vs Ⓐ)\n');
console.log('='.repeat(60));

const { data: pricing } = await supabase
  .from('pricing_rules')
  .select('service_code, country_code, operator, activation_cost, activation_price')
  .eq('service_code', 'google')
  .eq('country_code', 'russia')
  .limit(5);

console.log('Exemple: Google Russia en DB:');
pricing?.forEach(p => {
  const margin = ((p.activation_price / p.activation_cost - 1) * 100).toFixed(1);
  console.log(`   ${p.operator.padEnd(12)} | Cost: ${p.activation_cost}₽ → ${p.activation_price}Ⓐ (marge: ${margin}%)`);
});

console.log('\n❌ PROBLÈME IDENTIFIÉ:');
console.log('   - 5sim donne les prix en Roubles (₽)');
console.log('   - Notre système utilise des Pièces (Ⓐ)');
console.log('   - Actuellement: 1₽ = 1Ⓐ directement (pas de conversion)');
console.log('   - Marge appliquée: 20% (cost * 1.2)');
console.log('   ');
console.log('   Sur 5sim: Logo Google = 15₽');
console.log('   Sur notre app: Logo Google = 18Ⓐ (15 * 1.2)');
console.log('   ');
console.log('   🤔 Question: Est-ce que 1Ⓐ = 1₽ en valeur réelle?');

console.log('\n💡 SOLUTION:');
console.log('   Option 1: Définir clairement 1Ⓐ = 1₽ (simple)');
console.log('   Option 2: Ajouter taux de change ₽→Ⓐ dans .env');
console.log('   Option 3: Afficher les deux devises (transparent)');

// PROBLÈME 3: TRI DES PAYS
console.log('\n\n🌍 PROBLÈME 3: TRI DES PAYS (Success Rate)\n');
console.log('='.repeat(60));

const { data: countries } = await supabase
  .from('countries')
  .select('code, name, success_rate')
  .eq('active', true)
  .order('success_rate', { ascending: false })
  .limit(10);

console.log('Pays triés par success_rate:');
countries?.forEach(c => {
  console.log(`   ${c.code.padEnd(5)} | ${c.name.padEnd(20)} | ${c.success_rate}%`);
});

console.log('\n❌ PROBLÈME IDENTIFIÉ:');
console.log('   - TOUS les pays ont success_rate = 99%');
console.log('   - Pas de différenciation entre pays performants et non performants');
console.log('   - Le tri ne sert à rien si tous égaux');

console.log('\n💡 SOLUTION:');
console.log('   Calculer success_rate réel depuis:');
console.log('   1. Historique des activations (orders table)');
console.log('   2. Taux de SMS reçus vs expirés');
console.log('   3. Delivery_rate moyen des opérateurs du pays');

console.log('\n\n✅ RÉSUMÉ DES PROBLÈMES:\n');
console.log('1. 📊 POPULARITY_SCORE: Valeurs manuelles obsolètes');
console.log('2. 💰 PRIX: Conversion ₽→Ⓐ + marge 20% (à clarifier)');
console.log('3. 🌍 SUCCESS_RATE: Tous à 99%, pas de vraies données');

console.log('\n🎯 PROCHAINES ÉTAPES:');
console.log('1. Créer fonction auto-calcul popularity_score');
console.log('2. Clarifier le système de conversion monétaire');
console.log('3. Implémenter calcul success_rate depuis historique réel');
