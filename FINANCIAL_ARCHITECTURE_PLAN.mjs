/**
 * ============================================================================
 * 🧠 DEEP RÉFLEXION - ARCHITECTURE FINANCIÈRE ONE SMS
 * ============================================================================
 * 
 * ANALYSE DU PROBLÈME ACTUEL:
 * 
 * Le système a 2 flux différents avec des approches incohérentes:
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ ACTIVATION (Complexe, avec protection)                                   │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ 1. Vérifier balance disponible (balance - frozen)                       │
 * │ 2. Créer transaction PENDING                                            │
 * │ 3. GELER crédits (frozen += price)                                      │
 * │ 4. Appeler API SMS-Activate                                             │
 * │ 5. Si erreur → DÉGELER + transaction = failed                           │
 * │ 6. Si OK → créer activation (pending)                                   │
 * │ 7. PLUS TARD (check-status): Si SMS reçu → balance -= price, frozen -=  │
 * │ 8. PLUS TARD: Si timeout/cancel → frozen -= price, transaction=refunded │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ RENT (Simple, SANS protection)                                          │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ 1. Vérifier balance                                                     │
 * │ 2. Appeler API SMS-Activate                                             │
 * │ 3. Si OK → créer rental + balance -= price + transaction completed      │
 * │ 4. Si erreur → throw (mais pas de rollback si erreur partielle!)        │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * PROBLÈMES IDENTIFIÉS:
 * 
 * 1. ❌ RENT: Pas de protection contre double-click
 * 2. ❌ RENT: Si création rental échoue APRÈS API, crédits perdus
 * 3. ❌ RENT: Transaction créée APRÈS débit (pas de traçabilité si erreur)
 * 4. ❌ ACTIVATION: frozen_balance peut se désynchroniser
 * 5. ❌ ACTIVATION: 52 transactions pending orphelines (jamais résolues)
 * 6. ❌ GÉNÉRAL: Pas de nettoyage automatique des états incohérents
 * 
 * ============================================================================
 * 💡 SOLUTION PROPOSÉE: ARCHITECTURE UNIFIÉE
 * ============================================================================
 * 
 * PRINCIPE: "Freeze-Execute-Settle" (FES)
 * 
 * Pour TOUS les achats (activation ET rent), suivre ce flux:
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ PHASE 1: FREEZE (Atomique, avant tout appel externe)                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ 1. Vérifier balance disponible (balance - frozen >= price)              │
 * │ 2. Créer transaction PENDING avec tous les détails                      │
 * │ 3. Geler crédits: frozen_balance += price                               │
 * │ 4. Retourner transaction_id                                             │
 * │ ⚠️ Si erreur dans 1-3: rollback complet, rien n'est fait                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ PHASE 2: EXECUTE (Appel API externe)                                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ 1. Appeler l'API SMS-Activate                                           │
 * │ 2. Si erreur API:                                                       │
 * │    → Dégeler: frozen_balance -= price                                   │
 * │    → Transaction status = 'failed'                                      │
 * │    → Retourner erreur                                                   │
 * │ 3. Si OK:                                                               │
 * │    → Créer record (activation ou rental)                                │
 * │    → Lier transaction au record                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ PHASE 3: SETTLE (Finalisation)                                          │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ POUR RENT (immédiat):                                                   │
 * │   → balance -= price                                                    │
 * │   → frozen_balance -= price                                             │
 * │   → transaction status = 'completed'                                    │
 * │                                                                         │
 * │ POUR ACTIVATION (différé - quand SMS reçu ou timeout):                  │
 * │   Si SMS reçu:                                                          │
 * │     → balance -= price                                                  │
 * │     → frozen_balance -= price                                           │
 * │     → transaction status = 'completed'                                  │
 * │   Si timeout/cancel:                                                    │
 * │     → frozen_balance -= price (pas de débit)                            │
 * │     → transaction status = 'refunded'                                   │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * ============================================================================
 * 🔧 IMPLÉMENTATION: FONCTION UTILITAIRE PARTAGÉE
 * ============================================================================
 * 
 * Créer un module partagé: `_shared/financial-operations.ts`
 * 
 * export async function freezeCredits(supabase, userId, amount, description) {
 *   // Vérifier et geler atomiquement
 *   // Retourne { success, transactionId, frozenBalance }
 * }
 * 
 * export async function unfreezeCredits(supabase, userId, transactionId) {
 *   // Dégeler et marquer transaction failed
 * }
 * 
 * export async function settleTransaction(supabase, userId, transactionId, debit = true) {
 *   // Finaliser: débit balance, dégeler, transaction completed
 * }
 * 
 * export async function refundTransaction(supabase, userId, transactionId) {
 *   // Annuler: dégeler sans débit, transaction refunded
 * }
 * 
 * ============================================================================
 * 🎯 AVANTAGES DE CETTE ARCHITECTURE
 * ============================================================================
 * 
 * 1. ✅ Code DRY - même logique pour activation et rent
 * 2. ✅ Protection double-click pour TOUS les achats
 * 3. ✅ Traçabilité complète (transaction créée AVANT tout)
 * 4. ✅ Rollback propre en cas d'erreur
 * 5. ✅ frozen_balance toujours synchronisé
 * 6. ✅ Facile à auditer et débugger
 * 7. ✅ Extensible pour futurs types d'achats
 * 
 * ============================================================================
 * 📋 PLAN D'ACTION
 * ============================================================================
 * 
 * PHASE 1: Créer le module partagé
 * - Créer _shared/financial-operations.ts
 * - Implémenter les 4 fonctions
 * 
 * PHASE 2: Refactorer buy-sms-activate-rent
 * - Utiliser freezeCredits avant API
 * - Utiliser settleTransaction après succès
 * - Utiliser unfreezeCredits si erreur
 * 
 * PHASE 3: Refactorer buy-sms-activate-number  
 * - Utiliser le module partagé
 * - Simplifier le code existant
 * 
 * PHASE 4: Mettre à jour check-sms-activate-status
 * - Utiliser settleTransaction/refundTransaction
 * 
 * PHASE 5: Script de nettoyage
 * - Résoudre les 52 transactions pending orphelines
 * - Synchroniser les frozen_balance
 * 
 */

console.log('📖 Ce fichier contient l\'analyse et le plan d\'architecture.');
console.log('Exécutez les corrections avec les commandes qui suivent.');
