-- Create a generic API cache table to prevent rate limiting
CREATE TABLE IF NOT EXISTS public.api_cache (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Enable RLS (though functions bypass it usually, good practice)
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON public.api_cache
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users read-only access (optional, if frontend needs it directly)
-- For now, we only access it via Edge Functions (service_role) so no other policies needed strictly.
