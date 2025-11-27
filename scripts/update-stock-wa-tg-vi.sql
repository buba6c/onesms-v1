-- ============================================================================
-- MISE À JOUR DES STOCKS: WhatsApp, Telegram, Viber
-- ============================================================================
--
-- Ce script met à jour les stocks des 3 services manquants avec les données
-- actuelles de l'API SMS-Activate
--
-- Date: 26 novembre 2025
-- Source: API SMS-Activate (https://api.sms-activate.io)
-- ============================================================================

BEGIN;

-- Mise à jour WhatsApp (wa)
UPDATE services 
SET total_available = 397
WHERE code = 'wa';

-- Mise à jour Telegram (tg)
UPDATE services 
SET total_available = 61034
WHERE code = 'tg';

-- Mise à jour Viber (vi)
UPDATE services 
SET total_available = 222
WHERE code = 'vi';

-- Vérification
DO $$
DECLARE
  wa_stock INT;
  tg_stock INT;
  vi_stock INT;
BEGIN
  SELECT total_available INTO wa_stock FROM services WHERE code = 'wa';
  SELECT total_available INTO tg_stock FROM services WHERE code = 'tg';
  SELECT total_available INTO vi_stock FROM services WHERE code = 'vi';
  
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '✅ MISE À JOUR TERMINÉE';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 NOUVEAUX STOCKS:';
  RAISE NOTICE '   wa (WhatsApp): % numéros', wa_stock;
  RAISE NOTICE '   tg (Telegram): % numéros', tg_stock;
  RAISE NOTICE '   vi (Viber):    % numéros', vi_stock;
  RAISE NOTICE '';
  RAISE NOTICE '💡 Rechargez votre Dashboard pour voir les changements!';
  RAISE NOTICE '════════════════════════════════════════';
END $$;

COMMIT;
