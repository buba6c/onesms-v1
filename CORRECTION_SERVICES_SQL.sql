-- ═══════════════════════════════════════════════════════════════════════════════
--  📱 CONFIGURATION PHONE LOGIN - SOLUTION LA PLUS RAPIDE
-- ═══════════════════════════════════════════════════════════════════════════════

-- ⏱️  TEMPS TOTAL: 15 MINUTES
-- 💰 GRATUIT pour commencer (15.50$ de crédit offert)


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🚀 4 ÉTAPES RAPIDES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


-- 1️⃣  TWILIO - Créer compte (5 min)
-- ──────────────────────────────────────────────────────────────────────────────

-- 👉 https://www.twilio.com/try-twilio

-- • Cliquez "Start for free"
-- • Email + Password
-- • Vérifiez votre email
-- • Répondez au questionnaire:
--   - Product? → SMS
--   - Purpose? → Identity & verification
--   - Language? → JavaScript


-- 2️⃣  TWILIO - Récupérer credentials (2 min)
-- ──────────────────────────────────────────────────────────────────────────────

-- Sur le Dashboard Twilio:

-- 📝 Account SID: AC1234567890abcdef...
-- 📝 Auth Token: (cliquez "Show")

-- ➜ COPIEZ CES 2 VALEURS !


-- 3️⃣  TWILIO - Obtenir un numéro (3 min)
-- ──────────────────────────────────────────────────────────────────────────────

-- • Menu → Phone Numbers → Buy a number
-- • Country: Votre pays (Senegal, France, USA...)
-- • Capabilities: ✅ SMS
-- • Search → Buy (GRATUIT en Trial)

-- 📝 Notez le numéro: +221123456789


-- 4️⃣  SUPABASE - Configuration (5 min)
-- ──────────────────────────────────────────────────────────────────────────────

-- 👉 https://app.supabase.com/

-- • Projet ONE SMS V1
-- • Authentication → Providers → Phone
-- • Enable Phone Sign-up: ✅ ON

-- Configuration Twilio:
-- ┌──────────────────────────────────────────┐
-- │ Phone provider: Twilio                   │
-- │ Account SID: AC1234567890abcdef...       │
-- │ Auth Token: votre_token_secret           │
-- │ Phone Number: +221123456789              │
-- └──────────────────────────────────────────┘

-- • Save ✅


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ✅ TEST IMMÉDIAT
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Console navigateur (F12):

-- Envoyer OTP:
-- await supabase.auth.signInWithOtp({
--   phone: '+221771234567',
--   options: { channel: 'sms' }
-- })

-- Vérifier code reçu par SMS:
-- await supabase.auth.verifyOtp({
--   phone: '+221771234567',
--   token: '123456'
-- })


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ⚠️  LIMITATION MODE TRIAL
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- En mode gratuit, vous pouvez SEULEMENT envoyer SMS aux numéros
-- vérifiés dans Twilio.

-- Pour tester:
-- 1. Twilio → Phone Numbers → Verified Caller IDs
-- 2. Ajoutez votre numéro de test
-- 3. Vérifiez-le par SMS/appel
-- 4. Testez l'authentification !


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📱 FORMAT NUMÉRO OBLIGATOIRE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ✅ CORRECT:
--    +221771234567  (Sénégal)
--    +33612345678   (France)
--    +15551234567   (USA)

-- ❌ INCORRECT:
--    771234567      (manque +221)
--    0612345678     (manque +33)


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 💰 COÛT
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Mode Trial (gratuit):
-- • 15.50$ de crédit offert ✅
-- • Numéros vérifiés uniquement ⚠️

-- Mode Production:
-- • ~0.0075$ par SMS (~5 FCFA)
-- • 1$ par mois pour le numéro
-- • Estimation: 100 auth/mois = 1.75$


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📖 GUIDE COMPLET
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- CONFIGURATION_PHONE_RAPIDE.md


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🎯 RÉSULTAT ATTENDU
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. User entre: +221771234567
-- 2. Clic "Send OTP"
-- 3. SMS reçu en 5-10 secondes ✅
-- 4. Code: 123456
-- 5. Connexion réussie ✅
-- 6. Redirect → /dashboard


-- 🚀 C'EST LA MÉTHODE LA PLUS RAPIDE !


-- ═══════════════════════════════════════════════════════════════════════════════

