-- 1. Check if keys exist (Diagnostic)
SELECT key, value FROM system_settings WHERE key IN ('textverified_api_key', 'textverified_api_username');

-- 2. Force Global Provider Mode to 'textverified'
UPDATE system_settings
SET value = 'textverified'
WHERE key = 'sms_provider_mode';

-- 3. Ensure 'textverified' is a valid option if not present (Optional safety)
INSERT INTO system_settings (key, value, category, type, description)
VALUES ('sms_provider_mode', 'textverified', 'sms_provider', 'string', 'Active SMS Provider')
ON CONFLICT (key) DO UPDATE SET value = 'textverified';

-- 4. Verify result
SELECT * FROM system_settings WHERE key = 'sms_provider_mode';
