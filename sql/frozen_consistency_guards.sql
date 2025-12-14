-- Guard updates on frozen amounts for activations/rentals to prevent direct clears

-- ACTIVATIONS: block clearing/modifying frozen_amount by session user unless SECURITY DEFINER
DROP TRIGGER IF EXISTS prevent_direct_frozen_clear_activation ON activations;
CREATE OR REPLACE FUNCTION prevent_direct_frozen_clear_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow SECURITY DEFINER / postgres
  IF current_user IS DISTINCT FROM session_user THEN
    RETURN NEW;
  END IF;
  IF session_user = 'postgres' OR current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- If frozen_amount changes, forbid
  IF OLD.frozen_amount IS DISTINCT FROM NEW.frozen_amount THEN
    RAISE EXCEPTION 'Direct update of activation.frozen_amount is forbidden. Use atomic_* functions.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER prevent_direct_frozen_clear_activation
  BEFORE UPDATE ON activations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_direct_frozen_clear_activation();

-- RENTALS: block clearing/modifying frozen_amount by session user unless SECURITY DEFINER
DROP TRIGGER IF EXISTS prevent_direct_frozen_clear_rental ON rentals;
CREATE OR REPLACE FUNCTION prevent_direct_frozen_clear_rental()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow SECURITY DEFINER / postgres
  IF current_user IS DISTINCT FROM session_user THEN
    RETURN NEW;
  END IF;
  IF session_user = 'postgres' OR current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- If frozen_amount changes, forbid
  IF OLD.frozen_amount IS DISTINCT FROM NEW.frozen_amount THEN
    RAISE EXCEPTION 'Direct update of rental.frozen_amount is forbidden. Use atomic_* functions.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER prevent_direct_frozen_clear_rental
  BEFORE UPDATE ON rentals
  FOR EACH ROW
  EXECUTE FUNCTION prevent_direct_frozen_clear_rental();

-- Monitoring helper: list discrepancies
CREATE OR REPLACE VIEW v_frozen_discrepancies AS
SELECT user_id, frozen_balance_user, total_frozen_activations, frozen_discrepancy
FROM v_frozen_balance_health_reconciliation
WHERE frozen_discrepancy != 0;
