-- 1. Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.api_cache (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Enable RLS
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;

-- 2. SAFELY Handle Policy (Drop if exists, then create)
DROP POLICY IF EXISTS "Service role full access" ON public.api_cache;

CREATE POLICY "Service role full access" ON public.api_cache
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Insert FALLBACK data for 'onlinesim_rent_countries'
INSERT INTO public.api_cache (key, value, expires_at)
VALUES (
    'onlinesim_rent_countries',
    '{
      "success": true,
      "countries": [
        {"id": 7, "code": "7", "name": "Russia", "available": true},
        {"id": 380, "code": "380", "name": "Ukraine", "available": true},
        {"id": 44, "code": "44", "name": "United Kingdom", "available": true},
        {"id": 48, "code": "48", "name": "Poland", "available": true},
        {"id": 33, "code": "33", "name": "France", "available": true},
        {"id": 49, "code": "49", "name": "Germany", "available": true},
        {"id": 1, "code": "1", "name": "USA", "available": true},
        {"id": 31, "code": "31", "name": "Netherlands", "available": true},
        {"id": 371, "code": "371", "name": "Latvia", "available": true},
        {"id": 77, "code": "77", "name": "Kazakhstan", "available": true},
        {"id": 370, "code": "370", "name": "Lithuania", "available": true},
        {"id": 62, "code": "62", "name": "Indonesia", "available": true},
        {"id": 63, "code": "63", "name": "Philippines", "available": true},
        {"id": 66, "code": "66", "name": "Thailand", "available": true},
        {"id": 84, "code": "84", "name": "Vietnam", "available": true}
      ]
    }'::jsonb,
    NOW() + INTERVAL '24 hours'
)
ON CONFLICT (key) DO UPDATE
SET 
    value = EXCLUDED.value,
    expires_at = EXCLUDED.expires_at;
