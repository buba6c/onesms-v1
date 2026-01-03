-- ============================================
-- GRIZZLY SMS & TEXTVERIFIED SETTINGS (ROBUST)
-- ============================================

-- 1. Ensure Table Exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_settings') THEN
        CREATE TABLE public.system_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            key VARCHAR(255) UNIQUE NOT NULL,
            value TEXT,
            is_encrypted BOOLEAN DEFAULT false,
            category VARCHAR(100),
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- 2. Ensure 'type' Column Exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'system_settings' AND column_name = 'type') THEN
        ALTER TABLE public.system_settings ADD COLUMN "type" VARCHAR(50) DEFAULT 'string';
    END IF;
END $$;

-- 3. Insert Settings
INSERT INTO public.system_settings (key, value, description, category, type)
VALUES 
    ('grizzly_api_key', '', 'API Key for Grizzly SMS provider', 'provider', 'secret'),
    ('textverified_api_key', '', 'API Key from TextVerified dashboard', 'provider', 'secret'),
    ('textverified_api_username', '', 'Account email (username) for TextVerified auth', 'provider', 'string')
ON CONFLICT (key) DO NOTHING;

-- 4. Update Priority (Smart Update)
DO $$
DECLARE
    current_val TEXT;
BEGIN
    SELECT value INTO current_val FROM public.system_settings WHERE key = 'provider_priority';
    
    IF current_val IS NOT NULL AND current_val NOT LIKE '%grizzly%' THEN
        UPDATE public.system_settings
        SET value = '["textverified", "grizzly", "5sim", "sms-activate", "smspva", "onlinesim"]'
        WHERE key = 'provider_priority';
    END IF;
END $$;
