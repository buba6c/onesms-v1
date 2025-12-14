// ===============================================================================
// 🛡️ FIX: buy-sms-activate-number avec protection rollback robuste
// ===============================================================================
// 
// PROBLÈME:
// - catch(error) global ligne 549 retourne erreur SANS rollback si freeze appliqué
// - Si erreur après secure_freeze_balance, frozen reste gelé à jamais
// 
// SOLUTION:
// - Wrapper freeze + logique suivante dans try-catch
// - Track si freeze appliqué via flag
// - Si erreur ET freeze appliqué → atomic_refund obligatoire
// ===============================================================================

// LIGNE 453-520: Remplacer par cette version protégée

    console.log('✅ [BUY-SMS-ACTIVATE] Activation created:', activation.id)

    // 🛡️ PROTECTION ROLLBACK: Track si freeze appliqué
    let freezeApplied = false
    let frozenAmount = 0

    try {
      // 4.1. 🔒 SECURE FREEZE using secure system
      console.log('🔒 [BUY-SMS-ACTIVATE] Freezing balance securely...')
      const { data: freezeResult, error: freezeError } = await supabaseClient.rpc('secure_freeze_balance', {
        p_user_id: userId,
        p_activation_id: activation.id,
        p_amount: price,
        p_reason: \`Activation \${product} (\${country})\`
      })

      if (freezeError) {
        console.error('❌ [BUY-SMS-ACTIVATE] secure_freeze_balance failed:', freezeError)
        
        // Nettoyer l'activation créée (freeze pas encore appliqué)
        await supabaseClient.from('activations').delete().eq('id', activation.id)
        await supabaseClient.from('transactions').update({ status: 'failed' }).eq('id', transactionId)
        
        // Message d'erreur utilisateur
        if (freezeError.message.includes('INSUFFICIENT_BALANCE')) {
          throw new Error(\`Solde insuffisant pour cet achat\`)
        }
        throw new Error(\`Failed to freeze balance: \${freezeError.message}\`)
      }

      // ✅ FREEZE APPLIQUÉ - Activer protection rollback
      freezeApplied = true
      frozenAmount = freezeResult.frozen_amount

      console.log('🔒 [BUY-SMS-ACTIVATE] secure_freeze_balance SUCCESS:', freezeResult)
      console.log('🔒 [BUY-SMS-ACTIVATE] Secure freeze completed:', {
        frozenAmount: freezeResult.frozen_amount,
        newFrozenBalance: freezeResult.new_frozen_balance,
        availableBalance: freezeResult.available_balance,
        price: price
      })

      // 5. ✅ Activation created and balance frozen!
      // 5.1. Link transaction to activation (CRITICAL for later status updates)
      const { error: linkError } = await supabaseClient
        .from('transactions')
        .update({ related_activation_id: activation.id })
        .eq('id', transactionId)

      if (linkError) {
        console.error('⚠️ [BUY-SMS-ACTIVATE] Failed to link transaction to activation:', linkError)
        // Si linkError critical, on throw pour trigger rollback
        if (linkError.code === 'PGRST116') {
          throw new Error(\`Failed to link transaction: \${linkError.message}\`)
        }
        // Sinon non-critical, continue
      } else {
        console.log('🔗 [BUY-SMS-ACTIVATE] Transaction linked to activation:', activation.id)
      }

      // 5.2. 🔒 IMPORTANT: Link the freeze operation to the activation
      const { error: linkFreezeError } = await supabaseClient
        .from('balance_operations')
        .update({ activation_id: activation.id })
        .eq('related_transaction_id', transactionId)
        .eq('operation_type', 'freeze')
        .is('activation_id', null)

      if (linkFreezeError) {
        console.warn('⚠️ [BUY-SMS-ACTIVATE] Failed to link freeze to activation:', linkFreezeError)
        // Non-critical, ne pas throw
      } else {
        console.log('🔗 [BUY-SMS-ACTIVATE] Freeze operation linked to activation:', activation.id)
      }

    } catch (postFreezeError) {
      // 🚨 ERREUR APRÈS FREEZE → ROLLBACK OBLIGATOIRE
      console.error('🚨 [BUY-SMS-ACTIVATE] Error after freeze, rolling back...')
      
      if (freezeApplied) {
        console.log('🔄 [BUY-SMS-ACTIVATE] Attempting atomic_refund rollback...')
        
        try {
          const { data: rollbackResult, error: rollbackError } = await supabaseClient.rpc('atomic_refund', {
            p_user_id: userId,
            p_activation_id: activation.id,
            p_amount: frozenAmount,
            p_reason: \`Rollback: \${postFreezeError.message}\`
          })

          if (rollbackError) {
            console.error('❌ [BUY-SMS-ACTIVATE] atomic_refund rollback FAILED:', rollbackError)
            // Log critique mais ne pas bloquer la réponse error
          } else if (rollbackResult?.success) {
            console.log('✅ [BUY-SMS-ACTIVATE] Rollback successful:', rollbackResult)
          } else {
            console.error('⚠️ [BUY-SMS-ACTIVATE] atomic_refund returned non-success:', rollbackResult)
          }
        } catch (rollbackException) {
          console.error('❌ [BUY-SMS-ACTIVATE] Rollback exception:', rollbackException)
          // Continue pour retourner l'erreur originale
        }
      }

      // Nettoyer la transaction
      await supabaseClient
        .from('transactions')
        .update({ status: 'failed', description: \`Error: \${postFreezeError.message}\` })
        .eq('id', transactionId)

      // Re-throw l'erreur originale
      throw postFreezeError
    }

    // 6. SUCCESS - Credits stay frozen until SMS received
    console.log('✅ [BUY-SMS-ACTIVATE] Purchase complete - credits frozen until SMS received')
    console.log('✅ [BUY-SMS-ACTIVATE] Success:', {
      id: activation.id,
      phone,
      price
    })

// ===============================================================================
// INSTRUCTIONS D'APPLICATION:
// ===============================================================================
// 
// 1. Ouvrir: supabase/functions/buy-sms-activate-number/index.ts
// 2. Remplacer les lignes 453-520 par le code ci-dessus
// 3. Tester:
//    a. Achat normal → doit fonctionner
//    b. Simuler erreur après freeze (commenter ligne linkError) → doit rollback
//    c. Vérifier logs: doit voir "🔄 Attempting atomic_refund rollback"
// 4. Déployer: npx supabase functions deploy buy-sms-activate-number
// 
// ===============================================================================
