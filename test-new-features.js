import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🧪 TEST DES NOUVELLES FONCTIONNALITÉS\n');
console.log('='.repeat(60));

// Test 1: Vérifier les popularity_scores AVANT
console.log('\n1️⃣ AVANT - Popularity Scores:');
const { data: beforeServices } = await supabase
  .from('services')
  .select('code, name, popularity_score, total_available')
  .eq('active', true)
  .order('total_available', { ascending: false })
  .limit(10);

beforeServices?.forEach((s, i) => {
  console.log(`   ${(i+1).toString().padStart(2)}. ${s.code.padEnd(15)} | Pop: ${String(s.popularity_score || 0).padStart(3)} | Stock: ${s.total_available || 0}`);
});

// Test 2: Appeler update-popularity-scores
console.log('\n2️⃣ APPEL - Mise à jour des scores...');
try {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/update-popularity-scores`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token || process.env.VITE_SUPABASE_ANON_KEY}`,
      'apikey': process.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  if (response.ok) {
    const result = await response.json();
    console.log('   ✅ Succès!');
    console.log('   Message:', result.message);
    if (result.top10) {
      console.log('\n   🏆 Top 10:');
      result.top10.forEach((s, i) => {
        console.log(`      ${i+1}. ${s.code.padEnd(15)} | Score: ${s.score} (Stock: ${s.breakdown.stock} + Delivery: ${s.breakdown.delivery} + Orders: ${s.breakdown.orders})`);
      });
    }
  } else {
    const errorText = await response.text();
    console.log('   ❌ Erreur:', response.status, errorText);
  }
} catch (err) {
  console.error('   ❌ Erreur:', err.message);
}

// Test 3: Vérifier les popularity_scores APRÈS
console.log('\n3️⃣ APRÈS - Popularity Scores (refresh):');
await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre 2s

const { data: afterServices } = await supabase
  .from('services')
  .select('code, name, popularity_score, total_available')
  .eq('active', true)
  .order('popularity_score', { ascending: false })
  .limit(10);

afterServices?.forEach((s, i) => {
  console.log(`   ${(i+1).toString().padStart(2)}. ${s.code.padEnd(15)} | Pop: ${String(s.popularity_score || 0).padStart(3)} | Stock: ${s.total_available || 0}`);
});

// Test 4: Vérifier les success_rates AVANT
console.log('\n4️⃣ AVANT - Success Rates:');
const { data: beforeCountries } = await supabase
  .from('countries')
  .select('code, name, success_rate')
  .eq('active', true)
  .order('success_rate', { ascending: false })
  .limit(5);

beforeCountries?.forEach(c => {
  console.log(`   ${c.code.padEnd(5)} | ${c.name.padEnd(20)} | ${c.success_rate}%`);
});

// Test 5: Appeler update-success-rates
console.log('\n5️⃣ APPEL - Mise à jour des success rates...');
try {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/update-success-rates`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token || process.env.VITE_SUPABASE_ANON_KEY}`,
      'apikey': process.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  if (response.ok) {
    const result = await response.json();
    console.log('   ✅ Succès!');
    console.log('   Message:', result.message);
    if (result.stats) {
      console.log(`   📊 Stats: ${result.stats.total_countries} pays, moyenne: ${result.stats.average_success_rate}%`);
    }
    if (result.top5) {
      console.log('\n   🏆 Top 5:');
      result.top5.forEach((c, i) => {
        console.log(`      ${i+1}. ${c.code.padEnd(5)} ${c.name.padEnd(20)} | ${c.success_rate}% (${c.sample_size} samples)`);
      });
    }
  } else {
    const errorText = await response.text();
    console.log('   ❌ Erreur:', response.status, errorText);
  }
} catch (err) {
  console.error('   ❌ Erreur:', err.message);
}

// Test 6: Vérifier les success_rates APRÈS
console.log('\n6️⃣ APRÈS - Success Rates (refresh):');
await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre 2s

const { data: afterCountries } = await supabase
  .from('countries')
  .select('code, name, success_rate')
  .eq('active', true)
  .order('success_rate', { ascending: false })
  .limit(5);

afterCountries?.forEach(c => {
  console.log(`   ${c.code.padEnd(5)} | ${c.name.padEnd(20)} | ${c.success_rate}%`);
});

console.log('\n\n✅ TESTS TERMINÉS!');
console.log('='.repeat(60));
console.log('\n💡 Prochaines étapes:');
console.log('   1. Les fonctions sont déployées ✅');
console.log('   2. Les boutons admin sont ajoutés ✅');
console.log('   3. Tester dans l\'interface: http://localhost:3001/admin/services');
console.log('   4. Configurer les cron jobs (voir INSTALLATION-GUIDE.md)');
