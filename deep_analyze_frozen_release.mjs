import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔍 DEEP ANALYSE - LIBÉRATION AUTOMATIQUE FROZEN_AMOUNT\n')

async function deepAnalyzeFrozenRelease() {
  console.log('📊 1. ANALYSE RENTALS AVEC FROZEN_AMOUNT:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  try {
    // Vérifier tous les rentals avec leurs frozen_amount
    const { data: rentals } = await sb
      .from('rentals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (rentals && rentals.length > 0) {
      console.log(`\n📋 RENTALS ANALYSÉS (${rentals.length} derniers):`)
      
      rentals.forEach((rental, index) => {
        const createdAt = new Date(rental.created_at)
        const endDate = rental.end_date ? new Date(rental.end_date) : null
        const now = new Date()
        const ageMinutes = Math.round((now - createdAt) / 60000)
        const isExpired = endDate && now > endDate
        
        console.log(`\n   ${index + 1}. ${rental.id.substring(0,8)}...`)
        console.log(`      Status: ${rental.status}`)
        console.log(`      Phone: ${rental.phone}`)
        console.log(`      Âge: ${ageMinutes}min`)
        console.log(`      Frozen Amount: ${rental.frozen_amount || 'NULL'}`)
        console.log(`      Price: ${rental.price}`)
        console.log(`      Expiré: ${isExpired ? 'OUI' : 'NON'}`)
        
        // Identifier les suspects
        if (rental.frozen_amount === null || rental.frozen_amount === 0) {
          console.log(`      🚨 FROZEN LIBÉRÉ - À analyser!`)
        }
      })
    }

    console.log('\n📊 2. ANALYSE BALANCE_OPERATIONS RÉCENTES:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Analyser les opérations de balance récentes
    const { data: operations } = await sb
      .from('balance_operations')
      .select('*')
      .or('operation_type.eq.refund,operation_type.eq.commit,operation_type.eq.unfreeze')
      .order('created_at', { ascending: false })
      .limit(15)

    if (operations && operations.length > 0) {
      console.log(`\n💰 OPÉRATIONS DE BALANCE (${operations.length} récentes):`)
      
      operations.forEach((op, index) => {
        const createdAt = new Date(op.created_at)
        console.log(`\n   ${index + 1}. ${createdAt.toLocaleString()}`)
        console.log(`      Type: ${op.operation_type}`)
        console.log(`      User: ${op.user_id?.substring(0,8)}...`)
        console.log(`      Rental ID: ${op.rental_id?.substring(0,8) || 'N/A'}...`)
        console.log(`      Activation ID: ${op.activation_id?.substring(0,8) || 'N/A'}...`)
        console.log(`      Amount: ${op.amount}`)
        console.log(`      Reason: ${op.reason}`)
        console.log(`      Frozen Before→After: ${op.frozen_before}→${op.frozen_after}`)
      })
    }

    console.log('\n📊 3. ANALYSE CRON JOBS & EDGE FUNCTIONS:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Vérifier les fonctions qui peuvent affecter frozen_amount
    const suspiciousFunctions = [
      'cleanup-expired-rentals',
      'cleanup-expired-activations', 
      'cron-atomic-reliable',
      'process_expired_activations',
      'atomic_refund',
      'atomic_commit'
    ]
    
    console.log('\n🎯 FONCTIONS SUSPECTES:')
    suspiciousFunctions.forEach(func => {
      console.log(`   • ${func}`)
    })

    console.log('\n📊 4. RECHERCHE PATTERNS DANS LES LOGS:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Analyser les patterns dans balance_operations
    if (operations) {
      const frozenChanges = operations.filter(op => 
        op.frozen_before !== op.frozen_after && 
        (op.frozen_before > 0 || op.frozen_after > 0)
      )
      
      console.log(`\n🔍 CHANGEMENTS FROZEN_BALANCE (${frozenChanges.length} trouvés):`)
      
      frozenChanges.forEach((op, index) => {
        console.log(`\n   ${index + 1}. ${op.operation_type.toUpperCase()}`)
        console.log(`      Frozen: ${op.frozen_before} → ${op.frozen_after}`)
        console.log(`      Différence: ${op.frozen_after - op.frozen_before}`)
        console.log(`      Raison: ${op.reason}`)
        console.log(`      Date: ${new Date(op.created_at).toLocaleString()}`)
      })
    }

    console.log('\n📊 5. ANALYSE USERS FROZEN_BALANCE:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Vérifier les utilisateurs avec frozen_balance
    const { data: users } = await sb
      .from('users')
      .select('id, email, balance, frozen_balance, updated_at')
      .gt('frozen_balance', 0)
      .order('updated_at', { ascending: false })
      .limit(5)

    if (users && users.length > 0) {
      console.log(`\n👥 USERS AVEC FROZEN_BALANCE (${users.length} trouvés):`)
      
      users.forEach((user, index) => {
        console.log(`\n   ${index + 1}. ${user.email}`)
        console.log(`      ID: ${user.id.substring(0,8)}...`)
        console.log(`      Balance: ${user.balance}`)
        console.log(`      Frozen: ${user.frozen_balance}`)
        console.log(`      Updated: ${new Date(user.updated_at).toLocaleString()}`)
      })
    } else {
      console.log(`\n👥 Aucun user avec frozen_balance > 0`)
    }

    console.log('\n🎯 SUSPECTS PRINCIPAUX:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('1️⃣ CRON cleanup-expired-rentals:')
    console.log('   • Peut appeler set-rent-status automatiquement')
    console.log('   • Libère frozen_amount via atomic_commit')
    console.log('')
    console.log('2️⃣ CRON cleanup-expired-activations:')
    console.log('   • process_expired_activations() SQL')
    console.log('   • Peut affecter rentals par erreur?')
    console.log('')
    console.log('3️⃣ FONCTION atomic_refund/atomic_commit:')
    console.log('   • Appelées automatiquement')
    console.log('   • Libèrent frozen_amount')
    console.log('')
    console.log('4️⃣ BUG CROSS-CONTAMINATION:')
    console.log('   • Activation timeout affecte rentals?')
    console.log('   • Mauvais user_id dans opération?')

  } catch (error) {
    console.error('❌ ERREUR ANALYSE:', error.message)
  }
}

// Exécuter l'analyse
await deepAnalyzeFrozenRelease()

console.log('\n✅ ANALYSE TERMINÉE')
console.log('Vérifiez les patterns ci-dessus pour identifier le coupable!')