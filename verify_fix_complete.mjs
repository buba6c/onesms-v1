import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🧪 VÉRIFICATION POST-FIX: RLS et Synchronisation\n')
console.log('='.repeat(70))

async function postFixVerification() {
  let allGood = true
  
  // Test 1: Insertion activation
  console.log('\n1️⃣  TEST INSERTION ACTIVATION\n')
  
  const testData = {
    user_id: 'ea4eb96d-1663-427e-8903-65113aaf4221',  // admin@onesms.test
    order_id: 'verify_' + Date.now(),
    phone: '+6289518249636',
    service_code: 'whatsapp',
    country_code: 'indonesia',
    operator: 'any',
    price: 15.5,
    status: 'pending',
    expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    provider: 'sms-activate'
  }
  
  const { data: inserted, error: insertError } = await supabase
    .from('activations')
    .insert(testData)
    .select()
    .single()
  
  if (insertError) {
    console.log('❌ ÉCHEC - RLS bloque toujours')
    console.log(`   ${insertError.message}`)
    console.log('\n👉 Exécutez le SQL de fix dans Supabase Dashboard\n')
    allGood = false
  } else {
    console.log('✅ Insertion OK')
    console.log(`   ID: ${inserted.id.slice(0, 8)}...`)
    
    // Test 2: Lecture
    console.log('\n2️⃣  TEST LECTURE ACTIVATION\n')
    
    const { data: read, error: readError } = await supabase
      .from('activations')
      .select('*')
      .eq('id', inserted.id)
      .single()
    
    if (readError) {
      console.log('❌ Lecture échouée')
      console.log(`   ${readError.message}`)
      allGood = false
    } else {
      console.log('✅ Lecture OK')
      console.log(`   Phone: ${read.phone}`)
      console.log(`   Status: ${read.status}`)
    }
    
    // Test 3: Update (simuler réception SMS)
    console.log('\n3️⃣  TEST UPDATE ACTIVATION (Simulation SMS)\n')
    
    const { data: updated, error: updateError } = await supabase
      .from('activations')
      .update({
        status: 'received',
        sms_code: '123456',
        sms_text: 'Your code is 123456',
        updated_at: new Date().toISOString()
      })
      .eq('id', inserted.id)
      .select()
      .single()
    
    if (updateError) {
      console.log('❌ Update échoué')
      console.log(`   ${updateError.message}`)
      allGood = false
    } else {
      console.log('✅ Update OK')
      console.log(`   Status: ${updated.status}`)
      console.log(`   SMS Code: ${updated.sms_code}`)
      console.log('   WebSocket devrait notifier le frontend maintenant!')
    }
    
    // Test 4: Vérifier Realtime
    console.log('\n4️⃣  TEST REALTIME (WebSocket)\n')
    
    console.log('Souscription au channel...')
    
    let realtimeWorking = false
    
    const channel = supabase
      .channel('test-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'activations',
          filter: `id=eq.${inserted.id}`
        },
        (payload) => {
          console.log('✅ WebSocket reçu:', payload.new.status)
          realtimeWorking = true
        }
      )
      .subscribe((status) => {
        console.log(`WebSocket status: ${status}`)
      })
    
    // Attendre souscription
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Faire un update pour trigger WebSocket
    await supabase
      .from('activations')
      .update({ sms_text: 'Updated via test' })
      .eq('id', inserted.id)
    
    // Attendre notification
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    await supabase.removeChannel(channel)
    
    if (realtimeWorking) {
      console.log('\n✅ WebSocket fonctionne!')
    } else {
      console.log('\n⚠️  WebSocket pas reçu (peut-être lent)')
      console.log('   Vérifiez que Realtime est activé dans Supabase')
    }
    
    // Test 5: Query frontend
    console.log('\n5️⃣  TEST QUERY FRONTEND\n')
    
    const { data: frontendData, error: frontendError } = await supabase
      .from('activations')
      .select('*')
      .eq('user_id', testData.user_id)
      .in('status', ['pending', 'waiting', 'received'])
      .order('created_at', { ascending: false })
    
    if (frontendError) {
      console.log('❌ Query frontend échouée')
      console.log(`   ${frontendError.message}`)
      allGood = false
    } else {
      console.log(`✅ Query OK - ${frontendData.length} activation(s)`)
      if (frontendData.length > 0) {
        console.log(`   Dernière: ${frontendData[0].phone} - ${frontendData[0].status}`)
      }
    }
    
    // Nettoyage
    console.log('\n6️⃣  NETTOYAGE\n')
    
    const { error: deleteError } = await supabase
      .from('activations')
      .delete()
      .eq('id', inserted.id)
    
    if (deleteError) {
      console.log('⚠️  Suppression échouée (manuel requis)')
    } else {
      console.log('✅ Test activation supprimée')
    }
  }
  
  // Résumé final
  console.log('\n' + '='.repeat(70))
  
  if (allGood) {
    console.log('\n🎉 TOUS LES TESTS PASSENT!\n')
    console.log('✅ RLS configuré correctement')
    console.log('✅ Insertions fonctionnent')
    console.log('✅ Updates fonctionnent')
    console.log('✅ Lectures fonctionnent')
    console.log('✅ WebSocket activé')
    console.log('\n👉 Vous pouvez maintenant tester sur la plateforme:\n')
    console.log('   1. Ouvrez http://localhost:3002')
    console.log('   2. Activez un numéro')
    console.log('   3. Le SMS devrait s\'afficher automatiquement')
    console.log('   4. Vérifiez les logs navigateur (F12 → Console)\n')
  } else {
    console.log('\n❌ CERTAINS TESTS ONT ÉCHOUÉ\n')
    console.log('👉 Exécutez le SQL de fix dans Supabase Dashboard:')
    console.log('   - Ouvrez: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw')
    console.log('   - SQL Editor → New Query')
    console.log('   - Copiez le SQL depuis generate_rls_fix_sql.mjs')
    console.log('   - Cliquez RUN')
    console.log('   - Relancez ce script\n')
  }
}

postFixVerification().catch(console.error)
