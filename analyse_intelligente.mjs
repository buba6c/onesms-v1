console.log('🔍 ANALYSE INTELLIGENTE - ÉCHEC CRÉDIT PAYDUNYA');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Configuration Supabase
const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1MjY0ODQsImV4cCI6MjA0NzEwMjQ4NH0.FQVhOFlVrhZONYt2aXNqwu2sOGGLI-kJtdYYpxz2qRE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('📊 DÉBUT ANALYSE POST-PAIEMENT');
console.log(`   ⏰ Heure analyse: ${new Date().toLocaleString()}`);

async function analyzeRecentTransactions() {
  console.log('\n🔍 1️⃣ ANALYSE DES TRANSACTIONS RÉCENTES (5 dernières)');
  
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (error) {
      console.log('   ❌ Erreur accès transactions:', error.message)
      return []
    }
    
    console.log(`   📋 Transactions trouvées: ${transactions.length}`)
    
    transactions.forEach((tx, index) => {
      const createdAt = new Date(tx.created_at).toLocaleString()
      console.log(`\n   📄 Transaction ${index + 1}:`)
      console.log(`      🆔 ID: ${tx.id}`)
      console.log(`      👤 User: ${tx.user_id}`)
      console.log(`      💰 Montant: ${tx.amount} FCFA`)
      console.log(`      📱 Status: ${tx.status}`)
      console.log(`      🏷️  Type: ${tx.type}`)
      console.log(`      📅 Créé: ${createdAt}`)
      console.log(`      🔑 External ID: ${tx.external_id || 'N/A'}`)
      console.log(`      📋 Provider: ${tx.provider}`)
      
      // Analyser les métadonnées
      if (tx.metadata) {
        console.log(`      📊 Métadonnées:`)
        if (tx.metadata.activations) {
          console.log(`         💳 Activations: ${tx.metadata.activations}`)
        }
        if (tx.metadata.paydunya_token) {
          console.log(`         �� Token PayDunya: ${tx.metadata.paydunya_token}`)
        }
        if (tx.metadata.webhook_received) {
          console.log(`         🔔 Webhook reçu: ✅`)
          console.log(`         ⏰ Webhook timestamp: ${tx.metadata.webhook_timestamp || 'N/A'}`)
        } else {
          console.log(`         🔔 Webhook reçu: ❌`)
        }
        if (tx.metadata.error) {
          console.log(`         �� Erreur: ${tx.metadata.error}`)
          console.log(`         📋 Détail: ${tx.metadata.error_detail || 'N/A'}`)
        }
      }
      
      // Diagnostiquer le problème
      if (tx.status === 'pending' && !tx.metadata?.webhook_received) {
        console.log(`      🎯 DIAGNOSTIC: Webhook PayDunya pas encore reçu`)
      } else if (tx.status === 'pending_credit_error') {
        console.log(`      🎯 DIAGNOSTIC: Erreur lors du crédit`)
      } else if (tx.status === 'completed') {
        console.log(`      🎯 DIAGNOSTIC: Transaction complétée avec succès`)
      } else if (tx.status === 'failed') {
        console.log(`      🎯 DIAGNOSTIC: Transaction échouée`)
      }
    })
    
    return transactions
  } catch (error) {
    console.log('   🚨 Erreur analyse transactions:', error.message)
    return []
  }
}

async function checkUserBalance(transactions) {
  console.log('\n🔍 2️⃣ VÉRIFICATION BALANCE UTILISATEURS');
  
  const userIds = [...new Set(transactions.map(tx => tx.user_id).filter(Boolean))]
  
  for (const userId of userIds) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('balance, email')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.log(`   ❌ Erreur user ${userId}:`, error.message)
        continue
      }
      
      console.log(`   👤 User ${userId}:`)
      console.log(`      📧 Email: ${user.email || 'N/A'}`)
      console.log(`      💰 Balance: ${user.balance || 0} activations`)
      
      // Calculer le crédit attendu
      const userTransactions = transactions.filter(tx => tx.user_id === userId)
      const expectedCredits = userTransactions.reduce((sum, tx) => {
        return sum + (tx.metadata?.activations || 0)
      }, 0)
      
      console.log(`      🎯 Crédit attendu: ${expectedCredits} activations`)
      
      if (user.balance < expectedCredits) {
        console.log(`      🚨 PROBLÈME: Balance insuffisante!`)
      }
      
    } catch (error) {
      console.log(`   🚨 Erreur check user ${userId}:`, error.message)
    }
  }
}

