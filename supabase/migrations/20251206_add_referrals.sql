-- Add referral code to users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE
  DEFAULT lower(substr(md5(gen_random_uuid()::text), 1, 8));

-- Backfill referral codes for existing users
UPDATE public.users
SET referral_code = lower(substr(md5(gen_random_uuid()::text), 1, 8))
WHERE referral_code IS NULL;

-- Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  referee_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','qualified','rewarded','rejected','expired')),
  trigger_event text,
  reason text,
  reward_txn_id uuid,
  expiry_date timestamptz,
  qualified_at timestamptz,
  rewarded_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unicity: one referrer per referee
CREATE UNIQUE INDEX IF NOT EXISTS referrals_referee_unique ON public.referrals (referee_id);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals (referrer_id);
CREATE INDEX IF NOT EXISTS referrals_status_idx ON public.referrals (status);

-- System settings defaults for referral program
INSERT INTO public.system_settings (key, value, category, description)
VALUES
  ('referral_enabled', 'false', 'referral', 'Activer/désactiver le programme de parrainage'),
  ('referral_bonus_referrer', '5', 'referral', 'Bonus tokens pour le parrain'),
  ('referral_bonus_referee', '5', 'referral', 'Bonus tokens pour le filleul'),
  ('referral_trigger', 'first_recharge', 'referral', 'Événement déclencheur du bonus'),
  ('referral_min_recharge_amount', '0', 'referral', 'Montant minimum de recharge pour qualifier'),
  ('referral_expiry_days', '14', 'referral', 'Délai max pour que le filleul qualifie (jours)'),
  ('referral_monthly_cap', '20', 'referral', 'Plafond de filleuls récompensés par parrain et par mois'),
  ('referral_self_referral_block', 'true', 'referral', 'Bloquer auto-référence'),
  ('referral_anti_fraud_level', 'medium', 'referral', 'Niveau anti-fraude'),
  ('referral_notify_email', 'true', 'referral', 'Notifier par email'),
  ('referral_notify_inapp', 'true', 'referral', 'Notifier in-app'),
  ('referral_reminder_days', '1,3,7', 'referral', 'Jours de relance filleul'),
  ('referral_terms_link', '', 'referral', 'Lien des conditions du programme'),
  ('referral_code_length', '8', 'referral', 'Longueur du code de parrainage'),
  ('referral_allowed_domains', '', 'referral', 'Liste blanche de domaines emails'),
  ('referral_blocked_domains', '', 'referral', 'Liste noire de domaines emails'),
  ('referral_code_prefix', '', 'referral', 'Préfixe facultatif pour les codes générés'),
  ('referral_link_base', '', 'referral', 'URL de base pour construire les liens'),
  ('referral_allow_custom_code', 'false', 'referral', 'Autoriser la saisie manuelle de codes')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, category = EXCLUDED.category, description = EXCLUDED.description;
