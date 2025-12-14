-- Guard to prevent silent balance/frozen updates without a ledger entry

CREATE OR REPLACE FUNCTION ensure_user_balance_ledger()
RETURNS trigger AS $$
BEGIN
  -- Only check when balance or frozen_balance actually change
  IF (NEW.balance IS DISTINCT FROM OLD.balance OR NEW.frozen_balance IS DISTINCT FROM OLD.frozen_balance) THEN
    -- Require a matching balance_operations row in the same transaction window
    IF NOT EXISTS (
      SELECT 1
      FROM balance_operations bo
      WHERE bo.user_id = NEW.id
        AND bo.balance_after = NEW.balance
        AND bo.frozen_after = NEW.frozen_balance
        AND bo.created_at >= now() - interval '5 seconds'
    ) THEN
      RAISE EXCEPTION 'Balance/frozen update requires balance_operations entry (users_balance_guard)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_balance_ledger ON users;
CREATE TRIGGER enforce_balance_ledger
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION ensure_user_balance_ledger();

COMMENT ON FUNCTION ensure_user_balance_ledger() IS 'Blocks balance/frozen changes on users unless a matching balance_operations row exists (within 5s window).';