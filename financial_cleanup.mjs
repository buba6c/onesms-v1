/**
 * ============================================================================
 * SCRIPT DE NETTOYAGE FINANCIER
 * ============================================================================
 * 
 * Résout les problèmes identifiés par l'audit:
 * 1. Transactions pending orphelines (> 30 min)
 * 2. frozen_balance désynchronisé
 * 3. Transactions sans activation/rental correspondant
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function main() {
  console.log('============================================================')
  console.log('🧹 NETTOYAGE FINANCIER - ONE SMS')
  console.log('============================================================')
  console.log('')

  // =========================================================================
  // 1. TROUVER LES TRANSACTIONS PENDING ORPHELINES (> 30 min)
  // =========================================================================
  console.log('📋 1. Analyse des transactions pending orphelines...')
  
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  
  const { data: orphanPending, error: pendingError } = await supabase
    .from('transactions')
    .select('id, user_id, amount, description, created_at, metadata')
    .eq('status', 'pending')
    .lt('created_at', thirtyMinAgo)
  
  if (pendingError) {
    console.error('❌ Erreur:', pendingError)
  } else {
    console.log(`   📊 ${orphanPending?.length || 0} transactions pending orphelines trouvées`)
    
    if (orphanPending && orphanPending.length > 0) {
      // Afficher un échantillon
      console.log('   📝 Échantillon:')
      orphanPending.slice(0, 5).forEach(tx => {
        console.log(`      - ${tx.id}: ${tx.description} (${tx.amount}Ⓐ) - ${tx.created_at}`)
      })
      if (orphanPending.length > 5) {
        console.log(`      ... et ${orphanPending.length - 5} autres`)
      }
    }
  }
  
  // =========================================================================
  // 2. TROUVER LES UTILISATEURS AVEC frozen_balance INCORRECT
  // =========================================================================
  console.log('')
  console.log('📋 2. Vérification des frozen_balance...')
  
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, balance, frozen_balance')
    .gt('frozen_balance', 0)
  
  if (profilesError) {
    console.error('❌ Erreur:', profilesError)
  } else {
    console.log(`   📊 ${profiles?.length || 0} utilisateurs avec frozen_balance > 0`)
    
    for (const profile of profiles || []) {
      // Calculer le frozen_balance attendu (somme des pending transactions)
      const { data: pendingTx } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', profile.id)
        .eq('status', 'pending')
      
      const expectedFrozen = pendingTx?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0
      const actualFrozen = profile.frozen_balance || 0
      
      if (expectedFrozen !== actualFrozen) {
        console.log(`   ⚠️ User ${profile.email}:`)
        console.log(`      Frozen actuel: ${actualFrozen}Ⓐ`)
        console.log(`      Frozen attendu: ${expectedFrozen}Ⓐ (basé sur pending tx)`)
        console.log(`      Différence: ${actualFrozen - expectedFrozen}Ⓐ`)
      }
    }
  }
  
  // =========================================================================
  // 3. PROPOSER LES CORRECTIONS
  // =========================================================================
  console.log('')
  console.log('============================================================')
  console.log('🔧 CORRECTIONS PROPOSÉES')
  console.log('============================================================')
  console.log('')
  
  // Correction 1: Marquer les transactions pending orphelines comme failed
  if (orphanPending && orphanPending.length > 0) {
    console.log('📝 Correction 1: Marquer les pending orphelines comme "failed"')
    console.log(`   → ${orphanPending.length} transactions à corriger`)
    
    // Demander confirmation (en production, enlever le DRY RUN)
    const DRY_RUN = true
    
    if (!DRY_RUN) {
      for (const tx of orphanPending) {
        // 1. Marquer comme failed
        await supabase
          .from('transactions')
          .update({ 
            status: 'failed',
            metadata: {
              ...tx.metadata,
              cleanup_reason: 'Orphan pending > 30min',
              cleaned_at: new Date().toISOString()
            }
          })
          .eq('id', tx.id)
        
        console.log(`   ✅ TX ${tx.id} marquée comme failed`)
      }
    } else {
      console.log('   ⚠️ DRY RUN - Pas de modification effectuée')
    }
  }
  
  // Correction 2: Réinitialiser les frozen_balance incorrects
  console.log('')
  console.log('📝 Correction 2: Synchroniser les frozen_balance')
  
  for (const profile of profiles || []) {
    const { data: pendingTx } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', profile.id)
      .eq('status', 'pending')
    
    const expectedFrozen = pendingTx?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0
    const actualFrozen = profile.frozen_balance || 0
    
    if (expectedFrozen !== actualFrozen) {
      const DRY_RUN = true
      
      if (!DRY_RUN) {
        await supabase
          .from('profiles')
          .update({ frozen_balance: expectedFrozen })
          .eq('id', profile.id)
        
        console.log(`   ✅ ${profile.email}: frozen ${actualFrozen} → ${expectedFrozen}`)
      } else {
        console.log(`   ⚠️ DRY RUN - ${profile.email}: frozen ${actualFrozen} → ${expectedFrozen}`)
      }
    }
  }
  
  // =========================================================================
  // 4. RÉSUMÉ
  // =========================================================================
  console.log('')
  console.log('============================================================')
  console.log('📊 RÉSUMÉ')
  console.log('============================================================')
  console.log('')
  console.log(`   Transactions pending orphelines: ${orphanPending?.length || 0}`)
  console.log(`   Utilisateurs avec frozen > 0: ${profiles?.length || 0}`)
  console.log('')
  console.log('💡 Pour exécuter les corrections, modifier DRY_RUN = false')
  console.log('')
}

main().catch(console.error)
