// ANALYSE COMPLÈTE - Tous les points de libération du frozen_balance
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function deepAnalyseFrozen() {
  console.log('🔍 ANALYSE DEEP - Points de libération du frozen_balance')
  console.log('=' .repeat(70))

  try {
    // 1. ANALYSE des balance_operations (toutes les modifications de frozen)
    console.log('💰 ANALYSE balance_operations - Dernières modifications frozen:')
    console.log('-'.repeat(70))
    
    const { data: operations, error: opError } = await supabase
      .from('balance_operations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (opError) {
      console.error('❌ Erreur balance_operations:', opError)
    } else if (!operations || operations.length === 0) {
      console.log('📭 Aucune opération trouvée')
    } else {
      operations.forEach((op, idx) => {
        const time = new Date(op.created_at).toLocaleString('fr-FR')
        const frozenDelta = op.frozen_after - op.frozen_before
        const balanceDelta = op.balance_after - op.balance_before
        const type = op.operation_type
        const reason = op.reason || 'No reason'
        
        let icon = '📊'
        if (type === 'freeze') icon = '🔒'
        if (type === 'refund') icon = '💰'
        if (type === 'commit') icon = '✅'
        
        console.log(`${icon} ${idx + 1}. [${time}] ${type.toUpperCase()}`)
        console.log(`   Amount: ${op.amount}Ⓐ | Balance: ${op.balance_before} → ${op.balance_after} (${balanceDelta >= 0 ? '+' : ''}${balanceDelta})`)
        console.log(`   Frozen: ${op.frozen_before} → ${op.frozen_after} (${frozenDelta >= 0 ? '+' : ''}${frozenDelta})`)
        console.log(`   Reason: ${reason}`)
        console.log(`   User: ${op.user_id?.slice(0, 8)}... | Activation: ${op.activation_id?.slice(0, 8) || 'N/A'}... | Rental: ${op.rental_id?.slice(0, 8) || 'N/A'}...`)
        console.log('')
      })
    }

    // 2. ANALYSE des activations avec frozen_amount > 0
    console.log('🔥 ACTIVATIONS actives avec frozen_amount > 0:')
    console.log('-'.repeat(70))
    
    const { data: frozenActivations, error: activationsError } = await supabase
      .from('activations')
      .select('*')
      .gt('frozen_amount', 0)
      .order('created_at', { ascending: false })

    if (activationsError) {
      console.error('❌ Erreur activations:', activationsError)
    } else if (!frozenActivations || frozenActivations.length === 0) {
      console.log('✅ Aucune activation avec frozen_amount > 0')
    } else {
      console.log(`📊 Total: ${frozenActivations.length} activations avec frozen_amount`)
      frozenActivations.forEach((act, idx) => {
        const time = new Date(act.created_at).toLocaleString('fr-FR')
        const status = act.status
        let statusIcon = '⚪'
        if (status === 'pending') statusIcon = '🟡'
        if (status === 'waiting') statusIcon = '🔵'
        if (status === 'success') statusIcon = '🟢'
        if (status === 'cancelled') statusIcon = '🔴'
        if (status === 'timeout') statusIcon = '⏰'
        
        console.log(`${statusIcon} ${idx + 1}. [${time}] ID: ${act.id.slice(0, 8)}... | ${act.phone} | ${act.service}`)
        console.log(`   Status: ${status} | frozen_amount: ${act.frozen_amount}Ⓐ | price: ${act.price}Ⓐ`)
        console.log(`   User: ${act.user_id.slice(0, 8)}... | Order: ${act.order_id}`)
        console.log('')
      })
    }

    // 3. ANALYSE des rentals avec frozen_amount > 0
    console.log('🏠 RENTALS actifs avec frozen_amount > 0:')
    console.log('-'.repeat(70))
    
    const { data: frozenRentals, error: rentalsError } = await supabase
      .from('rentals')
      .select('*')
      .gt('frozen_amount', 0)
      .order('created_at', { ascending: false })

    if (rentalsError) {
      console.error('❌ Erreur rentals:', rentalsError)
    } else if (!frozenRentals || frozenRentals.length === 0) {
      console.log('✅ Aucun rental avec frozen_amount > 0')
    } else {
      console.log(`📊 Total: ${frozenRentals.length} rentals avec frozen_amount`)
      frozenRentals.forEach((rental, idx) => {
        const time = new Date(rental.created_at).toLocaleString('fr-FR')
        const status = rental.status
        let statusIcon = '⚪'
        if (status === 'active') statusIcon = '🟢'
        if (status === 'completed') statusIcon = '✅'
        if (status === 'cancelled') statusIcon = '🔴'
        if (status === 'finished') statusIcon = '🏁'
        
        console.log(`${statusIcon} ${idx + 1}. [${time}] ID: ${rental.id.slice(0, 8)}... | ${rental.phone} | ${rental.service_code}`)
        console.log(`   Status: ${status} | frozen_amount: ${rental.frozen_amount}Ⓐ | price: ${rental.price}Ⓐ`)
        console.log(`   User: ${rental.user_id.slice(0, 8)}... | Rent ID: ${rental.rent_id}`)
        console.log('')
      })
    }

    // 4. ANALYSE des utilisateurs avec frozen_balance > 0
    console.log('👤 UTILISATEURS avec frozen_balance > 0:')
    console.log('-'.repeat(70))
    
    const { data: frozenUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, balance, frozen_balance, updated_at')
      .gt('frozen_balance', 0)

    if (usersError) {
      console.error('❌ Erreur users:', usersError)
    } else if (!frozenUsers || frozenUsers.length === 0) {
      console.log('✅ Aucun utilisateur avec frozen_balance > 0')
    } else {
      console.log(`🔒 Total: ${frozenUsers.length} utilisateurs avec balance frozen`)
      for (const user of frozenUsers) {
        const lastUpdate = new Date(user.updated_at).toLocaleString('fr-FR')
        console.log(`🔒 ${user.email}`)
        console.log(`   Balance: ${user.balance}Ⓐ | Frozen: ${user.frozen_balance}Ⓐ | Disponible: ${user.balance - user.frozen_balance}Ⓐ`)
        console.log(`   Dernière MAJ: ${lastUpdate}`)
        
        // Vérifier les activations/rentals de cet user
        const [actCount, rentalCount] = await Promise.all([
          supabase
            .from('activations')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gt('frozen_amount', 0),
          supabase
            .from('rentals')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gt('frozen_amount', 0)
        ])
        
        console.log(`   Activations frozen: ${actCount.count || 0} | Rentals frozen: ${rentalCount.count || 0}`)
        console.log('')
      }
    }

    // 5. ANALYSE des transactions pending de type rental/activation
    console.log('⏳ TRANSACTIONS PENDING (rental/activation):')
    console.log('-'.repeat(70))
    
    const { data: pendingTx, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'pending')
      .in('type', ['activation', 'rental'])
      .order('created_at', { ascending: false })
      .limit(10)

    if (txError) {
      console.error('❌ Erreur transactions:', txError)
    } else if (!pendingTx || pendingTx.length === 0) {
      console.log('✅ Aucune transaction pending')
    } else {
      pendingTx.forEach((tx, idx) => {
        const time = new Date(tx.created_at).toLocaleString('fr-FR')
        const type = tx.type
        const typeIcon = type === 'rental' ? '🏠' : '📱'
        
        console.log(`${typeIcon} ${idx + 1}. [${time}] ${type.toUpperCase()} - ${tx.amount}Ⓐ`)
        console.log(`   Description: ${tx.description}`)
        console.log(`   User: ${tx.user_id.slice(0, 8)}... | Balance before: ${tx.balance_before}Ⓐ → after: ${tx.balance_after}Ⓐ`)
        console.log('')
      })
    }

    // 6. RÉSUMÉ ET COHÉRENCE
    console.log('📋 RÉSUMÉ COHÉRENCE SYSTÈME:')
    console.log('-'.repeat(70))
    
    const totalUsersFrozen = frozenUsers?.reduce((sum, u) => sum + (u.frozen_balance || 0), 0) || 0
    const totalActivationsFrozen = frozenActivations?.reduce((sum, a) => sum + (a.frozen_amount || 0), 0) || 0
    const totalRentalsFrozen = frozenRentals?.reduce((sum, r) => sum + (r.frozen_amount || 0), 0) || 0
    const totalItemsFrozen = totalActivationsFrozen + totalRentalsFrozen
    
    console.log(`💰 Total frozen_balance utilisateurs: ${totalUsersFrozen}Ⓐ`)
    console.log(`📱 Total frozen_amount activations: ${totalActivationsFrozen}Ⓐ`)
    console.log(`🏠 Total frozen_amount rentals: ${totalRentalsFrozen}Ⓐ`)
    console.log(`📊 Total frozen_amount items: ${totalItemsFrozen}Ⓐ`)
    console.log(`🔍 Différence: ${totalUsersFrozen - totalItemsFrozen}Ⓐ`)
    
    if (Math.abs(totalUsersFrozen - totalItemsFrozen) < 0.01) {
      console.log('✅ COHÉRENCE PARFAITE - frozen_balance = sum(frozen_amount)')
    } else {
      console.log('⚠️  INCOHÉRENCE DÉTECTÉE - Différence entre frozen_balance et frozen_amount')
    }

    // 7. ANALYSE DES EDGE FUNCTIONS (points de libération)
    console.log('')
    console.log('🔧 FONCTIONS DE LIBÉRATION IDENTIFIÉES:')
    console.log('-'.repeat(70))
    console.log('1. 🔒 atomic_freeze - GÈLE les crédits (balance -= prix, frozen += prix)')
    console.log('2. 💰 atomic_refund - LIBÈRE + REMBOURSE (balance += prix, frozen -= prix)')
    console.log('3. ✅ atomic_commit - LIBÈRE SANS REMBOURSER (frozen -= prix, balance inchangé)')
    console.log('4. 🛠️  atomic_refund_direct - LIBÈRE + REMBOURSE (sans activation/rental)')
    console.log('')
    console.log('📍 Edge Functions utilisant ces RPCs:')
    console.log('   • buy-sms-activate-number → atomic_freeze, atomic_refund_direct')
    console.log('   • buy-sms-activate-rent → atomic_freeze, atomic_refund_direct')
    console.log('   • cancel-sms-activate-order → atomic_refund')
    console.log('   • set-rent-status → atomic_refund, atomic_commit')
    console.log('   • check-sms-activate-status → atomic_commit')
    console.log('   • cleanup-expired-activations → atomic_refund')
    console.log('   • cleanup-expired-rentals → atomic_commit')
    console.log('   • atomic-timeout-processor → atomic_refund')
    console.log('   • cron-check-pending-sms → atomic_refund')

    console.log('')
    console.log('🎯 CONCLUSION:')
    if (totalUsersFrozen === 0) {
      console.log('✅ SYSTÈME SAIN - Aucun frozen_balance détecté')
    } else {
      console.log(`⚠️  ${totalUsersFrozen}Ⓐ gelés au total - Vérifier les opérations récentes`)
    }

  } catch (error) {
    console.error('❌ Erreur analyse:', error)
  }
}

deepAnalyseFrozen()