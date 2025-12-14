/**
 * Diagnostic complet du Realtime Supabase
 * Vérifie les configurations, RLS, et connexion WebSocket
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.i31PDBp-K02RqZs35gfqEUQp9OHtxEQ6FqwfBV33wac';

// Créer clients avec et sans auth
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

const USER_ID = 'e108c02a-2012-4043-bbc2-fb09bb11f824';
const USER_EMAIL = 'buba6c@gmail.com';
const USER_PASSWORD = 'Souleymane14';

async function diagnoseRealtime() {
  console.log('🔍 DIAGNOSTIC COMPLET REALTIME SUPABASE\n');
  console.log('=' .repeat(60));
  
  // 1. Vérifier la configuration Realtime des tables
  console.log('\n📋 1. VÉRIFICATION PUBLICATION REALTIME\n');
  
  const { data: publications, error: pubError } = await supabaseService
    .from('pg_publication_tables')
    .select('*')
    .eq('pubname', 'supabase_realtime');
  
  if (pubError) {
    // La table pg_publication_tables n'est pas accessible, utiliser SQL
    console.log('   Accès direct non disponible, vérification via RPC...');
    
    const checkSql = `
      SELECT tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime'
      ORDER BY tablename;
    `;
    
    // On peut pas exécuter du SQL raw avec le client normal
    // Vérifions autrement en testant les souscriptions
  } else {
    console.log('   Tables publiées pour Realtime:');
    publications?.forEach(p => console.log(`   - ${p.schemaname}.${p.tablename}`));
  }
  
  // 2. Test de connexion WebSocket sans authentification
  console.log('\n📡 2. TEST WEBSOCKET (ANON)\n');
  
  const testResults = {
    users: { status: 'pending', events: 0 },
    activations: { status: 'pending', events: 0 },
    transactions: { status: 'pending', events: 0 }
  };
  
  // Test users subscription (sans filtre)
  const channelUsers = supabaseAnon
    .channel('diag-users')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'users' },
      (payload) => {
        console.log('   📥 users event:', payload.eventType);
        testResults.users.events++;
      }
    )
    .subscribe((status) => {
      testResults.users.status = status;
      console.log(`   [users] Status: ${status}`);
    });
    
  // Test activations subscription (sans filtre)
  const channelActivations = supabaseAnon
    .channel('diag-activations')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'activations' },
      (payload) => {
        console.log('   📥 activations event:', payload.eventType);
        testResults.activations.events++;
      }
    )
    .subscribe((status) => {
      testResults.activations.status = status;
      console.log(`   [activations] Status: ${status}`);
    });
    
  // Attendre 3 secondes pour les souscriptions
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('\n   Résultat sans auth:');
  console.log(`   - users: ${testResults.users.status}`);
  console.log(`   - activations: ${testResults.activations.status}`);
  
  // Cleanup
  await supabaseAnon.removeChannel(channelUsers);
  await supabaseAnon.removeChannel(channelActivations);
  
  // 3. Test avec authentification
  console.log('\n🔐 3. TEST WEBSOCKET (AUTHENTIFIÉ)\n');
  
  const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
    email: USER_EMAIL,
    password: USER_PASSWORD
  });
  
  if (authError) {
    console.log(`   ❌ Erreur d'authentification: ${authError.message}`);
  } else {
    console.log(`   ✅ Connecté en tant que: ${authData.user?.email}`);
    
    const testResultsAuth = {
      users: { status: 'pending', events: 0 },
      activations: { status: 'pending', events: 0 }
    };
    
    // Test users avec filtre user_id
    const channelUsersAuth = supabaseAnon
      .channel('diag-users-auth')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'users',
          filter: `id=eq.${USER_ID}`
        },
        (payload) => {
          console.log('   📥 users (auth) event:', payload.eventType);
          testResultsAuth.users.events++;
        }
      )
      .subscribe((status) => {
        testResultsAuth.users.status = status;
        console.log(`   [users-auth] Status: ${status}`);
      });
      
    // Test activations avec filtre user_id
    const channelActivationsAuth = supabaseAnon
      .channel('diag-activations-auth')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'activations',
          filter: `user_id=eq.${USER_ID}`
        },
        (payload) => {
          console.log('   📥 activations (auth) event:', payload.eventType);
          testResultsAuth.activations.events++;
        }
      )
      .subscribe((status) => {
        testResultsAuth.activations.status = status;
        console.log(`   [activations-auth] Status: ${status}`);
      });
      
    // Attendre 3 secondes
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('\n   Résultat avec auth:');
    console.log(`   - users: ${testResultsAuth.users.status}`);
    console.log(`   - activations: ${testResultsAuth.activations.status}`);
    
    // Cleanup
    await supabaseAnon.removeChannel(channelUsersAuth);
    await supabaseAnon.removeChannel(channelActivationsAuth);
  }
  
  // 4. Vérifier les politiques RLS
  console.log('\n🛡️  4. VÉRIFICATION RLS SUR ACTIVATIONS\n');
  
  const { data: policies, error: polError } = await supabaseService.rpc('exec_sql', {
    sql: `
      SELECT polname, polcmd, polroles, polqual, polwithcheck
      FROM pg_policy 
      WHERE polrelid = 'public.activations'::regclass
      ORDER BY polname;
    `
  });
  
  if (polError) {
    console.log('   Vérification RLS via query...');
    
    // Tester la lecture directe
    const { data: testRead, error: readError } = await supabaseAnon
      .from('activations')
      .select('id')
      .eq('user_id', USER_ID)
      .limit(1);
      
    if (readError) {
      console.log(`   ❌ Lecture activations échouée: ${readError.message}`);
    } else {
      console.log(`   ✅ Lecture activations OK (${testRead?.length || 0} résultats)`);
    }
  } else {
    console.log('   Politiques RLS sur activations:');
    policies?.forEach(p => console.log(`   - ${p.polname}: ${p.polcmd}`));
  }
  
  // 5. Vérifier l'état actuel
  console.log('\n📊 5. ÉTAT ACTUEL DE L\'UTILISATEUR\n');
  
  const { data: user, error: userError } = await supabaseService
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', USER_ID)
    .single();
    
  if (user) {
    console.log(`   Balance: ${user.balance} Ⓐ`);
    console.log(`   Frozen: ${user.frozen_balance} Ⓐ`);
  }
  
  const { data: pendingActivations, error: pendingError } = await supabaseService
    .from('activations')
    .select('id, status, frozen_amount')
    .eq('user_id', USER_ID)
    .in('status', ['pending', 'active']);
    
  console.log(`   Activations en cours: ${pendingActivations?.length || 0}`);
  pendingActivations?.forEach(a => {
    console.log(`   - ${a.id}: status=${a.status}, frozen=${a.frozen_amount}`);
  });
  
  // 6. Test d'update et notification
  console.log('\n🔔 6. TEST UPDATE AVEC NOTIFICATION\n');
  
  // Créer une souscription et modifier le solde pour voir si on reçoit l'event
  const updateTest = {
    received: false,
    payload: null
  };
  
  const testChannel = supabaseAnon
    .channel('test-update-notify')
    .on('postgres_changes', 
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'users',
        filter: `id=eq.${USER_ID}`
      },
      (payload) => {
        console.log('   ✅ Notification reçue!');
        updateTest.received = true;
        updateTest.payload = payload;
      }
    )
    .subscribe(async (status) => {
      console.log(`   [test-update] Status: ${status}`);
      
      if (status === 'SUBSCRIBED') {
        // Faire une petite mise à jour
        console.log('   Mise à jour du solde...');
        const currentBalance = user?.balance || 0;
        
        // +0.01 puis -0.01 pour ne pas modifier réellement
        const { error: updateError } = await supabaseService
          .from('users')
          .update({ balance: currentBalance + 0.01 })
          .eq('id', USER_ID);
          
        if (updateError) {
          console.log(`   ❌ Erreur update: ${updateError.message}`);
        } else {
          console.log('   Update effectué, attente notification...');
          
          // Attendre la notification
          await new Promise(r => setTimeout(r, 2000));
          
          if (updateTest.received) {
            console.log('   ✅ REALTIME FONCTIONNE! Notification reçue.');
          } else {
            console.log('   ❌ Pas de notification reçue');
          }
          
          // Remettre le solde original
          await supabaseService
            .from('users')
            .update({ balance: currentBalance })
            .eq('id', USER_ID);
          console.log('   Solde restauré');
        }
      }
    });
    
  // Attendre le test
  await new Promise(r => setTimeout(r, 5000));
  
  await supabaseAnon.removeChannel(testChannel);
  
  // Résumé final
  console.log('\n' + '=' .repeat(60));
  console.log('📋 RÉSUMÉ DU DIAGNOSTIC\n');
  console.log('1. WebSocket Connection: Vérifier les logs ci-dessus');
  console.log('2. Si "SUBSCRIBED" mais pas de notifications:');
  console.log('   → Vérifier que la table est dans la publication supabase_realtime');
  console.log('   → Exécuter: ALTER PUBLICATION supabase_realtime ADD TABLE activations;');
  console.log('3. Si "CHANNEL_ERROR":');
  console.log('   → Les politiques RLS bloquent peut-être les notifications');
  console.log('   → Vérifier les logs Supabase Dashboard');
  console.log('=' .repeat(60));
  
  // Déconnexion
  await supabaseAnon.auth.signOut();
  process.exit(0);
}

diagnoseRealtime().catch(console.error);
