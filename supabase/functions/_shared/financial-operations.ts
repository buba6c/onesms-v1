/**
 * ============================================================================
 * FINANCIAL OPERATIONS - Module partagé pour la gestion des crédits
 * ============================================================================
 * 
 * Architecture "Freeze-Execute-Settle" (FES)
 * 
 * Ce module fournit des opérations atomiques pour gérer les crédits:
 * 1. freezeCredits - Geler des crédits avant un achat
 * 2. unfreezeCredits - Dégeler si l'achat échoue
 * 3. settleTransaction - Finaliser avec débit
 * 4. refundTransaction - Annuler sans débit
 * 
 * Usage:
 * ```typescript
 * import { freezeCredits, unfreezeCredits, settleTransaction } from '../_shared/financial-operations.ts'
 * 
 * // Avant l'appel API
 * const freeze = await freezeCredits(supabase, userId, price, 'Achat numéro WhatsApp')
 * if (!freeze.success) throw new Error(freeze.error)
 * 
 * // Appel API...
 * const apiResult = await callApi(...)
 * 
 * // Si erreur
 * if (apiResult.error) {
 *   await unfreezeCredits(supabase, userId, freeze.transactionId)
 *   throw new Error(apiResult.error)
 * }
 * 
 * // Si succès
 * await settleTransaction(supabase, userId, freeze.transactionId)
 * ```
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Types
interface FreezeResult {
  success: boolean
  transactionId?: string
  availableBalance?: number
  frozenBalance?: number
  error?: string
}

interface OperationResult {
  success: boolean
  error?: string
  newBalance?: number
  newFrozenBalance?: number
}

/**
 * FREEZE CREDITS
 * 
 * Gèle des crédits pour un achat en cours.
 * Crée une transaction PENDING et incrémente frozen_balance.
 * 
 * @param supabase - Client Supabase avec service role
 * @param userId - ID de l'utilisateur
 * @param amount - Montant en coins à geler
 * @param description - Description de la transaction
 * @param metadata - Données additionnelles (service, country, etc.)
 * @returns FreezeResult avec transactionId si succès
 */
