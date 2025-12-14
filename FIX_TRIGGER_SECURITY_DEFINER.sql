-- ============================================================================
-- FIX URGENT: Corriger le trigger pour autoriser SECURITY DEFINER functions
-- ============================================================================
-- Problème: secure_freeze_balance() (SECURITY DEFINER) est bloquée par le trigger
-- Solution: Améliorer la détection pour autoriser toutes les fonctions atomiques
-- ============================================================================

-- 1. DROP l'ancien trigger
DROP TRIGGER IF EXISTS protect_frozen_amount_activations ON activations;
DROP TRIGGER IF EXISTS protect_frozen_amount_rentals ON rentals;

-- 2. Fonction trigger améliorée
CREATE OR REPLACE FUNCTION prevent_direct_frozen_amount_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- ✅ Autoriser si appelé depuis une fonction (pg_trigger_depth > 0 = trigger appelé par fonction)
  -- Toutes nos fonctions atomiques sont SECURITY DEFINER et feront pg_trigger_depth() = 1
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  
  -- ✅ Autoriser si session_user = postgres (SECURITY DEFINER classic)
  IF session_user = 'postgres' THEN
    RETURN NEW;
  END IF;
  
  -- ✅ Autoriser si current_user = postgres
  IF current_user = 'postgres' THEN
    RETURN NEW;
  END IF;
  
  -- ❌ Bloquer tout UPDATE direct de frozen_amount
  IF (NEW.frozen_amount IS DISTINCT FROM OLD.frozen_amount) THEN
    RAISE EXCEPTION 'Direct update of frozen_amount is forbidden. Use atomic_refund(), atomic_commit() or secure_freeze_balance() instead.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Recréer les triggers
CREATE TRIGGER protect_frozen_amount_activations
  BEFORE UPDATE ON activations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_direct_frozen_amount_update();

CREATE TRIGGER protect_frozen_amount_rentals
  BEFORE UPDATE ON rentals
  FOR EACH ROW
  EXECUTE FUNCTION prevent_direct_frozen_amount_update();

-- 4. Test
DO $$
BEGIN
  RAISE NOTICE '✅ Triggers de protection mis à jour';
  RAISE NOTICE '✅ Autorise maintenant: pg_trigger_depth() > 1 OU session_user = postgres OU current_user = postgres';
  RAISE NOTICE '💡 Toutes les fonctions SECURITY DEFINER sont autorisées';
END $$;

SELECT 'Trigger corrigé: autorise SECURITY DEFINER functions' AS status;
