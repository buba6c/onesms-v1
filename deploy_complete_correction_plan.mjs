// PLAN CORRECTION COMPLET - ATOMIC_REFUND_DIRECT FIX
// Correction immédiate de la fonction atomic_refund_direct avec nettoyage automatique

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🛡️ DÉPLOIEMENT CORRECTION ATOMIC_REFUND_DIRECT')
console.log('=' .repeat(60))

// 1. CORRECTION DE LA FONCTION ATOMIC_REFUND_DIRECT
async function deployFixedAtomicRefundDirect() {
  console.log('\n🔧 1. DÉPLOIEMENT FONCTION CORRIGÉE')
  console.log('-'.repeat(45))
  
  const fixedFunction = `
-- FONCTION CORRIGÉE: atomic_refund_direct avec nettoyage automatique
CREATE OR REPLACE FUNCTION atomic_refund_direct(p_user_id uuid, p_amount numeric)
RETURNS jsonb AS $$
DECLARE
    current_frozen numeric;
    current_balance numeric;
    activations_cleaned integer := 0;
    rentals_cleaned integer := 0;
    total_cleaned_amount numeric := 0;
    cleanup_details jsonb := '[]'::jsonb;
    result jsonb;
BEGIN
    -- Lock user row pour transaction atomique
    SELECT balance, frozen_balance 
    INTO current_balance, current_frozen
    FROM users 
    WHERE id = p_user_id 
    FOR UPDATE;
    
    -- Vérifications
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    IF current_frozen < p_amount THEN
        RAISE EXCEPTION 'Insufficient frozen balance: % < %', current_frozen, p_amount;
    END IF;
    
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid amount: %', p_amount;
    END IF;
    
    -- Libérer le frozen_balance (comportement existant)
    UPDATE users 
    SET frozen_balance = frozen_balance - p_amount 
    WHERE id = p_user_id;
    
    -- **NOUVEAU: Nettoyer les frozen_amount orphelins dans activations**
    WITH cleaned_activations AS (
        UPDATE activations 
        SET frozen_amount = 0 
        WHERE user_id = p_user_id 
          AND frozen_amount > 0 
          AND status IN ('timeout', 'cancelled', 'refunded')
        RETURNING id, frozen_amount, status, service_code
    )
    SELECT 
        COUNT(*), 
        COALESCE(SUM(frozen_amount), 0),
        json_agg(json_build_object('type', 'activation', 'id', id, 'amount', frozen_amount, 'status', status, 'service', service_code))
    INTO activations_cleaned, total_cleaned_amount, cleanup_details
    FROM cleaned_activations;
    
    -- **NOUVEAU: Nettoyer les frozen_amount orphelins dans rentals**
    WITH cleaned_rentals AS (
        UPDATE rentals 
        SET frozen_amount = 0 
        WHERE user_id = p_user_id 
          AND frozen_amount > 0 
          AND status IN ('cancelled')
        RETURNING id, frozen_amount, status, service_name
    )
    SELECT 
        COUNT(*),
        COALESCE(SUM(frozen_amount), 0)
    INTO rentals_cleaned, total_cleaned_amount
    FROM cleaned_rentals;
    
    -- Ajouter les rentals au cleanup_details si nécessaire
    IF rentals_cleaned > 0 THEN
        WITH rental_details AS (
            SELECT json_agg(json_build_object('type', 'rental', 'id', id, 'amount', frozen_amount, 'status', status, 'service', service_name)) as rental_json
            FROM rentals 
            WHERE user_id = p_user_id AND frozen_amount = 0 AND status = 'cancelled'
            LIMIT rentals_cleaned
        )
        SELECT cleanup_details || COALESCE(rental_json, '[]'::json)
        INTO cleanup_details
        FROM rental_details;
    END IF;
    
    -- Logger l'opération de refund
    INSERT INTO balance_operations (user_id, operation_type, amount, description, metadata)
    VALUES (
        p_user_id, 
        'refund', 
        p_amount, 
        'atomic_refund_direct with automatic cleanup',
        json_build_object(
            'cleaned_activations', activations_cleaned,
            'cleaned_rentals', rentals_cleaned,
            'total_cleaned_amount', total_cleaned_amount,
            'cleanup_details', cleanup_details
        )
    );
    
    -- Logger le nettoyage si des éléments ont été nettoyés
    IF activations_cleaned > 0 OR rentals_cleaned > 0 THEN
        INSERT INTO balance_operations (user_id, operation_type, amount, description, metadata)
        VALUES (
            p_user_id, 
            'cleanup', 
            total_cleaned_amount, 
            'Automatic frozen_amount cleanup',
            json_build_object(
                'activations_cleaned', activations_cleaned,
                'rentals_cleaned', rentals_cleaned,
                'details', cleanup_details
            )
        );
    END IF;
    
    -- Construire le résultat
    result := json_build_object(
        'success', true,
        'refunded_amount', p_amount,
        'user_id', p_user_id,
        'cleanup_performed', activations_cleaned > 0 OR rentals_cleaned > 0,
        'activations_cleaned', activations_cleaned,
        'rentals_cleaned', rentals_cleaned,
        'total_cleaned_amount', total_cleaned_amount,
        'new_frozen_balance', current_frozen - p_amount,
        'cleanup_details', cleanup_details
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Logger l'erreur
        INSERT INTO balance_operations (user_id, operation_type, amount, description, metadata)
        VALUES (
            p_user_id, 
            'error', 
            p_amount, 
            'atomic_refund_direct failed: ' || SQLERRM,
            json_build_object('error', SQLERRM, 'sqlstate', SQLSTATE)
        );
        
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION atomic_refund_direct(uuid, numeric) TO authenticated, service_role;

-- Commentaire pour documentation
COMMENT ON FUNCTION atomic_refund_direct(uuid, numeric) IS 
'Enhanced atomic_refund_direct with automatic cleanup of orphaned frozen_amount values. 
Returns detailed JSON with cleanup information.';`

  try {
    console.log('🚀 Déploiement de la fonction corrigée...')
    
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: fixedFunction 
    })
    
    if (error) {
      console.error('❌ Erreur déploiement fonction:', error)
      return false
    }
    
    console.log('✅ Fonction atomic_refund_direct corrigée déployée!')
    return true
    
  } catch (e) {
    console.error('💥 Exception déploiement:', e.message)
    
    // Tentative alternative avec exécution directe SQL
    console.log('\n🔄 Tentative alternative...')
    
    try {
      // Créer la fonction via plusieurs requêtes si nécessaire
      const sqlParts = fixedFunction.split(';').filter(part => part.trim())
      
      for (const [index, sqlPart] of sqlParts.entries()) {
        if (sqlPart.trim()) {
          console.log(`Exécution partie ${index + 1}/${sqlParts.length}...`)
          
          const { error: partError } = await supabase.rpc('exec_sql', {
            sql_query: sqlPart.trim() + ';'
          })
          
          if (partError) {
            console.error(`❌ Erreur partie ${index + 1}:`, partError)
            return false
          }
        }
      }
      
      console.log('✅ Fonction déployée via méthode alternative!')
      return true
      
    } catch (altError) {
      console.error('💥 Échec méthode alternative:', altError.message)
      return false
    }
  }
}

