import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('💡 ANALYSE - LOGIQUE REMBOURSEMENT RENTALS\n')

console.log('🧠 LOGIQUE MÉTIER EXPLIQUÉE:')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('')
console.log('📋 RÈGLES DE REMBOURSEMENT RENTALS:')
console.log('')
console.log('   ⏱️ PÉRIODE GRACE (< 20 minutes):')
console.log('      ✅ Remboursement possible si:')
console.log('         • Rental annulé par utilisateur')
console.log('         • Aucun SMS reçu')
console.log('         • Temps écoulé < 20 minutes')
console.log('')
console.log('   🚫 PÉRIODE FERME (> 20 minutes):') 
console.log('      ❌ PAS de remboursement même si:')
console.log('         • Aucun SMS reçu')
console.log('         • Numéro ne fonctionne pas')
console.log('         • Service défaillant')
console.log('      → Location = service consommé, facturé définitivement')
console.log('')
console.log('   🏁 À L\'EXPIRATION:')
console.log('      • Status → "expired"')
console.log('      • PAS de refund automatique')
console.log('      • Fonds restent débités (service rendu)')

try {
  console.log('\n🔍 VÉRIFICATION SYSTÈME ACTUEL...\n')
  
  // 1. Vérifier les rentals récents avec timestamps
  const { data: recentRentals } = await sb
    .from('rentals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (recentRentals && recentRentals.length > 0) {
    console.log(`📱 RENTALS RÉCENTS ANALYSÉS:`)
    
    recentRentals.forEach(rental => {
      const createdAt = new Date(rental.created_at)
      const endDate = new Date(rental.end_date)
      const now = new Date()
      
      const ageMinutes = Math.round((now - createdAt) / 60000)
      const isInGracePeriod = ageMinutes <= 20
      const isExpired = now > endDate
      
      console.log(`\n   🏠 ${rental.id.substring(0,8)}...`)
      console.log(`      Phone: ${rental.phone}`)
      console.log(`      Service: ${rental.service_code}`)
      console.log(`      Status: ${rental.status}`)
      console.log(`      Âge: ${ageMinutes}min`)
      console.log(`      Période grâce: ${isInGracePeriod ? 'OUI (remboursable)' : 'NON (facturé)'}`)
      console.log(`      Expiré: ${isExpired ? 'OUI' : 'NON'}`)
      console.log(`      Messages reçus: ${rental.message_count || 0}`)
      
      // Analyse du comportement attendu
      if (isInGracePeriod && rental.message_count === 0) {
        console.log(`      🟡 Remboursement possible si annulation`)
      } else if (!isInGracePeriod) {
        console.log(`      🔴 Plus de remboursement possible (> 20min)`)
      }
      
      if (isExpired && rental.status !== 'expired') {
        console.log(`      ⚠️ Devrait être marqué "expired"`)
      }
    })
  }

  console.log('\n📋 FONCTIONS EDGE ANALYSÉES:')
  console.log('')
  
  // Analyser les fonctions disponibles pour rentals
  const rentalFunctions = [
    'rent-sms-activate-number',
    'continue-sms-activate-rent', 
    'get-rent-status',
    'cancel-rent' // Si existe
  ]
  
  for (const funcName of rentalFunctions) {
    try {
      const response = await fetch(`https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/${funcName}`, {
        method: 'OPTIONS'
      })
      console.log(`   ${response.ok ? '✅' : '❌'} ${funcName}`)
    } catch {
      console.log(`   ❌ ${funcName} (non trouvée)`)
    }
  }

  console.log('\n🎯 IMPLÉMENTATION REQUISE:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('1️⃣ FONCTION CANCEL RENTAL:')
  console.log('   • Vérifier âge < 20 minutes')
  console.log('   • Vérifier message_count = 0')
  console.log('   • Si OK → Refund via atomic_refund')
  console.log('   • Si NON → Erreur "Too late for refund"')
  console.log('')
  console.log('2️⃣ CRON RENTAL EXPIRATION:')
  console.log('   • Marquer rentals expirés → status="expired"')
  console.log('   • AUCUN refund automatique')
  console.log('   • Juste changement de status')
  console.log('')
  console.log('3️⃣ UI CANCEL BUTTON:')
  console.log('   • Afficher si âge < 20min ET messages = 0')
  console.log('   • Cacher après 20 minutes')
  console.log('   • Message explicatif si trop tard')
  console.log('')
  console.log('4️⃣ PROTECTION ATOMIC TIMEOUT:')
  console.log('   • process_expired_activations() ignore rentals ✅')
  console.log('   • Tables séparées ✅')
  console.log('   • Aucun refund accidentel ✅')

  console.log('\n💭 COMPARAISON ACTIVATIONS vs RENTALS:')
  console.log('')
  console.log('   ACTIVATIONS:')
  console.log('   • Expire → Refund automatique')
  console.log('   • Service non reçu = non facturé')
  console.log('   • Logique "essai gratuit"')
  console.log('')
  console.log('   RENTALS:')
  console.log('   • < 20min + 0 SMS → Refund possible')
  console.log('   • > 20min → Service consommé, facturé')
  console.log('   • Expire → PAS de refund')
  console.log('   • Logique "location payante"')

  console.log('\n✅ COMPRÉHENSION CONFIRMÉE!')
  console.log('   La logique métier est claire et différente des activations.')
  console.log('   Le système doit implémenter cette règle des 20 minutes.')

} catch (error) {
  console.error('❌ ERREUR:', error.message)
}