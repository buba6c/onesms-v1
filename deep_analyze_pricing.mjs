import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function deepAnalyzePricingFlow() {
  console.log('🔍 ANALYSE APPROFONDIE DU FLUX DE PRIX ET DÉDUCTIONS\n')
  console.log('='.repeat(80))
  
  const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'
  
  try {
    // 1. État actuel de l'utilisateur
    console.log('\n1️⃣ ÉTAT ACTUEL DE L\'UTILISATEUR\n')
    
    const { data: user } = await supabase
      .from('users')
      .select('email, balance, frozen_balance')
      .eq('id', userId)
      .single()
    
    console.log(`👤 ${user.email}`)
    console.log(`   Balance: ${user.balance} Ⓐ`)
    console.log(`   Frozen: ${user.frozen_balance} Ⓐ`)
    console.log(`   Disponible: ${user.balance - user.frozen_balance} Ⓐ`)
    
    // 2. Analyser les 5 dernières activations
    console.log('\n' + '='.repeat(80))
    console.log('\n2️⃣ ANALYSE DES 5 DERNIÈRES ACTIVATIONS\n')
    
    const { data: recentActivations } = await supabase
      .from('activations')
      .select('id, phone, service_code, country_code, price, frozen_amount, status, created_at, charged')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
    
    console.log('ID\t\tService\t\tCountry\tPrice\tFrozen\tCharged\tStatus\tDate')
    console.log('─'.repeat(80))
    
    recentActivations?.forEach(act => {
      const date = new Date(act.created_at).toLocaleString()
      const priceMatch = act.price === act.frozen_amount ? '✅' : '❌'
      console.log(`${act.id.slice(0,8)}\t${act.service_code}\t${act.country_code}\t${act.price}\t${act.frozen_amount}\t${act.charged}\t${act.status}\t${date} ${priceMatch}`)
    })
    
    // 3. Analyser les transactions récentes
    console.log('\n' + '='.repeat(80))
    console.log('\n3️⃣ ANALYSE DES 10 DERNIÈRES TRANSACTIONS\n')
    
    const { data: recentTransactions } = await supabase
      .from('transactions')
      .select('id, type, amount, description, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log('Type\t\t\tAmount\tStatus\tDescription\t\t\tDate')
    console.log('─'.repeat(80))
    
    recentTransactions?.forEach(tx => {
      const date = new Date(tx.created_at).toLocaleString()
      console.log(`${tx.type}\t\t${tx.amount}\t${tx.status}\t${tx.description?.slice(0,30)}\t${date}`)
    })
    
    // 4. Comparer prix affiché vs prix réel pour un service spécifique
    console.log('\n' + '='.repeat(80))
    console.log('\n4️⃣ ANALYSE DES PRIX POUR WHATSAPP\n')
    
    // Récupérer les prix depuis la table services
    const { data: whatsappServices } = await supabase
      .from('services')
      .select('service_code, country_code, service_name, country_name, price, rent')
      .eq('service_code', 'wa')
      .order('price', { ascending: true })
      .limit(10)
    
    console.log('Service\tCountry\tService Name\t\t\tPrice\tRent')
    console.log('─'.repeat(80))
    
    whatsappServices?.forEach(svc => {
      console.log(`${svc.service_code}\t${svc.country_code}\t${svc.service_name?.slice(0,20)}\t\t${svc.price}\t${svc.rent}`)
    })
    
    // 5. Vérifier les activations WhatsApp récentes
    console.log('\n' + '='.repeat(80))
    console.log('\n5️⃣ ACTIVATIONS WHATSAPP RÉCENTES\n')
    
    const { data: whatsappActivations } = await supabase
      .from('activations')
      .select('id, phone, service_code, country_code, price, frozen_amount, status, created_at')
      .eq('user_id', userId)
      .eq('service_code', 'wa')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (whatsappActivations && whatsappActivations.length > 0) {
      console.log('ID\t\tPhone\t\tCountry\tPrice affiché\tPrice gelé\tDifférence')
      console.log('─'.repeat(80))
      
      whatsappActivations.forEach(act => {
        const diff = act.price - act.frozen_amount
        const diffIndicator = Math.abs(diff) < 0.01 ? '✅' : `❌ ${diff > 0 ? '+' : ''}${diff.toFixed(2)}`
        console.log(`${act.id.slice(0,8)}\t${act.phone}\t${act.country_code}\t${act.price}\t\t${act.frozen_amount}\t\t${diffIndicator}`)
      })
    } else {
      console.log('Aucune activation WhatsApp récente')
    }
    
    // 6. Analyser l'historique des changements de balance
    console.log('\n' + '='.repeat(80))
    console.log('\n6️⃣ ANALYSE DES CHANGEMENTS DE BALANCE\n')
    
    // Récupérer les transactions de type 'purchase' et 'refund'
    const { data: balanceChanges } = await supabase
      .from('transactions')
      .select('id, type, amount, description, status, created_at')
      .eq('user_id', userId)
      .in('type', ['purchase', 'refund', 'topup'])
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log('Type\t\tAmount\tStatus\tDescription\t\t\t\tDate')
    console.log('─'.repeat(80))
    
    let totalDeducted = 0
    let totalRefunded = 0
    
    balanceChanges?.forEach(tx => {
      const date = new Date(tx.created_at).toLocaleString()
      console.log(`${tx.type}\t${tx.amount}\t${tx.status}\t${tx.description?.slice(0,40)}\t${date}`)
      
      if (tx.type === 'purchase' && tx.status === 'completed') {
        totalDeducted += Math.abs(tx.amount)
      }
      if (tx.type === 'refund' && tx.status === 'completed') {
        totalRefunded += tx.amount
      }
    })
    
    console.log(`\n📊 Total déduit (purchases): ${totalDeducted} Ⓐ`)
    console.log(`📊 Total remboursé (refunds): ${totalRefunded} Ⓐ`)
    
    // 7. Vérifier les incohérences entre price et frozen_amount
    console.log('\n' + '='.repeat(80))
    console.log('\n7️⃣ RECHERCHE D\'INCOHÉRENCES PRICE vs FROZEN_AMOUNT\n')
    
    const { data: inconsistentActivations } = await supabase
      .from('activations')
      .select('id, phone, service_code, country_code, price, frozen_amount, status, created_at')
      .eq('user_id', userId)
      .neq('price', 'frozen_amount')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (inconsistentActivations && inconsistentActivations.length > 0) {
      console.log(`❌ TROUVÉ ${inconsistentActivations.length} ACTIVATIONS AVEC INCOHÉRENCE!\n`)
      console.log('ID\t\tService\tCountry\tPrice\tFrozen\tDifférence\tStatus\tDate')
      console.log('─'.repeat(80))
      
      inconsistentActivations.forEach(act => {
        const diff = act.price - act.frozen_amount
        const date = new Date(act.created_at).toLocaleString()
        console.log(`${act.id.slice(0,8)}\t${act.service_code}\t${act.country_code}\t${act.price}\t${act.frozen_amount}\t${diff > 0 ? '+' : ''}${diff.toFixed(2)}\t\t${act.status}\t${date}`)
      })
      
      console.log('\n⚠️  PROBLÈME IDENTIFIÉ:')
      console.log('   Les valeurs price et frozen_amount ne correspondent pas!')
      console.log('   Cela peut causer des déductions incorrectes.')
    } else {
      console.log('✅ Aucune incohérence trouvée entre price et frozen_amount')
    }
    
    // 8. Vérifier les marges appliquées
    console.log('\n' + '='.repeat(80))
    console.log('\n8️⃣ VÉRIFICATION DES MARGES APPLIQUÉES\n')
    
    // Récupérer les paramètres de marge
    const { data: marginSettings } = await supabase
      .from('margin_settings')
      .select('*')
      .single()
    
    if (marginSettings) {
      console.log('📊 CONFIGURATION DES MARGES:')
      console.log(`   Enabled: ${marginSettings.enabled}`)
      console.log(`   SMS Margin: ${marginSettings.sms_margin_percentage}%`)
      console.log(`   Rent Margin: ${marginSettings.rent_margin_percentage}%`)
      console.log(`   Min SMS: ${marginSettings.min_sms_price}`)
      console.log(`   Min Rent: ${marginSettings.min_rent_price}`)
    }
    
    // 9. Comparer le prix de la table services avec le prix dans activations
    console.log('\n' + '='.repeat(80))
    console.log('\n9️⃣ COMPARAISON PRIX SERVICES vs PRIX ACTIVATIONS\n')
    
    if (recentActivations && recentActivations.length > 0) {
      console.log('Activation\tService\tCountry\tPrix activation\tPrix service\tDifférence')
      console.log('─'.repeat(80))
      
      for (const act of recentActivations) {
        const { data: servicePrice } = await supabase
          .from('services')
          .select('price')
          .eq('service_code', act.service_code)
          .eq('country_code', act.country_code)
          .single()
        
        if (servicePrice) {
          const diff = act.price - servicePrice.price
          const diffIndicator = Math.abs(diff) < 0.01 ? '✅' : `❌ ${diff > 0 ? '+' : ''}${diff.toFixed(2)}`
          console.log(`${act.id.slice(0,8)}\t${act.service_code}\t${act.country_code}\t${act.price}\t\t${servicePrice.price}\t\t${diffIndicator}`)
        }
      }
    }
    
    // 10. Résumé et recommandations
    console.log('\n' + '='.repeat(80))
    console.log('\n🎯 RÉSUMÉ ET DIAGNOSTIC\n')
    
    // Calculer les incohérences
    const hasInconsistentPrices = inconsistentActivations && inconsistentActivations.length > 0
    
    if (hasInconsistentPrices) {
      console.log('❌ PROBLÈMES DÉTECTÉS:')
      console.log('   1. Incohérence entre price et frozen_amount dans les activations')
      console.log('   2. Certaines activations gèlent un montant différent du prix affiché')
      console.log('')
      console.log('🔧 CAUSES POSSIBLES:')
      console.log('   - La marge est appliquée au price mais pas au frozen_amount')
      console.log('   - Le frozen_amount est fixé avant l\'application de la marge')
      console.log('   - Les transactions déduisent le price, pas le frozen_amount')
      console.log('')
      console.log('💡 SOLUTION RECOMMANDÉE:')
      console.log('   1. S\'assurer que frozen_amount = price dans buy-sms-activate-number')
      console.log('   2. Appliquer la marge AVANT de définir price et frozen_amount')
      console.log('   3. Vérifier que les transactions utilisent frozen_amount pour les remboursements')
    } else {
      console.log('✅ SYSTÈME COHÉRENT:')
      console.log('   - Tous les prix correspondent aux montants gelés')
      console.log('   - Les transactions sont cohérentes')
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  }
}

// Exécuter l'analyse
deepAnalyzePricingFlow()