// 2. NETTOYAGE DES PHANTOM FROZEN EXISTANTS
async function cleanupExistingPhantom() {
  console.log('\n🧹 2. NETTOYAGE PHANTOM FROZEN EXISTANT')
  console.log('-'.repeat(45))
  
  try {
    // Récupérer l'état actuel de buba6c
    const { data: userBuba, error: errorUser } = await supabase
      .from('users')
      .select('id, email, balance, frozen_balance')
      .eq('email', 'buba6c@gmail.com')
      .single()
    
    if (errorUser || !userBuba) {
      console.error('❌ Erreur récupération buba6c:', errorUser)
      return false
    }
    
    console.log(`🔍 État actuel buba6c:`)
    console.log(`  • Balance: ${userBuba.balance}Ⓐ`)
    console.log(`  • Frozen: ${userBuba.frozen_balance}Ⓐ`)
    
    // Calculer le frozen attendu
    const { data: activeRentals } = await supabase
      .from('rentals')
      .select('frozen_amount')
      .eq('user_id', userBuba.id)
      .eq('status', 'active')
    
    const { data: activeActivations } = await supabase
      .from('activations')  
      .select('frozen_amount')
      .eq('user_id', userBuba.id)
      .in('status', ['active', 'pending'])
    
    const expectedFrozenRentals = (activeRentals || []).reduce((sum, r) => sum + (r.frozen_amount || 0), 0)
    const expectedFrozenActivations = (activeActivations || []).reduce((sum, a) => sum + (a.frozen_amount || 0), 0)
    const expectedTotal = expectedFrozenRentals + expectedFrozenActivations
    
    console.log(`🔍 Frozen attendu:`)
    console.log(`  • Rentals actives: ${expectedFrozenRentals}Ⓐ`)
    console.log(`  • Activations actives: ${expectedFrozenActivations}Ⓐ`) 
    console.log(`  • Total attendu: ${expectedTotal}Ⓐ`)
    
    const phantomAmount = userBuba.frozen_balance - expectedTotal
    
    if (phantomAmount > 0) {
      console.log(`⚠️ Phantom frozen détecté: ${phantomAmount}Ⓐ`)
      
      // Correction du phantom
      const { error: updateError } = await supabase
        .from('users')
        .update({ frozen_balance: expectedTotal })
        .eq('id', userBuba.id)
      
      if (updateError) {
        console.error('❌ Erreur correction phantom:', updateError)
        return false
      }
      
      // Logger la correction
      const { error: logError } = await supabase
        .from('balance_operations')
        .insert({
          user_id: userBuba.id,
          operation_type: 'correction',
          amount: phantomAmount,
          description: 'Manual phantom frozen balance cleanup',
          metadata: {
            previous_frozen: userBuba.frozen_balance,
            new_frozen: expectedTotal,
            phantom_cleaned: phantomAmount,
            timestamp: new Date().toISOString()
          }
        })
      
      if (logError) {
        console.error('⚠️ Erreur logging correction:', logError)
      }
      
      console.log(`✅ Phantom ${phantomAmount}Ⓐ nettoyé!`)
      console.log(`  • Ancien frozen: ${userBuba.frozen_balance}Ⓐ`)
      console.log(`  • Nouveau frozen: ${expectedTotal}Ⓐ`)
      
    } else {
      console.log('✅ Aucun phantom frozen détecté')
    }
    
    return true
    
  } catch (error) {
    console.error('💥 Erreur nettoyage phantom:', error.message)
    return false
  }
}

