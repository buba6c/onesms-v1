-- ============================================================================
-- SYNCHRONISATION SMS-ACTIVATE
-- Généré le: 26/11/2025 15:33:22
-- ============================================================================

BEGIN;

-- Mise à jour des stocks

UPDATE services SET total_available = 674 WHERE code = 'wa'; -- WhatsApp: 674 numéros
UPDATE services SET total_available = 60882 WHERE code = 'tg'; -- Telegram: 60882 numéros
UPDATE services SET total_available = 219 WHERE code = 'vi'; -- Viber: 219 numéros
UPDATE services SET total_available = 251 WHERE code = 'ig'; -- Instagram: 251 numéros
UPDATE services SET total_available = 225685 WHERE code = 'fb'; -- Facebook: 225685 numéros
UPDATE services SET total_available = 0 WHERE code = 'go'; -- Google: 0 numéros
UPDATE services SET total_available = 303363 WHERE code = 'tw'; -- Twitter: 303363 numéros
UPDATE services SET total_available = 303439 WHERE code = 'ds'; -- Discord: 303439 numéros
UPDATE services SET total_available = 50 WHERE code = 'vk'; -- VKontakte: 50 numéros
UPDATE services SET total_available = 0 WHERE code = 'ok'; -- Odnoklassniki: 0 numéros
UPDATE services SET total_available = 303167 WHERE code = 'mm'; -- Microsoft: 303167 numéros
UPDATE services SET total_available = 836 WHERE code = 'am'; -- Amazon: 836 numéros
UPDATE services SET total_available = 303407 WHERE code = 'nf'; -- Netflix: 303407 numéros
UPDATE services SET total_available = 303402 WHERE code = 'ub'; -- Uber: 303402 numéros
UPDATE services SET total_available = 43 WHERE code = 'ts'; -- PayPal: 43 numéros
-- ⚠️  apple (Apple): Non disponible dans l'API
UPDATE services SET total_available = 303332 WHERE code = 'mb'; -- MB: 303332 numéros
-- ⚠️  spotify (Spotify): Non disponible dans l'API
-- ⚠️  tiktok (TikTok): Non disponible dans l'API
UPDATE services SET total_available = 303558 WHERE code = 'li'; -- LinkedIn: 303558 numéros

-- Créer un log de synchronisation

INSERT INTO sync_logs (
  sync_type,
  status,
  services_synced,
  countries_synced,
  prices_synced,
  started_at,
  completed_at,
  triggered_by
) VALUES (
  'services',
  'success',
  17,
  0,
  0,
  NOW(),
  NOW(),
  NULL
);

COMMIT;

-- ============================================================================
-- ✅ 17 services à mettre à jour
-- ⚠️  3 services non trouvés dans l'API
-- ============================================================================
