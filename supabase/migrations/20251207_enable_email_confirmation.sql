-- ============================================================================
-- ACTIVER LA CONFIRMATION PAR EMAIL
-- Date: 7 décembre 2025
-- ============================================================================

-- 1. Mettre à jour le trigger pour NE PAS auto-confirmer l'email
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code TEXT;
  v_referrer_id UUID;
  v_expiry_days INT := 30;
BEGIN
  -- NE PAS auto-confirmer l'email - laisser Supabase envoyer l'email de confirmation
  -- L'utilisateur doit cliquer sur le lien dans l'email
  
  -- Supprimer d'abord l'ancien enregistrement s'il existe avec le même email mais un ID différent
  DELETE FROM public.users 
  WHERE email = NEW.email AND id != NEW.id;
  
  -- Générer un code de parrainage unique pour ce nouvel utilisateur
  -- Format: 8 caractères alphanumériques
  DECLARE
    v_new_referral_code TEXT;
  BEGIN
    v_new_referral_code := substr(md5(random()::text || NEW.id::text), 1, 8);
    
    -- Insérer ou mettre à jour l'utilisateur avec son propre code de parrainage
    INSERT INTO public.users (id, email, name, avatar_url, role, balance, referral_code, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.raw_user_meta_data->>'avatar_url',
      'user',
      0,
      v_new_referral_code,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      email = EXCLUDED.email,
      name = COALESCE(EXCLUDED.name, users.name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
      referral_code = COALESCE(users.referral_code, EXCLUDED.referral_code),
      updated_at = NOW();
  END;
  
  -- Traiter le code de parrainage si présent dans les métadonnées
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  
  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    -- Trouver le parrain par son code
    SELECT id INTO v_referrer_id
    FROM public.users
    WHERE referral_code = v_referral_code
    LIMIT 1;
    
    IF v_referrer_id IS NOT NULL THEN
      -- Vérifier que ce n'est pas un auto-parrainage
      IF v_referrer_id != NEW.id THEN
        -- Récupérer la durée d'expiration depuis les paramètres
        SELECT COALESCE((value)::int, 30) INTO v_expiry_days
        FROM system_settings
        WHERE key = 'referral_expiry_days';
        
        -- Créer l'entrée de parrainage
        INSERT INTO public.referrals (referrer_id, referee_id, status, expiry_date, created_at)
        VALUES (
          v_referrer_id,
          NEW.id,
          'pending',
          NOW() + (v_expiry_days || ' days')::interval,
          NOW()
        )
        ON CONFLICT DO NOTHING;
        
        RAISE LOG '[REFERRAL] Created referral: referrer=%, referee=%, code=%', v_referrer_id, NEW.id, v_referral_code;
      ELSE
        RAISE WARNING '[REFERRAL] Self-referral blocked for user %', NEW.id;
      END IF;
    ELSE
      RAISE WARNING '[REFERRAL] Invalid referral code: %', v_referral_code;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Recréer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 3. Note importante pour la configuration Supabase Dashboard
-- ============================================================================
-- CONFIGURATION REQUISE DANS SUPABASE DASHBOARD:
-- 
-- 1. Aller dans Authentication → Settings → Email
--    - Enable email confirmations: ON ✅
--    - Secure email change: ON ✅
--
-- 2. Aller dans Authentication → Settings → SMTP Settings
--    - Enable Custom SMTP: ON ✅
--    - Host: smtp.zoho.com (ou smtp.gmail.com)
--    - Port: 587
--    - Username: support@onesms-sn.com
--    - Password: [votre mot de passe]
--    - Sender email: support@onesms-sn.com
--    - Sender name: One SMS
--
-- 3. Personnaliser les templates dans Authentication → Email Templates
--    - Confirm signup: Template de bienvenue
--    - Magic Link: Template de connexion
--    - Reset Password: Template de réinitialisation
-- ============================================================================

SELECT 'Migration terminée. Configurez SMTP dans Supabase Dashboard.' AS status;
