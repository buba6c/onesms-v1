/**
 * Test simple de Realtime - vérifie si les notifications arrivent
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';

const USER_ID = 'e108c02a-2012-4043-bbc2-fb09bb11f824';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRealtime() {
  console.log('🔍 TEST REALTIME SIMPLIFIÉ\n');
  
  // S'authentifier
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'bubacarrsy2003@gmail.com',
    password: 'Souleymane14'
  });
  
  if (authError) {
    console.log('Essai avec buba6c...');
    const { data: auth2, error: err2 } = await supabase.auth.signInWithPassword({
      email: 'buba6c@gmail.com',
      password: 'Souleymane14'
    });
    
    if (err2) {
      console.log('❌ Authentification échouée:', err2.message);
      console.log('\nTest sans authentification...');
    } else {
      console.log('✅ Connecté:', auth2.user?.email);
    }
  } else {
    console.log('✅ Connecté:', authData.user?.email);
  }
  
  let eventsReceived = 0;
  
  // Créer une souscription à la table users avec filtre
  const channel = supabase
    .channel('simple-test')
    .on('postgres_changes', 
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'users',
        filter: `id=eq.${USER_ID}`
      },
      (payload) => {
        eventsReceived++;
        console.log(`\n📥 EVENT REÇU #${eventsReceived}!`);
        console.log('   Type:', payload.eventType);
        console.log('   New balance:', payload.new?.balance);
        console.log('   Old balance:', payload.old?.balance);
      }
    )
    .subscribe((status, err) => {
      console.log(`\n📡 Status: ${status}`);
      if (err) console.log('   Error:', err);
      
      if (status === 'SUBSCRIBED') {
        console.log('\n✅ Souscription active !');
        console.log('\n⏳ En attente de changements pendant 30 secondes...');
        console.log('   → Ouvrez Supabase Dashboard et modifiez le solde manuellement');
        console.log('   → Ou faites un achat dans l\'application');
        console.log('\n   Appuyez sur Ctrl+C pour arrêter\n');
      }
    });
    
  // Attendre 30 secondes
  await new Promise(r => setTimeout(r, 30000));
  
  console.log(`\n📊 Résultat: ${eventsReceived} événements reçus`);
  
  if (eventsReceived === 0) {
    console.log('\n⚠️  Aucun événement reçu. Causes possibles:');
    console.log('   1. Aucune modification n\'a été faite pendant le test');
    console.log('   2. La table users n\'est pas dans la publication supabase_realtime');
    console.log('   3. RLS bloque les notifications pour cet utilisateur');
    console.log('\n   Solution: Exécuter dans Supabase SQL Editor:');
    console.log('   ALTER PUBLICATION supabase_realtime ADD TABLE users;');
  }
  
  await supabase.removeChannel(channel);
  await supabase.auth.signOut();
  process.exit(0);
}

testRealtime().catch(console.error);
