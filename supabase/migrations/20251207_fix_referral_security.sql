-- ============================================================================
-- CORRECTIFS DE SÉCURITÉ CRITIQUES - SYSTÈME DE PARRAINAGE
-- Date: 7 décembre 2025
-- Référence: SECURITY_AUDIT_REFERRAL.md
-- ============================================================================

-- ============================================================================
-- 1. ACTIVER RLS SUR TABLE REFERRALS
-- ============================================================================

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'referrals' AND policyname = 'Users can view own referrals'
  ) THEN
    CREATE POLICY "Users can view own referrals"
    ON public.referrals FOR SELECT
    TO authenticated
    USING (
      auth.uid() = referrer_id OR auth.uid() = referee_id
    );
  END IF;
END $$;

-- Policy: Service role a tous les droits (pour les edge functions)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'referrals' AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
    ON public.referrals FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Policy: Bloquer toutes les mutations (INSERT/UPDATE/DELETE) pour les utilisateurs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'referrals' AND policyname = 'Block user mutations'
  ) THEN
    CREATE POLICY "Block user mutations"
    ON public.referrals FOR ALL
    TO authenticated
    USING (false)
    WITH CHECK (false);
  END IF;
END $$;

-- ============================================================================
-- 2. ACTIVER RLS SUR TABLE TRANSACTIONS
-- ============================================================================

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'Users view own transactions'
  ) THEN
    CREATE POLICY "Users view own transactions"
    ON public.transactions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Supprimer le doublon éventuel de policy user
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'Users can view own transactions'
  ) THEN
    DROP POLICY "Users can view own transactions" ON public.transactions;
  END IF;
END $$;

-- Policy: Service role a tous les droits
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'Service role transactions full access'
  ) THEN
    CREATE POLICY "Service role transactions full access"
    ON public.transactions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Policy: Bloquer mutations utilisateurs (sauf si besoin futur)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'Block user transaction mutations'
  ) THEN
    CREATE POLICY "Block user transaction mutations"
    ON public.transactions FOR ALL
    TO authenticated
    USING (false)
    WITH CHECK (false);
  END IF;
END $$;

-- Policy admin lecture globale restreinte au rôle admin
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'Admins can view all transactions'
  ) THEN
    DROP POLICY "Admins can view all transactions" ON public.transactions;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'Admins can view all transactions'
  ) THEN
    CREATE POLICY "Admins can view all transactions"
    ON public.transactions FOR SELECT
    TO admin
    USING (true);
  END IF;
END $$;

-- ============================================================================
-- 3. MODIFIER handle_new_user() POUR VALIDER ET CRÉER REFERRALS
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code text;
  v_referrer_id uuid;
  v_expiry_days int;
BEGIN
  -- Auto-confirmer l'email immédiatement
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = NEW.id AND email_confirmed_at IS NULL;
  
  -- Récupérer le code de parrainage depuis les métadonnées
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  
  -- Insérer ou mettre à jour l'utilisateur
  INSERT INTO public.users (id, email, name, avatar_url, role, balance, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'user',
    0,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();
  
  -- Traiter le code de parrainage si présent
  IF v_referral_code IS NOT NULL AND trim(v_referral_code) != '' THEN
    -- Normaliser le code (minuscules, trim)
    v_referral_code := lower(trim(v_referral_code));
    
    -- Chercher le parrain par code
    SELECT id INTO v_referrer_id
    FROM public.users
    WHERE referral_code = v_referral_code
      AND id != NEW.id  -- Bloquer auto-référence stricte
    LIMIT 1;
    
    -- Si code valide, créer l'entrée referral
    IF v_referrer_id IS NOT NULL THEN
      -- Récupérer le délai d'expiration depuis system_settings (par défaut 14 jours)
      SELECT COALESCE((value::int), 14) INTO v_expiry_days
      FROM public.system_settings
      WHERE key = 'referral_expiry_days'
      LIMIT 1;
      
      IF v_expiry_days IS NULL THEN
        v_expiry_days := 14;
      END IF;
      
      -- Créer le referral
      INSERT INTO public.referrals (
        referrer_id,
        referee_id,
        status,
        trigger_event,
        expiry_date,
        metadata,
        created_at
      ) VALUES (
        v_referrer_id,
        NEW.id,
        'pending',
        'signup',
        NOW() + (v_expiry_days || ' days')::INTERVAL,
        jsonb_build_object(
          'signup_method', COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
          'referral_code_used', v_referral_code
        ),
        NOW()
      )
      ON CONFLICT (referee_id) DO NOTHING;  -- Éviter duplicatas
      
      RAISE NOTICE '[REFERRAL] Created: referrer=% referee=% expires=%', v_referrer_id, NEW.id, NOW() + (v_expiry_days || ' days')::INTERVAL;
    ELSE
      RAISE WARNING '[REFERRAL] Invalid code "%" for user %', v_referral_code, NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] Error: % - SQLSTATE: %', SQLERRM, SQLSTATE;
    -- Ne pas bloquer l'inscription même en cas d'erreur parrainage
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger si absent pour appeler handle_new_user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;

