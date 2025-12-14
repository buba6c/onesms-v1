-- ============================================================================
-- ALTER TABLE RENTALS - Ajouter les colonnes manquantes
-- ============================================================================
-- Exécutez ce script dans Supabase Dashboard > SQL Editor
-- ============================================================================

-- Ajouter les colonnes manquantes à la table rentals
ALTER TABLE public.rentals 
ADD COLUMN IF NOT EXISTS service TEXT,
ADD COLUMN IF NOT EXISTS service_name TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS sms_messages JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Créer des index pour les nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_rentals_service ON public.rentals(service);
CREATE INDEX IF NOT EXISTS idx_rentals_country ON public.rentals(country);
CREATE INDEX IF NOT EXISTS idx_rentals_phone ON public.rentals(phone);

-- Vérifier la structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'rentals'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Message de succès
SELECT '✅ Colonnes ajoutées avec succès!' as message;
