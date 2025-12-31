-- Insert Moneroo dans payment_providers pour Coolify
-- Exécuter via: psql -h ... -U postgres -d postgres < insert_moneroo.sql

-- 1. Vérifier si Moneroo existe déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM payment_providers WHERE provider_code = 'moneroo'
  ) THEN
    -- Insérer Moneroo
    INSERT INTO payment_providers (
      provider_code,
      provider_name,
      provider_type,
      is_enabled,
      is_active,
      is_default,
      priority,
      logo_url,
      description,
      config,
      supported_methods,
      supported_currencies,
      supported_countries,
      min_amount,
      max_amount,
      processing_time,
      fees_type,
      fees_percentage,
      created_at,
      updated_at
    ) VALUES (
      'moneroo',
      'Moneroo',
      'mobile_money',
      true,
      true,
      false,
      3,
      'https://moneroo.io/logo.png',
      'Paiements mobiles multi-pays (Orange Money, Wave, MTN, Moov, M-Pesa)',
      '{"api_url": "https://api.moneroo.io/v1", "test_mode": true}'::jsonb,
      ARRAY['orange_money_sn', 'wave_sn', 'free_money_sn', 'mtn_bj', 'moov_bj', 'mtn_ci', 'moov_ci', 'orange_money_ci', 'wave_ci', 'mpesa_ke', 'mtn_cm', 'orange_money_cm'],
      ARRAY['XOF', 'XAF', 'NGN', 'GHS', 'KES'],
      ARRAY['SN', 'CI', 'BJ', 'TG', 'BF', 'ML', 'NE', 'CM', 'KE', 'GH', 'NG'],
      100,
      5000000,
      '1-5 minutes',
      'percentage',
      0,
      NOW(),
      NOW()
    );
    RAISE NOTICE '✅ Moneroo inserted successfully';
  ELSE
    -- Mettre à jour si existe
    UPDATE payment_providers
    SET 
      is_enabled = true,
      is_active = true,
      updated_at = NOW()
    WHERE provider_code = 'moneroo';
    RAISE NOTICE '✅ Moneroo updated successfully';
  END IF;
END $$;

-- 2. Afficher le résultat
SELECT 
  provider_code,
  provider_name,
  is_enabled,
  is_active,
  priority,
  created_at
FROM payment_providers
WHERE provider_code = 'moneroo';
