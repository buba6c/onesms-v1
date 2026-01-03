-- Enable public read access to system_settings
-- This is critical for Maintenance Mode to work for unauthenticated users

-- 1. Enable RLS (just in case)
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policy if any (to avoid conflicts)
DROP POLICY IF EXISTS "Enable read access for all users" ON system_settings;
DROP POLICY IF EXISTS "Public Read Access" ON system_settings;

-- 3. Create permissive read policy for ANON and AUTHENTICATED
CREATE POLICY "Public Read Access"
ON system_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- 4. Verify it worked
SELECT count(*) FROM pg_policies WHERE tablename = 'system_settings';
