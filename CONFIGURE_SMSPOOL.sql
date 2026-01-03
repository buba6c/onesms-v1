INSERT INTO system_settings (key, value, description, category, is_secret, label)
VALUES (
  'smspool_api_key',
  'reGMub06enmD6Aq2heLeT8sAHJ4FlcGy',
  'Clé API pour SMSPool.net (Premium Provider)',
  'api',
  true,
  'Clé API SMSPool'
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();
