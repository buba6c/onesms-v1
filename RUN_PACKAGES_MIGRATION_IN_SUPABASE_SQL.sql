-- Exécuter ce script dans l'éditeur SQL de Supabase Dashboard
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

-- Créer la table activation_packages
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(activations)
);

-- Insérer les packages par défaut
INSERT INTO public.activation_packages (activations, price_xof, price_eur, price_usd, is_popular, savings_percentage, display_order) VALUES
(5, 2000, 2.99, 3.29, false, 0, 1),
(10, 3500, 4.99, 5.49, true, 10, 2),
(20, 6000, 8.99, 9.89, false, 15, 3),
(50, 13000, 19.99, 21.99, false, 20, 4),
(100, 23000, 34.99, 38.49, false, 25, 5),
(200, 40000, 59.99, 65.99, false, 30, 6)
ON CONFLICT (activations) DO NOTHING;

-- Enable RLS
ALTER TABLE public.activation_packages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active packages" ON public.activation_packages;
DROP POLICY IF EXISTS "Admins can insert packages" ON public.activation_packages;
DROP POLICY IF EXISTS "Admins can update packages" ON public.activation_packages;
DROP POLICY IF EXISTS "Admins can delete packages" ON public.activation_packages;

-- Public can view active packages
CREATE POLICY "Anyone can view active packages" ON public.activation_packages
    FOR SELECT USING (is_active = true);

-- Admins can manage packages
CREATE POLICY "Admins can insert packages" ON public.activation_packages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update packages" ON public.activation_packages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete packages" ON public.activation_packages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_activation_packages_order ON public.activation_packages(display_order);
CREATE INDEX IF NOT EXISTS idx_activation_packages_active ON public.activation_packages(is_active);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_activation_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_activation_packages_updated_at ON public.activation_packages;
CREATE TRIGGER trigger_update_activation_packages_updated_at
    BEFORE UPDATE ON public.activation_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_activation_packages_updated_at();

-- Success message
SELECT 'Migration activation_packages terminée avec succès!' as message;
