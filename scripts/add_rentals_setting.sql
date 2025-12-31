
-- Insert the rentals_enabled setting if it doesn't exist
INSERT INTO public.system_settings (key, value, category, description)
SELECT 'rentals_enabled', 'true', 'features', 'Enable or disable the Rentals (Location) feature globally'
WHERE NOT EXISTS (
    SELECT 1 FROM public.system_settings WHERE key = 'rentals_enabled'
);

-- Ensure RLS allows reading this setting (assuming public/authenticated need read access to features)
-- Usually system_settings might be restricted, but 'features' category should be readable.
-- If you have strict RLS, you might need a policy. For now, assuming existing read policy covers it or we use RPC/admin.
-- Actually, let's make sure we can read it.
