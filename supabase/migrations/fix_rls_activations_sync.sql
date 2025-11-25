-- Fix RLS pour permettre insertions activations + synchronisation SMS

-- 1. DÉSACTIVER RLS temporairement pour debug
ALTER TABLE activations DISABLE ROW LEVEL SECURITY;

-- 2. OU créer les bonnes policies (RECOMMANDÉ)
-- Supprimer anciennes policies
DROP POLICY IF EXISTS "Users can view their own activations" ON activations;
DROP POLICY IF EXISTS "Users can insert their own activations" ON activations;
DROP POLICY IF EXISTS "Users can update their own activations" ON activations;
DROP POLICY IF EXISTS "Service role can do everything" ON activations;

-- Réactiver RLS
ALTER TABLE activations ENABLE ROW LEVEL SECURITY;

-- Policy: Service role peut tout faire (pour les Edge Functions)
CREATE POLICY "Service role full access" ON activations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Utilisateurs peuvent voir leurs propres activations
CREATE POLICY "Users view own activations" ON activations
  FOR SELECT
  TO authenticated, anon
  USING (user_id = auth.uid() OR user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy: Utilisateurs peuvent insérer leurs propres activations
CREATE POLICY "Users insert own activations" ON activations
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (user_id = auth.uid() OR user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy: Utilisateurs peuvent update leurs propres activations
CREATE POLICY "Users update own activations" ON activations
  FOR UPDATE
  TO authenticated, anon
  USING (user_id = auth.uid() OR user_id::text = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (user_id = auth.uid() OR user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- 3. Vérifier les colonnes manquantes
ALTER TABLE activations 
  ADD COLUMN IF NOT EXISTS external_id TEXT;

ALTER TABLE activations
  ADD COLUMN IF NOT EXISTS charged BOOLEAN DEFAULT FALSE;

-- 4. Créer index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_activations_user_status 
  ON activations(user_id, status) 
  WHERE status IN ('pending', 'waiting', 'received');

CREATE INDEX IF NOT EXISTS idx_activations_order_id 
  ON activations(order_id);

-- 5. Activer Realtime pour synchronisation automatique
ALTER PUBLICATION supabase_realtime ADD TABLE activations;

-- Vérification
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'activations';
