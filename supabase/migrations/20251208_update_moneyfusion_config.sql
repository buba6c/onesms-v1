-- ============================================================================
-- METTRE À JOUR MONEYFUSION AVEC MERCHANT_ID ET WEBHOOK_URL
-- ============================================================================

UPDATE payment_providers 
SET config = jsonb_build_object(
  'merchant_id', 'TON_MERCHANT_ID_ICI',
  'api_key', 'CONFIGURED_IN_SUPABASE_SECRETS',
  'api_secret', 'CONFIGURED_IN_SUPABASE_SECRETS',
  'api_url', 'CONFIGURED_IN_SUPABASE_SECRETS',
  'webhook_url', 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/moneyfusion-webhook',
  'mode', 'live',
  'note', 'Les vraies clés sont dans Supabase Edge Function Secrets'
)
WHERE provider_code = 'moneyfusion';

-- Vérifier
SELECT 
  provider_code,
  provider_name,
  config->>'merchant_id' as merchant_id,
  config->>'webhook_url' as webhook_url,
  config->>'mode' as mode
FROM payment_providers
WHERE provider_code = 'moneyfusion';