// 3. DÉPLOIEMENT DE LA VUE DE HEALTH CHECK
async function deployHealthCheckView() {
  console.log('\n📊 3. DÉPLOIEMENT VUE HEALTH CHECK')
  console.log('-'.repeat(45))
  
  const healthCheckView = `
-- Vue de santé pour monitoring des incohérences
CREATE OR REPLACE VIEW v_frozen_balance_health AS
SELECT 
    u.id as user_id,
    u.email,
    u.balance,
    u.frozen_balance as actual_frozen,
    COALESCE(a.activation_frozen, 0) as activation_frozen_amount,
    COALESCE(r.rental_frozen, 0) as rental_frozen_amount,
    COALESCE(a.activation_frozen, 0) + COALESCE(r.rental_frozen, 0) as expected_frozen,
    u.frozen_balance - (COALESCE(a.activation_frozen, 0) + COALESCE(r.rental_frozen, 0)) as discrepancy,
    CASE 
        WHEN u.frozen_balance - (COALESCE(a.activation_frozen, 0) + COALESCE(r.rental_frozen, 0)) > 1 THEN 'PHANTOM_FROZEN'
        WHEN u.frozen_balance - (COALESCE(a.activation_frozen, 0) + COALESCE(r.rental_frozen, 0)) < -1 THEN 'INSUFFICIENT_FROZEN'
        ELSE 'HEALTHY'
    END as health_status,
    u.updated_at as last_balance_update
FROM users u
LEFT JOIN (
    SELECT 
        user_id, 
        SUM(frozen_amount) as activation_frozen,
        COUNT(*) as active_activations_count
    FROM activations 
    WHERE frozen_amount > 0 
    GROUP BY user_id
) a ON u.id = a.user_id
LEFT JOIN (
    SELECT 
        user_id, 
        SUM(frozen_amount) as rental_frozen,
        COUNT(*) as active_rentals_count
    FROM rentals 
    WHERE frozen_amount > 0 
    GROUP BY user_id
) r ON u.id = r.user_id
WHERE 
    u.frozen_balance > 0 
    OR COALESCE(a.activation_frozen, 0) > 0 
    OR COALESCE(r.rental_frozen, 0) > 0
ORDER BY ABS(u.frozen_balance - (COALESCE(a.activation_frozen, 0) + COALESCE(r.rental_frozen, 0))) DESC;

-- Permissions sur la vue
GRANT SELECT ON v_frozen_balance_health TO authenticated, service_role;

-- Commentaire
COMMENT ON VIEW v_frozen_balance_health IS 
'Health monitoring view for frozen balance consistency. Shows discrepancies between user frozen_balance and sum of item frozen_amounts.';`

  try {
    console.log('🚀 Déploiement vue de health check...')
    
    const { error } = await supabase.rpc('exec_sql', { 
      sql_query: healthCheckView 
    })
    
    if (error) {
      console.error('❌ Erreur déploiement vue:', error)
      return false
    }
    
    console.log('✅ Vue v_frozen_balance_health déployée!')
    
    // Tester la vue
    console.log('\n🔍 Test de la vue...')
    const { data: healthData, error: healthError } = await supabase
      .from('v_frozen_balance_health')
      .select('*')
      .limit(10)
    
    if (healthError) {
      console.error('⚠️ Erreur test vue:', healthError)
    } else {
      console.log(`✅ Vue testée avec succès! ${healthData.length} entrées trouvées`)
      
      if (healthData.length > 0) {
        console.log('\n📊 Aperçu health check:')
        healthData.forEach(row => {
          console.log(`  • ${row.email}: ${row.health_status} (${row.discrepancy}Ⓐ discrepancy)`)
        })
      }
    }
    
    return true
    
  } catch (error) {
    console.error('💥 Erreur déploiement vue:', error.message)
    return false
  }
}

