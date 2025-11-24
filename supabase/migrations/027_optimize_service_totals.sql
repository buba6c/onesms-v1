-- Fonction RPC optimisée pour calculer total_available de tous les services en une seule requête
CREATE OR REPLACE FUNCTION calculate_service_totals()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE services s
  SET total_available = COALESCE(
    (
      SELECT SUM(pr.available_count)
      FROM pricing_rules pr
      WHERE pr.service_code = s.code
        AND pr.active = true
    ),
    0
  )
  WHERE s.active = true;
END;
$$;
