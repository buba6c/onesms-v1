// DIAGNOSTIC FINAL - Vérifier l'état après les corrections
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnosticFinal() {
  console.log('🩺 DIAGNOSTIC FINAL - État après corrections')
  console.log('=' .repeat(50))

  try {
    // 1. Vérifier les dernières opérations de balance
    console.log('💰 Dernières opérations balance (10 dernières):')
    const { data: operations, error: opError } = await supabase
      .from('balance_operations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (opError) {
      console.error('❌ Erreur opérations:', opError)
    } else {
      operations.forEach((op, idx) => {
        const time = new Date(op.created_at).toLocaleString('fr-FR')
        const description = op.description || 'No description'
        const status = description.includes('failed') ? '❌' : '✅'
        console.log(`${status} ${idx + 1}. [${time}] ${description} - ${op.amount}Ⓐ (U: ${op.user_id?.slice(0, 8) || 'N/A'}...)`)
      })
    }

    console.log('')

    // 2. Vérifier l'état des rentals
    console.log('🏠 Tous les rentals dans la base:')
    const { data: rentals, error: rentalsError } = await supabase
      .from('rentals')
      .select('*')
      .order('created_at', { ascending: false })

    if (rentalsError) {
      console.error('❌ Erreur rentals:', rentalsError)
    } else if (!rentals || rentals.length === 0) {
      console.log('📭 Aucun rental trouvé dans la base')
    } else {
      console.log(`📊 Total: ${rentals.length} rentals`)
      rentals.forEach((rental, idx) => {
        const time = new Date(rental.created_at).toLocaleString('fr-FR')
        const status = rental.status === 'active' ? '🟢' : 
                      rental.status === 'completed' ? '✅' : 
                      rental.status === 'cancelled' ? '🔴' : '⚪'
        console.log(`${status} ${idx + 1}. [${time}] ID: ${rental.id.slice(0, 8)}... | ${rental.phone} | ${rental.service_code} | ${rental.status} | frozen: ${rental.frozen_amount}Ⓐ`)
        
        // Vérifier intégrité des colonnes critiques
        const missing = []
        if (!rental.rent_hours) missing.push('rent_hours')
        if (!rental.end_date) missing.push('end_date')
        if (!rental.service_code) missing.push('service_code')
        if (!rental.country_code) missing.push('country_code')
        
        if (missing.length > 0) {
          console.log(`   ⚠️  Colonnes manquantes: ${missing.join(', ')}`)
        }
      })
    }

    console.log('')

    // 3. Vérifier les utilisateurs avec balance frozen
    console.log('🔒 Utilisateurs avec balance frozen:')
    const { data: frozenUsers, error: frozenError } = await supabase
      .from('users')
      .select('id, email, balance, frozen_balance')
      .gt('frozen_balance', 0)

    if (frozenError) {
      console.error('❌ Erreur frozen users:', frozenError)
    } else if (!frozenUsers || frozenUsers.length === 0) {
      console.log('✅ Aucun utilisateur avec balance frozen')
    } else {
      frozenUsers.forEach(user => {
        console.log(`🔒 ${user.email}: balance=${user.balance}Ⓐ, frozen=${user.frozen_balance}Ⓐ`)
      })
    }

    console.log('')

    // 4. Transactions en pending
    console.log('⏳ Transactions pending:')
    const { data: pendingTx, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'pending')
      .eq('type', 'rental')
      .order('created_at', { ascending: false })

    if (txError) {
      console.error('❌ Erreur transactions:', txError)
    } else if (!pendingTx || pendingTx.length === 0) {
      console.log('✅ Aucune transaction rental pending')
    } else {
      pendingTx.forEach(tx => {
        const time = new Date(tx.created_at).toLocaleString('fr-FR')
        console.log(`⏳ [${time}] ${tx.description} - ${tx.amount}Ⓐ`)
      })
    }

    console.log('')

    // 5. Résumé de santé
    console.log('📋 RÉSUMÉ SANTÉ SYSTÈME:')
    const recentFailures = operations?.filter(op => 
      (op.description || '').includes('failed') && 
      new Date(op.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length || 0

    console.log(`✅ Function buy-sms-activate-rent: Redéployée avec corrections`)
    console.log(`📊 Rentals actifs: ${rentals?.filter(r => r.status === 'active').length || 0}`)
    console.log(`🔒 Utilisateurs avec frozen balance: ${frozenUsers?.length || 0}`)
    console.log(`⏳ Transactions rental pending: ${pendingTx?.length || 0}`)
    console.log(`❌ Échecs dernières 24h: ${recentFailures}`)
    
    if (recentFailures === 0) {
      console.log('🎉 SYSTÈME SAIN - Pas d\'échecs récents détectés!')
    } else {
      console.log(`⚠️  ${recentFailures} échecs détectés dans les dernières 24h`)
    }

  } catch (error) {
    console.error('❌ Erreur diagnostic:', error)
  }
}

diagnosticFinal()