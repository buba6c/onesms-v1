-- Configuration Moneroo Payment Provider
-- À exécuter dans Supabase SQL Editor

-- 1. Ajouter Moneroo dans payment_providers (si pas déjà présent)
INSERT INTO payment_providers (
  provider_code,
  provider_name,
  is_active,
  config,
  supported_currencies,
  supported_countries,
  min_amount,
  max_amount,
  processing_time,
  fees_type,
  fees_percentage,
  display_order
) VALUES (
  'moneroo',
  'Moneroo',
  true,
  '{
    "api_key": "VOTRE_API_KEY_ICI",
    "webhook_secret": "VOTRE_WEBHOOK_SECRET_ICI",
    "test_mode": false,
    "auto_confirm": true
  }'::jsonb,
  ARRAY['XOF', 'USD', 'EUR']::text[],
  ARRAY['SN', 'CI', 'BJ', 'TG', 'BF', 'ML', 'NE']::text[],
  100,
  5000000,
  '1-5 minutes',
  'fixed',
  0,
  3
)
ON CONFLICT (provider_code) DO UPDATE SET
  is_active = true,
  updated_at = NOW();

-- 2. Vérifier l'insertion
SELECT 
  provider_code,
  provider_name,
  is_active,
  supported_currencies,
  created_at
FROM payment_providers
WHERE provider_code = 'moneroo';

-- 3. Afficher le webhook URL à configurer
SELECT 
  'Webhook URL à configurer dans Moneroo:' as info,
  'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/moneroo-webhook' as url;
