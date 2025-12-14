-- Fix du trigger prevent_direct_frozen_amount_update pour autoriser les fonctions SECURITY DEFINER

DROP TRIGGER IF EXISTS prevent_direct_frozen_amount_update ON users;

CREATE OR REPLACE FUNCTION prevent_direct_frozen_amount_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- ✅ Autoriser si la fonction est SECURITY DEFINER (current_user différent de session_user)
  IF current_user IS DISTINCT FROM session_user THEN
    RETURN NEW;
  END IF;

  -- ✅ Autoriser si session_user = postgres
  IF session_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- ✅ Autoriser si current_user = postgres  
  IF current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- ❌ Bloquer les modifications directes de frozen_balance
  IF OLD.frozen_balance IS DISTINCT FROM NEW.frozen_balance THEN
    RAISE EXCEPTION 'Direct update of frozen_balance is forbidden. Use atomic_freeze, atomic_commit, or atomic_refund functions.';
  END IF;

  RETURN NEW;
END;
$$;

-- Recréer le trigger
CREATE TRIGGER prevent_direct_frozen_amount_update
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_direct_frozen_amount_update();
