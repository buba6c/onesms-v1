-- ============================================================================
-- FIX: Permettre les INSERT dans activations via service_role
-- ============================================================================
-- Problème: La policy "Service role can manage activations" ne fonctionne pas
-- car auth.jwt()->>'role' ne retourne pas 'service_role' dans les Edge Functions
--
-- Solution: Utiliser auth.role() au lieu de auth.jwt()->>'role'
-- ============================================================================

-- Supprimer l'ancienne policy
DROP POLICY IF EXISTS "Service role can manage activations" ON activations;

-- Créer une nouvelle policy qui fonctionne correctement
CREATE POLICY "Service role can manage activations"
  ON activations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Alternative : Ajouter une policy spécifique pour INSERT
CREATE POLICY "Authenticated users can insert activations"
  ON activations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Ajouter une policy pour UPDATE par service_role
CREATE POLICY "Service role can update activations"
  ON activations FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Service role can manage activations" ON activations IS 
'Permet aux Edge Functions (service_role) de gérer les activations';

COMMENT ON POLICY "Authenticated users can insert activations" ON activations IS 
'Permet aux utilisateurs authentifiés de créer leurs propres activations';
