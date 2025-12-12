-- ============================================================================
-- FIX URGENCE : Permettre aux admins de voir les preuves Wave
-- ============================================================================
-- À EXÉCUTER DANS LE SQL EDITOR
-- URL: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql/new
-- ============================================================================

-- Ajouter une policy pour que les admins voient toutes les preuves
CREATE POLICY "Admins can view all wave proofs"
ON public.wave_payment_proofs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Permettre aux admins de mettre à jour les preuves (validation/rejet)
CREATE POLICY "Admins can update wave proofs"
ON public.wave_payment_proofs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Vérifier les policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'wave_payment_proofs'
ORDER BY policyname;
