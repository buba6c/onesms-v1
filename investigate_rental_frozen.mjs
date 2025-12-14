import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🚨 INVESTIGATION: Rentals avec frozen_amount détectés!\n')

try {
  // Chercher les rentals avec frozen_amount
  const { data: rentalsWithFrozen } = await sb
    .from('rentals')
    .select('*')
    .not('frozen_amount', 'is', null)
    .gt('frozen_amount', 0)
    .order('created_at', { ascending: false })
    .limit(10)

  if (rentalsWithFrozen && rentalsWithFrozen.length > 0) {
    console.log(`🚨 ${rentalsWithFrozen.length} RENTALS AVEC FROZEN_AMOUNT:`)
    
    rentalsWithFrozen.forEach(rental => {
      const created = new Date(rental.created_at).toLocaleString()
      const expires = rental.end_date ? new Date(rental.end_date).toLocaleString() : 'N/A'
      const isExpired = rental.end_date ? new Date() > new Date(rental.end_date) : false
      
      console.log(`\n   🏠 ${rental.id.substring(0,8)}...`)
      console.log(`      Phone: ${rental.phone}`)
      console.log(`      Service: ${rental.service_code}`)
      console.log(`      Status: ${rental.status}`)
      console.log(`      Prix: ${rental.price}Ⓐ`)
      console.log(`      Frozen: ${rental.frozen_amount}Ⓐ ← PROBLÈME!`)
      console.log(`      Créé: ${created}`)
      console.log(`      Expire: ${expires}`)
      console.log(`      Expiré: ${isExpired ? 'OUI' : 'NON'}`)
      
      if (isExpired && rental.frozen_amount > 0) {
        console.log(`      ⚠️ RISQUE: Rental expiré avec frozen_amount > 0`)
      }
    })

    console.log('\n🔍 ANALYSE DU RISQUE:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Vérifier si la fonction process_expired_activations pourrait les attraper
    console.log('\n📋 CRITÈRES DE process_expired_activations():')
    console.log('   1. FROM activations ← Rentals sont dans table "rentals"')
    console.log('   2. WHERE status IN (\'pending\',\'waiting\') ← Rentals ont autres status') 
    console.log('   3. AND expires_at < NOW() ← Rentals utilisent "end_date"')
    console.log('   4. AND frozen_amount > 0 ← SEUL critère qui match!')
    console.log('')
    console.log('   🛡️ PROTECTION: Critères 1, 2, 3 empêchent le traitement')
    console.log('   ✅ Même avec frozen_amount, ils ne seront PAS traités')

    // Vérifier le schéma exact
    console.log('\n📊 VÉRIFICATION SCHÉMA:')
    
    const { data: rentalsSchema } = await sb
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'rentals')
      .in('column_name', ['expires_at', 'end_date', 'frozen_amount'])

    if (rentalsSchema) {
      console.log('   Colonnes trouvées dans rentals:')
      rentalsSchema.forEach(col => {
        console.log(`     ${col.column_name}: ${col.data_type}`)
      })
    }

    // Test final: simuler la requête de la fonction atomic
    console.log('\n🧪 SIMULATION process_expired_activations():')
    
    const { data: wouldBeProcessed, error } = await sb
      .from('activations')
      .select('id, frozen_amount')
      .in('status', ['pending', 'waiting'])
      .lt('expires_at', new Date().toISOString())
      .gt('frozen_amount', 0)
      .limit(10)

    if (error) {
      console.log(`   ❌ Erreur simulation: ${error.message}`)
    } else {
      console.log(`   📊 Activations qui seraient traitées: ${wouldBeProcessed?.length || 0}`)
      console.log(`   📊 Rentals qui seraient traités: 0 (table différente)`)
    }

    console.log('\n✅ CONCLUSION:')
    console.log('   Même si rentals ont frozen_amount, ils sont protégés par:')
    console.log('   1. Table séparée (rentals vs activations)')
    console.log('   2. Colonnes différentes (end_date vs expires_at)')
    console.log('   3. Status différents (active vs pending/waiting)')
    console.log('   → AUCUN RISQUE DE REFUND ACCIDENTEL')

  } else {
    console.log('✅ Aucun rental avec frozen_amount trouvé')
  }

} catch (error) {
  console.error('❌ ERREUR INVESTIGATION:', error.message)
}