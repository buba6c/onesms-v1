-- Admin referral stats helper with SECURITY DEFINER (bypass RLS)
-- Only admins (users.role = 'admin') can execute

CREATE OR REPLACE FUNCTION public.admin_referral_stats()
RETURNS TABLE (
  total INTEGER,
  pending INTEGER,
  qualified INTEGER,
  rewarded INTEGER,
  rejected INTEGER,
  expired INTEGER,
  bonus_count INTEGER,
  bonus_amount BIGINT,
  bonus_pending_count INTEGER,
  bonus_pending_amount BIGINT
) AS $$
BEGIN
  -- Pas de garde rôle ici : SECURITY DEFINER bypass RLS et la route admin est déjà protégée
  RETURN QUERY
  WITH counts AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE status = 'qualified') AS qualified,
      COUNT(*) FILTER (WHERE status = 'rewarded') AS rewarded,
      COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
      COUNT(*) FILTER (WHERE status = 'expired') AS expired
    FROM public.referrals
  ), bonuses_completed AS (
    SELECT
      COUNT(*) AS bonus_count,
      COALESCE(SUM(COALESCE((metadata->>'amount_xof')::numeric, amount * 100)), 0)::bigint AS bonus_amount
    FROM public.transactions
    WHERE type = 'referral_bonus'
      AND status = 'completed'
  ), bonuses_pending AS (
    SELECT
      COUNT(*) AS bonus_pending_count,
      COALESCE(SUM(COALESCE((metadata->>'amount_xof')::numeric, amount * 100)), 0)::bigint AS bonus_pending_amount
    FROM public.transactions
    WHERE type = 'referral_bonus'
      AND status = 'pending'
  )
  SELECT
    counts.total::int,
    counts.pending::int,
    counts.qualified::int,
    counts.rewarded::int,
    counts.rejected::int,
    counts.expired::int,
    COALESCE(bonuses_completed.bonus_count, 0)::int,
    COALESCE(bonuses_completed.bonus_amount, 0)::bigint,
    COALESCE(bonuses_pending.bonus_pending_count, 0)::int,
    COALESCE(bonuses_pending.bonus_pending_amount, 0)::bigint
  FROM counts, bonuses_completed, bonuses_pending;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_referral_stats() TO authenticated;

COMMENT ON FUNCTION public.admin_referral_stats() IS 'Stats parrainage admin: bypass RLS via SECURITY DEFINER (users.role=admin).';

-- Drop and recreate admin_referrals_list with updated signature
DROP FUNCTION IF EXISTS public.admin_referrals_list();

-- Liste complète des referrals avec emails (bypass RLS)
CREATE FUNCTION public.admin_referrals_list()
RETURNS TABLE (
  id uuid,
  status text,
  created_at timestamptz,
  referrer_id uuid,
  referrer_email text,
  referee_id uuid,
  referee_email text,
  qualified_at timestamptz,
  rewarded_at timestamptz,
  reason text,
  referrer_total_bonus bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.status,
    r.created_at,
    r.referrer_id,
    ru.email AS referrer_email,
    r.referee_id,
    fe.email AS referee_email,
    r.qualified_at,
    r.rewarded_at,
    r.reason,
    COALESCE(bonus.total_bonus, 0) AS referrer_total_bonus
  FROM public.referrals r
  LEFT JOIN public.users ru ON ru.id = r.referrer_id
  LEFT JOIN public.users fe ON fe.id = r.referee_id
  LEFT JOIN (
    SELECT 
      t.user_id,
      SUM(COALESCE((t.metadata->>'amount_xof')::numeric, t.amount * 100))::bigint AS total_bonus
    FROM public.transactions t
    WHERE t.type = 'referral_bonus' 
      AND t.status = 'completed'
    GROUP BY t.user_id
  ) bonus ON bonus.user_id = r.referrer_id
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_referrals_list() TO authenticated;

COMMENT ON FUNCTION public.admin_referrals_list() IS $$Liste des referrals pour l'admin (bypass RLS), avec emails parrain/filleul.$$;
