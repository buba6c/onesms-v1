-- Monitoring function for frozen discrepancies; schedule via Supabase cron

CREATE OR REPLACE FUNCTION check_frozen_discrepancies()
RETURNS TABLE(
  user_id uuid,
  frozen_balance_user numeric,
  total_frozen_activations numeric,
  frozen_discrepancy numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT user_id, frozen_balance_user, total_frozen_activations, frozen_discrepancy
  FROM v_frozen_balance_health_reconciliation
  WHERE frozen_discrepancy != 0
  ORDER BY ABS(frozen_discrepancy) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_frozen_discrepancies() IS 'Returns users with frozen discrepancies; schedule SELECT * FROM check_frozen_discrepancies() as cron.';
