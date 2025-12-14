/**
 * Script pour corriger la transaction TopUp qui n'a pas crédité le solde
 * Transaction ID: fd58bdf7-c4ec-4ae2-bed9-11d81d712e63
 * User ID: e108c02a-2012-4043-bbc2-fb09bb11f824
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const TRANSACTION_ID = 'fd58bdf7-c4ec-4ae2-bed9-11d81d712e63'
const USER_ID = 'e108c02a-2012-4043-bbc2-fb09bb11f824'

async function fixTransaction() {
  console.log('🔍 Analyse de la transaction...\n')
  
  // 1. Récupérer la transaction
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', TRANSACTION_ID)
    .single()
  
  if (txError) {
    console.error('❌ Erreur récupération transaction:', txError)
    return
  }
  
  console.log('📋 Transaction trouvée:')
  console.log('   - ID:', tx.id)
  console.log('   - User ID:', tx.user_id)
  console.log('   - Type:', tx.type)
  console.log('   - Amount:', tx.amount)
  console.log('   - Status:', tx.status)
  console.log('   - Description:', tx.description)
  console.log('   - Created:', tx.created_at)
  console.log('   - Metadata:', JSON.stringify(tx.metadata, null, 2))
  console.log()
  
  // 2. Récupérer le solde actuel de l'utilisateur
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, balance')
    .eq('id', USER_ID)
    .single()
  
  if (userError) {
    console.error('❌ Erreur récupération utilisateur:', userError)
    return
  }
  
  console.log('👤 Utilisateur:')
  console.log('   - ID:', user.id)
  console.log('   - Email:', user.email)
  console.log('   - Balance actuelle:', user.balance)
  console.log()
  
  // 3. Vérifier si la transaction est déjà complétée
  if (tx.status === 'completed') {
    console.log('ℹ️ Cette transaction est déjà marquée comme completed.')
    console.log('   Vérifiez si le solde correspond.')
    return
  }
  
  // 4. Calculer les crédits à ajouter
  const creditsToAdd = tx.metadata?.activations || tx.amount || 0
  const currentBalance = user.balance || 0
  const newBalance = currentBalance + creditsToAdd
  
  console.log('💰 Correction à appliquer:')
  console.log('   - Crédits à ajouter:', creditsToAdd)
  console.log('   - Balance actuelle:', currentBalance)
  console.log('   - Nouvelle balance:', newBalance)
  console.log()
  
  // Demander confirmation
  console.log('⚠️ Voulez-vous appliquer cette correction ?')
  console.log('   Appuyez sur Ctrl+C pour annuler, ou attendez 3 secondes pour continuer...\n')
  
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  // 5. Mettre à jour la transaction
  console.log('🔄 Mise à jour de la transaction...')
  const { error: updateTxError } = await supabase
    .from('transactions')
    .update({
      status: 'completed',
      balance_before: currentBalance,
      balance_after: newBalance,
      updated_at: new Date().toISOString(),
      metadata: {
        ...tx.metadata,
        moneyfusion_status: 'paid',
        manual_fix: true,
        fixed_at: new Date().toISOString(),
        fix_reason: 'Webhook MoneyFusion non reçu'
      }
    })
    .eq('id', TRANSACTION_ID)
  
  if (updateTxError) {
    console.error('❌ Erreur mise à jour transaction:', updateTxError)
    return
  }
  console.log('✅ Transaction mise à jour avec status: completed')
  
  // 6. Créditer le solde utilisateur
  console.log('🔄 Mise à jour du solde utilisateur...')
  const { error: updateBalanceError } = await supabase
    .from('users')
    .update({ balance: newBalance })
    .eq('id', USER_ID)
  
  if (updateBalanceError) {
    console.error('❌ Erreur mise à jour solde:', updateBalanceError)
    return
  }
  console.log('✅ Solde mis à jour:', currentBalance, '→', newBalance)
  
  // 7. Vérification finale
  console.log('\n🔍 Vérification finale...')
  
  const { data: finalUser } = await supabase
    .from('users')
    .select('balance')
    .eq('id', USER_ID)
    .single()
  
  const { data: finalTx } = await supabase
    .from('transactions')
    .select('status, balance_after')
    .eq('id', TRANSACTION_ID)
    .single()
  
  console.log('✅ Balance finale:', finalUser?.balance)
  console.log('✅ Status transaction:', finalTx?.status)
  
  console.log('\n🎉 Correction terminée avec succès!')
  console.log('   L\'utilisateur a maintenant', newBalance, 'activations disponibles.')
}

fixTransaction().catch(console.error)
