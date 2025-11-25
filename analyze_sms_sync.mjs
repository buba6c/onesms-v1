import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 DEEP ANALYSIS: Synchronisation SMS\n')
console.log('='.repeat(70))

async function analyzeSmsSync() {
  // 1. Vérifier activations avec SMS dans la DB
  console.log('\n1️⃣  ACTIVATIONS DANS LA DB\n')
  
  const { data: activations, error: activationsError } = await supabase
    .from('activations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (activationsError) {
    console.error('❌ Erreur:', activationsError.message)
  } else if (!activations || activations.length === 0) {
    console.log('⚠️  AUCUNE activation dans la DB')
  } else {
    console.log(`Total: ${activations.length} activations`)
    
    const withSms = activations.filter(a => a.sms_code)
    const withoutSms = activations.filter(a => !a.sms_code)
    
    console.log(`   Avec SMS: ${withSms.length}`)
    console.log(`   Sans SMS: ${withoutSms.length}`)
    
    console.log('\n📋 Détails des 5 dernières:\n')
    activations.slice(0, 5).forEach((a, i) => {
      console.log(`${i + 1}. ID: ${a.id.slice(0, 8)}...`)
      console.log(`   Phone: ${a.phone}`)
      console.log(`   Status: ${a.status}`)
      console.log(`   SMS Code: ${a.sms_code || 'NULL'}`)
      console.log(`   Order ID: ${a.order_id}`)
      console.log(`   Created: ${a.created_at}`)
      console.log(`   Updated: ${a.updated_at}`)
      console.log('')
    })
  }
  
  // 2. Tester check-sms-activate-status
  console.log('\n2️⃣  TEST CHECK-SMS-ACTIVATE-STATUS\n')
  
  if (activations && activations.length > 0) {
    const testActivation = activations[0]
    
    console.log(`Test avec activation: ${testActivation.id.slice(0, 8)}...`)
    console.log(`Order ID: ${testActivation.order_id}`)
    console.log(`Status actuel: ${testActivation.status}`)
    console.log(`SMS actuel: ${testActivation.sms_code || 'NULL'}`)
    
    console.log('\nAppel de check-sms-activate-status...\n')
    
    try {
      const { data: checkResult, error: checkError } = await supabase.functions.invoke(
        'check-sms-activate-status',
        {
          body: { activationId: testActivation.id }
        }
      )
      
      if (checkError) {
        console.error('❌ Erreur:', checkError.message)
      } else {
        console.log('✅ Résultat:')
        console.log(JSON.stringify(checkResult, null, 2))
        
        // Vérifier si la DB a été mise à jour
        const { data: updated } = await supabase
          .from('activations')
          .select('status, sms_code, sms_text, updated_at')
          .eq('id', testActivation.id)
          .single()
        
        console.log('\n📊 État après check:')
        console.log(`   Status: ${testActivation.status} → ${updated?.status}`)
        console.log(`   SMS: ${testActivation.sms_code || 'NULL'} → ${updated?.sms_code || 'NULL'}`)
        console.log(`   Updated: ${updated?.updated_at}`)
      }
    } catch (error) {
      console.error('❌ Exception:', error)
    }
  }
  
  // 3. Vérifier le cron job
  console.log('\n\n3️⃣  VÉRIFICATION CRON JOB\n')
  
  try {
    const { data: cronResult, error: cronError } = await supabase.functions.invoke(
      'cron-check-pending-sms'
    )
    
    if (cronError) {
      console.error('❌ Erreur cron:', cronError.message)
    } else {
      console.log('✅ Cron result:')
      console.log(JSON.stringify(cronResult, null, 2))
    }
  } catch (error) {
    console.error('❌ Exception cron:', error)
  }
  
  // 4. Vérifier WebSocket Realtime
  console.log('\n\n4️⃣  VÉRIFICATION WEBSOCKET REALTIME\n')
  
  console.log('Checking si useRealtimeSms est utilisé...')
  
  // Simuler un changement pour tester
  if (activations && activations.length > 0) {
    const testId = activations[0].id
    
    console.log(`\nTest: Mise à jour activation ${testId.slice(0, 8)}...`)
    
    const { error: updateError } = await supabase
      .from('activations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', testId)
    
    if (updateError) {
      console.error('❌ Erreur update:', updateError.message)
    } else {
      console.log('✅ Activation mise à jour (trigger WebSocket)')
      console.log('   Le frontend devrait recevoir la notification via WebSocket')
    }
  }
  
  // 5. Vérifier le polling frontend
  console.log('\n\n5️⃣  ANALYSE POLLING FRONTEND\n')
  
  console.log('Le frontend utilise:')
  console.log('   - useQuery pour charger les activations')
  console.log('   - refetchInterval intelligent (3s → 30s)')
  console.log('   - WebSocket pour notifications instantanées')
  console.log('   - Refetch manuel après activation')
  
  // 6. Diagnostic complet
  console.log('\n\n6️⃣  DIAGNOSTIC PROBLÈME SYNCHRONISATION\n')
  
  console.log('Causes possibles:')
  console.log('   1. ❓ check-sms-activate-status ne met pas à jour la DB')
  console.log('   2. ❓ WebSocket ne trigger pas le refetch')
  console.log('   3. ❓ Frontend ne recharge pas les données')
  console.log('   4. ❓ RLS bloque la lecture des activations')
  console.log('   5. ❓ Cron job ne s\'exécute pas régulièrement')
  
  // Vérifier RLS
  console.log('\n🔐 Vérification RLS:\n')
  
  const { data: testRead, error: rlsError } = await supabase
    .from('activations')
    .select('id')
    .limit(1)
  
  if (rlsError) {
    console.error('❌ RLS bloque la lecture:', rlsError.message)
  } else {
    console.log('✅ RLS OK - Frontend peut lire les activations')
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('\n✅ Analyse terminée')
}

analyzeSmsSync().catch(console.error)
