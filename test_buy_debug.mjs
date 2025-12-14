import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4OTk0NjMsImV4cCI6MjA2MDQ3NTQ2M30.m4jrSPj9rvjEKMls4mIzQghXdpDuT1sVXd1bVXlK9mI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBuy() {
  console.log('🧪 Test buy-sms-activate-number\n');
  
  // Test avec différents formats de country
  const testCases = [
    { country: '187', product: 'wa', desc: 'ID numérique string' },
    { country: 187, product: 'wa', desc: 'ID numérique number' },
    { country: 'usa', product: 'wa', desc: 'Code texte lowercase' },
    { country: 'united_states', product: 'wa', desc: 'Nom complet' },
  ];
  
  for (const test of testCases) {
    console.log(`\n📋 Test: ${test.desc}`);
    console.log(`   country: ${test.country} (type: ${typeof test.country})`);
    
    try {
      const { data, error } = await supabase.functions.invoke('buy-sms-activate-number', {
        body: {
          country: test.country,
          operator: 'any',
          product: test.product,
          userId: 'test-user-id',
          expectedPrice: 5
        }
      });
      
      if (error) {
        console.log(`   ❌ Error:`, error.message);
        // Essayer de lire le body de l'erreur
        if (error.context) {
          try {
            const text = await error.context.text();
            console.log(`   📄 Response:`, text);
          } catch (e) {}
        }
      } else {
        console.log(`   ✅ Success:`, JSON.stringify(data, null, 2));
      }
    } catch (e) {
      console.log(`   ❌ Exception:`, e.message);
    }
  }
}

testBuy();
