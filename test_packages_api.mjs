// Test direct de l'API packages depuis le même client que l'application
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Test API activation_packages - même méthode que l\'app');
console.log('='.repeat(60));
console.log('\n📌 URL:', supabaseUrl);
console.log('📌 Anon Key:', supabaseAnonKey?.substring(0, 30) + '...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test exact comme dans packages.ts
async function testGetActivePackages() {
  console.log('\n📦 Test getActivePackages():');
  
  const { data, error } = await supabase
    .from('activation_packages')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.log('❌ Erreur:', error);
    return [];
  }
  
  console.log('✅ Succès! Packages récupérés:', data?.length);
  
  if (data && data.length > 0) {
    console.log('\n📋 Structure du premier package:');
    console.log(JSON.stringify(data[0], null, 2));
    
    console.log('\n📋 Tous les packages:');
    data.forEach((pkg, i) => {
      console.log(`  ${i + 1}. ${pkg.activations} activations - ${pkg.price_xof} FCFA ${pkg.is_popular ? '⭐ POPULAIRE' : ''}`);
    });
  }
  
  return data || [];
}

// Test avec tri comme dans HomePage
async function testWithSorting() {
  console.log('\n📦 Test avec tri (comme HomePage):');
  
  const { data: packages, error } = await supabase
    .from('activation_packages')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.log('❌ Erreur:', error);
    return;
  }
  
  // Trier par display_order, puis mettre le populaire au milieu
  const sorted = [...packages].sort((a, b) => a.display_order - b.display_order);
  
  // Trouver le package populaire et le mettre au milieu
  const popularIndex = sorted.findIndex(p => p.is_popular);
  console.log('\n📊 Index du populaire:', popularIndex);
  
  if (popularIndex !== -1 && sorted.length >= 3) {
    const popular = sorted.splice(popularIndex, 1)[0];
    const middleIndex = Math.floor(sorted.length / 2);
    sorted.splice(middleIndex, 0, popular);
    console.log('✅ Package populaire déplacé au milieu (index:', middleIndex, ')');
  }
  
  console.log('\n📋 Ordre final:');
  sorted.forEach((pkg, i) => {
    console.log(`  ${i + 1}. ${pkg.activations} activations - ${pkg.price_xof} FCFA ${pkg.is_popular ? '⭐' : ''}`);
  });
}

// Test de fetch HTTP direct (pour simuler ce que le navigateur fait)
async function testDirectFetch() {
  console.log('\n📦 Test fetch HTTP direct:');
  
  const url = `${supabaseUrl}/rest/v1/activation_packages?is_active=eq.true&order=display_order.asc&select=*`;
  
  console.log('📌 URL:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📌 Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Erreur HTTP:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Succès! Packages:', data?.length);
  } catch (err) {
    console.log('❌ Erreur fetch:', err.message);
  }
}

// Exécuter tous les tests
async function runAllTests() {
  await testGetActivePackages();
  await testWithSorting();
  await testDirectFetch();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Tous les tests terminés');
  console.log('\n💡 Si tous ces tests passent mais l\'erreur 400 persiste dans le navigateur,');
  console.log('   vérifiez:');
  console.log('   1. Videz le cache du navigateur (Cmd+Shift+R)');
  console.log('   2. Vérifiez la console Network pour voir la requête exacte');
  console.log('   3. Assurez-vous que le .env est bien chargé dans Vite');
}

runAllTests();
