import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4OTk0NjMsImV4cCI6MjA2MDQ3NTQ2M30.m4jrSPj9rvjEKMls4mIzQghXdpDuT1sVXd1bVXlK9mI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('🔍 DIAGNOSTIC COMPLET\n');
  
  // 1. Tester get-top-countries-by-service pour voir le format de données
  console.log('1️⃣ Test get-top-countries-by-service (WhatsApp)...');
  
  const { data: countriesData, error: countriesError } = await supabase.functions.invoke('get-top-countries-by-service', {
    body: { service: 'wa' }
  });
  
  if (countriesError) {
    console.log('   ❌ Erreur:', countriesError.message);
  } else {
    console.log('   ✅ Success! Premiers pays:');
    const countries = countriesData?.countries || [];
    countries.slice(0, 3).forEach((c, i) => {
      console.log(`      ${i+1}. ID: ${c.countryId} | Code: ${c.countryCode} | Name: ${c.countryName} | Price: ${c.price}Ⓐ`);
    });
    
    // Simuler ce que le frontend envoie
    if (countries.length > 0) {
      const firstCountry = countries[0];
      console.log('\n2️⃣ Données que le frontend enverrait:');
      console.log(`   country: "${firstCountry.countryId}" (depuis selectedCountry.id)`);
      console.log(`   product: "wa"`);
      console.log(`   expectedPrice: ${firstCountry.price}`);
    }
  }
  
  // 2. Vérifier les activations récentes pour voir les erreurs
  console.log('\n3️⃣ Dernières transactions pending/failed...');
  
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, type, status, description, created_at')
    .in('status', ['pending', 'failed'])
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (transactions?.length) {
    transactions.forEach(t => {
      console.log(`   - [${t.status}] ${t.description?.substring(0, 60)}...`);
    });
  } else {
    console.log('   Aucune transaction pending/failed récente');
  }
  
  // 3. Vérifier solde SMS-Activate
  console.log('\n4️⃣ Test API SMS-Activate direct...');
  
  const apiKey = 'A6241Ab92dAf0f38f04f82e5e8A54720';
  const balanceUrl = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${apiKey}&action=getBalance`;
  
  try {
    const res = await fetch(balanceUrl);
    const text = await res.text();
    console.log(`   Solde SMS-Activate: ${text}`);
  } catch (e) {
    console.log(`   ❌ Erreur API:`, e.message);
  }
  
  // 4. Tester disponibilité numéros
  console.log('\n5️⃣ Test disponibilité WhatsApp USA (187)...');
  
  const statusUrl = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${apiKey}&action=getNumbersStatus&country=187&service=wa`;
  
  try {
    const res = await fetch(statusUrl);
    const data = await res.json();
    console.log(`   Disponibilité:`, JSON.stringify(data).substring(0, 200));
  } catch (e) {
    console.log(`   ❌ Erreur:`, e.message);
  }
}

diagnose();
