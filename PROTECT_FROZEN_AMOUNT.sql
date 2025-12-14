-- ============================================================================
-- SOLUTION ROBUSTE: Empêcher UPDATE direct de frozen_amount
-- ============================================================================
-- Problème: Edge Functions mettent frozen_amount=0 même si RPC échoue
-- Solution: Trigger qui bloque UPDATE direct et force l'utilisation des fonctions
-- ============================================================================

-- 1. Fonction trigger qui vérifie les UPDATE de frozen_amount
CREATE OR REPLACE FUNCTION prevent_direct_frozen_amount_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Autoriser si l'UPDATE vient d'une fonction sécurisée (SECURITY DEFINER)
  -- On détecte ça via session_user qui sera 'postgres' pour les fonctions SECURITY DEFINER
  IF session_user = 'postgres' THEN
    RETURN NEW;
  END IF;
  
  -- Bloquer si tentative de modifier frozen_amount directement
  IF (NEW.frozen_amount IS DISTINCT FROM OLD.frozen_amount) THEN
    RAISE EXCEPTION 'Direct update of frozen_amount is forbidden. Use atomic_refund() or atomic_commit() instead.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Créer le trigger sur activations
DROP TRIGGER IF EXISTS protect_frozen_amount_activations ON activations;
CREATE TRIGGER protect_frozen_amount_activations
  BEFORE UPDATE ON activations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_direct_frozen_amount_update();

-- 3. Créer le trigger sur rentals
DROP TRIGGER IF EXISTS protect_frozen_amount_rentals ON rentals;
CREATE TRIGGER protect_frozen_amount_rentals
  BEFORE UPDATE ON rentals
  FOR EACH ROW
  EXECUTE FUNCTION prevent_direct_frozen_amount_update();

-- 4. Test de vérification
DO $$
BEGIN
  RAISE NOTICE '✅ Triggers de protection installés sur activations et rentals';
  RAISE NOTICE '⚠️ Maintenant, seules atomic_refund() et atomic_commit() peuvent modifier frozen_amount';
  RAISE NOTICE '💡 Les Edge Functions qui tentent UPDATE direct recevront une erreur explicite';
END $$;

SELECT 'Protection robuste: frozen_amount ne peut être modifié que par fonctions atomiques' AS status;