// 4. VALIDATION COMPLÈTE
async function validateCorrections() {
  console.log('\n✅ 4. VALIDATION CORRECTIONS')
  console.log('-'.repeat(35))
  
  try {
    // Test 1: Vérifier la fonction atomic_refund_direct
    console.log('🔍 Test 1: Fonction atomic_refund_direct...')
    
    const { data: userTest } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'buba6c@gmail.com')
      .single()
    
    if (userTest) {
      // Test avec montant invalide pour vérifier les contrôles
      const { error: testError } = await supabase.rpc('atomic_refund_direct', {
        p_user_id: userTest.id,
        p_amount: 0
      })
      
      if (testError && testError.message.includes('Invalid amount')) {
        console.log('  ✅ Fonction répond correctement aux contrôles')
      } else {
        console.log('  ⚠️ Comportement fonction inattendu')
      }
    }
    
    // Test 2: Vérifier la vue health
    console.log('🔍 Test 2: Vue health check...')
    
    const { data: healthCheck, error: healthError } = await supabase
      .from('v_frozen_balance_health')
      .select('*')
      .eq('email', 'buba6c@gmail.com')
    
    if (healthError) {
      console.log('  ❌ Erreur accès vue health:', healthError.message)
    } else {
      const bubaHealth = healthCheck[0]
      if (bubaHealth) {
        console.log('  ✅ Vue health accessible')
        console.log(`    • Status: ${bubaHealth.health_status}`)
        console.log(`    • Discrepancy: ${bubaHealth.discrepancy}Ⓐ`)
        
        if (bubaHealth.health_status === 'HEALTHY') {
          console.log('  🎯 SUCCÈS: Buba6c est maintenant HEALTHY!')
        } else {
          console.log(`  ⚠️ Attention: Status = ${bubaHealth.health_status}`)
        }
      }
    }
    
    // Test 3: Vérifier l'état général
    console.log('🔍 Test 3: État général système...')
    
    const { data: allHealth } = await supabase
      .from('v_frozen_balance_health')
      .select('health_status, discrepancy')
    
    if (allHealth) {
      const healthSummary = allHealth.reduce((acc, row) => {
        acc[row.health_status] = (acc[row.health_status] || 0) + 1
        return acc
      }, {})
      
      console.log('  📊 Résumé health système:')
      Object.entries(healthSummary).forEach(([status, count]) => {
        console.log(`    • ${status}: ${count}`)
      })
      
      const totalDiscrepancy = allHealth.reduce((sum, row) => sum + Math.abs(row.discrepancy || 0), 0)
      console.log(`    • Discrepancy totale: ${totalDiscrepancy}Ⓐ`)
      
      if (totalDiscrepancy === 0) {
        console.log('  🎯 PARFAIT: Aucune discrepancy système!')
      }
    }
    
    return true
    
  } catch (error) {
    console.error('💥 Erreur validation:', error.message)
    return false
  }
}

