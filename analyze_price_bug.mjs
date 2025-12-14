import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function analyzePriceDeductionBug() {
  console.log('🐛 ANALYSE DU BUG: DÉDUCTION DE PRIX INCORRECTE\n')
  console.log('='.repeat(80))
  
  const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'
  
  try {
    // 1. Prendre une activation récente comme exemple
    console.log('\n1️⃣ ANALYSE D\'UNE ACTIVATION RÉCENTE\n')
    
    const { data: latestActivation } = await supabase
      .from('activations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    console.log('📱 ACTIVATION LA PLUS RÉCENTE:')
    console.log(`   ID: ${latestActivation.id}`)
    console.log(`   Service: ${latestActivation.service_code}`)
    console.log(`   Country: ${latestActivation.country_code}`)
    console.log(`   Phone: ${latestActivation.phone}`)
    console.log(`   Status: ${latestActivation.status}`)
    console.log(`   Price dans DB: ${latestActivation.price} Ⓐ`)
    console.log(`   Frozen amount: ${latestActivation.frozen_amount} Ⓐ`)
    console.log(`   Charged: ${latestActivation.charged}`)
    console.log(`   Created: ${new Date(latestActivation.created_at).toLocaleString()}`)
    
    // 2. Trouver la transaction correspondante
    console.log('\n' + '='.repeat(80))
    console.log('\n2️⃣ TRANSACTION CORRESPONDANTE\n')
    
    const { data: relatedTransaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(new Date(latestActivation.created_at).getTime() - 5000).toISOString())
      .lte('created_at', new Date(new Date(latestActivation.created_at).getTime() + 5000).toISOString())
      .eq('type', 'purchase')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (relatedTransaction) {
      console.log('💰 TRANSACTION:')
      console.log(`   ID: ${relatedTransaction.id}`)
      console.log(`   Type: ${relatedTransaction.type}`)
      console.log(`   Amount: ${relatedTransaction.amount} Ⓐ`)
      console.log(`   Description: ${relatedTransaction.description}`)
      console.log(`   Status: ${relatedTransaction.status}`)
      console.log(`   Created: ${new Date(relatedTransaction.created_at).toLocaleString()}`)
      
      console.log('\n🔍 COMPARAISON:')
      console.log(`   Prix dans activation: ${latestActivation.price} Ⓐ`)
      console.log(`   Montant déduit (transaction): ${Math.abs(relatedTransaction.amount)} Ⓐ`)
      console.log(`   Différence: ${Math.abs(relatedTransaction.amount) - latestActivation.price} Ⓐ`)
      
      if (Math.abs(Math.abs(relatedTransaction.amount) - latestActivation.price) > 0.01) {
        console.log('\n❌ INCOHÉRENCE DÉTECTÉE!')
        console.log('   Le montant déduit ne correspond PAS au prix affiché!')
      } else {
        console.log('\n✅ Cohérence: montant déduit = prix affiché')
      }
    }
    
    // 3. Récupérer le prix depuis la table services
    console.log('\n' + '='.repeat(80))
    console.log('\n3️⃣ PRIX DEPUIS LA TABLE SERVICES\n')
    
    const { data: serviceInfo } = await supabase
      .from('services')
      .select('*')
      .eq('service_code', latestActivation.service_code)
      .eq('country_code', latestActivation.country_code)
      .single()
    
    if (serviceInfo) {
      console.log('📊 SERVICE INFO:')
      console.log(`   Service: ${serviceInfo.service_name}`)
      console.log(`   Country: ${serviceInfo.country_name}`)
      console.log(`   Prix de base: ${serviceInfo.price} Ⓐ`)
      console.log(`   Rent: ${serviceInfo.rent} Ⓐ`)
      
      console.log('\n🔍 FLUX DES PRIX:')
      console.log(`   1. Prix dans services table: ${serviceInfo.price} Ⓐ`)
      console.log(`   2. Prix dans activation: ${latestActivation.price} Ⓐ`)
      console.log(`   3. Montant gelé (frozen_amount): ${latestActivation.frozen_amount} Ⓐ`)
      if (relatedTransaction) {
        console.log(`   4. Montant déduit (transaction): ${Math.abs(relatedTransaction.amount)} Ⓐ`)
      }
      
      // Vérifier si une marge a été appliquée
      const marginApplied = latestActivation.price - serviceInfo.price
      if (Math.abs(marginApplied) > 0.01) {
        console.log(`\n💰 MARGE APPLIQUÉE: +${marginApplied.toFixed(2)} Ⓐ (${((marginApplied / serviceInfo.price) * 100).toFixed(2)}%)`)
      }
    }
    
    // 4. Analyser le flow complet de buy-sms-activate-number
    console.log('\n' + '='.repeat(80))
    console.log('\n4️⃣ ANALYSE DU FLOW DANS BUY-SMS-ACTIVATE-NUMBER\n')
    
    console.log('📋 ÉTAPES ATTENDUES:')
    console.log('   1. Frontend envoie la requête avec service + country')
    console.log('   2. Backend récupère le prix depuis services table')
    console.log('   3. Backend applique une marge (si configuré)')
    console.log('   4. Backend crée une transaction avec le prix final')
    console.log('   5. Backend gèle le montant: balance - price → frozen_balance + price')
    console.log('   6. Backend crée l\'activation avec price et frozen_amount = price')
    
    // 5. Vérifier l'historique de balance
    console.log('\n' + '='.repeat(80))
    console.log('\n5️⃣ HISTORIQUE DE BALANCE AUTOUR DE L\'ACTIVATION\n')
    
    const { data: user } = await supabase
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', userId)
      .single()
    
    console.log('💰 ÉTAT ACTUEL:')
    console.log(`   Balance: ${user.balance} Ⓐ`)
    console.log(`   Frozen: ${user.frozen_balance} Ⓐ`)
    console.log(`   Disponible: ${user.balance - user.frozen_balance} Ⓐ`)
    
    // Calculer ce que devrait être la balance si tout était correct
    const { data: activeActivations } = await supabase
      .from('activations')
      .select('frozen_amount')
      .eq('user_id', userId)
      .in('status', ['pending', 'waiting'])
    
    const { data: activeRentals } = await supabase
      .from('rentals')
      .select('frozen_amount')
      .eq('user_id', userId)
      .eq('status', 'active')
    
    const expectedFrozen = 
      (activeActivations?.reduce((sum, a) => sum + (a.frozen_amount || 0), 0) || 0) +
      (activeRentals?.reduce((sum, r) => sum + (r.frozen_amount || 0), 0) || 0)
    
    console.log('\n🔍 VÉRIFICATION:')
    console.log(`   Frozen attendu (somme des frozen_amount): ${expectedFrozen} Ⓐ`)
    console.log(`   Frozen actuel dans users: ${user.frozen_balance} Ⓐ`)
    console.log(`   ${Math.abs(expectedFrozen - user.frozen_balance) < 0.01 ? '✅' : '❌'} ${Math.abs(expectedFrozen - user.frozen_balance) < 0.01 ? 'COHÉRENT' : 'INCOHÉRENT'}`)
    
    // 6. Identifier le bug spécifique
    console.log('\n' + '='.repeat(80))
    console.log('\n🎯 DIAGNOSTIC DU BUG\n')
    
    if (relatedTransaction && serviceInfo) {
      const servicePriceInDb = serviceInfo.price
      const priceInActivation = latestActivation.price
      const amountDeducted = Math.abs(relatedTransaction.amount)
      const frozenAmount = latestActivation.frozen_amount
      
      console.log('📊 RÉCAPITULATIF:')
      console.log(`   Prix dans services DB: ${servicePriceInDb} Ⓐ`)
      console.log(`   Prix dans activation: ${priceInActivation} Ⓐ`)
      console.log(`   Frozen amount: ${frozenAmount} Ⓐ`)
      console.log(`   Montant déduit: ${amountDeducted} Ⓐ`)
      
      // Cas 1: Le prix dans services est différent du prix dans activation
      if (Math.abs(servicePriceInDb - priceInActivation) > 0.01) {
        console.log('\n⚠️  CAS 1: MARGE APPLIQUÉE')
        console.log(`   Une marge de ${(priceInActivation - servicePriceInDb).toFixed(2)} Ⓐ a été ajoutée`)
        console.log(`   Ratio: ${((priceInActivation / servicePriceInDb - 1) * 100).toFixed(2)}%`)
      }
      
      // Cas 2: frozen_amount différent de price
      if (Math.abs(frozenAmount - priceInActivation) > 0.01) {
        console.log('\n❌ CAS 2: FROZEN_AMOUNT INCORRECT')
        console.log(`   frozen_amount (${frozenAmount}) ≠ price (${priceInActivation})`)
        console.log('   CAUSE: Le frozen_amount n\'a pas été mis à jour avec le bon prix')
      }
      
      // Cas 3: Montant déduit différent du prix
      if (Math.abs(amountDeducted - priceInActivation) > 0.01) {
        console.log('\n❌ CAS 3: DÉDUCTION INCORRECTE')
        console.log(`   Montant déduit (${amountDeducted}) ≠ prix affiché (${priceInActivation})`)
        console.log('   CAUSE: La transaction utilise un prix différent de celui affiché')
      }
      
      console.log('\n💡 SOLUTION:')
      console.log('   1. S\'assurer que price = frozen_amount dans toutes les activations')
      console.log('   2. Vérifier que la transaction déduit exactement le price')
      console.log('   3. Appliquer la marge AVANT de créer l\'activation et la transaction')
      console.log('   4. Utiliser frozen_amount (pas price) pour les remboursements')
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  }
}

// Exécuter l'analyse
analyzePriceDeductionBug()
