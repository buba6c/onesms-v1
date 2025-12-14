-- =====================================================
-- FIX PACKAGES TABLE - Corriger l'erreur 400
-- Exécuter dans Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Vérifier si la table existe, sinon la créer
CREATE TABLE IF NOT EXISTS public.activation_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activations INTEGER NOT NULL,
    price_xof DECIMAL(10, 2) NOT NULL,
    price_eur DECIMAL(10, 2) NOT NULL,
    price_usd DECIMAL(10, 2) NOT NULL,
    is_popular BOOLEAN DEFAULT false,
    savings_percentage INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. S'assurer que RLS est activé
ALTER TABLE public.activation_packages ENABLE ROW LEVEL SECURITY;

-- 3. SUPPRIMER toutes les anciennes policies
DROP POLICY IF EXISTS "Anyone can view active packages" ON public.activation_packages;
DROP POLICY IF EXISTS "Admins can insert packages" ON public.activation_packages;
DROP POLICY IF EXISTS "Admins can update packages" ON public.activation_packages;
DROP POLICY IF EXISTS "Admins can delete packages" ON public.activation_packages;
DROP POLICY IF EXISTS "Public read access" ON public.activation_packages;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.activation_packages;

-- 4. Créer une policy SIMPLE pour lecture publique (IMPORTANT!)
CREATE POLICY "Public read access" ON public.activation_packages
    FOR SELECT 
    TO public
    USING (true);  -- Tout le monde peut lire TOUS les packages

-- 5. Policies admin pour modifications
CREATE POLICY "Admin full access" ON public.activation_packages
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 6. Insérer les packages par défaut si la table est vide
INSERT INTO public.activation_packages (activations, price_xof, price_eur, price_usd, is_popular, savings_percentage, display_order, is_active)
SELECT * FROM (VALUES
    (5, 2000, 2.99, 3.29, false, 0, 1, true),
    (10, 3500, 4.99, 5.49, false, 10, 2, true),
    (20, 6000, 8.99, 9.89, true, 15, 3, true),  -- POPULAIRE (au milieu)
    (50, 13000, 19.99, 21.99, false, 20, 4, true),
    (100, 23000, 34.99, 38.49, false, 25, 5, true)
) AS v(activations, price_xof, price_eur, price_usd, is_popular, savings_percentage, display_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.activation_packages LIMIT 1);

-- 7. Vérifier les données
SELECT 
    id,
    activations,
    price_xof,
    is_popular,
    is_active,
    display_order
FROM public.activation_packages
ORDER BY display_order;

-- 8. Test: Vérifier que la lecture fonctionne
SELECT COUNT(*) as total_packages FROM public.activation_packages WHERE is_active = true;