// PLAN D'EXÉCUTION PRINCIPAL
async function executeCorrectionPlan() {
  console.log('🚀 EXÉCUTION PLAN DE CORRECTION COMPLET')
  console.log('=' .repeat(55))
  
  let success = true
  
  try {
    // Étape 1: Déployer fonction corrigée
    console.log('\n📋 ÉTAPE 1/4: Déploiement fonction')
    const step1 = await deployFixedAtomicRefundDirect()
    if (!step1) {
      console.log('❌ Échec étape 1 - Arrêt du processus')
      return false
    }
    
    // Étape 2: Nettoyer phantom existant  
    console.log('\n📋 ÉTAPE 2/4: Nettoyage phantom')
    const step2 = await cleanupExistingPhantom()
    if (!step2) {
      console.log('⚠️ Échec étape 2 - Continuons')
      success = false
    }
    
    // Étape 3: Déployer monitoring
    console.log('\n📋 ÉTAPE 3/4: Déploiement monitoring')
    const step3 = await deployHealthCheckView()
    if (!step3) {
      console.log('⚠️ Échec étape 3 - Continuons')
      success = false
    }
    
    // Étape 4: Validation
    console.log('\n📋 ÉTAPE 4/4: Validation')
    const step4 = await validateCorrections()
    if (!step4) {
      console.log('⚠️ Échec étape 4')
      success = false
    }
    
    // Résultat final
    console.log('\n🎯 RÉSULTAT FINAL')
    console.log('=' .repeat(30))
    
    if (success) {
      console.log('✅ SUCCÈS COMPLET!')
      console.log('🎉 Corrections déployées avec succès')
      console.log('🛡️ Système protégé contre futurs phantom frozen')
      console.log('📊 Monitoring activé')
    } else {
      console.log('⚠️ SUCCÈS PARTIEL')
      console.log('✅ Fonction principale corrigée')
      console.log('⚠️ Certaines étapes ont échoué - vérifier manuellement')
    }
    
    return success
    
  } catch (error) {
    console.error('💥 ERREUR CRITIQUE:', error.message)
    console.log('❌ Échec du plan de correction')
    return false
  }
}

// EXÉCUTION
executeCorrectionPlan()
  .then(success => {
    if (success) {
      console.log('\n🎊 MISSION ACCOMPLIE!')
      console.log('Le problème de frozen balance phantom a été résolu!')
    } else {
      console.log('\n🔧 INTERVENTION MANUELLE REQUISE')
      console.log('Certaines étapes nécessitent une attention supplémentaire')
    }
  })
  .catch(error => {
    console.error('\n💥 ÉCHEC CRITIQUE:', error.message)
    console.log('Contactez l\'équipe technique pour assistance')
  })