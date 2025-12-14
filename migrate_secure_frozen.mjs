/**
 * Script de migration et réconciliation pour le système sécurisé de frozen_balance
 * 
 * Ce script:
 * 1. Ajoute la colonne frozen_amount si elle n'existe pas
 * 2. Migre les données existantes
 * 3. Réconcilie les frozen_balance incorrects
 * 4. Génère un rapport de santé
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
)

console.log('🔒 MIGRATION SECURE FROZEN BALANCE SYSTEM')
console.log('=' .repeat(80))
console.log('')

// Étape 1: Vérifier si la colonne existe sur activations
console.log('📊 ÉTAPE 1: Vérification de la structure des tables\n')

const { data: testActivation, error: testError } = await supabase
  .from('activations')
  .select('id, frozen_amount')
  .limit(1)

if (testError && testError.message.includes('frozen_amount')) {
  console.log('⚠️  La colonne frozen_amount n\'existe pas encore sur activations.')
  console.log('📝 Exécutez d\'abord la migration SQL:\n')
  console.log('   npx supabase db execute -f migrations/secure_frozen_balance_system.sql')
  console.log('')
  process.exit(1)
} else {
  console.log('✅ La colonne frozen_amount existe sur activations')
}

// Vérifier aussi sur rentals
const { data: testRental, error: rentalTestError } = await supabase
  .from('rentals')
  .select('id, frozen_amount')
  .limit(1)

if (rentalTestError && rentalTestError.message.includes('frozen_amount')) {
  console.log('⚠️  La colonne frozen_amount n\'existe pas encore sur rentals.')
  console.log('📝 Exécutez d\'abord la migration SQL:\n')
  console.log('   npx supabase db execute -f migrations/secure_frozen_balance_system.sql')
  console.log('')
  process.exit(1)
} else {
  console.log('✅ La colonne frozen_amount existe sur rentals')
}

// Étape 2: Migrer les activations pending/waiting sans frozen_amount
console.log('\n📊 ÉTAPE 2: Migration des activations existantes\n')

const { data: pendingActivations, error: pendingError } = await supabase
  .from('activations')
  .select('id, price, status, frozen_amount, user_id')
  .in('status', ['pending', 'waiting'])
  .or('frozen_amount.is.null,frozen_amount.eq.0')

if (pendingError) {
  console.error('❌ Erreur lors de la récupération des activations:', pendingError)
  process.exit(1)
}

console.log(`📋 ${pendingActivations?.length || 0} activations pending/waiting à migrer`)

let migratedCount = 0
for (const activation of pendingActivations || []) {
  const { error: updateError } = await supabase
    .from('activations')
    .update({ frozen_amount: activation.price })
    .eq('id', activation.id)
  
  if (!updateError) {
    migratedCount++
    console.log(`   ✓ ${activation.id.substring(0,8)}... → frozen_amount = ${activation.price}`)
  } else {
    console.log(`   ✗ ${activation.id.substring(0,8)}... ERREUR: ${updateError.message}`)
  }
}

console.log(`\n✅ ${migratedCount} activations migrées`)

// Étape 2b: Migrer les rentals actives sans frozen_amount
console.log('\n📊 ÉTAPE 2b: Migration des rentals existantes\n')

const { data: activeRentals, error: rentalsError } = await supabase
  .from('rentals')
  .select('id, total_cost, status, frozen_amount, user_id')
  .eq('status', 'active')
  .or('frozen_amount.is.null,frozen_amount.eq.0')

if (rentalsError) {
  console.error('❌ Erreur lors de la récupération des rentals:', rentalsError)
} else {
  console.log(`📋 ${activeRentals?.length || 0} rentals actives à migrer`)

  let rentalsMigrated = 0
  for (const rental of activeRentals || []) {
    const { error: updateError } = await supabase
      .from('rentals')
      .update({ frozen_amount: rental.total_cost })
      .eq('id', rental.id)
    
    if (!updateError) {
      rentalsMigrated++
      console.log(`   ✓ ${rental.id.substring(0,8)}... → frozen_amount = ${rental.total_cost}`)
    } else {
      console.log(`   ✗ ${rental.id.substring(0,8)}... ERREUR: ${updateError.message}`)
    }
  }
  console.log(`\n✅ ${rentalsMigrated} rentals migrées`)
}

// Étape 3: Remettre frozen_amount à 0 pour les activations terminées
console.log('\n📊 ÉTAPE 3: Nettoyage des activations terminées\n')

const { data: completedActivations } = await supabase
  .from('activations')
  .select('id, frozen_amount')
  .not('status', 'in', '("pending","waiting")')
  .gt('frozen_amount', 0)

console.log(`📋 ${completedActivations?.length || 0} activations terminées avec frozen_amount > 0`)

if (completedActivations && completedActivations.length > 0) {
  const { error: cleanupError } = await supabase
    .from('activations')
    .update({ frozen_amount: 0 })
    .not('status', 'in', '("pending","waiting")')
    .gt('frozen_amount', 0)
  
  if (!cleanupError) {
    console.log(`✅ ${completedActivations.length} activations nettoyées`)
  } else {
    console.log(`❌ Erreur: ${cleanupError.message}`)
  }
}

// Étape 4: Réconciliation des frozen_balance utilisateurs
console.log('\n📊 ÉTAPE 4: Réconciliation des frozen_balance utilisateurs\n')

const { data: users } = await supabase
  .from('users')
  .select('id, email, balance, frozen_balance')

const anomalies = []

for (const user of users || []) {
  // Calculer ce que frozen_balance devrait être (activations)
  const { data: userActivations } = await supabase
    .from('activations')
    .select('frozen_amount')
    .eq('user_id', user.id)
    .in('status', ['pending', 'waiting'])
    .gt('frozen_amount', 0)
  
  // Calculer ce que frozen_balance devrait être (rentals)
  const { data: userRentals } = await supabase
    .from('rentals')
    .select('frozen_amount')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .gt('frozen_amount', 0)
  
  const activationFrozen = userActivations?.reduce((sum, a) => sum + (a.frozen_amount || 0), 0) || 0
  const rentalFrozen = userRentals?.reduce((sum, r) => sum + (r.frozen_amount || 0), 0) || 0
  const calculatedFrozen = activationFrozen + rentalFrozen
  const actualFrozen = user.frozen_balance || 0
  const difference = actualFrozen - calculatedFrozen
  
  if (Math.abs(difference) > 0.01) {
    anomalies.push({
      user_id: user.id,
      email: user.email,
      balance: user.balance,
      actual_frozen: actualFrozen,
      calculated_frozen: calculatedFrozen,
      activation_frozen: activationFrozen,
      rental_frozen: rentalFrozen,
      difference: difference,
      pending_activations: userActivations?.length || 0,
      active_rentals: userRentals?.length || 0
    })
    
    console.log(`⚠️  ${user.email}:`)
    console.log(`   Balance: ${user.balance}`)
    console.log(`   Frozen actuel: ${actualFrozen}`)
    console.log(`   Frozen calculé: ${calculatedFrozen} (activations: ${activationFrozen}, rentals: ${rentalFrozen})`)
    console.log(`   Différence: ${difference}`)
    console.log(`   Activations pending: ${userActivations?.length || 0}`)
    console.log(`   Rentals actives: ${userRentals?.length || 0}`)
    console.log('')
  }
}

if (anomalies.length === 0) {
  console.log('✅ Aucune anomalie détectée!')
} else {
  console.log(`\n⚠️  ${anomalies.length} anomalies détectées`)
  console.log('\n🔧 Correction automatique...\n')
  
  for (const anomaly of anomalies) {
    const { error: fixError } = await supabase
      .from('users')
      .update({ frozen_balance: anomaly.calculated_frozen })
      .eq('id', anomaly.user_id)
    
    if (!fixError) {
      console.log(`   ✓ ${anomaly.email}: ${anomaly.actual_frozen} → ${anomaly.calculated_frozen}`)
    } else {
      console.log(`   ✗ ${anomaly.email}: ERREUR ${fixError.message}`)
    }
  }
}

// Étape 5: Rapport final
console.log('\n' + '=' .repeat(80))
console.log('📊 RAPPORT FINAL\n')

const { data: finalStats } = await supabase
  .from('users')
  .select('id, frozen_balance')
  .gt('frozen_balance', 0)

const { data: finalPending } = await supabase
  .from('activations')
  .select('id')
  .in('status', ['pending', 'waiting'])

console.log(`👤 Utilisateurs avec frozen_balance > 0: ${finalStats?.length || 0}`)
console.log(`📱 Activations pending/waiting: ${finalPending?.length || 0}`)
console.log(`🔄 Activations migrées: ${migratedCount}`)
console.log(`⚠️  Anomalies corrigées: ${anomalies.length}`)

console.log('\n✅ Migration terminée!')
console.log('\n📝 Prochaines étapes:')
console.log('   1. Déployer les fonctions Edge mises à jour:')
console.log('      npx supabase functions deploy cancel-sms-activate-order')
console.log('      npx supabase functions deploy buy-sms-activate-number')
console.log('      npx supabase functions deploy check-sms-activate-status')
console.log('      npx supabase functions deploy cron-check-pending-sms')
console.log('   2. Surveiller les logs pour les erreurs')
console.log('   3. Vérifier les frozen_balance régulièrement avec ce script')
