-- ============================================================================
-- MIGRATION URGENTE : Créer la table wave_payment_proofs
-- ============================================================================
-- À COPIER-COLLER DANS LE SQL EDITOR DE SUPABASE
-- URL: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql/new
-- ============================================================================

-- Créer la table
CREATE TABLE IF NOT EXISTS public.wave_payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  activations INTEGER NOT NULL,
  proof_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected')),
  rejection_reason TEXT,
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS wave_payment_proofs_user_id_idx ON public.wave_payment_proofs(user_id);
CREATE INDEX IF NOT EXISTS wave_payment_proofs_status_idx ON public.wave_payment_proofs(status);
CREATE INDEX IF NOT EXISTS wave_payment_proofs_created_at_idx ON public.wave_payment_proofs(created_at DESC);

-- RLS
ALTER TABLE public.wave_payment_proofs ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres preuves
CREATE POLICY "Users can view own proofs"
ON public.wave_payment_proofs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent créer leurs propres preuves
CREATE POLICY "Users can create own proofs"
ON public.wave_payment_proofs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Seul le service role peut UPDATE/DELETE
CREATE POLICY "Service role full access"
ON public.wave_payment_proofs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_wave_payment_proofs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wave_payment_proofs_updated_at
BEFORE UPDATE ON public.wave_payment_proofs
FOR EACH ROW
EXECUTE FUNCTION update_wave_payment_proofs_updated_at();

-- Vérification
SELECT 'Table wave_payment_proofs créée avec succès!' as status;
