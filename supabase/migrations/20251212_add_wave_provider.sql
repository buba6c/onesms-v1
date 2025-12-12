-- ============================================================================
-- AJOUT DU PROVIDER WAVE AVEC LIEN DE PAIEMENT DIRECT
-- ============================================================================

-- Insérer Wave comme provider de paiement
INSERT INTO payment_providers (
  provider_code, 
  provider_name, 
  is_active, 
  is_default, 
  priority, 
  config,
  supported_methods, 
  description, 
  logo_url
) VALUES (
  'wave',
  'Wave',
  false, -- Désactivé par défaut, à activer depuis l'admin
  false,
  4,
  jsonb_build_object(
    'payment_link_template', 'https://pay.wave.com/m/M_2wPEpxMumWXY/c/sn/?amount={amount}',
    'merchant_id', 'M_2wPEpxMumWXY',
    'country_code', 'sn',
    'currency', 'XOF'
  ),
  '["wave"]'::jsonb,
  'Paiement direct via lien Wave - Redirection instantanée',
  'https://www.wave.com/en/wp-content/themes/wave/img/logo.svg'
)
ON CONFLICT (provider_code) DO UPDATE SET
  config = EXCLUDED.config,
  description = EXCLUDED.description,
  logo_url = EXCLUDED.logo_url;

-- Commentaire
COMMENT ON COLUMN payment_providers.config IS 'Configuration du provider. Pour Wave: payment_link_template avec {amount} comme placeholder';