async function testPaydunyaAPI() {
  console.log('\n🔍 3️⃣ TEST API PAYDUNYA');
  
  const config = {
    masterKey: 'NRimGfVs-w3HH-U396-4KyR-AXNV5vmF0uEW',
    privateKey: 'live_private_MptaDaAADwpfmUi5rIhi2tP5wFc',
    token: 'igh8jsikXdOst2oY85NT'
  }
  
  // Tester avec les tokens récents
  const recentTokens = ['D7NxM5yhEOtArVK1c5Am', 'Js7LlgESaAFXjMcBmOjQ']
  
  for (const token of recentTokens) {
    try {
      console.log(`\n   🧪 Test token: ${token}`)
      
      const response = await fetch(`https://app.paydunya.com/api/v1/checkout-invoice/confirm/${token}`, {
        method: 'GET',
        headers: {
          'PAYDUNYA-MASTER-KEY': config.masterKey,
          'PAYDUNYA-PRIVATE-KEY': config.privateKey,
          'PAYDUNYA-TOKEN': config.token,
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log(`   📊 Status: ${result.response_code} - ${result.response_text}`)
        
        if (result.response_code === '00' && result.invoice) {
          const invoice = result.invoice
          console.log(`   💰 Montant: ${invoice.total_amount}`)
          console.log(`   📱 Status: ${invoice.status || 'N/A'}`)
          console.log(`   📅 Date: ${invoice.created_at ? new Date(invoice.created_at).toLocaleString() : 'N/A'}`)
          
          if (invoice.status === 'completed') {
            console.log(`   ✅ Paiement confirmé côté PayDunya`)
          } else {
            console.log(`   ⚠️  Statut PayDunya: ${invoice.status}`)
          }
        }
      } else {
        console.log(`   ❌ Erreur HTTP: ${response.status}`)
      }
      
      // Pause entre requêtes
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.log(`   🚨 Erreur test token ${token}:`, error.message)
    }
  }
}

async function analyzeCreditFunction() {
  console.log('\n🔍 4️⃣ ANALYSE FONCTION CRÉDIT');
  
  console.log('   📝 Fonction utilisée: secure_moneyfusion_credit_v2')
  console.log('   🔑 Type: SECURITY DEFINER RPC')
  console.log('   ✅ Idempotente: Évite les doubles crédits')
  
  console.log('\n   🎯 Points de contrôle:')
  console.log('     1. Transaction doit exister')
  console.log('     2. Token PayDunya doit être valide')
  console.log('     3. Référence ne doit pas être dupliquée')
  console.log('     4. Métadonnées doivent contenir "activations"')
  console.log('     5. User doit exister')
}

async function generateDiagnosis(transactions) {
  console.log('\n🎯 DIAGNOSTIC INTELLIGENT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const latestTransaction = transactions[0]
  
  if (!latestTransaction) {
    console.log('   🚨 PROBLÈME: Aucune transaction trouvée')
    console.log('   💡 SOLUTION: Vérifier si le paiement a créé une transaction')
    return
  }
  
  console.log(`   📋 Transaction analysée: ${latestTransaction.id}`)
  console.log(`   📅 Créée: ${new Date(latestTransaction.created_at).toLocaleString()}`)
  console.log(`   📱 Status actuel: ${latestTransaction.status}`)
  
  // Diagnostic selon le statut
  switch (latestTransaction.status) {
    case 'pending':
      if (!latestTransaction.metadata?.webhook_received) {
        console.log('\n   🎯 CAUSE: Webhook PayDunya non reçu')
        console.log('   ⏰ ATTENTE: 2-5 minutes normale')
        console.log('   🔍 VÉRIFIER: URLs de redirection accessibles')
        console.log('   💡 ACTION: Attendre ou vérifier manuellement')
      } else {
        console.log('\n   🎯 CAUSE: Webhook reçu mais crédit pas effectué')
        console.log('   🚨 PROBLÈME: Erreur dans secure_moneyfusion_credit_v2')
        console.log('   💡 ACTION: Vérifier logs détaillés')
      }
      break
      
    case 'pending_credit_error':
      console.log('\n   🎯 CAUSE: Erreur confirmée lors du crédit')
      console.log(`   📋 Erreur: ${latestTransaction.metadata?.error || 'Non spécifiée'}`)
      console.log(`   📋 Détail: ${latestTransaction.metadata?.error_detail || 'Non disponible'}`)
      console.log('   💡 ACTION: Réparer et relancer le crédit')
      break
      
    case 'completed':
      console.log('\n   ✅ STATUS: Transaction complétée')
      console.log('   💡 Si pas crédité: Vérifier balance utilisateur')
      break
      
    case 'failed':
      console.log('\n   ❌ STATUS: Transaction échouée')
      console.log('   💡 CAUSE: Problème côté PayDunya ou validation')
      break
      
    default:
      console.log(`\n   ⚠️  STATUS INCONNU: ${latestTransaction.status}`)
  }
  
  // Recommandations générales
  console.log('\n📝 RECOMMANDATIONS:')
  console.log('   1. ⏰ Attendre 5 minutes après paiement')
  console.log('   2. 🔍 Vérifier https://onesms-sn.com/dashboard accessible')
  console.log('   3. 📊 Consulter dashboard PayDunya directement')
  console.log('   4. 🔄 Si nécessaire: crédit manuel via RPC')
  console.log('   5. 🚨 Alertes: Configurer monitoring webhook')
}

// Exécuter l'analyse complète
async function runCompleteAnalysis() {
  const transactions = await analyzeRecentTransactions()
  await checkUserBalance(transactions)
  await testPaydunyaAPI()
  await analyzeCreditFunction()
  await generateDiagnosis(transactions)
  
  console.log('\n✅ ANALYSE TERMINÉE')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

runCompleteAnalysis()
