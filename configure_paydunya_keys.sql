-- ============================================================================
-- CONFIGURATION DES CLÉS API PAYDUNYA (MODE TEST)
-- ============================================================================

UPDATE payment_providers
SET config = jsonb_build_object(
  'master_key', 'NRimGfVs-w3HH-U396-4KyR-AXNV5vmF0uEW',
  'public_key', 'test_public_iQ2Xt5KoOC1KT9l7tstvVhLLkiC',
  'private_key', 'test_private_c7KkCGiFSBjGGlK59kaM87dUXKa',
  'token', 'w8wLEciWYNOm6tmWNEDI',
  'mode', 'test',
  'callback_url', 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/paydunya-webhook',
  'return_url', 'https://onesms-sn.com/dashboard?payment=success',
  'cancel_url', 'https://onesms-sn.com/topup?payment=cancel'
),
updated_at = NOW()
WHERE provider_code = 'paydunya';

-- Vérifier la configuration
SELECT 
  provider_name,
  is_active,
  is_default,
  config->>'mode' as mode,
  config->>'master_key' as master_key_preview,
  CASE 
    WHEN config->>'master_key' IS NOT NULL THEN '✅ Configurée'
    ELSE '❌ Manquante'
  END as status
FROM payment_providers
WHERE provider_code = 'paydunya';
