-- Insérer Moneroo dans payment_providers
-- À exécuter dans Supabase SQL Editor

-- Désactiver temporairement RLS pour l'insertion
SET session_replication_role = 'replica';

-- Insérer ou mettre à jour Moneroo
INSERT INTO payment_providers (
  provider_code,
  provider_name,
  is_active,
  is_default,
  priority,
  config,
  supported_methods,
  fees_config,
  logo_url,
  description,
  created_at,
  updated_at
) VALUES (
  'moneroo',
  'Moneroo',
  true,
  false,
  4,
  '{"api_url": "https://api.moneroo.io/v1", "test_mode": true}'::jsonb,
  '["orange_money_sn", "wave_sn", "free_money_sn", "mtn_bj", "moov_bj", "mtn_ci", "moov_ci", "orange_money_ci", "wave_ci", "mpesa_ke", "mtn_cm", "orange_money_cm"]'::jsonb,
  '{"type": "percentage", "value": 0}'::jsonb,
  'https://moneroo.io/logo.png',
  'Paiements mobiles multi-pays (Orange Money, Wave, MTN, Moov, M-Pesa)',
  NOW(),
  NOW()
)
ON CONFLICT (provider_code) 
DO UPDATE SET
  is_active = true,
  priority = 4,
  config = '{"api_url": "https://api.moneroo.io/v1", "test_mode": true}'::jsonb,
  supported_methods = '["orange_money_sn", "wave_sn", "free_money_sn", "mtn_bj", "moov_bj", "mtn_ci", "moov_ci", "orange_money_ci", "wave_ci", "mpesa_ke", "mtn_cm", "orange_money_cm"]'::jsonb,
  description = 'Paiements mobiles multi-pays (Orange Money, Wave, MTN, Moov, M-Pesa)',
  logo_url = 'https://moneroo.io/logo.png',
  updated_at = NOW();

-- Réactiver RLS
SET session_replication_role = 'origin';

-- Vérifier l'insertion
SELECT 
  provider_code,
  provider_name,
  is_active,
  is_default,
  priority,
  description,
  created_at
FROM payment_providers
ORDER BY priority;