-- ÉTAPE 1: Vérification avant correction
-- ───────────────────────────────────────────────────────────────────────────────
-- Exécuter cette requête pour voir l'état actuel des services problématiques
-- ───────────────────────────────────────────────────────────────────────────────

SELECT 
  code,
  name AS nom_actuel_incorrect,
  CASE code
    WHEN 'ts' THEN 'PayPal'
    WHEN 'oi' THEN 'Tinder'
    WHEN 'lf' THEN 'TikTok'
    WHEN 're' THEN 'Coinbase'
    WHEN 'aon' THEN 'Binance'
    WHEN 'ka' THEN 'Shopee'
    WHEN 'tn' THEN 'LinkedIn'
    WHEN 'qv' THEN 'Badoo'
    WHEN 'bd' THEN 'Bumble'
    WHEN 'fu' THEN 'Snapchat'
    WHEN 'sn' THEN 'Snapchat'
    WHEN 'bnl' THEN 'Reddit'
    WHEN 'ij' THEN 'Revolut'
    WHEN 'alj' THEN 'Spotify'
    WHEN 'mg' THEN 'Mercado Libre'
    WHEN 'mt' THEN 'Mercado Libre'
    WHEN 'zn' THEN 'Dzen'
    WHEN 'me' THEN 'LINE'
    WHEN 'mm' THEN 'Mamba'
    WHEN 'mb' THEN 'Mamba'
    WHEN 'wx' THEN 'WeChat'
    WHEN 'kt' THEN 'KakaoTalk'
    WHEN 'im' THEN 'IMO'
  END AS nom_correct,
  active,
  icon
FROM services 
WHERE code IN ('ts','oi','lf','re','aon','ka','tn','qv','bd','fu','sn','bnl','ij','alj','mg','mt','zn','me','mm','mb','wx','kt','im')
ORDER BY code;


-- ÉTAPE 2: CORRECTIONS (23 services)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Exécuter ces UPDATEs pour corriger les noms
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. PayPal (code: ts) - Actuellement "TypeScript Services"
UPDATE services 
SET name = 'PayPal',
    display_name = 'PayPal',
    updated_at = NOW()
WHERE code = 'ts';

-- 2. Tinder (code: oi) - Actuellement "OLX"
UPDATE services 
SET name = 'Tinder',
    display_name = 'Tinder',
    updated_at = NOW()
WHERE code = 'oi';

-- 3. TikTok (code: lf) - Actuellement "Lifeline" ou "AliExpress"
UPDATE services 
SET name = 'TikTok',
    display_name = 'TikTok',
    updated_at = NOW()
WHERE code = 'lf';

-- 4. Coinbase (code: re) - Actuellement "Reddit"
UPDATE services 
SET name = 'Coinbase',
    display_name = 'Coinbase',
    updated_at = NOW()
WHERE code = 're';

-- 5. Binance (code: aon) - Actuellement "Aon"
UPDATE services 
SET name = 'Binance',
    display_name = 'Binance',
    updated_at = NOW()
WHERE code = 'aon';

-- 6. Shopee (code: ka) - Actuellement "Kakao"
UPDATE services 
SET name = 'Shopee',
    display_name = 'Shopee',
    updated_at = NOW()
WHERE code = 'ka';

-- 7. LinkedIn (code: tn) - Actuellement "Tinder"
UPDATE services 
SET name = 'LinkedIn',
    display_name = 'LinkedIn',
    updated_at = NOW()
WHERE code = 'tn';

-- 8. Badoo (code: qv) - Actuellement "Qiwi"
UPDATE services 
SET name = 'Badoo',
    display_name = 'Badoo',
    updated_at = NOW()
WHERE code = 'qv';

-- 9. Bumble (code: bd) - Actuellement "Badoo"
UPDATE services 
SET name = 'Bumble',
    display_name = 'Bumble',
    updated_at = NOW()
WHERE code = 'bd';

-- 10. Snapchat (code: fu) - Actuellement "Fubao" ou autre
UPDATE services 
SET name = 'Snapchat',
    display_name = 'Snapchat',
    updated_at = NOW()
WHERE code = 'fu';

-- 11. Snapchat (code: sn) - Actuellement "SN" ou autre
UPDATE services 
SET name = 'Snapchat',
    display_name = 'Snapchat',
    updated_at = NOW()
WHERE code = 'sn';

