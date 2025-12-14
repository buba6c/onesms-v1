// DIAGNOSTIC DEEP - Fonctions RPC atomiques actuelles
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnosticRPCAtomics() {
  console.log('🔍 DIAGNOSTIC - Fonctions RPC atomiques')
  console.log('=' .repeat(50))

  try {
    // 1. TESTER atomic_freeze 
    console.log('🧪 TEST atomic_freeze avec paramètres basiques...')
    try {
      const { data: freezeTest, error: freezeError } = await supabase.rpc('atomic_freeze', {
        p_user_id: 'e108c02a-2012-4043-bbc2-fb09bb11f824',
        p_amount: 0.01,  // Test minimal
        p_transaction_id: 'test-freeze-diagnostic',
        p_reason: 'TEST diagnostic'
      })
      
      if (freezeError) {
        console.log('❌ atomic_freeze ERREUR:', freezeError.message)
      } else {
        console.log('✅ atomic_freeze OK:', freezeTest)
      }
    } catch (e) {
      console.log('❌ atomic_freeze EXCEPTION:', e.message)
    }

    // 2. TESTER atomic_refund_direct
    console.log('\n🧪 TEST atomic_refund_direct...')
    try {
      const { data: refundTest, error: refundError } = await supabase.rpc('atomic_refund_direct', {
        p_user_id: 'e108c02a-2012-4043-bbc2-fb09bb11f824',
        p_amount: 0.01,  // Test minimal
        p_transaction_id: 'test-refund-diagnostic',
        p_reason: 'TEST diagnostic refund'
      })
      
      if (refundError) {
        console.log('❌ atomic_refund_direct ERREUR:', refundError.message)
      } else {
        console.log('✅ atomic_refund_direct OK:', refundTest)
      }
    } catch (e) {
      console.log('❌ atomic_refund_direct EXCEPTION:', e.message)
    }

    // 3. ANALYSER L'INCOHÉRENCE - Pourquoi frozen_balance = 0 mais frozen_amount > 0 ?
    console.log('\n🔍 ANALYSE INCOHÉRENCE frozen_balance vs frozen_amount:')
    
    // Utilisateur test
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, balance, frozen_balance, updated_at')
      .eq('id', 'e108c02a-2012-4043-bbc2-fb09bb11f824')
      .single()

    if (userError) {
      console.log('❌ Erreur user:', userError)
    } else {
      console.log(`👤 User ${userData.email}:`)
      console.log(`   Balance: ${userData.balance}Ⓐ | Frozen: ${userData.frozen_balance}Ⓐ`)
      console.log(`   Updated: ${new Date(userData.updated_at).toLocaleString('fr-FR')}`)
    }

    // Ses activations avec frozen_amount
    const { data: userActivations, error: actError } = await supabase
      .from('activations')
      .select('id, status, frozen_amount, price, created_at')
      .eq('user_id', 'e108c02a-2012-4043-bbc2-fb09bb11f824')
      .gt('frozen_amount', 0)

    if (actError) {
      console.log('❌ Erreur activations:', actError)
    } else {
      console.log(`\n📱 Activations avec frozen_amount (${userActivations?.length || 0}):`)
      userActivations?.forEach(act => {
        console.log(`   • ${act.id.slice(0, 8)}... | ${act.status} | frozen: ${act.frozen_amount}Ⓐ | price: ${act.price}Ⓐ`)
      })
    }

    // Ses rentals avec frozen_amount
    const { data: userRentals, error: rentError } = await supabase
      .from('rentals')
      .select('id, status, frozen_amount, price, created_at')
      .eq('user_id', 'e108c02a-2012-4043-bbc2-fb09bb11f824')
      .gt('frozen_amount', 0)

    if (rentError) {
      console.log('❌ Erreur rentals:', rentError)
    } else {
      console.log(`\n🏠 Rentals avec frozen_amount (${userRentals?.length || 0}):`)
      userRentals?.forEach(rental => {
        console.log(`   • ${rental.id.slice(0, 8)}... | ${rental.status} | frozen: ${rental.frozen_amount}Ⓐ | price: ${rental.price}Ⓐ`)
      })
    }

    // 4. VÉRIFIER s'il y a eu des operations balance_operations récentes sans effet sur frozen_balance
    console.log('\n📊 Balance operations récentes pour ce user:')
    const { data: userOps, error: opsError } = await supabase
      .from('balance_operations')
      .select('*')
      .eq('user_id', 'e108c02a-2012-4043-bbc2-fb09bb11f824')
      .order('created_at', { ascending: false })
      .limit(5)

    if (opsError) {
      console.log('❌ Erreur balance_operations:', opsError)
    } else {
      userOps?.forEach(op => {
        const time = new Date(op.created_at).toLocaleString('fr-FR')
        console.log(`   • [${time}] ${op.operation_type} ${op.amount}Ⓐ - frozen: ${op.frozen_before} → ${op.frozen_after}`)
        console.log(`     Reason: ${op.reason}`)
      })
    }

    // 5. HYPOTHÈSES sur l'incohérence
    console.log('\n💡 HYPOTHÈSES sur l\'incohérence:')
    console.log('1. 🔧 Les fonctions atomic_* ont été mises à jour mais les données existantes pas synchronisées')
    console.log('2. 🐛 Bug dans atomic_refund_direct qui libère frozen_balance mais pas frozen_amount')
    console.log('3. 📝 Modification manuelle de frozen_balance sans passer par les RPCs')
    console.log('4. 🔄 Rollback partiel - frozen_balance libéré mais frozen_amount pas reseté')

    // 6. VÉRIFIER les triggers de protection
    console.log('\n🛡️  VÉRIFIER les protections:')
    try {
      // Essayer de modifier frozen_balance directement (devrait être bloqué)
      const { data: protectionTest, error: protectionError } = await supabase
        .from('users')
        .update({ frozen_balance: 999 })
        .eq('id', 'e108c02a-2012-4043-bbc2-fb09bb11f824')

      if (protectionError && protectionError.message.includes('frozen_balance bloquée')) {
        console.log('✅ Protection active - Modification directe bloquée')
      } else {
        console.log('⚠️  Protection faible ou absente')
      }
    } catch (e) {
      if (e.message.includes('frozen_balance')) {
        console.log('✅ Protection active - Exception levée')
      } else {
        console.log('❌ Protection error:', e.message)
      }
    }

    console.log('\n🎯 CONCLUSION DIAGNOSTIC:')
    console.log('L\'incohérence frozen_balance=0 mais frozen_amount>0 indique:')
    console.log('• Soit les atomic_* ont été refactorés sans migration des données')
    console.log('• Soit atomic_refund_direct ne reset pas les frozen_amount')
    console.log('• Soit il y a eu modification manuelle/directe')

  } catch (error) {
    console.error('❌ Erreur diagnostic:', error)
  }
}

diagnosticRPCAtomics()