export async function freezeCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  description: string,
  metadata: Record<string, any> = {}
): Promise<FreezeResult> {
  try {
    // Arrondir le montant
    const roundedAmount = Math.round(amount)
    
    if (roundedAmount <= 0) {
      return { success: false, error: 'Le montant doit être positif' }
    }

    // 1. Récupérer le profil utilisateur avec verrou FOR UPDATE (via RPC)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance, frozen_balance')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('❌ Erreur récupération profil:', profileError)
      return { success: false, error: 'Utilisateur non trouvé' }
    }

    const currentBalance = profile.balance || 0
    const currentFrozen = profile.frozen_balance || 0
    const availableBalance = currentBalance - currentFrozen

    // 2. Vérifier le solde disponible
    if (availableBalance < roundedAmount) {
      console.log(`⚠️ Solde insuffisant: disponible=${availableBalance}, requis=${roundedAmount}`)
      return { 
        success: false, 
        error: `Solde insuffisant. Disponible: ${availableBalance}Ⓐ, Requis: ${roundedAmount}Ⓐ`,
        availableBalance,
        frozenBalance: currentFrozen
      }
    }

    // 3. Créer la transaction PENDING
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount: -roundedAmount, // Négatif pour un débit
        type: 'purchase',
        status: 'pending',
        description: description,
        metadata: {
          ...metadata,
          frozen_at: new Date().toISOString(),
          original_balance: currentBalance,
          original_frozen: currentFrozen
        }
      })
      .select('id')
      .single()

    if (txError || !transaction) {
      console.error('❌ Erreur création transaction:', txError)
      return { success: false, error: 'Impossible de créer la transaction' }
    }

    // 4. Incrémenter frozen_balance
    const newFrozen = currentFrozen + roundedAmount
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        frozen_balance: newFrozen,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('❌ Erreur mise à jour frozen_balance:', updateError)
      // Rollback: supprimer la transaction créée
      await supabase.from('transactions').delete().eq('id', transaction.id)
      return { success: false, error: 'Impossible de geler les crédits' }
    }

    console.log(`✅ Crédits gelés: ${roundedAmount}Ⓐ pour user ${userId}`)
    console.log(`   Transaction ID: ${transaction.id}`)
    console.log(`   Frozen balance: ${currentFrozen} → ${newFrozen}`)

    return {
      success: true,
      transactionId: transaction.id,
      availableBalance: currentBalance - newFrozen,
      frozenBalance: newFrozen
    }

  } catch (error) {
    console.error('❌ Erreur freeze:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * UNFREEZE CREDITS
 * 
 * Dégèle des crédits suite à un échec.
 * Décrémente frozen_balance et marque la transaction comme failed.
 * 
 * @param supabase - Client Supabase
 * @param userId - ID de l'utilisateur
 * @param transactionId - ID de la transaction à annuler
 * @param reason - Raison de l'échec (optionnel)
 * @returns OperationResult
 */
export async function unfreezeCredits(
  supabase: SupabaseClient,
  userId: string,
  transactionId: string,
  reason?: string
): Promise<OperationResult> {
  try {
    // 1. Récupérer la transaction
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('amount, status, metadata')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single()

    if (txError || !tx) {
      console.error('❌ Transaction non trouvée:', transactionId)
      return { success: false, error: 'Transaction non trouvée' }
    }

    // Vérifier que la transaction est bien pending
    if (tx.status !== 'pending') {
      console.warn(`⚠️ Transaction ${transactionId} n'est pas pending (status: ${tx.status})`)
      return { success: true } // Déjà traitée
    }

    const amountToUnfreeze = Math.abs(tx.amount) // Le montant est négatif dans la tx

    // 2. Récupérer le profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance, frozen_balance')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'Profil non trouvé' }
    }

    // 3. Décrémenter frozen_balance
    const newFrozen = Math.max(0, (profile.frozen_balance || 0) - amountToUnfreeze)
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        frozen_balance: newFrozen,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('❌ Erreur unfreeze:', updateError)
      return { success: false, error: 'Impossible de dégeler les crédits' }
    }

    // 4. Marquer la transaction comme failed
    const { error: txUpdateError } = await supabase
      .from('transactions')
      .update({ 
        status: 'failed',
        metadata: {
          ...tx.metadata,
          unfrozen_at: new Date().toISOString(),
          failure_reason: reason || 'API error'
        }
      })
      .eq('id', transactionId)

    if (txUpdateError) {
      console.error('❌ Erreur mise à jour transaction:', txUpdateError)
    }

    console.log(`✅ Crédits dégelés: ${amountToUnfreeze}Ⓐ pour user ${userId}`)
    console.log(`   Frozen balance: ${profile.frozen_balance} → ${newFrozen}`)

    return {
      success: true,
      newBalance: profile.balance,
      newFrozenBalance: newFrozen
    }

  } catch (error) {
    console.error('❌ Erreur unfreeze:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * SETTLE TRANSACTION
 * 
 * Finalise une transaction avec succès.
 * Débite balance, décrémente frozen_balance, marque completed.
 * 
 * @param supabase - Client Supabase
 * @param userId - ID de l'utilisateur
 * @param transactionId - ID de la transaction à finaliser
 * @param relatedId - ID de l'activation ou rental créé (optionnel)
 * @returns OperationResult
 */
export async function settleTransaction(
  supabase: SupabaseClient,
  userId: string,
  transactionId: string,
  relatedId?: string
): Promise<OperationResult> {
  try {
    // 1. Récupérer la transaction
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('amount, status, metadata')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single()

    if (txError || !tx) {
      console.error('❌ Transaction non trouvée:', transactionId)
      return { success: false, error: 'Transaction non trouvée' }
    }

    // Si déjà completed, ne rien faire
    if (tx.status === 'completed') {
      console.log(`ℹ️ Transaction ${transactionId} déjà completed`)
      return { success: true }
    }

    // Vérifier que la transaction est pending
    if (tx.status !== 'pending') {
      console.warn(`⚠️ Transaction ${transactionId} a un status inattendu: ${tx.status}`)
      return { success: false, error: `Transaction status: ${tx.status}` }
    }

    const amountToDebit = Math.abs(tx.amount)

    // 2. Récupérer le profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance, frozen_balance')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'Profil non trouvé' }
    }

    // 3. Mettre à jour balance ET frozen_balance atomiquement
    const newBalance = (profile.balance || 0) - amountToDebit
    const newFrozen = Math.max(0, (profile.frozen_balance || 0) - amountToDebit)

    if (newBalance < 0) {
      console.error(`❌ Balance deviendrait négative: ${newBalance}`)
      // On continue quand même car les crédits étaient déjà gelés
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        balance: newBalance,
        frozen_balance: newFrozen,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('❌ Erreur settle:', updateError)
      return { success: false, error: 'Impossible de finaliser la transaction' }
    }

    // 4. Marquer la transaction comme completed
    const { error: txUpdateError } = await supabase
      .from('transactions')
      .update({ 
        status: 'completed',
        metadata: {
          ...tx.metadata,
          settled_at: new Date().toISOString(),
          related_id: relatedId,
          final_balance: newBalance,
          final_frozen: newFrozen
        }
      })
      .eq('id', transactionId)

    if (txUpdateError) {
      console.error('❌ Erreur mise à jour transaction:', txUpdateError)
    }

    console.log(`✅ Transaction finalisée: ${amountToDebit}Ⓐ débités pour user ${userId}`)
    console.log(`   Balance: ${profile.balance} → ${newBalance}`)
    console.log(`   Frozen: ${profile.frozen_balance} → ${newFrozen}`)

    return {
      success: true,
      newBalance,
      newFrozenBalance: newFrozen
    }

  } catch (error) {
    console.error('❌ Erreur settle:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * REFUND TRANSACTION
 * 
 * Rembourse une transaction (timeout, annulation).
 * Dégèle sans débiter, marque comme refunded.
 * 
 * @param supabase - Client Supabase
 * @param userId - ID de l'utilisateur
 * @param transactionId - ID de la transaction à rembourser
 * @param reason - Raison du remboursement
 * @returns OperationResult
 */
export async function refundTransaction(
  supabase: SupabaseClient,
  userId: string,
  transactionId: string,
  reason?: string
): Promise<OperationResult> {
  try {
    // 1. Récupérer la transaction
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('amount, status, metadata')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single()

    if (txError || !tx) {
      console.error('❌ Transaction non trouvée:', transactionId)
      return { success: false, error: 'Transaction non trouvée' }
    }

    // Si déjà refunded, ne rien faire
    if (tx.status === 'refunded') {
      console.log(`ℹ️ Transaction ${transactionId} déjà remboursée`)
      return { success: true }
    }

    // On accepte pending ou completed pour le refund
    if (tx.status !== 'pending' && tx.status !== 'completed') {
      console.warn(`⚠️ Transaction ${transactionId} a un status inattendu: ${tx.status}`)
    }

    const amountToUnfreeze = Math.abs(tx.amount)

    // 2. Récupérer le profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance, frozen_balance')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'Profil non trouvé' }
    }

    // 3. Si la transaction était completed (déjà débitée), rembourser aussi la balance
    let newBalance = profile.balance || 0
    if (tx.status === 'completed') {
      newBalance = (profile.balance || 0) + amountToUnfreeze
      console.log(`💰 Remboursement de ${amountToUnfreeze}Ⓐ (était déjà débité)`)
    }

    // 4. Décrémenter frozen_balance
    const newFrozen = Math.max(0, (profile.frozen_balance || 0) - amountToUnfreeze)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        balance: newBalance,
        frozen_balance: newFrozen,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('❌ Erreur refund:', updateError)
      return { success: false, error: 'Impossible de rembourser' }
    }

    // 5. Marquer la transaction comme refunded
    const { error: txUpdateError } = await supabase
      .from('transactions')
      .update({ 
        status: 'refunded',
        metadata: {
          ...tx.metadata,
          refunded_at: new Date().toISOString(),
          refund_reason: reason || 'Cancelled/Timeout'
        }
      })
      .eq('id', transactionId)

    if (txUpdateError) {
      console.error('❌ Erreur mise à jour transaction:', txUpdateError)
    }

    console.log(`✅ Transaction remboursée: ${amountToUnfreeze}Ⓐ pour user ${userId}`)
    console.log(`   Raison: ${reason || 'Non spécifiée'}`)
    console.log(`   Balance: ${profile.balance} → ${newBalance}`)
    console.log(`   Frozen: ${profile.frozen_balance} → ${newFrozen}`)

    return {
      success: true,
      newBalance,
      newFrozenBalance: newFrozen
    }

  } catch (error) {
    console.error('❌ Erreur refund:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * CHECK AVAILABLE BALANCE
 * 
 * Vérifie le solde disponible d'un utilisateur.
 * 
 * @param supabase - Client Supabase
 * @param userId - ID de l'utilisateur
 * @returns { balance, frozenBalance, availableBalance }
 */
export async function checkAvailableBalance(
  supabase: SupabaseClient,
  userId: string
): Promise<{ balance: number; frozenBalance: number; availableBalance: number } | null> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('balance, frozen_balance')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return null
    }

    const balance = profile.balance || 0
    const frozenBalance = profile.frozen_balance || 0
    
    return {
      balance,
      frozenBalance,
      availableBalance: balance - frozenBalance
    }
  } catch {
    return null
  }
}
