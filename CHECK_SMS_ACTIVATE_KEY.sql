-- Check current SMS-Activate API key
SELECT key, 
       LEFT(value, 10) || '...' as value_preview,
       LENGTH(value) as key_length,
       description,
       updated_at
FROM system_settings 
WHERE key = 'sms_activate_api_key';
