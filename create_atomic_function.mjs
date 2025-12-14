import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🚀 CRÉATION: Fonction atomique via migration\n')

// Créer directement la fonction avec une requête SQL brute
const { error } = await sb.rpc('exec', {
  sql: `
CREATE OR REPLACE FUNCTION process_expired_activations()
RETURNS JSON AS $$
DECLARE
  v_activation RECORD;
  v_processed_count INTEGER := 0;
  v_refunded_total DECIMAL := 0;
  v_errors INTEGER := 0;
  v_result JSON;
BEGIN
  -- Parcourir toutes les activations expirées
  FOR v_activation IN
    SELECT id, user_id, price, frozen_amount, order_id, service_code
    FROM activations 
    WHERE status IN ('pending', 'waiting') 
      AND expires_at < NOW()
      AND frozen_amount > 0
    ORDER BY expires_at ASC
    LIMIT 50  -- Traiter par batch
  LOOP
    BEGIN
      -- TRANSACTION ATOMIQUE COMPLÈTE
      -- 1. Lock activation
      UPDATE activations 
      SET 
        status = 'timeout',
        frozen_amount = 0,
        charged = false,
        updated_at = NOW()
      WHERE id = v_activation.id 
        AND status IN ('pending', 'waiting');  -- Double-check
      
      IF NOT FOUND THEN
        -- Déjà traité par un autre processus
        CONTINUE;
      END IF;
      
      -- 2. Libérer frozen_balance utilisateur (Model A)
      UPDATE users
      SET 
        frozen_balance = GREATEST(0, frozen_balance - v_activation.frozen_amount),
        updated_at = NOW()
      WHERE id = v_activation.user_id;
      
      -- 3. Logger l'opération refund
      INSERT INTO balance_operations (
        user_id,
        activation_id,
        operation_type,
        amount,
        balance_before,
        balance_after,
        frozen_before,
        frozen_after,
        reason,
        created_at
      ) 
      SELECT 
        v_activation.user_id,
        v_activation.id,
        'refund',
        v_activation.frozen_amount,
        u.balance,  -- Balance inchangé (Model A)
        u.balance,  -- Balance inchangé (Model A)
        u.frozen_balance + v_activation.frozen_amount,  -- Frozen avant
        u.frozen_balance,  -- Frozen après
        'Automatic refund - timeout',
        NOW()
      FROM users u WHERE u.id = v_activation.user_id;
      
      -- Compter les succès
      v_processed_count := v_processed_count + 1;
      v_refunded_total := v_refunded_total + v_activation.frozen_amount;
        
    EXCEPTION
      WHEN OTHERS THEN
        -- En cas d'erreur, continuer avec les autres
        v_errors := v_errors + 1;
    END;
  END LOOP;
  
  -- Retourner le résumé
  v_result := json_build_object(
    'success', true,
    'processed', v_processed_count,
    'refunded_total', v_refunded_total,
    'errors', v_errors,
    'timestamp', NOW()
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'processed', v_processed_count,
      'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION process_expired_activations() TO service_role, authenticated;
  `
})

if (error) {
  console.error('❌ Erreur création:', error)
  
  // Essai alternatif: créer via CREATE OR REPLACE direct
  console.log('\n🔄 Tentative alternative...')
  
  const queries = [
    // Drop si existe
    "DROP FUNCTION IF EXISTS process_expired_activations() CASCADE;",
    
    // Créer la fonction
    `CREATE FUNCTION process_expired_activations()
     RETURNS JSON 
     LANGUAGE plpgsql 
     AS $func$
     DECLARE
       v_activation RECORD;
       v_count INTEGER := 0;
       v_total DECIMAL := 0;
     BEGIN
       FOR v_activation IN
         SELECT id, user_id, frozen_amount
         FROM activations 
         WHERE status IN ('pending', 'waiting') 
           AND expires_at < NOW()
           AND frozen_amount > 0
         LIMIT 10
       LOOP
         -- Atomic update
         UPDATE activations 
         SET status = 'timeout', frozen_amount = 0, updated_at = NOW()
         WHERE id = v_activation.id;
         
         UPDATE users 
         SET frozen_balance = GREATEST(0, frozen_balance - v_activation.frozen_amount)
         WHERE id = v_activation.user_id;
         
         v_count := v_count + 1;
         v_total := v_total + v_activation.frozen_amount;
       END LOOP;
       
       RETURN json_build_object('processed', v_count, 'refunded', v_total);
     END;
     $func$;`,
     
    // Grant permissions
    "GRANT EXECUTE ON FUNCTION process_expired_activations() TO service_role, authenticated;"
  ]
  
  for (let i = 0; i < queries.length; i++) {
    const { error: queryError } = await sb.rpc('exec', { sql: queries[i] })
    if (queryError) {
      console.error(`❌ Erreur query ${i+1}:`, queryError)
    } else {
      console.log(`✅ Query ${i+1} OK`)
    }
  }
  
} else {
  console.log('✅ Fonction créée!')
}

// Test final
console.log('\n🧪 TEST FINAL...')
const { data: result, error: testError } = await sb.rpc('process_expired_activations')

if (testError) {
  console.error('❌ Test échoué:', testError)
} else {
  console.log('✅ SUCCÈS!')
  console.log('📊 Résultat:', result)
}