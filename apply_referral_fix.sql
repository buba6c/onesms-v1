-- Apply updated admin_referrals_list with referrer_total_bonus
DROP FUNCTION IF EXISTS public.admin_referrals_list();

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