-- ============================================================================
-- 4. AJOUTER INDEX POUR PERFORMANCE
-- ============================================================================

-- Index pour recherche rapide par code (déjà présent normalement via UNIQUE)
CREATE INDEX IF NOT EXISTS users_referral_code_idx ON public.users (referral_code) WHERE referral_code IS NOT NULL;

-- Index pour requêtes admin parrainages par statut
CREATE INDEX IF NOT EXISTS referrals_status_created_idx ON public.referrals (status, created_at DESC);

-- Index pour cap mensuel (used in moneyfusion-webhook)
CREATE INDEX IF NOT EXISTS referrals_referrer_rewarded_idx ON public.referrals (referrer_id, rewarded_at) WHERE status = 'rewarded';



-- Vérifier manuellement après déploiement pour éviter tout blocage dans la migration.
-- ============================================================================
-- 6. COMMENTAIRES ET DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.referrals IS 'Système de parrainage avec RLS activé. Seuls les utilisateurs impliqués peuvent voir leurs propres referrals. Service role a accès complet.';

COMMENT ON POLICY "Users can view own referrals" ON public.referrals IS 'Permet aux utilisateurs de voir les parrainages où ils sont parrain OU filleul';
COMMENT ON POLICY "Block user mutations" ON public.referrals IS 'Empêche les utilisateurs de créer/modifier/supprimer des referrals directement';

COMMENT ON POLICY "Users view own transactions" ON public.transactions IS 'Permet aux utilisateurs de voir uniquement leurs propres transactions';
COMMENT ON POLICY "Block user transaction mutations" ON public.transactions IS 'Empêche les utilisateurs de manipuler les transactions directement';

-- ============================================================================
-- NOTES IMPORTANTES
-- ============================================================================

/*
Cette migration corrige les vulnérabilités critiques suivantes:

1. ❌ → ✅ RLS activé sur `referrals` - Les utilisateurs ne peuvent plus voir tous les parrainages
2. ❌ → ✅ RLS activé sur `transactions` - Protection des données financières
3. ❌ → ✅ Validation du code parrainage lors de l'inscription
4. ❌ → ✅ Création automatique de l'entrée referral si code valide
5. ✅ → ✅ Protection auto-référence renforcée (NEW.id != referrer)

TESTS À EFFECTUER APRÈS MIGRATION:
- Inscription avec code valide → doit créer referral
- Inscription avec code invalide → pas de referral créé (warning logué)
- Inscription avec son propre code → doit être refusé
- Query client `supabase.from('referrals').select('*')` → doit retourner uniquement ses propres referrals
- Admin dashboard → doit toujours fonctionner (service_role)

BREAKING CHANGES:
- Les requêtes client sur `referrals` sans filtre ne retourneront plus tous les records
- Les frontend queries doivent être revues pour utiliser des filtres appropriés
*/
