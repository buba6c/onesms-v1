-- ============================================================================
-- CONFIGURATION COMPLÈTE DES FOURNISSEURS DE PAIEMENT
-- Ajoute PayDunya et met à jour MoneyFusion
-- ============================================================================

-- 1. Mettre à jour MoneyFusion avec configuration placeholder
UPDATE payment_providers 
SET config = jsonb_build_object(
  'api_key', 'CONFIGURED_IN_SUPABASE_SECRETS',
  'api_secret', 'CONFIGURED_IN_SUPABASE_SECRETS',
  'api_url', 'CONFIGURED_IN_SUPABASE_SECRETS',
  'mode', 'live',
  'note', 'Les vraies clés sont dans Supabase Edge Function Secrets'
)
WHERE provider_code = 'moneyfusion';

-- 2. Insérer ou mettre à jour PayDunya
INSERT INTO payment_providers (
  provider_code,
  provider_name,
  is_active,
  is_default,
  priority,
  config,
  supported_methods,
  description
) VALUES (
  'paydunya',
  'PayDunya',
  false, -- Désactivé par défaut, tu pourras l'activer dans l'admin
  false,
  1,
  jsonb_build_object(
    'master_key', 'NRimGfVs-w3HH-U396-4KyR-AXNV5vmF0uEW',
    'private_key', 'test_private_c7KkCGiFSBjGGlK59kaM87dUXKa',
    'token', 'w8wLEciWYNOm6tmWNEDI',
    'mode', 'test'
  ),
  '["orange-money", "mtn-money", "moov-money", "wave", "free-money", "e-money", "visa", "mastercard"]'::jsonb,
  'Paiement via PayDunya - Orange Money, Wave, MTN, Moov, Cartes bancaires'
)
ON CONFLICT (provider_code) DO UPDATE SET
  provider_name = EXCLUDED.provider_name,
  config = EXCLUDED.config,
  supported_methods = EXCLUDED.supported_methods,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 3. Vérifier le résultat
SELECT 
  provider_code,
  provider_name,
  is_active,
  is_default,
  priority,
  (config->>'mode') as mode,
  jsonb_array_length(supported_methods) as nb_methods
FROM payment_providers
ORDER BY priority;