-- 12. Reddit (code: bnl) - Actuellement "BNL" ou autre
UPDATE services 
SET name = 'Reddit',
    display_name = 'Reddit',
    updated_at = NOW()
WHERE code = 'bnl';

-- 13. Revolut (code: ij) - Actuellement "IJ" ou autre
UPDATE services 
SET name = 'Revolut',
    display_name = 'Revolut',
    updated_at = NOW()
WHERE code = 'ij';

-- 14. Spotify (code: alj) - Actuellement "ALJ" ou autre
UPDATE services 
SET name = 'Spotify',
    display_name = 'Spotify',
    updated_at = NOW()
WHERE code = 'alj';

-- 15. Mercado Libre (code: mg) - Actuellement "Magnit"
UPDATE services 
SET name = 'Mercado Libre',
    display_name = 'Mercado Libre',
    updated_at = NOW()
WHERE code = 'mg';

-- 16. Mercado Libre (code: mt) - Actuellement "MT" ou autre
UPDATE services 
SET name = 'Mercado Libre',
    display_name = 'Mercado Libre',
    updated_at = NOW()
WHERE code = 'mt';

-- 17. Dzen (code: zn) - Actuellement "ZN" ou autre
UPDATE services 
SET name = 'Dzen',
    display_name = 'Dzen',
    updated_at = NOW()
WHERE code = 'zn';

-- 18. LINE (code: me) - Actuellement "Me" ou autre
UPDATE services 
SET name = 'LINE',
    display_name = 'LINE',
    updated_at = NOW()
WHERE code = 'me';

-- 19. Mamba (code: mm) - Actuellement "MM" ou autre
UPDATE services 
SET name = 'Mamba',
    display_name = 'Mamba',
    updated_at = NOW()
WHERE code = 'mm';

-- 20. Mamba (code: mb) - Actuellement "MB" ou autre
UPDATE services 
SET name = 'Mamba',
    display_name = 'Mamba',
    updated_at = NOW()
WHERE code = 'mb';

-- 21. WeChat (code: wx) - Actuellement "WX" ou autre
UPDATE services 
SET name = 'WeChat',
    display_name = 'WeChat',
    updated_at = NOW()
WHERE code = 'wx';

-- 22. KakaoTalk (code: kt) - Actuellement "KT" ou autre
UPDATE services 
SET name = 'KakaoTalk',
    display_name = 'KakaoTalk',
    updated_at = NOW()
WHERE code = 'kt';

-- 23. IMO (code: im) - Actuellement "IM" ou autre
UPDATE services 
SET name = 'IMO',
    display_name = 'IMO',
    updated_at = NOW()
WHERE code = 'im';

COMMIT;


-- ÉTAPE 3: Vérification après correction
-- ───────────────────────────────────────────────────────────────────────────────
-- Exécuter cette requête pour confirmer les corrections
-- ───────────────────────────────────────────────────────────────────────────────

SELECT 
  code,
  name AS nom_corrige,
  display_name AS nom_affiche,
  active,
  updated_at
FROM services 
WHERE code IN ('ts','oi','lf','re','aon','ka','tn','qv','bd','fu','sn','bnl','ij','alj','mg','mt','zn','me','mm','mb','wx','kt','im')
ORDER BY name;


-- ÉTAPE 4: Statistiques finales
-- ───────────────────────────────────────────────────────────────────────────────

SELECT 
  '✅ Corrections appliquées' AS status,
  COUNT(*) AS services_corriges
FROM services 
WHERE code IN ('ts','oi','lf','re','aon','ka','tn','qv','bd','fu','sn','bnl','ij','alj','mg','mt','zn','me','mm','mb','wx','kt','im')
  AND updated_at > NOW() - INTERVAL '5 minutes';


-- ═══════════════════════════════════════════════════════════════════════════════
-- RÉSULTAT ATTENDU
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- ✅ 23 services corrigés
-- ✅ Logo PayPal affiche maintenant "PayPal" (pas "TypeScript Services")
-- ✅ Logo Tinder affiche maintenant "Tinder" (pas "OLX")
-- ✅ Logo TikTok affiche maintenant "TikTok" (pas "Lifeline")
-- ✅ Tous les noms correspondent aux logos affichés
-- ✅ Expérience utilisateur cohérente et professionnelle
-- 
-- ═══════════════════════════════════════════════════════════════════════════════
