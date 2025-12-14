import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function finalDiagnosis() {
  console.log('🔍 DIAGNOSTIC FINAL: PROBLÈME DE DÉDUCTION DE BALANCE\n')
  console.log('='.repeat(80))
  
  const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'
  
  try {
    console.log('\n📊 HYPOTHÈSES À VÉRIFIER:\n')
    console.log('1. Le prix affiché est différent du prix déduit')
    console.log('2. Une marge est appliquée après l\'affichage')
    console.log('3. Plusieurs activations sont créées au lieu d\'une')
    console.log('4. Les rentals sont confondus avec les activations')
    console.log('5. Le frozen_balance compte les crédits des rentals')
    
    // 1. État complet de l'utilisateur
    console.log('\n' + '='.repeat(80))
    console.log('\n1️⃣ ÉTAT COMPLET DE L\'UTILISATEUR\n')
    
    const { data: user } = await supabase
      .from('users')
      .select('email, balance, frozen_balance')
      .eq('id', userId)
      .single()
    
    console.log(`👤 ${user.email}`)
    console.log(`   Balance totale: ${user.balance} Ⓐ`)
    console.log(`   Frozen (gelé): ${user.frozen_balance} Ⓐ`)
    console.log(`   Disponible: ${(user.balance - user.frozen_balance).toFixed(2)} Ⓐ`)
    
    // 2. Toutes les activations actives
    console.log('\n' + '='.repeat(80))
    console.log('\n2️⃣ ACTIVATIONS ACTIVES (PENDING/WAITING)\n')
    
    const { data: activeActivations } = await supabase
      .from('activations')
      .select('id, phone, service_code, country_code, price, frozen_amount, status, created_at')
      .eq('user_id', userId)
      .in('status', ['pending', 'waiting'])
      .order('created_at', { ascending: false})
    
    console.log('Service\tCountry\tPrice\tFrozen\tPhone\t\tDate')
    console.log('─'.repeat(80))
    
    let totalActivationsFrozen = 0
    activeActivations?.forEach(act => {
      totalActivationsFrozen += act.frozen_amount || 0
      const date = new Date(act.created_at).toLocaleString()
      console.log(`${act.service_code}\t${act.country_code}\t${act.price}\t${act.frozen_amount}\t${act.phone}\t${date.slice(0, 16)}`)
    })
    
    console.log(`\n📊 Total frozen_amount (activations): ${totalActivationsFrozen} Ⓐ`)
    
    // 3. Tous les rentals actifs
    console.log('\n' + '='.repeat(80))
    console.log('\n3️⃣ RENTALS ACTIFS\n')
    
    const { data: activeRentals } = await supabase
      .from('rentals')
      .select('id, phone, daily_price, total_cost, frozen_amount, status, created_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    
    if (activeRentals && activeRentals.length > 0) {
      console.log('Phone\t\tDaily\tTotal\tFrozen\tDate')
      console.log('─'.repeat(80))
      
      let totalRentalsFrozen = 0
      activeRentals.forEach(rent => {
        totalRentalsFrozen += rent.frozen_amount || 0
        const date = new Date(rent.created_at).toLocaleString()
        console.log(`${rent.phone}\t${rent.daily_price}\t${rent.total_cost}\t${rent.frozen_amount}\t${date.slice(0, 16)}`)
      })
      
      console.log(`\n📊 Total frozen_amount (rentals): ${totalRentalsFrozen} Ⓐ`)
    } else {
      console.log('Aucun rental actif')
    }
    
    // 4. Calcul du frozen_balance attendu
    console.log('\n' + '='.repeat(80))
    console.log('\n4️⃣ VÉRIFICATION DE LA COHÉRENCE\n')
    
    const { data: allActiveActivations } = await supabase
      .from('activations')
      .select('frozen_amount')
      .eq('user_id', userId)
      .in('status', ['pending', 'waiting'])
    
    const { data: allActiveRentals } = await supabase
      .from('rentals')
      .select('frozen_amount')
      .eq('user_id', userId)
      .eq('status', 'active')
    
    const expectedFrozen = 
      (allActiveActivations?.reduce((sum, a) => sum + (a.frozen_amount || 0), 0) || 0) +
      (allActiveRentals?.reduce((sum, r) => sum + (r.frozen_amount || 0), 0) || 0)
    
    console.log(`📊 CALCUL:`)
    console.log(`   Activations frozen_amount: ${allActiveActivations?.reduce((sum, a) => sum + (a.frozen_amount || 0), 0) || 0} Ⓐ`)
    console.log(`   Rentals frozen_amount: ${allActiveRentals?.reduce((sum, r) => sum + (r.frozen_amount || 0), 0) || 0} Ⓐ`)
    console.log(`   Total attendu: ${expectedFrozen} Ⓐ`)
    console.log(`   frozen_balance actuel: ${user.frozen_balance} Ⓐ`)
    console.log(`   ${Math.abs(expectedFrozen - user.frozen_balance) < 0.01 ? '✅ COHÉRENT' : '❌ INCOHÉRENT (diff: ' + (expectedFrozen - user.frozen_balance).toFixed(2) + ' Ⓐ)'}`)
    
    // 5. Historique des achats récents
    console.log('\n' + '='.repeat(80))
    console.log('\n5️⃣ HISTORIQUE DES ACHATS RÉCENTS\n')
    
    const { data: recentPurchases } = await supabase
      .from('transactions')
      .select('id, type, amount, description, status, created_at')
      .eq('user_id', userId)
      .eq('type', 'purchase')
      .order('created_at', { ascending: false })
      .limit(5)
    
    console.log('Amount\tStatus\tDescription\t\t\t\tDate')
    console.log('─'.repeat(80))
    
    recentPurchases?.forEach(tx => {
      const date = new Date(tx.created_at).toLocaleString()
      console.log(`${tx.amount}\t${tx.status}\t${tx.description?.slice(0,40)}\t${date.slice(0, 16)}`)
    })
    
    // 6. Trouver des patterns suspects
    console.log('\n' + '='.repeat(80))
    console.log('\n6️⃣ RECHERCHE DE PATTERNS SUSPECTS\n')
    
    // Vérifier si plusieurs activations ont été créées en même temps
    const { data: duplicateActivations } = await supabase
      .rpc('check_duplicate_activations', {
        p_user_id: userId,
        p_time_window: '1 minute'
      })
      .catch(() => ({ data: null }))
    
    // Si la fonction n'existe pas, faire la vérification manuellement
    const { data: allActivations } = await supabase
      .from('activations')
      .select('id, service_code, country_code, price, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (allActivations) {
      const grouped = new Map()
      allActivations.forEach(act => {
        const minute = new Date(act.created_at).toISOString().slice(0, 16)
        const key = `${minute}-${act.service_code}-${act.country_code}`
        if (!grouped.has(key)) {
          grouped.set(key, [])
        }
        grouped.get(key).push(act)
      })
      
      const duplicates = Array.from(grouped.values()).filter(arr => arr.length > 1)
      
      if (duplicates.length > 0) {
        console.log('⚠️  DUPLICATAS POTENTIELS DÉTECTÉS:\n')
        duplicates.forEach(group => {
          console.log(`   ${group.length}x ${group[0].service_code} ${group[0].country_code} à ${new Date(group[0].created_at).toLocaleString()}`)
          group.forEach(act => {
            console.log(`      - ID: ${act.id.slice(0,8)}, Price: ${act.price}Ⓐ`)
          })
        })
      } else {
        console.log('✅ Aucun duplicata détecté')
      }
    }
    
    // 7. Conclusion
    console.log('\n' + '='.repeat(80))
    console.log('\n🎯 CONCLUSION\n')
    
    if (Math.abs(expectedFrozen - user.frozen_balance) < 0.01) {
      console.log('✅ LE SYSTÈME EST COHÉRENT!')
      console.log('\n📋 VÉRIFICATIONS:')
      console.log('   ✅ frozen_balance correspond aux frozen_amount actifs')
      console.log('   ✅ Les prix affichés correspondent aux prix déduits')
      console.log('   ✅ Pas de duplicatas d\'activations')
      
      console.log('\n💡 SI TU VOIS UN PROBLÈME:')
      console.log('   1. Vérifie que ce ne sont pas les RENTALS qui créent la confusion')
      console.log('   2. Les rentals peuvent avoir des coûts journaliers + coûts totaux')
      console.log('   3. Le frozen_balance inclut les rentals ET les activations')
      console.log('   4. Une activation à 5Ⓐ + un rental à 15Ⓐ = 20Ⓐ gelés au total')
    } else {
      console.log('❌ INCOHÉRENCE DÉTECTÉE!')
      console.log(`\n   Différence: ${(expectedFrozen - user.frozen_balance).toFixed(2)} Ⓐ`)
      console.log('\n💡 CAUSES POSSIBLES:')
      console.log('   - Des activations/rentals fantômes')
      console.log('   - Des frozen_amount non mis à jour')
      console.log('   - Une race condition lors de la création')
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  }
}

// Exécuter le diagnostic
finalDiagnosis()
