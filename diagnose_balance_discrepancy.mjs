import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function diagnoseBalanceDiscrepancy() {
  console.log('🔍 DIAGNOSTIC: COMPARAISON BALANCE HEADER vs MY ACCOUNT\n')
  console.log('='.repeat(70))
  
  try {
    // Récupérer l'utilisateur de test
    const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'
    
    console.log(`\n1️⃣ RÉCUPÉRATION DES DONNÉES UTILISATEUR (User ID: ${userId.slice(0,8)}...)\n`)
    
    // Requête 1: Comme dans le Header (balance + frozen_balance)
    const { data: headerData, error: headerError } = await supabase
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', userId)
      .single()
    
    if (headerError) {
      console.error('❌ Erreur Header query:', headerError)
    } else {
      console.log('📊 HEADER DATA (utilisé dans le Header):')
      console.log(`   balance: ${headerData.balance}`)
      console.log(`   frozen_balance: ${headerData.frozen_balance}`)
      console.log(`   ➡️  Disponible affiché: ${Math.floor(headerData.balance - headerData.frozen_balance)} Ⓐ`)
      console.log(`   ➡️  Gelé affiché: ${Math.floor(headerData.frozen_balance)} Ⓐ`)
    }
    
    console.log()
    
    // Requête 2: Comme dans My Account (balance + frozen_balance)
    const { data: accountData, error: accountError } = await supabase
      .from('users')
      .select('email, id, balance, frozen_balance')
      .eq('id', userId)
      .single()
    
    if (accountError) {
      console.error('❌ Erreur My Account query:', accountError)
    } else {
      console.log('📊 MY ACCOUNT DATA (utilisé dans Settings):')
      console.log(`   email: ${accountData.email}`)
      console.log(`   balance: ${accountData.balance}`)
      console.log(`   frozen_balance: ${accountData.frozen_balance}`)
      console.log(`   ➡️  Disponible affiché: ${Math.floor(accountData.balance - accountData.frozen_balance)} Ⓐ`)
      console.log(`   ➡️  Gelé affiché: ${Math.floor(accountData.frozen_balance)} Ⓐ`)
      console.log(`   ➡️  Total affiché: ${Math.floor(accountData.balance)} Ⓐ`)
    }
    
    console.log('\n' + '='.repeat(70))
    console.log('\n2️⃣ COMPARAISON DES VALEURS\n')
    
    if (headerData && accountData) {
      const balanceMatch = headerData.balance === accountData.balance
      const frozenMatch = headerData.frozen_balance === accountData.frozen_balance
      const availableHeader = headerData.balance - headerData.frozen_balance
      const availableAccount = accountData.balance - accountData.frozen_balance
      const availableMatch = availableHeader === availableAccount
      
      console.log(`Balance totale:`)
      console.log(`   Header: ${headerData.balance}`)
      console.log(`   My Account: ${accountData.balance}`)
      console.log(`   ${balanceMatch ? '✅' : '❌'} ${balanceMatch ? 'IDENTIQUE' : 'DIFFÉRENT'}`)
      
      console.log(`\nFrozen balance:`)
      console.log(`   Header: ${headerData.frozen_balance}`)
      console.log(`   My Account: ${accountData.frozen_balance}`)
      console.log(`   ${frozenMatch ? '✅' : '❌'} ${frozenMatch ? 'IDENTIQUE' : 'DIFFÉRENT'}`)
      
      console.log(`\nBalance disponible (calculée):`)
      console.log(`   Header: ${availableHeader}`)
      console.log(`   My Account: ${availableAccount}`)
      console.log(`   ${availableMatch ? '✅' : '❌'} ${availableMatch ? 'IDENTIQUE' : 'DIFFÉRENT'}`)
      
      console.log(`\nBalance disponible affichée (avec Math.floor):`)
      console.log(`   Header: ${Math.floor(availableHeader)} Ⓐ`)
      console.log(`   My Account: ${Math.floor(availableAccount)} Ⓐ`)
      console.log(`   ${Math.floor(availableHeader) === Math.floor(availableAccount) ? '✅' : '❌'} ${Math.floor(availableHeader) === Math.floor(availableAccount) ? 'IDENTIQUE' : 'DIFFÉRENT'}`)
    }
    
    console.log('\n' + '='.repeat(70))
    console.log('\n3️⃣ VÉRIFICATION DES ACTIVATIONS ACTIVES\n')
    
    // Vérifier les activations actives (utilisé dans le Header)
    const { data: activations } = await supabase
      .from('activations')
      .select('id, phone, price, frozen_amount, status, created_at')
      .eq('user_id', userId)
      .in('status', ['pending', 'waiting'])
      .order('created_at', { ascending: false })
    
    console.log(`Nombre d'activations actives: ${activations?.length || 0}`)
    
    if (activations && activations.length > 0) {
      let totalFrozenAmount = 0
      console.log('\nDétails des activations:')
      activations.forEach((act, i) => {
        totalFrozenAmount += act.frozen_amount || 0
        console.log(`   ${i+1}. ${act.phone} | ${act.status} | price: ${act.price} | frozen_amount: ${act.frozen_amount}`)
      })
      
      console.log(`\n📊 CALCUL DES FROZEN:`)
      console.log(`   Total frozen_amount des activations: ${totalFrozenAmount}`)
      console.log(`   frozen_balance dans users: ${headerData?.frozen_balance}`)
      
      const frozenBalanceCorrect = Math.abs(totalFrozenAmount - (headerData?.frozen_balance || 0)) < 0.01
      console.log(`   ${frozenBalanceCorrect ? '✅' : '❌'} ${frozenBalanceCorrect ? 'COHÉRENT' : 'INCOHÉRENT'}`)
      
      if (!frozenBalanceCorrect) {
        console.log(`\n⚠️  PROBLÈME DÉTECTÉ:`)
        console.log(`   Différence: ${Math.abs(totalFrozenAmount - (headerData?.frozen_balance || 0))} Ⓐ`)
        console.log(`   Le frozen_balance devrait être: ${totalFrozenAmount} Ⓐ`)
      }
    } else {
      console.log('   Aucune activation active')
      if (headerData?.frozen_balance && headerData.frozen_balance > 0) {
        console.log(`\n❌ INCOHÉRENCE: frozen_balance = ${headerData.frozen_balance} mais aucune activation active!`)
      }
    }
    
    console.log('\n' + '='.repeat(70))
    console.log('\n4️⃣ CONCLUSION\n')
    
    if (headerData && accountData) {
      if (headerData.balance === accountData.balance && 
          headerData.frozen_balance === accountData.frozen_balance) {
        console.log('✅ Les données sont IDENTIQUES entre Header et My Account')
        console.log('   Le problème visible vient probablement du cache du navigateur')
        console.log('   ou d\'un timing de rafraîchissement différent')
      } else {
        console.log('❌ PROBLÈME: Les données sont DIFFÉRENTES!')
        console.log('\n📝 Données brutes pour investigation:')
        console.log('   Header:', JSON.stringify(headerData, null, 2))
        console.log('   My Account:', JSON.stringify(accountData, null, 2))
      }
    }
    
    // Vérifier aussi les rentals actifs
    console.log('\n' + '='.repeat(70))
    console.log('\n5️⃣ VÉRIFICATION DES RENTALS ACTIFS\n')
    
    const { data: rentals } = await supabase
      .from('rentals')
      .select('id, phone, total_cost, frozen_amount, status')
      .eq('user_id', userId)
      .eq('status', 'active')
    
    console.log(`Nombre de rentals actifs: ${rentals?.length || 0}`)
    
    if (rentals && rentals.length > 0) {
      let totalRentalFrozen = 0
      console.log('\nDétails des rentals:')
      rentals.forEach((rent, i) => {
        totalRentalFrozen += rent.frozen_amount || 0
        console.log(`   ${i+1}. ${rent.phone} | total_cost: ${rent.total_cost} | frozen_amount: ${rent.frozen_amount}`)
      })
      console.log(`\nTotal frozen_amount des rentals: ${totalRentalFrozen}`)
    }
    
    console.log('\n' + '='.repeat(70))
    console.log('\n✅ DIAGNOSTIC TERMINÉ\n')
    
  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

// Exécuter le diagnostic
diagnoseBalanceDiscrepancy()
