-- =====================================================
-- SETUP BRANDING STORAGE BUCKET
-- Exécuter ce script dans Supabase SQL Editor
-- =====================================================

-- 1. Créer le bucket public-assets pour les logos et favicons
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets',
  'public-assets',
  true,  -- Public bucket
  2097152,  -- 2MB max file size
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/x-icon', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/x-icon', 'image/gif'];

-- 2. Politique de lecture publique pour tous
CREATE POLICY IF NOT EXISTS "Public Access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'public-assets');

-- Alternative si la politique existe déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Public Access for public-assets'
  ) THEN
    CREATE POLICY "Public Access for public-assets" ON storage.objects
      FOR SELECT
      USING (bucket_id = 'public-assets');
  END IF;
END $$;

-- 3. Politique d'upload pour les admins authentifiés
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Admin Upload for public-assets'
  ) THEN
    CREATE POLICY "Admin Upload for public-assets" ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'public-assets' 
        AND auth.role() = 'authenticated'
        AND EXISTS (
          SELECT 1 FROM public.users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      );
  END IF;
END $$;

-- 4. Politique de suppression pour les admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Admin Delete for public-assets'
  ) THEN
    CREATE POLICY "Admin Delete for public-assets" ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'public-assets' 
        AND auth.role() = 'authenticated'
        AND EXISTS (
          SELECT 1 FROM public.users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      );
  END IF;
END $$;

-- 5. Ajouter les paramètres de branding dans system_settings
INSERT INTO public.system_settings (key, value, category, description)
VALUES 
  ('app_logo_url', '', 'branding', 'URL du logo du site'),
  ('app_favicon_url', '', 'branding', 'URL du favicon'),
  ('app_primary_color', '#3B82F6', 'branding', 'Couleur primaire du site'),
  ('app_secondary_color', '#06B6D4', 'branding', 'Couleur secondaire'),
  ('app_accent_color', '#8B5CF6', 'branding', 'Couleur d''accent')
ON CONFLICT (key) DO NOTHING;

-- Vérification
SELECT 'Bucket créé:' as status, id, name, public FROM storage.buckets WHERE id = 'public-assets';
SELECT 'Paramètres branding:' as status, key, value FROM public.system_settings WHERE category = 'branding';
