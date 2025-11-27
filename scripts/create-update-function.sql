-- ============================================================================
-- FONCTION HELPER: Mise à jour du stock d'un service
-- ============================================================================
--
-- Cette fonction permet de mettre à jour le stock d'un service
-- même avec les restrictions RLS (Row Level Security)
--
-- Usage: SELECT update_service_stock('wa', 397);
-- ============================================================================

-- Supprimer l'ancienne version si elle existe
DROP FUNCTION IF EXISTS update_service_stock(TEXT, INTEGER);

-- Créer la fonction
CREATE OR REPLACE FUNCTION update_service_stock(
  service_code TEXT,
  new_stock INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  -- Mettre à jour le service
  UPDATE services 
  SET total_available = new_stock
  WHERE code = service_code AND active = true;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  -- Retourner true si au moins une ligne a été affectée
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commenter la fonction
COMMENT ON FUNCTION update_service_stock IS 'Met à jour le stock d''un service (bypass RLS)';

-- ============================================================================
-- TEST DE LA FONCTION
-- ============================================================================

-- Test avec WhatsApp
SELECT update_service_stock('wa', 397);

-- Vérifier le résultat
SELECT code, name, total_available 
FROM services 
WHERE code = 'wa';

RAISE NOTICE '✅ Fonction update_service_stock créée et testée';
