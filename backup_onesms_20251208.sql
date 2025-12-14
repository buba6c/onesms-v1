


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."admin_add_credit"("p_user_id" "uuid", "p_amount" numeric, "p_admin_note" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user RECORD;
  v_new_balance DECIMAL;
  v_transaction_id UUID;
  v_caller UUID := auth.uid();
  v_claims JSON := NULL;
  v_role TEXT := NULL;
BEGIN
  BEGIN
    v_claims := current_setting('request.jwt.claims', true)::json;
    v_role := COALESCE(v_claims->>'role', v_claims->>'role_name', NULL);
  EXCEPTION WHEN others THEN
    v_role := NULL;
  END;

  IF v_role = 'service_role' OR current_user = 'service_role' THEN
    NULL;
  ELSIF v_caller IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: no authenticated user';
  ELSE
    PERFORM 1 FROM users WHERE id = v_caller AND role = 'admin';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unauthorized: admin role required';
    END IF;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive: %', p_amount;
  END IF;

  SELECT id, balance, frozen_balance, email
  INTO v_user
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  v_new_balance := v_user.balance + p_amount;

  INSERT INTO balance_operations (
    user_id, operation_type, amount,
    balance_before, balance_after,
    frozen_before, frozen_after, reason
  ) VALUES (
    p_user_id, 'credit_admin', p_amount,
    v_user.balance, v_new_balance,
    v_user.frozen_balance, v_user.frozen_balance,
    COALESCE(p_admin_note, 'Crédit ajouté par admin')
  );

  UPDATE users
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO transactions (
    user_id, type, amount, status,
    payment_method, balance_before, balance_after, description
  ) VALUES (
    p_user_id, 'credit', p_amount, 'completed',
    'bonus',
    v_user.balance, v_new_balance,
    COALESCE(p_admin_note, 'Crédit ajouté par admin')
  )
  RETURNING id INTO v_transaction_id;

  RETURN json_build_object(
    'success', true,
    'amount_added', p_amount,
    'balance_before', v_user.balance,
    'balance_after', v_new_balance,
    'frozen', v_user.frozen_balance,
    'transaction_id', v_transaction_id,
    'user_email', v_user.email
  );
END;
$$;


ALTER FUNCTION "public"."admin_add_credit"("p_user_id" "uuid", "p_amount" numeric, "p_admin_note" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_add_credit"("p_user_id" "uuid", "p_amount" numeric, "p_admin_note" "text") IS 'Admin function to add credits to user balance (Model A) with full logging';



CREATE OR REPLACE FUNCTION "public"."admin_referral_stats"() RETURNS TABLE("total" integer, "pending" integer, "qualified" integer, "rewarded" integer, "rejected" integer, "expired" integer, "bonus_count" integer, "bonus_amount" bigint, "bonus_pending_count" integer, "bonus_pending_amount" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admin_referral_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_referral_stats"() IS 'Stats parrainage admin: bypass RLS via SECURITY DEFINER (users.role=admin).';



CREATE OR REPLACE FUNCTION "public"."admin_referrals_list"() RETURNS TABLE("id" "uuid", "status" "text", "created_at" timestamp with time zone, "referrer_id" "uuid", "referrer_email" "text", "referee_id" "uuid", "referee_email" "text", "qualified_at" timestamp with time zone, "rewarded_at" timestamp with time zone, "reason" "text", "referrer_total_bonus" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admin_referrals_list"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atomic_commit"("p_user_id" "uuid", "p_activation_id" "uuid" DEFAULT NULL::"uuid", "p_rental_id" "uuid" DEFAULT NULL::"uuid", "p_transaction_id" "uuid" DEFAULT NULL::"uuid", "p_reason" "text" DEFAULT 'Commit funds'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_balance_before DECIMAL;
  v_frozen_before DECIMAL;
  v_frozen_amount DECIMAL;
  v_commit DECIMAL;
  v_balance_after DECIMAL;
  v_frozen_after DECIMAL;
BEGIN
  -- 1) Lock user row
  SELECT balance, frozen_balance
  INTO v_balance_before, v_frozen_before
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- 2) Determine frozen amount from activation or rental
  IF p_activation_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount
    FROM activations
    WHERE id = p_activation_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Activation not found: %', p_activation_id;
    END IF;
  ELSIF p_rental_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount
    FROM rentals
    WHERE id = p_rental_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Rental not found: %', p_rental_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Either activation_id or rental_id must be provided';
  END IF;

  v_frozen_amount := COALESCE(v_frozen_amount, 0);

  -- 3) Idempotence: nothing to commit
  IF v_frozen_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'message', 'Already committed',
      'balance', v_balance_before,
      'frozen', v_frozen_before
    );
  END IF;

  -- 4) Compute new balances (Model A: balance and frozen both decrease)
  v_commit := LEAST(v_frozen_amount, COALESCE(v_frozen_before, 0));
  v_balance_after := v_balance_before - v_commit;
  IF v_balance_after < 0 THEN
    RAISE EXCEPTION 'Insufficient balance to commit %, balance_before=%', v_commit, v_balance_before;
  END IF;
  v_frozen_after := GREATEST(0, v_frozen_before - v_commit);

  -- 5) Insert ledger FIRST to satisfy users_balance_guard
  INSERT INTO balance_operations (
    user_id,
    activation_id,
    rental_id,
    related_transaction_id,
    operation_type,
    amount,
    balance_before,
    balance_after,
    frozen_before,
    frozen_after,
    reason
  ) VALUES (
    p_user_id,
    p_activation_id,
    p_rental_id,
    p_transaction_id,
    'commit',
    v_commit,
    v_balance_before,
    v_balance_after,
    v_frozen_before,
    v_frozen_after,
    COALESCE(p_reason, 'Commit funds')
  );

  -- 6) Update user balances (guard now passes)
  UPDATE users
  SET
    balance = v_balance_after,
    frozen_balance = v_frozen_after,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- 7) Clear frozen_amount and mark charged
  IF p_activation_id IS NOT NULL THEN
    UPDATE activations
    SET
      frozen_amount = 0,
      charged = true,
      status = CASE WHEN status IN ('pending', 'waiting') THEN 'received' ELSE status END,
      updated_at = NOW()
    WHERE id = p_activation_id;
  END IF;

  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals
    SET
      frozen_amount = 0,
      charged = true,
      status = CASE WHEN status IN ('pending', 'active') THEN 'completed' ELSE status END,
      updated_at = NOW()
    WHERE id = p_rental_id;
  END IF;

  -- 8) Update linked transaction if provided
  IF p_transaction_id IS NOT NULL THEN
    UPDATE transactions
    SET status = 'completed', updated_at = NOW()
    WHERE id = p_transaction_id AND status = 'pending';
  END IF;

  -- 9) Return result
  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'committed', v_commit,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'frozen_before', v_frozen_before,
    'frozen_after', v_frozen_after
  );
END;
$$;


ALTER FUNCTION "public"."atomic_commit"("p_user_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_transaction_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atomic_freeze"("p_user_id" "uuid", "p_amount" numeric, "p_transaction_id" "uuid", "p_activation_id" "uuid" DEFAULT NULL::"uuid", "p_rental_id" "uuid" DEFAULT NULL::"uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user RECORD;
  v_available DECIMAL;
  v_new_frozen DECIMAL;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive: %', p_amount;
  END IF;

  SELECT balance, frozen_balance
  INTO v_user
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  v_available := v_user.balance - v_user.frozen_balance;
  IF v_available < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: % available, % required', v_available, p_amount;
  END IF;

  v_new_frozen := v_user.frozen_balance + p_amount;

  -- Insert ledger FIRST so users_balance_guard allows the subsequent user update
  INSERT INTO balance_operations (
    user_id,
    activation_id,
    rental_id,
    related_transaction_id,
    operation_type,
    amount,
    balance_before,
    balance_after,
    frozen_before,
    frozen_after,
    reason
  ) VALUES (
    p_user_id,
    p_activation_id,
    p_rental_id,
    p_transaction_id,
    'freeze',
    p_amount,
    v_user.balance,
    v_user.balance,
    v_user.frozen_balance,
    v_new_frozen,
    COALESCE(p_reason, 'Credits frozen for purchase')
  );

  UPDATE users
  SET 
    frozen_balance = v_new_frozen,
    updated_at = NOW()
  WHERE id = p_user_id;

  IF p_activation_id IS NOT NULL THEN
    UPDATE activations
    SET frozen_amount = p_amount, updated_at = NOW()
    WHERE id = p_activation_id;
  END IF;

  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals
    SET frozen_amount = p_amount, updated_at = NOW()
    WHERE id = p_rental_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'balance_before', v_user.balance,
    'balance_after', v_user.balance,
    'frozen_before', v_user.frozen_balance,
    'frozen_after', v_new_frozen,
    'available', v_user.balance - v_new_frozen
  );
END;
$$;


ALTER FUNCTION "public"."atomic_freeze"("p_user_id" "uuid", "p_amount" numeric, "p_transaction_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."atomic_freeze"("p_user_id" "uuid", "p_amount" numeric, "p_transaction_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_reason" "text") IS 'Model A: freeze credits without changing balance. Only frozen_balance increases.';



CREATE OR REPLACE FUNCTION "public"."atomic_refund"("p_user_id" "uuid", "p_activation_id" "uuid" DEFAULT NULL::"uuid", "p_rental_id" "uuid" DEFAULT NULL::"uuid", "p_reason" "text" DEFAULT 'Refund'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSON;
BEGIN
  v_result := secure_unfreeze_balance(
    p_user_id, p_activation_id, p_rental_id, TRUE, p_reason
  );

  IF (v_result->>'success')::boolean THEN
    IF p_activation_id IS NOT NULL THEN
      UPDATE activations
      SET status = CASE 
          WHEN status IN ('pending','waiting') THEN 'cancelled'
          ELSE status
        END,
        updated_at = NOW()
      WHERE id = p_activation_id
        AND status NOT IN ('received', 'completed');
    END IF;

    IF p_rental_id IS NOT NULL THEN
      UPDATE rentals
      SET status = 'cancelled',
          updated_at = NOW()
      WHERE id = p_rental_id
        AND status <> 'cancelled';
    END IF;
  END IF;

  RETURN json_build_object(
    'success', (v_result->>'success')::boolean,
    'refunded', COALESCE((v_result->>'unfrozen')::decimal, 0),
    'idempotent', COALESCE((v_result->>'idempotent')::boolean, false),
    'balance_before', (v_result->>'balance_before')::decimal,
    'balance_after', (v_result->>'balance_after')::decimal,
    'frozen_before', (v_result->>'frozen_before')::decimal,
    'frozen_after', (v_result->>'frozen_after')::decimal
  );
END;
$$;


ALTER FUNCTION "public"."atomic_refund"("p_user_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atomic_refund"("p_user_id" "uuid", "p_activation_id" "uuid" DEFAULT NULL::"uuid", "p_rental_id" "uuid" DEFAULT NULL::"uuid", "p_transaction_id" "uuid" DEFAULT NULL::"uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSON;
BEGIN
  v_result := secure_unfreeze_balance(
    p_user_id, p_activation_id, p_rental_id, TRUE, COALESCE(p_reason,'Refund')
  );

  IF (v_result->>'success')::boolean THEN
    IF p_activation_id IS NOT NULL THEN
      UPDATE activations
      SET 
        frozen_amount = 0,
        status = CASE 
          WHEN status IN ('pending','waiting') THEN 'cancelled'
          ELSE status
        END,
        updated_at = NOW()
      WHERE id = p_activation_id;
    END IF;

    IF p_rental_id IS NOT NULL THEN
      UPDATE rentals
      SET 
        frozen_amount = 0,
        status = CASE 
          WHEN status IN ('active','completed') THEN 'cancelled'
          ELSE status
        END,
        updated_at = NOW()
      WHERE id = p_rental_id;
    END IF;

    IF p_transaction_id IS NOT NULL THEN
      UPDATE transactions
      SET status = 'refunded', updated_at = NOW()
      WHERE id = p_transaction_id AND status = 'pending';
    END IF;
  END IF;

  RETURN json_build_object(
    'success', (v_result->>'success')::boolean,
    'refunded', COALESCE((v_result->>'unfrozen')::decimal, 0),
    'idempotent', COALESCE((v_result->>'idempotent')::boolean, false),
    'balance_before', (v_result->>'balance_before')::decimal,
    'balance_after', (v_result->>'balance_after')::decimal,
    'frozen_before', (v_result->>'frozen_before')::decimal,
    'frozen_after', (v_result->>'frozen_after')::decimal
  );
END;
$$;


ALTER FUNCTION "public"."atomic_refund"("p_user_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_transaction_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atomic_refund_direct"("p_user_id" "uuid", "p_amount" numeric, "p_transaction_id" "uuid" DEFAULT NULL::"uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_user RECORD;
  v_amount_to_refund DECIMAL;
  v_new_frozen DECIMAL;
BEGIN
  -- Validation
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive: %', p_amount;
  END IF;
  
  -- 1. LOCK USER et lire les valeurs
  SELECT balance, frozen_balance
  INTO v_user
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- 2. CALCULATE REFUND (Model A)
  -- On ne peut pas refund plus que ce qui est frozen
  v_amount_to_refund := LEAST(p_amount, v_user.frozen_balance);
  v_new_frozen := GREATEST(0, v_user.frozen_balance - v_amount_to_refund);
  
  -- 3. UPDATE USER (Model A: balance INCHANGÉ, frozen diminue)
  UPDATE users
  SET 
    frozen_balance = v_new_frozen,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- 4. UPDATE TRANSACTION
  IF p_transaction_id IS NOT NULL THEN
    UPDATE transactions
    SET 
      status = 'failed',  -- ✅ FIX: Utiliser 'failed' au lieu de 'refunded'
      balance_after = v_user.balance, -- balance inchangé
      updated_at = NOW()
    WHERE id = p_transaction_id AND status = 'pending';
  END IF;
  
  -- 5. LOG OPERATION (Model A)
  INSERT INTO balance_operations (
    user_id,
    related_transaction_id,
    operation_type,
    amount,
    balance_before,
    balance_after,
    frozen_before,
    frozen_after,
    reason
  ) VALUES (
    p_user_id,
    p_transaction_id,
    'refund',
    v_amount_to_refund,
    v_user.balance,
    v_user.balance, -- Model A: balance inchangé
    v_user.frozen_balance,
    v_new_frozen,
    COALESCE(p_reason, 'Refund - purchase failed before activation')
  );
  
  -- 6. RETURN RESULT
  RETURN json_build_object(
    'success', true,
    'amount_refunded', v_amount_to_refund,
    'balance', v_user.balance,
    'frozen_before', v_user.frozen_balance,
    'frozen_after', v_new_frozen
  );
END;
$$;


ALTER FUNCTION "public"."atomic_refund_direct"("p_user_id" "uuid", "p_amount" numeric, "p_transaction_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."atomic_refund_direct"("p_user_id" "uuid", "p_amount" numeric, "p_transaction_id" "uuid", "p_reason" "text") IS 'Model A: Refund sans activation - balance inchangé, frozen diminue. Fix: status=failed au lieu de refunded';



CREATE OR REPLACE FUNCTION "public"."check_frozen_discrepancies"() RETURNS TABLE("user_id" "uuid", "frozen_balance_user" numeric, "total_frozen_activations" numeric, "frozen_discrepancy" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT user_id, frozen_balance_user, total_frozen_activations, frozen_discrepancy
  FROM v_frozen_balance_health_reconciliation
  WHERE frozen_discrepancy != 0
  ORDER BY ABS(frozen_discrepancy) DESC;
END;
$$;


ALTER FUNCTION "public"."check_frozen_discrepancies"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_frozen_discrepancies"() IS 'Returns users with frozen discrepancies; schedule SELECT * FROM check_frozen_discrepancies() as cron.';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_logs"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM system_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_logs"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_logs"() IS 'Cleanup logs older than 30 days (run via cron)';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_provider_logs"("retention_days" integer DEFAULT 90) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM logs_provider
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_provider_logs"("retention_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_provider_logs"("retention_days" integer) IS 'Supprime les logs de plus de X jours (défaut: 90). Appeler via cron hebdomadaire.';



CREATE OR REPLACE FUNCTION "public"."ensure_user_balance_ledger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Only check when balance or frozen_balance actually change
  IF (NEW.balance IS DISTINCT FROM OLD.balance OR NEW.frozen_balance IS DISTINCT FROM OLD.frozen_balance) THEN
    -- Require a matching balance_operations row in the same transaction window
    IF NOT EXISTS (
      SELECT 1
      FROM balance_operations bo
      WHERE bo.user_id = NEW.id
        AND bo.balance_after = NEW.balance
        AND bo.frozen_after = NEW.frozen_balance
        AND bo.created_at >= now() - interval '5 seconds'
    ) THEN
      RAISE EXCEPTION 'Balance/frozen update requires balance_operations entry (users_balance_guard)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_user_balance_ledger"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."ensure_user_balance_ledger"() IS 'Blocks balance/frozen changes on users unless a matching balance_operations row exists (within 5s window).';



CREATE OR REPLACE FUNCTION "public"."expire_rentals"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Marquer comme expirées les locations dont la date est dépassée
    UPDATE public.rentals
    SET status = 'expired'
    WHERE status = 'active'
    AND expires_at < now();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$;


ALTER FUNCTION "public"."expire_rentals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fix_frozen_balance_discrepancy"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_calculated DECIMAL(10,2);
    v_actual DECIMAL(10,2);
    v_balance DECIMAL(10,2);
    v_activation_frozen DECIMAL(10,2);
    v_rental_frozen DECIMAL(10,2);
BEGIN
    -- Calculer ce que frozen_balance DEVRAIT être (activations)
    SELECT COALESCE(SUM(frozen_amount), 0)
    INTO v_activation_frozen
    FROM activations
    WHERE user_id = p_user_id
    AND status IN ('pending', 'waiting')
    AND frozen_amount > 0;
    
    -- Calculer ce que frozen_balance DEVRAIT être (rentals)
    SELECT COALESCE(SUM(frozen_amount), 0)
    INTO v_rental_frozen
    FROM rentals
    WHERE user_id = p_user_id
    AND status = 'active'
    AND frozen_amount > 0;
    
    -- Total
    v_calculated := v_activation_frozen + v_rental_frozen;
    
    -- Récupérer les valeurs actuelles
    SELECT balance, COALESCE(frozen_balance, 0)
    INTO v_balance, v_actual
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;
    
    -- Si pas de différence significative, retourner
    IF ABS(v_actual - v_calculated) < 0.01 THEN
        RETURN jsonb_build_object(
            'success', true,
            'correction_needed', false,
            'frozen_balance', v_actual,
            'activation_frozen', v_activation_frozen,
            'rental_frozen', v_rental_frozen
        );
    END IF;
    
    -- Corriger
    UPDATE users
    SET frozen_balance = v_calculated
    WHERE id = p_user_id;
    
    -- Logger la correction
    INSERT INTO balance_operations (
        user_id, activation_id, operation_type, amount,
        balance_before, balance_after,
        frozen_before, frozen_after,
        reason, metadata
    ) VALUES (
        p_user_id, NULL, 'correction', v_actual - v_calculated,
        v_balance, v_balance,
        v_actual, v_calculated,
        'Automatic frozen balance reconciliation',
        jsonb_build_object(
            'old_frozen', v_actual,
            'new_frozen', v_calculated,
            'difference', v_actual - v_calculated,
            'activation_frozen', v_activation_frozen,
            'rental_frozen', v_rental_frozen
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'correction_needed', true,
        'old_frozen', v_actual,
        'new_frozen', v_calculated,
        'difference', v_actual - v_calculated,
        'activation_frozen', v_activation_frozen,
        'rental_frozen', v_rental_frozen
    );
END;
$$;


ALTER FUNCTION "public"."fix_frozen_balance_discrepancy"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cron_jobs"() RETURNS TABLE("job_id" bigint, "job_name" "text", "schedule" "text", "is_active" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.jobid,
    j.jobname::text,
    j.schedule::text,
    j.active
  FROM cron.job j
  ORDER BY j.jobname;
END;
$$;


ALTER FUNCTION "public"."get_cron_jobs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_setting"("setting_key" character varying) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (SELECT value FROM system_settings WHERE key = setting_key);
END;
$$;


ALTER FUNCTION "public"."get_setting"("setting_key" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_referral_code TEXT;
  v_referrer_id UUID;
  v_expiry_days INT := 30;
  v_new_referral_code TEXT;
BEGIN
  DELETE FROM public.users WHERE email = NEW.email AND id != NEW.id;
  
  v_new_referral_code := substr(md5(random()::text || NEW.id::text), 1, 8);
  
  INSERT INTO public.users (id, email, name, avatar_url, role, balance, referral_code, created_at, updated_at)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url', 'user', 0, v_new_referral_code, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    referral_code = COALESCE(users.referral_code, EXCLUDED.referral_code),
    updated_at = NOW();

  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  
  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    SELECT id INTO v_referrer_id FROM public.users WHERE referral_code = v_referral_code LIMIT 1;
    IF v_referrer_id IS NOT NULL AND v_referrer_id != NEW.id THEN
      SELECT COALESCE((value)::int, 30) INTO v_expiry_days FROM system_settings WHERE key = 'referral_expiry_days';
      INSERT INTO public.referrals (referrer_id, referee_id, status, expiry_date, created_at)
      VALUES (v_referrer_id, NEW.id, 'pending', NOW() + (v_expiry_days || ' days')::interval, NOW())
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_promo_uses"("code_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE promo_codes 
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE id = code_id;
END;
$$;


ALTER FUNCTION "public"."increment_promo_uses"("code_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lock_user_wallet"("p_user_id" "uuid") RETURNS TABLE("balance" numeric, "frozen_balance" numeric, "available_balance" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.balance, 
    u.frozen_balance,
    u.balance - u.frozen_balance AS available_balance
  FROM users u
  WHERE u.id = p_user_id
  FOR UPDATE;
END;
$$;


ALTER FUNCTION "public"."lock_user_wallet"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_event"("p_level" "text", "p_category" "text", "p_message" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO system_logs (level, category, message, metadata, user_id)
  VALUES (p_level, p_category, p_message, p_metadata, p_user_id)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."log_event"("p_level" "text", "p_category" "text", "p_message" "text", "p_metadata" "jsonb", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_event"("p_level" "text", "p_category" "text", "p_message" "text", "p_metadata" "jsonb", "p_user_id" "uuid") IS 'Helper function to insert logs with validation';



CREATE OR REPLACE FUNCTION "public"."prevent_direct_frozen_amount_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- ✅ Autoriser si la fonction est SECURITY DEFINER (current_user différent de session_user)
  IF current_user IS DISTINCT FROM session_user THEN
    RETURN NEW;
  END IF;

  -- ✅ Autoriser si session_user = postgres
  IF session_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- ✅ Autoriser si current_user = postgres  
  IF current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- ❌ Bloquer les modifications directes de frozen_balance
  IF OLD.frozen_balance IS DISTINCT FROM NEW.frozen_balance THEN
    RAISE EXCEPTION 'Direct update of frozen_balance is forbidden. Use atomic_freeze, atomic_commit, or atomic_refund functions.';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_direct_frozen_amount_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_direct_frozen_clear_activation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Allow SECURITY DEFINER / postgres
  IF current_user IS DISTINCT FROM session_user THEN
    RETURN NEW;
  END IF;
  IF session_user = 'postgres' OR current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- If frozen_amount changes, forbid
  IF OLD.frozen_amount IS DISTINCT FROM NEW.frozen_amount THEN
    RAISE EXCEPTION 'Direct update of activation.frozen_amount is forbidden. Use atomic_* functions.';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_direct_frozen_clear_activation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_direct_frozen_clear_rental"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Allow SECURITY DEFINER / postgres
  IF current_user IS DISTINCT FROM session_user THEN
    RETURN NEW;
  END IF;
  IF session_user = 'postgres' OR current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- If frozen_amount changes, forbid
  IF OLD.frozen_amount IS DISTINCT FROM NEW.frozen_amount THEN
    RAISE EXCEPTION 'Direct update of rental.frozen_amount is forbidden. Use atomic_* functions.';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_direct_frozen_clear_rental"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_expired_activations"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_activation RECORD;
  v_user RECORD;
  v_processed_count INTEGER := 0;
  v_refunded_total DECIMAL := 0;
  v_errors INTEGER := 0;
  v_result JSON;
BEGIN
  RAISE NOTICE 'Starting expired activations processing at %', NOW();
  
  FOR v_activation IN
    SELECT id, user_id, price, frozen_amount, order_id, service_code, expires_at
    FROM activations 
    WHERE status IN ('pending', 'waiting') 
      AND expires_at < NOW()
      AND frozen_amount > 0
    ORDER BY expires_at ASC
    LIMIT 50
  LOOP
    BEGIN
      UPDATE activations 
      SET status = 'timeout', frozen_amount = 0, charged = false, updated_at = NOW()
      WHERE id = v_activation.id 
        AND status IN ('pending', 'waiting')
        AND frozen_amount > 0;
      
      IF NOT FOUND THEN
        CONTINUE;
      END IF;
      
      SELECT balance, frozen_balance INTO v_user
      FROM users WHERE id = v_activation.user_id FOR UPDATE;
      
      UPDATE users
      SET frozen_balance = GREATEST(0, frozen_balance - v_activation.frozen_amount),
          updated_at = NOW()
      WHERE id = v_activation.user_id;
      
      INSERT INTO balance_operations (
        user_id, activation_id, operation_type, amount,
        balance_before, balance_after, frozen_before, frozen_after, reason
      ) VALUES (
        v_activation.user_id, v_activation.id, 'refund', v_activation.frozen_amount,
        v_user.balance, v_user.balance,
        v_user.frozen_balance, GREATEST(0, v_user.frozen_balance - v_activation.frozen_amount),
        'Automatic timeout refund'
      );
      
      v_processed_count := v_processed_count + 1;
      v_refunded_total := v_refunded_total + v_activation.frozen_amount;
      
      RAISE NOTICE 'PROCESSED: % (%) - %Ⓐ refunded', 
        v_activation.id, v_activation.service_code, v_activation.frozen_amount;
        
    EXCEPTION
      WHEN OTHERS THEN
        v_errors := v_errors + 1;
        RAISE WARNING 'ERROR processing activation %: %', v_activation.id, SQLERRM;
    END;
  END LOOP;
  
  v_result := json_build_object(
    'success', true,
    'processed', v_processed_count,
    'refunded_total', v_refunded_total,
    'errors', v_errors,
    'timestamp', NOW()::text
  );
  
  RAISE NOTICE 'COMPLETED: % processed, %Ⓐ refunded, % errors', 
    v_processed_count, v_refunded_total, v_errors;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- CORRIGÉ: RAISE EXCEPTION au lieu de RAISE ERROR
    RAISE EXCEPTION 'FATAL ERROR in process_expired_activations: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."process_expired_activations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_sms_received"("p_order_id" "text", "p_code" "text", "p_text" "text" DEFAULT NULL::"text", "p_source" "text" DEFAULT 'unknown'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_activation activations%ROWTYPE;
  v_tx transactions%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_sms_text TEXT;
  v_commit JSONB;
BEGIN
  -- 1) Lock activation by order_id
  SELECT * INTO v_activation
  FROM activations
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'activation_not_found', 'order_id', p_order_id);
  END IF;

  -- 2) Idempotence with retry: if already received but not charged or still frozen, we still proceed to commit.
  IF v_activation.status = 'received' THEN
    IF COALESCE(v_activation.charged, false) = true AND COALESCE(v_activation.frozen_amount, 0) <= 0 THEN
      RETURN jsonb_build_object('success', true, 'idempotent', true, 'activation_id', v_activation.id);
    END IF;
    -- else keep going to force the missing commit/cleanup
  END IF;

  -- 3) Prepare SMS text
  v_sms_text := COALESCE(p_text, v_activation.sms_text, format('Votre code de validation est %s', p_code));

  -- 4) Update activation with SMS (set received if not already, also fill missing sms_received_at)
  UPDATE activations
  SET
    status = 'received',
    sms_code = p_code,
    sms_text = v_sms_text,
    sms_received_at = COALESCE(v_activation.sms_received_at, v_now),
    updated_at = v_now
  WHERE id = v_activation.id;

  -- 5) Fetch pending transaction if any
  SELECT * INTO v_tx
  FROM transactions
  WHERE related_activation_id = v_activation.id
    AND status = 'pending'
  LIMIT 1;

  -- 6) Commit funds atomically via guard-safe path (links transaction if present)
  SELECT secure_unfreeze_balance(
    p_user_id := v_activation.user_id,
    p_activation_id := v_activation.id,
    p_rental_id := NULL,
    p_refund_to_balance := false,
    p_refund_reason := CONCAT('SMS received (', p_source, ')')
  ) INTO v_commit;

  IF COALESCE(v_commit ->> 'success', 'false') <> 'true' THEN
    RAISE EXCEPTION 'secure_unfreeze_balance failed: %', v_commit;
  END IF;

  -- 7) Mark transaction completed if it was pending
  IF v_tx.id IS NOT NULL THEN
    UPDATE transactions
    SET status = 'completed', updated_at = v_now
    WHERE id = v_tx.id AND status = 'pending';
  END IF;

  -- 8) Return result
  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'activation_id', v_activation.id,
    'code', p_code,
    'source', p_source,
    'commit', v_commit
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'order_id', p_order_id
  );
END;
$$;


ALTER FUNCTION "public"."process_sms_received"("p_order_id" "text", "p_code" "text", "p_text" "text", "p_source" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reconcile_frozen_balance"("p_user_id" "uuid") RETURNS TABLE("calculated_frozen" numeric, "actual_frozen" numeric, "difference" numeric, "needs_correction" boolean)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_calculated DECIMAL(10,2);
    v_actual DECIMAL(10,2);
    v_activation_frozen DECIMAL(10,2);
    v_rental_frozen DECIMAL(10,2);
BEGIN
    -- Calculer la somme des frozen_amount pour les activations actives
    SELECT COALESCE(SUM(frozen_amount), 0)
    INTO v_activation_frozen
    FROM activations
    WHERE user_id = p_user_id
    AND status IN ('pending', 'waiting')
    AND frozen_amount > 0;
    
    -- Calculer la somme des frozen_amount pour les rentals actives
    SELECT COALESCE(SUM(frozen_amount), 0)
    INTO v_rental_frozen
    FROM rentals
    WHERE user_id = p_user_id
    AND status = 'active'
    AND frozen_amount > 0;
    
    -- Total calculé
    v_calculated := v_activation_frozen + v_rental_frozen;
    
    -- Récupérer le frozen_balance actuel
    SELECT COALESCE(frozen_balance, 0)
    INTO v_actual
    FROM users
    WHERE id = p_user_id;
    
    RETURN QUERY SELECT 
        v_calculated,
        v_actual,
        v_actual - v_calculated,
        ABS(v_actual - v_calculated) > 0.01;
END;
$$;


ALTER FUNCTION "public"."reconcile_frozen_balance"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reconcile_orphan_freezes"() RETURNS TABLE("activation_id" "uuid", "user_id" "uuid", "frozen_amount" numeric, "status" "text", "refund_applied" boolean, "error" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_activation RECORD;
  v_refund_exists BOOLEAN;
  v_refund_result jsonb;
BEGIN
  FOR v_activation IN
    SELECT a.id, a.user_id, a.frozen_amount, a.status
    FROM activations a
    WHERE a.frozen_amount > 0
      AND a.status IN ('timeout', 'failed', 'cancelled')
      AND a.charged = false
    ORDER BY a.created_at DESC
    LIMIT 50
  LOOP
    SELECT EXISTS(
      SELECT 1 
      FROM balance_operations bo
      WHERE bo.activation_id = v_activation.id 
        AND bo.operation_type = 'refund'
    ) INTO v_refund_exists;
    
    IF NOT v_refund_exists THEN
      BEGIN
        SELECT atomic_refund(
          p_user_id := v_activation.user_id,
          p_activation_id := v_activation.id,
          p_rental_id := NULL,
          p_transaction_id := NULL,
          p_reason := 'Reconciliation: orphan freeze cleanup'
        ) INTO v_refund_result;
        
        RETURN QUERY SELECT 
          v_activation.id,
          v_activation.user_id,
          v_activation.frozen_amount,
          v_activation.status,
          true,
          NULL::text;
        
        RAISE NOTICE 'Reconciled activation %: refunded % Ⓐ', v_activation.id, v_activation.frozen_amount;
      EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
          v_activation.id,
          v_activation.user_id,
          v_activation.frozen_amount,
          v_activation.status,
          false,
          SQLERRM;
      END;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;


ALTER FUNCTION "public"."reconcile_orphan_freezes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reconcile_orphan_freezes"() IS 'Cron job function: find activations with frozen_amount > 0 but status=timeout/failed/cancelled, apply atomic_refund if no refund exists';



CREATE OR REPLACE FUNCTION "public"."reconcile_rentals_orphan_freezes"() RETURNS TABLE("rental_id" "uuid", "user_id" "uuid", "frozen_amount" numeric, "status" "text", "refund_applied" boolean, "error" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_rental RECORD;
  v_refund_exists BOOLEAN;
  v_refund_result jsonb;
BEGIN
  FOR v_rental IN
    SELECT r.id, r.user_id, r.frozen_amount, r.status
    FROM rentals r
    WHERE r.frozen_amount > 0
      AND r.status IN ('expired', 'failed', 'cancelled')
    ORDER BY r.created_at DESC
    LIMIT 50
  LOOP
    SELECT EXISTS(
      SELECT 1 
      FROM balance_operations bo
      WHERE bo.rental_id = v_rental.id 
        AND bo.operation_type = 'refund'
    ) INTO v_refund_exists;
    
    IF NOT v_refund_exists THEN
      BEGIN
        SELECT atomic_refund(
          p_user_id := v_rental.user_id,
          p_activation_id := NULL,
          p_rental_id := v_rental.id,
          p_transaction_id := NULL,
          p_reason := 'Reconciliation: rental orphan freeze cleanup'
        ) INTO v_refund_result;
        
        RETURN QUERY SELECT 
          v_rental.id,
          v_rental.user_id,
          v_rental.frozen_amount,
          v_rental.status,
          true,
          NULL::text;
        
        RAISE NOTICE 'Reconciled rental %: refunded % Ⓐ', v_rental.id, v_rental.frozen_amount;
      EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
          v_rental.id,
          v_rental.user_id,
          v_rental.frozen_amount,
          v_rental.status,
          false,
          SQLERRM;
      END;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;


ALTER FUNCTION "public"."reconcile_rentals_orphan_freezes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."secure_freeze_balance"("p_user_id" "uuid", "p_amount" numeric, "p_activation_id" "uuid" DEFAULT NULL::"uuid", "p_rental_id" "uuid" DEFAULT NULL::"uuid", "p_reason" "text" DEFAULT 'Balance freeze'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user RECORD;
  v_available DECIMAL;
BEGIN
  SELECT id, balance, frozen_balance INTO v_user
  FROM users WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  v_available := v_user.balance - COALESCE(v_user.frozen_balance, 0);

  IF v_available < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  UPDATE users
  SET frozen_balance = frozen_balance + p_amount, updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO balance_operations (
    user_id, activation_id, rental_id, operation_type, amount,
    balance_before, balance_after, frozen_before, frozen_after, reason
  ) VALUES (
    p_user_id, p_activation_id, p_rental_id, 'freeze', p_amount,
    v_user.balance, v_user.balance,
    v_user.frozen_balance, v_user.frozen_balance + p_amount, p_reason
  );

  IF p_activation_id IS NOT NULL THEN
    UPDATE activations SET frozen_amount = p_amount WHERE id = p_activation_id;
  END IF;

  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals SET frozen_amount = p_amount WHERE id = p_rental_id;
  END IF;

  RETURN json_build_object('success', true, 'frozen', p_amount);
END;
$$;


ALTER FUNCTION "public"."secure_freeze_balance"("p_user_id" "uuid", "p_amount" numeric, "p_activation_id" "uuid", "p_rental_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."secure_moneyfusion_credit"("p_transaction_id" "uuid", "p_token" "text" DEFAULT NULL::"text", "p_reference" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_tx record;
  v_already boolean;
  v_credit numeric;
  v_now timestamptz := now();
  v_balance_before numeric;
  v_balance_after numeric;
  v_frozen_before numeric;
  v_frozen_after numeric;
  v_reason text;
begin
  select * into v_tx
  from transactions
  where id = p_transaction_id
  for update;

  if not found then
    raise exception 'transaction % not found', p_transaction_id using errcode = 'P0002';
  end if;

  if v_tx.type <> 'deposit' then
    raise exception 'transaction % is not a deposit', p_transaction_id using errcode = 'P0003';
  end if;

  select exists(
    select 1 from balance_operations
    where related_transaction_id = v_tx.id
      and operation_type = 'credit_admin'
  ) into v_already;

  if v_already then
    update transactions
      set status = 'completed', updated_at = v_now
      where id = v_tx.id;
    return jsonb_build_object('status', 'noop', 'reason', 'already_credited');
  end if;

  v_credit := coalesce((v_tx.metadata ->> 'activations')::numeric, v_tx.amount);
  if coalesce(v_credit, 0) <= 0 then
    raise exception 'transaction % has no creditable amount', p_transaction_id using errcode = 'P0004';
  end if;

  -- lock user row
  select balance, frozen_balance into v_balance_before, v_frozen_before
  from users where id = v_tx.user_id for update;

  v_balance_after := coalesce(v_balance_before, 0) + v_credit;
  v_frozen_after := v_frozen_before; -- unchanged, but must match guard
  v_reason := coalesce(p_reference, v_tx.reference, 'MoneyFusion');

  -- ledger entry to satisfy balance guard
  insert into balance_operations(
    user_id,
    related_transaction_id,
    operation_type,
    amount,
    balance_before,
    balance_after,
    frozen_before,
    frozen_after,
    reason,
    metadata,
    created_at
  ) values (
    v_tx.user_id,
    v_tx.id,
    'credit_admin',
    v_credit,
    v_balance_before,
    v_balance_after,
    v_frozen_before,
    v_frozen_after,
    v_reason,
    jsonb_build_object(
      'moneyfusion_token', coalesce(p_token, v_tx.metadata ->> 'moneyfusion_token'),
      'source', 'secure_moneyfusion_credit'
    ),
    v_now
  );

  -- update user balance
  update users
    set balance = v_balance_after,
        updated_at = v_now
  where id = v_tx.user_id;

  -- update transaction
  update transactions
    set status = 'completed',
        balance_before = coalesce(v_tx.balance_before, v_balance_before),
        balance_after = v_balance_after,
        updated_at = v_now,
        metadata = coalesce(v_tx.metadata, '{}'::jsonb)
                   || jsonb_build_object(
                        'moneyfusion_token', coalesce(p_token, v_tx.metadata ->> 'moneyfusion_token'),
                        'moneyfusion_status', coalesce(v_tx.metadata ->> 'moneyfusion_status', 'paid'),
                        'moneyfusion_completed_at', v_now,
                        'autocredit', true,
                        'autocredit_source', 'secure_moneyfusion_credit'
                      )
    where id = v_tx.id;

  return jsonb_build_object(
    'status', 'credited',
    'transaction_id', v_tx.id,
    'user_id', v_tx.user_id,
    'credit', v_credit,
    'balance_after', v_balance_after
  );
end;
$$;


ALTER FUNCTION "public"."secure_moneyfusion_credit"("p_transaction_id" "uuid", "p_token" "text", "p_reference" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."secure_moneyfusion_credit"("p_transaction_id" "uuid", "p_token" "text", "p_reference" "text") IS 'Idempotent MoneyFusion credit via SECURITY DEFINER; writes balance_operations and updates users/transactions directly.';



CREATE OR REPLACE FUNCTION "public"."secure_moneyfusion_credit_v2"("p_transaction_id" "uuid", "p_token" "text", "p_reference" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tx transactions%rowtype;
  v_user_balance numeric;
  v_user_frozen numeric;
  v_credits numeric;
  v_now timestamptz := now();
BEGIN
  -- Lock transaction
  SELECT * INTO v_tx
  FROM transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'transaction % not found', p_transaction_id USING errcode = 'P0002';
  END IF;

  -- Idempotence: already credited?
  IF EXISTS (
    SELECT 1 FROM balance_operations
    WHERE related_transaction_id = p_transaction_id
      AND operation_type = 'credit_admin'
    LIMIT 1
  ) THEN
    RETURN jsonb_build_object('status', 'noop', 'reason', 'already_credited');
  END IF;

  -- Extract credits from metadata
  v_credits := coalesce((v_tx.metadata->>'activations')::numeric, 0);
  IF v_credits <= 0 THEN
    RAISE EXCEPTION 'no activations in transaction metadata' USING errcode = 'P0003';
  END IF;

  -- Lock user
  SELECT balance, frozen_balance INTO v_user_balance, v_user_frozen
  FROM users WHERE id = v_tx.user_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user % not found', v_tx.user_id USING errcode = 'P0004';
  END IF;

  v_user_balance := coalesce(v_user_balance, 0) + v_credits;

  -- Insert balance operation
  INSERT INTO balance_operations(
    user_id, related_transaction_id, operation_type, amount,
    balance_before, balance_after, frozen_before, frozen_after,
    reason, metadata, created_at
  ) VALUES (
    v_tx.user_id, p_transaction_id, 'credit_admin', v_credits,
    coalesce(v_user_balance, 0) - v_credits, v_user_balance,
    coalesce(v_user_frozen, 0), coalesce(v_user_frozen, 0),
    'moneyfusion_topup',
    jsonb_build_object(
      'token', p_token,
      'reference', p_reference,
      'credits', v_credits
    ),
    v_now
  );

  -- Update user balance
  UPDATE users
    SET balance = v_user_balance,
        updated_at = v_now
    WHERE id = v_tx.user_id;

  -- Mark transaction completed
  UPDATE transactions
    SET status = 'completed',
        balance_after = v_user_balance,
        updated_at = v_now
    WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'status', 'credited',
    'transaction_id', p_transaction_id,
    'user_id', v_tx.user_id,
    'credits', v_credits,
    'new_balance', v_user_balance
  );
END;
$$;


ALTER FUNCTION "public"."secure_moneyfusion_credit_v2"("p_transaction_id" "uuid", "p_token" "text", "p_reference" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."secure_moneyfusion_credit_v2"("p_transaction_id" "uuid", "p_token" "text", "p_reference" "text") IS 'Crédite le solde utilisateur de façon idempotente après paiement MoneyFusion (version 2, sans drop).';



CREATE OR REPLACE FUNCTION "public"."secure_referral_payout"("p_referral_id" "uuid", "p_bonus_referrer" numeric, "p_bonus_referee" numeric, "p_reason" "text" DEFAULT 'referral_bonus'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_ref referrals%rowtype;
  v_now timestamptz := now();
  v_referrer_balance_before numeric;
  v_referrer_balance_after numeric;
  v_referrer_frozen numeric;
  v_referee_balance_before numeric;
  v_referee_balance_after numeric;
  v_referee_frozen numeric;
BEGIN
  SELECT * INTO v_ref
  FROM referrals
  WHERE id = p_referral_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'referral % not found', p_referral_id USING errcode = 'P0002';
  END IF;

  IF v_ref.status = 'rewarded' THEN
    RETURN jsonb_build_object('status', 'noop', 'reason', 'already_rewarded');
  END IF;

  IF v_ref.referee_id IS NULL THEN
    RAISE EXCEPTION 'referee missing on referral %', p_referral_id USING errcode = 'P0003';
  END IF;

  -- Credit referee
  SELECT balance, frozen_balance INTO v_referee_balance_before, v_referee_frozen
  FROM users WHERE id = v_ref.referee_id FOR UPDATE;

  v_referee_balance_before := coalesce(v_referee_balance_before, 0);
  v_referee_balance_after := v_referee_balance_before + coalesce(p_bonus_referee, 0);
  v_referee_frozen := coalesce(v_referee_frozen, 0);

  INSERT INTO balance_operations(
    user_id, related_transaction_id, operation_type, amount,
    balance_before, balance_after, frozen_before, frozen_after,
    reason, metadata, created_at
  ) VALUES (
    v_ref.referee_id, NULL, 'credit_admin', coalesce(p_bonus_referee, 0),
    v_referee_balance_before, v_referee_balance_after,
    v_referee_frozen, v_referee_frozen,
    p_reason,
    jsonb_build_object('source', 'referral_bonus', 'referral_id', p_referral_id),
    v_now
  );

  UPDATE users
    SET balance = v_referee_balance_after,
        updated_at = v_now
    WHERE id = v_ref.referee_id;

  -- Credit referrer if present
  IF v_ref.referrer_id IS NOT NULL AND coalesce(p_bonus_referrer, 0) > 0 THEN
    SELECT balance, frozen_balance INTO v_referrer_balance_before, v_referrer_frozen
    FROM users WHERE id = v_ref.referrer_id FOR UPDATE;

    v_referrer_balance_before := coalesce(v_referrer_balance_before, 0);
    v_referrer_balance_after := v_referrer_balance_before + coalesce(p_bonus_referrer, 0);
    v_referrer_frozen := coalesce(v_referrer_frozen, 0);

    INSERT INTO balance_operations(
      user_id, related_transaction_id, operation_type, amount,
      balance_before, balance_after, frozen_before, frozen_after,
      reason, metadata, created_at
    ) VALUES (
      v_ref.referrer_id, NULL, 'credit_admin', coalesce(p_bonus_referrer, 0),
      v_referrer_balance_before, v_referrer_balance_after,
      v_referrer_frozen, v_referrer_frozen,
      p_reason,
      jsonb_build_object('source', 'referral_bonus', 'referral_id', p_referral_id),
      v_now
    );

    UPDATE users
      SET balance = v_referrer_balance_after,
          updated_at = v_now
      WHERE id = v_ref.referrer_id;
  END IF;

  -- Log transactions for visibility in admin (idempotent because function returns noop when already rewarded)
  IF coalesce(p_bonus_referee, 0) > 0 THEN
    INSERT INTO transactions(
      user_id, type, amount, status, description, reference, 
      balance_before, balance_after,
      metadata, created_at
    ) VALUES (
      v_ref.referee_id,
      'referral_bonus',
      p_bonus_referee,
      'completed',
      'Bonus parrainage (filleul)',
      concat('REF-', p_referral_id, '-REFEREE'),
      v_referee_balance_before,
      v_referee_balance_after,
      jsonb_build_object('referral_id', p_referral_id, 'role', 'referee'),
      v_now
    )
    ON CONFLICT (reference) DO NOTHING;
  END IF;

  IF v_ref.referrer_id IS NOT NULL AND coalesce(p_bonus_referrer, 0) > 0 THEN
    INSERT INTO transactions(
      user_id, type, amount, status, description, reference, 
      balance_before, balance_after,
      metadata, created_at
    ) VALUES (
      v_ref.referrer_id,
      'referral_bonus',
      p_bonus_referrer,
      'completed',
      'Bonus parrainage (parrain)',
      concat('REF-', p_referral_id, '-REFERRER'),
      v_referrer_balance_before,
      v_referrer_balance_after,
      jsonb_build_object('referral_id', p_referral_id, 'role', 'referrer'),
      v_now
    )
    ON CONFLICT (reference) DO NOTHING;
  END IF;

  UPDATE referrals
    SET status = 'rewarded',
        rewarded_at = v_now,
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
          'payout_reason', p_reason,
          'bonus_referrer', coalesce(p_bonus_referrer, 0),
          'bonus_referee', coalesce(p_bonus_referee, 0)
        )
    WHERE id = p_referral_id;

  RETURN jsonb_build_object('status', 'rewarded', 'referral_id', p_referral_id);
END;
$$;


ALTER FUNCTION "public"."secure_referral_payout"("p_referral_id" "uuid", "p_bonus_referrer" numeric, "p_bonus_referee" numeric, "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."secure_referral_payout"("p_referral_id" "uuid", "p_bonus_referrer" numeric, "p_bonus_referee" numeric, "p_reason" "text") IS 'Crédite parrain/filleul de façon idempotente et marque le referral comme rewarded.';



CREATE OR REPLACE FUNCTION "public"."secure_unfreeze_balance"("p_user_id" "uuid", "p_activation_id" "uuid" DEFAULT NULL::"uuid", "p_rental_id" "uuid" DEFAULT NULL::"uuid", "p_refund_to_balance" boolean DEFAULT false, "p_refund_reason" "text" DEFAULT 'Refund'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user RECORD;
  v_frozen_amount DECIMAL := 0;
  v_balance_before DECIMAL := 0;
  v_frozen_before DECIMAL := 0;
  v_new_balance DECIMAL := 0;
  v_new_frozen DECIMAL := 0;
  v_operation_type TEXT;
BEGIN
  SELECT id, balance, frozen_balance INTO v_user
  FROM users WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  IF p_activation_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount
    FROM activations
    WHERE id = p_activation_id AND user_id = p_user_id FOR UPDATE;
  ELSIF p_rental_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount
    FROM rentals
    WHERE id = p_rental_id AND user_id = p_user_id FOR UPDATE;
  END IF;

  v_frozen_amount := COALESCE(v_frozen_amount, 0);
  v_balance_before := v_user.balance;
  v_frozen_before := COALESCE(v_user.frozen_balance, 0);

  IF v_frozen_amount <= 0 THEN
    RETURN json_build_object(
      'success', true,
      'idempotent', true,
      'unfrozen', 0,
      'balance_before', v_balance_before,
      'balance_after', v_balance_before,
      'frozen_before', v_frozen_before,
      'frozen_after', v_frozen_before
    );
  END IF;

  -- Calculate new balances depending on refund or commit (charge)
  v_new_frozen := GREATEST(0, v_frozen_before - v_frozen_amount);
  IF p_refund_to_balance THEN
    v_operation_type := 'refund';
    v_new_balance := v_balance_before; -- Model A: refund just frees frozen, balance unchanged
  ELSE
    v_operation_type := 'commit';
    v_new_balance := v_balance_before - v_frozen_amount; -- Charge: consume the frozen amount from balance
  END IF;

  -- Insert ledger FIRST so users_balance_guard passes on the upcoming user update
  INSERT INTO balance_operations (
    user_id, activation_id, rental_id, operation_type, amount,
    balance_before, balance_after, frozen_before, frozen_after, reason
  ) VALUES (
    p_user_id, p_activation_id, p_rental_id, v_operation_type, v_frozen_amount,
    v_balance_before, v_new_balance,
    v_frozen_before, v_new_frozen,
    p_refund_reason
  );

  -- Update user balances
  UPDATE users
  SET frozen_balance = v_new_frozen,
      balance = v_new_balance,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Clear frozen_amount on the activation/rental
  IF p_activation_id IS NOT NULL THEN
    UPDATE activations
    SET frozen_amount = 0,
        charged = charged OR (NOT p_refund_to_balance),
        status = CASE
                   WHEN NOT p_refund_to_balance AND status IN ('pending', 'waiting') THEN 'received'
                   ELSE status
                 END,
        updated_at = NOW()
    WHERE id = p_activation_id;
  END IF;

  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals
    SET frozen_amount = 0,
        charged = charged OR (NOT p_refund_to_balance),
        status = CASE
                   WHEN NOT p_refund_to_balance AND status IN ('active', 'pending') THEN 'completed'
                   ELSE status
                 END,
        updated_at = NOW()
    WHERE id = p_rental_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'unfrozen', v_frozen_amount,
    'balance_before', v_balance_before,
    'balance_after', v_new_balance,
    'frozen_before', v_frozen_before,
    'frozen_after', v_new_frozen
  );
END;
$$;


ALTER FUNCTION "public"."secure_unfreeze_balance"("p_user_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_refund_to_balance" boolean, "p_refund_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transfer_service_stock"("source_code" "text", "target_code" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Vérifier si les deux services existent
  IF NOT EXISTS (SELECT 1 FROM services WHERE code = source_code) THEN
    RAISE NOTICE 'Service source % n''existe pas, skip', source_code;
    RETURN;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM services WHERE code = target_code) THEN
    RAISE NOTICE 'Service target % n''existe pas, skip', target_code;
    RETURN;
  END IF;
  
  -- Transférer le total_available
  UPDATE services
  SET total_available = COALESCE(total_available, 0) + (
    SELECT COALESCE(total_available, 0) 
    FROM services 
    WHERE code = source_code
  )
  WHERE code = target_code;
  
  -- Mettre à jour les foreign keys dans service_icons
  UPDATE service_icons
  SET service_code = target_code
  WHERE service_code = source_code;
  
  -- Mettre à jour les foreign keys dans pricing_rules
  UPDATE pricing_rules
  SET service_code = target_code
  WHERE service_code = source_code
  AND NOT EXISTS (
    SELECT 1 FROM pricing_rules 
    WHERE service_code = target_code 
    AND country_code = pricing_rules.country_code
  );
  
  -- Supprimer les pricing_rules en doublon
  DELETE FROM pricing_rules
  WHERE service_code = source_code;
  
  -- Désactiver le service source
  UPDATE services
  SET active = false
  WHERE code = source_code;
  
  RAISE NOTICE 'Stock transféré de % vers % avec foreign keys mis à jour', source_code, target_code;
END;
$$;


ALTER FUNCTION "public"."transfer_service_stock"("source_code" "text", "target_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_activation_packages_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_activation_packages_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_activations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_activations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_contact_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_contact_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_payment_providers_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_payment_providers_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_rentals_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_rentals_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_setting"("setting_key" character varying, "setting_value" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_role VARCHAR;
BEGIN
  -- Check if user is admin
  SELECT role INTO user_role FROM users WHERE id = auth.uid();
  
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can update settings';
  END IF;
  
  -- Update setting
  UPDATE system_settings 
  SET value = setting_value, updated_at = NOW()
  WHERE key = setting_key;
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."update_setting"("setting_key" character varying, "setting_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_promo_code"("p_code" "text", "p_user_id" "uuid", "p_purchase_amount" numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_promo promo_codes%ROWTYPE;
  v_user_uses INT;
  v_discount NUMERIC;
BEGIN
  -- Chercher le code promo
  SELECT * INTO v_promo
  FROM promo_codes
  WHERE UPPER(code) = UPPER(p_code)
    AND is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Code promo invalide');
  END IF;
  
  -- Vérifier les dates
  IF v_promo.start_date IS NOT NULL AND NOW() < v_promo.start_date THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Code promo pas encore actif');
  END IF;
  
  IF v_promo.end_date IS NOT NULL AND NOW() > v_promo.end_date THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Code promo expiré');
  END IF;
  
  -- Vérifier le montant minimum
  IF p_purchase_amount < v_promo.min_purchase THEN
    RETURN jsonb_build_object(
      'valid', false, 
      'error', 'Montant minimum: ' || v_promo.min_purchase || 'Ⓐ'
    );
  END IF;
  
  -- Vérifier les utilisations globales
  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Code promo épuisé');
  END IF;
  
  -- Vérifier les utilisations par utilisateur
  SELECT COUNT(*) INTO v_user_uses
  FROM promo_code_uses
  WHERE promo_code_id = v_promo.id AND user_id = p_user_id;
  
  IF v_promo.max_uses_per_user IS NOT NULL AND v_user_uses >= v_promo.max_uses_per_user THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Vous avez déjà utilisé ce code');
  END IF;
  
  -- Calculer la réduction
  IF v_promo.discount_type = 'percentage' THEN
    v_discount := p_purchase_amount * (v_promo.discount_value / 100);
    -- Appliquer le max_discount si défini
    IF v_promo.max_discount IS NOT NULL AND v_discount > v_promo.max_discount THEN
      v_discount := v_promo.max_discount;
    END IF;
  ELSE
    -- Fixed discount
    v_discount := LEAST(v_promo.discount_value, p_purchase_amount);
  END IF;
  
  -- Arrondir
  v_discount := ROUND(v_discount, 2);
  
  RETURN jsonb_build_object(
    'valid', true,
    'promo_code_id', v_promo.id,
    'code', v_promo.code,
    'description', v_promo.description,
    'discount_type', v_promo.discount_type,
    'discount_value', v_promo.discount_value,
    'discount_amount', v_discount,
    'final_amount', p_purchase_amount + v_discount, -- Bonus: on AJOUTE au lieu de soustraire du prix
    'message', CASE 
      WHEN v_promo.discount_type = 'percentage' 
      THEN '+' || v_promo.discount_value || '% bonus'
      ELSE '+' || v_promo.discount_value || 'Ⓐ bonus'
    END
  );
END;
$$;


ALTER FUNCTION "public"."validate_promo_code"("p_code" "text", "p_user_id" "uuid", "p_purchase_amount" numeric) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activation_packages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "activations" integer NOT NULL,
    "price_xof" numeric(10,2) NOT NULL,
    "price_eur" numeric(10,2) NOT NULL,
    "price_usd" numeric(10,2) NOT NULL,
    "is_popular" boolean DEFAULT false,
    "savings_percentage" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."activation_packages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "order_id" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "service_code" "text" NOT NULL,
    "country_code" "text" NOT NULL,
    "operator" "text" NOT NULL,
    "price" numeric(10,2),
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "sms_code" "text",
    "sms_text" "text",
    "sms_received_at" timestamp with time zone,
    "expires_at" timestamp with time zone NOT NULL,
    "cancelled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "charged" boolean DEFAULT false,
    "provider" "text" DEFAULT 'sms-activate'::"text",
    "external_id" "text",
    "frozen_amount" numeric(10,2) DEFAULT 0
);


ALTER TABLE "public"."activations" OWNER TO "postgres";


COMMENT ON TABLE "public"."activations" IS 'Gestion des activations de numéros 5sim avec facturation à la réception du SMS';



COMMENT ON COLUMN "public"."activations"."price" IS 'Prix historique au moment de l''achat (USD). Calculé dynamiquement via getPrices API lors de l''achat.';



COMMENT ON COLUMN "public"."activations"."status" IS 'pending: En attente SMS | received: SMS reçu et facturé | timeout: Expiré et remboursé | cancelled: Annulé manuellement | completed: Terminé avec succès';



COMMENT ON COLUMN "public"."activations"."frozen_amount" IS 'Montant gelé pour cette activation spécifique. Utilisé pour le dégel sécurisé.';



CREATE OR REPLACE VIEW "public"."activation_stats" AS
 SELECT "user_id",
    "count"(*) AS "total_activations",
    "count"(*) FILTER (WHERE ("status" = 'received'::"text")) AS "successful_activations",
    "count"(*) FILTER (WHERE ("status" = 'timeout'::"text")) AS "timeout_count",
    "count"(*) FILTER (WHERE ("status" = 'cancelled'::"text")) AS "cancelled_count",
    "sum"("price") FILTER (WHERE ("status" = 'received'::"text")) AS "total_spent",
    "max"("created_at") AS "last_activation_at"
   FROM "public"."activations"
  GROUP BY "user_id";


ALTER VIEW "public"."activation_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "uuid",
    "details" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rentals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rent_id" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "service_code" "text" NOT NULL,
    "country_code" "text" NOT NULL,
    "operator" "text" DEFAULT 'any'::"text",
    "start_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "rent_hours" integer NOT NULL,
    "hourly_rate" numeric(10,2),
    "total_cost" numeric(10,2),
    "refund_amount" numeric(10,2) DEFAULT 0,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "last_message_date" timestamp with time zone,
    "message_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "duration_hours" integer,
    "expires_at" timestamp with time zone,
    "rental_id" "text",
    "provider" "text" DEFAULT 'sms-activate'::"text",
    "frozen_amount" numeric(10,2) DEFAULT 0,
    "service" "text",
    "service_name" "text",
    "country" "text",
    "phone_number" "text",
    "price" numeric(10,2),
    "sms_messages" "jsonb" DEFAULT '[]'::"jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "charged" boolean DEFAULT false,
    CONSTRAINT "rentals_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'cancelled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."rentals" OWNER TO "postgres";


COMMENT ON COLUMN "public"."rentals"."hourly_rate" IS 'Tarif horaire historique (USD) au moment de la location. Calculé via getRentServicesAndCountries API.';



COMMENT ON COLUMN "public"."rentals"."total_cost" IS 'Coût total historique de la location. Calculé: hourly_rate * rent_hours.';



COMMENT ON COLUMN "public"."rentals"."frozen_amount" IS 'Montant gelé pour cette location spécifique. Utilisé pour le dégel sécurisé.';



CREATE OR REPLACE VIEW "public"."available_services" AS
 SELECT DISTINCT "activations"."service_code",
    "activations"."country_code",
    'activation'::"text" AS "type",
    "count"(*) AS "usage_count",
    "max"("activations"."created_at") AS "last_used"
   FROM "public"."activations"
  WHERE (("activations"."service_code" IS NOT NULL) AND ("activations"."country_code" IS NOT NULL))
  GROUP BY "activations"."service_code", "activations"."country_code"
UNION ALL
 SELECT DISTINCT "rentals"."service_code",
    "rentals"."country_code",
    'rental'::"text" AS "type",
    "count"(*) AS "usage_count",
    "max"("rentals"."created_at") AS "last_used"
   FROM "public"."rentals"
  WHERE (("rentals"."service_code" IS NOT NULL) AND ("rentals"."country_code" IS NOT NULL))
  GROUP BY "rentals"."service_code", "rentals"."country_code"
  ORDER BY 5 DESC;


ALTER VIEW "public"."available_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."balance_operations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "activation_id" "uuid",
    "rental_id" "uuid",
    "related_transaction_id" "uuid",
    "operation_type" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "balance_before" numeric NOT NULL,
    "balance_after" numeric NOT NULL,
    "frozen_before" numeric NOT NULL,
    "frozen_after" numeric NOT NULL,
    "reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "balance_operations_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "balance_operations_operation_type_check" CHECK (("operation_type" = ANY (ARRAY['freeze'::"text", 'refund'::"text", 'credit_admin'::"text", 'commit'::"text", 'debit_admin'::"text"]))),
    CONSTRAINT "valid_balance" CHECK (("balance_after" >= (0)::numeric))
);


ALTER TABLE "public"."balance_operations" OWNER TO "postgres";


COMMENT ON TABLE "public"."balance_operations" IS 'Audit trail complet de toutes les opérations wallet (freeze/commit/refund). related_transaction_id stocke l''ID de transaction sans contrainte FK.';



CREATE TABLE IF NOT EXISTS "public"."contact_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) DEFAULT 'support@onesms-sn.com'::character varying NOT NULL,
    "whatsapp" character varying(50) DEFAULT '+221 77 123 45 67'::character varying,
    "address" character varying(255) DEFAULT 'Dakar, Sénégal'::character varying,
    "address_detail" character varying(255) DEFAULT 'Afrique de l''Ouest'::character varying,
    "hours_weekday" character varying(100) DEFAULT 'Lundi - Vendredi: 9h - 18h'::character varying,
    "hours_saturday" character varying(100) DEFAULT 'Samedi: 9h - 14h'::character varying,
    "hours_sunday" character varying(100) DEFAULT 'Dimanche: Fermé'::character varying,
    "email_response_time" character varying(100) DEFAULT 'Réponse sous 24h'::character varying,
    "whatsapp_hours" character varying(100) DEFAULT 'Lun-Sam, 9h-18h'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."contact_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."countries" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "flag_emoji" "text" DEFAULT '🌍'::"text",
    "active" boolean DEFAULT true,
    "price_multiplier" numeric(4,2) DEFAULT 1.00,
    "available_numbers" integer DEFAULT 0,
    "provider" "text" DEFAULT '5sim'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "success_rate" numeric(5,2) DEFAULT 99.00,
    "display_order" integer DEFAULT 0,
    "popularity_score" integer DEFAULT 0,
    "flag_url" "text"
);


ALTER TABLE "public"."countries" OWNER TO "postgres";


COMMENT ON COLUMN "public"."countries"."flag_url" IS 'URL to the country flag image from flagcdn.com';



CREATE TABLE IF NOT EXISTS "public"."email_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "promo_code" "text",
    "discount" "text",
    "status" "text" DEFAULT 'draft'::"text",
    "total_recipients" integer DEFAULT 0,
    "sent_count" integer DEFAULT 0,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "sent_at" timestamp with time zone
);


ALTER TABLE "public"."email_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "type" "text" NOT NULL,
    "subject" "text",
    "status" "text" DEFAULT 'sent'::"text",
    "resend_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."favorite_services" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "service_code" "text" NOT NULL,
    "service_name" "text" NOT NULL,
    "country" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."favorite_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."logs_provider" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "provider" "text" DEFAULT 'sms-activate'::"text" NOT NULL,
    "action" "text" NOT NULL,
    "request_url" "text" NOT NULL,
    "request_params" "jsonb",
    "response_status" integer,
    "response_body" "text",
    "response_time_ms" integer,
    "user_id" "uuid",
    "activation_id" "uuid",
    "rental_id" "uuid",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."logs_provider" OWNER TO "postgres";


COMMENT ON TABLE "public"."logs_provider" IS 'Historique de tous les appels vers les APIs externes (SMS-Activate, etc.)';



COMMENT ON COLUMN "public"."logs_provider"."action" IS 'Action appelée: getPrices, getNumber, setStatus, getRentNumber, getRentStatus, etc.';



COMMENT ON COLUMN "public"."logs_provider"."request_params" IS 'Paramètres de la requête (sans api_key pour sécurité)';



COMMENT ON COLUMN "public"."logs_provider"."response_time_ms" IS 'Temps de réponse en millisecondes (pour monitoring performance)';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'info'::"text",
    "read" boolean DEFAULT false,
    "action_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['info'::"text", 'success'::"text", 'warning'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_provider_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid",
    "admin_id" "uuid",
    "action" "text" NOT NULL,
    "old_value" "jsonb",
    "new_value" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_provider_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_providers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_code" "text" NOT NULL,
    "provider_name" "text" NOT NULL,
    "is_active" boolean DEFAULT false,
    "is_default" boolean DEFAULT false,
    "priority" integer DEFAULT 0,
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "supported_methods" "jsonb" DEFAULT '[]'::"jsonb",
    "fees_config" "jsonb" DEFAULT '{}'::"jsonb",
    "logo_url" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_providers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."popular_services" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "service_code" "text" NOT NULL,
    "country_code" "text" NOT NULL,
    "type" "text" NOT NULL,
    "display_order" integer DEFAULT 0,
    "is_featured" boolean DEFAULT false,
    "icon_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "popular_services_type_check" CHECK (("type" = ANY (ARRAY['activation'::"text", 'rental'::"text"])))
);


ALTER TABLE "public"."popular_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pricing_rules_archive" (
    "id" "uuid",
    "service_code" "text",
    "country_code" "text",
    "activation_cost" numeric(10,2),
    "activation_price" numeric(10,2),
    "rent_cost" numeric(10,2),
    "rent_price" numeric(10,2),
    "active" boolean,
    "archived_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pricing_rules_archive" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promo_code_uses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promo_code_id" "uuid",
    "user_id" "uuid",
    "transaction_id" "uuid",
    "discount_applied" numeric NOT NULL,
    "original_amount" numeric NOT NULL,
    "final_amount" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."promo_code_uses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promo_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "discount_type" "text" DEFAULT 'percentage'::"text" NOT NULL,
    "discount_value" numeric NOT NULL,
    "min_purchase" numeric DEFAULT 0,
    "max_discount" numeric,
    "start_date" timestamp with time zone DEFAULT "now"(),
    "end_date" timestamp with time zone,
    "max_uses" integer,
    "max_uses_per_user" integer DEFAULT 1,
    "current_uses" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."promo_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referrals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referrer_id" "uuid",
    "referee_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "trigger_event" "text",
    "reason" "text",
    "reward_txn_id" "uuid",
    "expiry_date" timestamp with time zone,
    "qualified_at" timestamp with time zone,
    "rewarded_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "referrals_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'qualified'::"text", 'rewarded'::"text", 'rejected'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."referrals" OWNER TO "postgres";


COMMENT ON TABLE "public"."referrals" IS 'Système de parrainage avec RLS activé. Seuls les utilisateurs impliqués peuvent voir leurs propres referrals. Service role a accès complet.';



CREATE TABLE IF NOT EXISTS "public"."rental_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rent_id" "text",
    "rental_id" "text",
    "user_id" "uuid",
    "action" "text",
    "status" "text",
    "payload" "jsonb",
    "response_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rental_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rental_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rental_id" "uuid",
    "rent_id" "text" NOT NULL,
    "phone_from" "text",
    "text" "text" NOT NULL,
    "service" "text",
    "received_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rental_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_icons" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "service_code" "text" NOT NULL,
    "icon_url" "text",
    "icon_emoji" "text" DEFAULT '📱'::"text",
    "icon_type" "text" DEFAULT 'emoji'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "service_icons_icon_type_check" CHECK (("icon_type" = ANY (ARRAY['emoji'::"text", 'url'::"text", 'upload'::"text"])))
);


ALTER TABLE "public"."service_icons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text",
    "category" "text" DEFAULT 'other'::"text",
    "icon" "text" DEFAULT '📱'::"text",
    "active" boolean DEFAULT true,
    "popularity_score" integer DEFAULT 0,
    "total_available" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "icon_url" "text",
    "provider" "text" DEFAULT 'sms-activate'::"text"
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sms_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "virtual_number_id" "uuid",
    "user_id" "uuid",
    "phone_number" "text" NOT NULL,
    "sender" "text",
    "content" "text" NOT NULL,
    "code" "text",
    "received_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sms_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "level" "text" NOT NULL,
    "category" "text" NOT NULL,
    "message" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "user_id" "uuid",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "system_logs_category_check" CHECK (("category" = ANY (ARRAY['api'::"text", 'payment'::"text", 'user'::"text", 'sync'::"text", 'system'::"text", 'sms'::"text", 'rent'::"text"]))),
    CONSTRAINT "system_logs_level_check" CHECK (("level" = ANY (ARRAY['info'::"text", 'warning'::"text", 'error'::"text", 'success'::"text"])))
);


ALTER TABLE "public"."system_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."system_logs" IS 'System logs for admin monitoring and debugging';



CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "text",
    "category" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "balance_before" numeric(10,2) NOT NULL,
    "balance_after" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "description" "text",
    "reference" "text",
    "payment_method" "text",
    "payment_data" "jsonb",
    "virtual_number_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "related_rental_id" "uuid",
    "related_activation_id" "uuid",
    "external_id" "text",
    "provider" "text" DEFAULT 'moneyfusion'::"text",
    CONSTRAINT "transactions_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['paytech'::"text", 'mobile_money'::"text", 'card'::"text", 'bonus'::"text"]))),
    CONSTRAINT "transactions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "phone" "text",
    "avatar_url" "text",
    "role" "text" DEFAULT 'user'::"text",
    "balance" numeric(10,2) DEFAULT 0.00,
    "language" "text" DEFAULT 'fr'::"text",
    "notifications_enabled" boolean DEFAULT true,
    "email_notifications" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "frozen_balance" numeric(10,2) DEFAULT 0.00,
    "referral_code" "text" DEFAULT "lower"("substr"("md5"(("gen_random_uuid"())::"text"), 1, 8)),
    CONSTRAINT "chk_frozen_balance_positive" CHECK (("frozen_balance" >= (0)::numeric)),
    CONSTRAINT "users_language_check" CHECK (("language" = ANY (ARRAY['fr'::"text", 'en'::"text"]))),
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text", 'moderator'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."frozen_balance" IS 'Solde gelé pendant les achats en attente. Évite la double dépense.';



CREATE OR REPLACE VIEW "public"."v_country_health" AS
 SELECT "country_code",
    "count"(*) AS "total_activations_24h",
    "sum"(
        CASE
            WHEN ("status" = 'received'::"text") THEN 1
            ELSE 0
        END) AS "successful_activations",
    "round"(((("sum"(
        CASE
            WHEN ("status" = 'received'::"text") THEN 1
            ELSE 0
        END))::numeric * 100.0) / (NULLIF("count"(*), 0))::numeric), 1) AS "success_rate_pct",
        CASE
            WHEN ("count"(*) < 3) THEN 'INSUFFICIENT_DATA'::"text"
            WHEN (((("sum"(
            CASE
                WHEN ("status" = 'received'::"text") THEN 1
                ELSE 0
            END))::numeric * 100.0) / ("count"(*))::numeric) < (20)::numeric) THEN 'CRITICAL'::"text"
            WHEN (((("sum"(
            CASE
                WHEN ("status" = 'received'::"text") THEN 1
                ELSE 0
            END))::numeric * 100.0) / ("count"(*))::numeric) < (40)::numeric) THEN 'WARNING'::"text"
            ELSE 'HEALTHY'::"text"
        END AS "health_status"
   FROM "public"."activations"
  WHERE ("created_at" > ("now"() - '24:00:00'::interval))
  GROUP BY "country_code"
  ORDER BY ("count"(*)) DESC;


ALTER VIEW "public"."v_country_health" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_country_health" IS 'Santé des pays sur 24h - success rate par country_code';



CREATE OR REPLACE VIEW "public"."v_dashboard_stats" AS
 SELECT "count"(*) AS "total_activations_24h",
    "sum"(
        CASE
            WHEN ("status" = 'received'::"text") THEN 1
            ELSE 0
        END) AS "successful_24h",
    "sum"(
        CASE
            WHEN ("status" = 'cancelled'::"text") THEN 1
            ELSE 0
        END) AS "cancelled_24h",
    "sum"(
        CASE
            WHEN ("status" = 'timeout'::"text") THEN 1
            ELSE 0
        END) AS "timeout_24h",
    "round"(((("sum"(
        CASE
            WHEN ("status" = 'received'::"text") THEN 1
            ELSE 0
        END))::numeric * 100.0) / (NULLIF("count"(*), 0))::numeric), 1) AS "global_success_rate_pct",
        CASE
            WHEN (((("sum"(
            CASE
                WHEN ("status" = 'received'::"text") THEN 1
                ELSE 0
            END))::numeric * 100.0) / ("count"(*))::numeric) < (30)::numeric) THEN 'CRITICAL'::"text"
            WHEN (((("sum"(
            CASE
                WHEN ("status" = 'received'::"text") THEN 1
                ELSE 0
            END))::numeric * 100.0) / ("count"(*))::numeric) < (50)::numeric) THEN 'WARNING'::"text"
            WHEN (((("sum"(
            CASE
                WHEN ("status" = 'received'::"text") THEN 1
                ELSE 0
            END))::numeric * 100.0) / ("count"(*))::numeric) < (70)::numeric) THEN 'GOOD'::"text"
            ELSE 'EXCELLENT'::"text"
        END AS "global_health_status"
   FROM "public"."activations"
  WHERE ("created_at" > ("now"() - '24:00:00'::interval));


ALTER VIEW "public"."v_dashboard_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_dashboard_stats" IS 'Statistiques globales dashboard sur 24h';



CREATE OR REPLACE VIEW "public"."v_frozen_balance_health" AS
 SELECT (( SELECT COALESCE("sum"("activations"."frozen_amount"), (0)::numeric) AS "coalesce"
           FROM "public"."activations"
          WHERE (("activations"."status" = ANY (ARRAY['pending'::"text", 'waiting'::"text"])) AND ("activations"."frozen_amount" > (0)::numeric))) + ( SELECT COALESCE("sum"("rentals"."frozen_amount"), (0)::numeric) AS "coalesce"
           FROM "public"."rentals"
          WHERE (("rentals"."status" = 'active'::"text") AND ("rentals"."frozen_amount" > (0)::numeric)))) AS "total_frozen_activations",
    ( SELECT COALESCE("sum"("users"."frozen_balance"), (0)::numeric) AS "coalesce"
           FROM "public"."users") AS "total_user_frozen",
    (( SELECT COALESCE("sum"("users"."frozen_balance"), (0)::numeric) AS "coalesce"
           FROM "public"."users") - (( SELECT COALESCE("sum"("activations"."frozen_amount"), (0)::numeric) AS "coalesce"
           FROM "public"."activations"
          WHERE (("activations"."status" = ANY (ARRAY['pending'::"text", 'waiting'::"text"])) AND ("activations"."frozen_amount" > (0)::numeric))) + ( SELECT COALESCE("sum"("rentals"."frozen_amount"), (0)::numeric) AS "coalesce"
           FROM "public"."rentals"
          WHERE (("rentals"."status" = 'active'::"text") AND ("rentals"."frozen_amount" > (0)::numeric))))) AS "total_discrepancy",
    ( SELECT "count"(*) AS "count"
           FROM "public"."activations"
          WHERE (("activations"."status" = ANY (ARRAY['pending'::"text", 'waiting'::"text"])) AND ("activations"."frozen_amount" > (0)::numeric))) AS "active_activations",
    ( SELECT "count"(*) AS "count"
           FROM "public"."rentals"
          WHERE (("rentals"."status" = 'active'::"text") AND ("rentals"."frozen_amount" > (0)::numeric))) AS "active_rentals";


ALTER VIEW "public"."v_frozen_balance_health" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_frozen_balance_health_reconciliation" AS
 WITH "user_frozen_sums" AS (
         SELECT "combined"."user_id",
            COALESCE("sum"("combined"."frozen_amount"), (0)::numeric) AS "total_frozen_activations"
           FROM ( SELECT "activations"."user_id",
                    "activations"."frozen_amount"
                   FROM "public"."activations"
                  WHERE ("activations"."frozen_amount" > (0)::numeric)
                UNION ALL
                 SELECT "rentals"."user_id",
                    "rentals"."frozen_amount"
                   FROM "public"."rentals"
                  WHERE ("rentals"."frozen_amount" > (0)::numeric)) "combined"
          GROUP BY "combined"."user_id"
        )
 SELECT "u"."id" AS "user_id",
    "u"."balance",
    "u"."frozen_balance" AS "frozen_balance_user",
    COALESCE("ufs"."total_frozen_activations", (0)::numeric) AS "total_frozen_activations",
    ("u"."frozen_balance" - COALESCE("ufs"."total_frozen_activations", (0)::numeric)) AS "frozen_discrepancy",
        CASE
            WHEN (("u"."frozen_balance" - COALESCE("ufs"."total_frozen_activations", (0)::numeric)) = (0)::numeric) THEN '✅ Healthy'::"text"
            WHEN (("u"."frozen_balance" - COALESCE("ufs"."total_frozen_activations", (0)::numeric)) > (0)::numeric) THEN '⚠️ Over-frozen'::"text"
            ELSE '🚨 Under-frozen'::"text"
        END AS "health_status"
   FROM ("public"."users" "u"
     LEFT JOIN "user_frozen_sums" "ufs" ON (("u"."id" = "ufs"."user_id")))
  WHERE (("u"."frozen_balance" > (0)::numeric) OR (COALESCE("ufs"."total_frozen_activations", (0)::numeric) > (0)::numeric));


ALTER VIEW "public"."v_frozen_balance_health_reconciliation" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_frozen_balance_health_reconciliation" IS 'Track frozen_balance consistency for reconciliation: compare users.frozen_balance with SUM(activations.frozen_amount + rentals.frozen_amount)';



CREATE OR REPLACE VIEW "public"."v_frozen_discrepancies" AS
 SELECT "user_id",
    "frozen_balance_user",
    "total_frozen_activations",
    "frozen_discrepancy"
   FROM "public"."v_frozen_balance_health_reconciliation"
  WHERE ("frozen_discrepancy" <> (0)::numeric);


ALTER VIEW "public"."v_frozen_discrepancies" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_provider_stats_24h" AS
 SELECT "provider",
    "action",
    "count"(*) AS "total_calls",
    "count"(*) FILTER (WHERE ("response_status" = 200)) AS "success_count",
    "count"(*) FILTER (WHERE ("error_message" IS NOT NULL)) AS "error_count",
    "avg"("response_time_ms") AS "avg_response_time_ms",
    "max"("response_time_ms") AS "max_response_time_ms",
    "min"("created_at") AS "first_call_at",
    "max"("created_at") AS "last_call_at"
   FROM "public"."logs_provider"
  WHERE ("created_at" > ("now"() - '24:00:00'::interval))
  GROUP BY "provider", "action"
  ORDER BY ("count"(*)) DESC;


ALTER VIEW "public"."v_provider_stats_24h" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_provider_stats_24h" IS 'Statistiques des appels API des dernières 24h (pour dashboard admin)';



CREATE OR REPLACE VIEW "public"."v_service_health" AS
 SELECT "service_code",
    "count"(*) AS "total_activations_24h",
    "sum"(
        CASE
            WHEN ("status" = 'received'::"text") THEN 1
            ELSE 0
        END) AS "successful_activations",
    "sum"(
        CASE
            WHEN ("status" = 'cancelled'::"text") THEN 1
            ELSE 0
        END) AS "cancelled_activations",
    "sum"(
        CASE
            WHEN ("status" = 'timeout'::"text") THEN 1
            ELSE 0
        END) AS "timeout_activations",
    "round"(((("sum"(
        CASE
            WHEN ("status" = 'received'::"text") THEN 1
            ELSE 0
        END))::numeric * 100.0) / (NULLIF("count"(*), 0))::numeric), 1) AS "success_rate_pct",
        CASE
            WHEN ("count"(*) < 3) THEN 'INSUFFICIENT_DATA'::"text"
            WHEN (((("sum"(
            CASE
                WHEN ("status" = 'received'::"text") THEN 1
                ELSE 0
            END))::numeric * 100.0) / ("count"(*))::numeric) < (15)::numeric) THEN 'CRITICAL'::"text"
            WHEN (((("sum"(
            CASE
                WHEN ("status" = 'received'::"text") THEN 1
                ELSE 0
            END))::numeric * 100.0) / ("count"(*))::numeric) < (35)::numeric) THEN 'WARNING'::"text"
            ELSE 'HEALTHY'::"text"
        END AS "health_status",
    "max"("created_at") AS "last_activation_at",
    "round"((EXTRACT(epoch FROM ("now"() - "max"("created_at"))) / (60)::numeric)) AS "minutes_since_last_use"
   FROM "public"."activations"
  WHERE ("created_at" > ("now"() - '24:00:00'::interval))
  GROUP BY "service_code"
  ORDER BY ("count"(*)) DESC;


ALTER VIEW "public"."v_service_health" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_service_health" IS 'Santé des services SMS sur 24h - success rate, total activations, status breakdown';



CREATE OR REPLACE VIEW "public"."v_service_response_time" AS
 SELECT "service_code",
    "count"(*) AS "successful_count",
    "round"("avg"((EXTRACT(epoch FROM ("sms_received_at" - "created_at")) / (60)::numeric)), 1) AS "avg_wait_minutes",
    "round"("min"((EXTRACT(epoch FROM ("sms_received_at" - "created_at")) / (60)::numeric)), 1) AS "min_wait_minutes",
    "round"("max"((EXTRACT(epoch FROM ("sms_received_at" - "created_at")) / (60)::numeric)), 1) AS "max_wait_minutes"
   FROM "public"."activations"
  WHERE (("status" = 'received'::"text") AND ("sms_received_at" IS NOT NULL) AND ("created_at" > ("now"() - '7 days'::interval)))
  GROUP BY "service_code"
 HAVING ("count"(*) >= 3)
  ORDER BY ("round"("avg"((EXTRACT(epoch FROM ("sms_received_at" - "created_at")) / (60)::numeric)), 1));


ALTER VIEW "public"."v_service_response_time" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_service_response_time" IS 'Temps moyen de réception SMS par service sur 7 jours';



CREATE TABLE IF NOT EXISTS "public"."virtual_numbers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "phone_number" "text" NOT NULL,
    "country" "text" NOT NULL,
    "country_code" "text" NOT NULL,
    "operator" "text",
    "service" "text" NOT NULL,
    "service_name" "text",
    "price" numeric(10,2) NOT NULL,
    "type" "text" DEFAULT 'activation'::"text",
    "status" "text" DEFAULT 'active'::"text",
    "activation_code" "text",
    "sms_received" "text"[],
    "expires_at" timestamp with time zone,
    "external_id" "text",
    "provider" "text" DEFAULT '5sim'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "virtual_numbers_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'waiting'::"text", 'completed'::"text", 'expired'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "virtual_numbers_type_check" CHECK (("type" = ANY (ARRAY['activation'::"text", 'rental'::"text"])))
);


ALTER TABLE "public"."virtual_numbers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "activation_id" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "received_at" timestamp with time zone NOT NULL,
    "ip_address" "text",
    "processed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."webhook_logs" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activation_packages"
    ADD CONSTRAINT "activation_packages_activations_key" UNIQUE ("activations");



ALTER TABLE ONLY "public"."activation_packages"
    ADD CONSTRAINT "activation_packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activations"
    ADD CONSTRAINT "activations_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."activations"
    ADD CONSTRAINT "activations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."balance_operations"
    ADD CONSTRAINT "balance_operations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_settings"
    ADD CONSTRAINT "contact_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_campaigns"
    ADD CONSTRAINT "email_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorite_services"
    ADD CONSTRAINT "favorite_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorite_services"
    ADD CONSTRAINT "favorite_services_user_id_service_code_country_key" UNIQUE ("user_id", "service_code", "country");



ALTER TABLE ONLY "public"."logs_provider"
    ADD CONSTRAINT "logs_provider_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_provider_logs"
    ADD CONSTRAINT "payment_provider_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_providers"
    ADD CONSTRAINT "payment_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_providers"
    ADD CONSTRAINT "payment_providers_provider_code_key" UNIQUE ("provider_code");



ALTER TABLE ONLY "public"."popular_services"
    ADD CONSTRAINT "popular_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."popular_services"
    ADD CONSTRAINT "popular_services_service_code_country_code_type_key" UNIQUE ("service_code", "country_code", "type");



ALTER TABLE ONLY "public"."promo_code_uses"
    ADD CONSTRAINT "promo_code_uses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promo_code_uses"
    ADD CONSTRAINT "promo_code_uses_promo_code_id_user_id_transaction_id_key" UNIQUE ("promo_code_id", "user_id", "transaction_id");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rental_logs"
    ADD CONSTRAINT "rental_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rental_messages"
    ADD CONSTRAINT "rental_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rentals"
    ADD CONSTRAINT "rentals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rentals"
    ADD CONSTRAINT "rentals_rent_id_unique" UNIQUE ("rent_id");



ALTER TABLE ONLY "public"."service_icons"
    ADD CONSTRAINT "service_icons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_icons"
    ADD CONSTRAINT "service_icons_service_code_key" UNIQUE ("service_code");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sms_messages"
    ADD CONSTRAINT "sms_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_logs"
    ADD CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_reference_key" UNIQUE ("reference");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_referral_code_key" UNIQUE ("referral_code");



ALTER TABLE ONLY "public"."virtual_numbers"
    ADD CONSTRAINT "virtual_numbers_external_id_key" UNIQUE ("external_id");



ALTER TABLE ONLY "public"."virtual_numbers"
    ADD CONSTRAINT "virtual_numbers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_logs"
    ADD CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_activation_packages_active" ON "public"."activation_packages" USING "btree" ("is_active");



CREATE INDEX "idx_activation_packages_order" ON "public"."activation_packages" USING "btree" ("display_order");



CREATE INDEX "idx_activations_charged" ON "public"."activations" USING "btree" ("charged");



CREATE INDEX "idx_activations_created_at" ON "public"."activations" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activations_frozen" ON "public"."activations" USING "btree" ("user_id", "status") WHERE ("frozen_amount" > (0)::numeric);



CREATE INDEX "idx_activations_order_id" ON "public"."activations" USING "btree" ("order_id");



CREATE INDEX "idx_activations_provider" ON "public"."activations" USING "btree" ("provider");



CREATE INDEX "idx_activations_reconcile" ON "public"."activations" USING "btree" ("status", "created_at" DESC, "charged") WHERE (("frozen_amount" > (0)::numeric) AND ("status" = ANY (ARRAY['timeout'::"text", 'failed'::"text", 'cancelled'::"text"])));



CREATE INDEX "idx_activations_status" ON "public"."activations" USING "btree" ("status");



CREATE INDEX "idx_activations_user_id" ON "public"."activations" USING "btree" ("user_id");



CREATE INDEX "idx_activations_user_status" ON "public"."activations" USING "btree" ("user_id", "status") WHERE ("status" = ANY (ARRAY['pending'::"text", 'waiting'::"text", 'received'::"text"]));



CREATE INDEX "idx_activity_logs_created_at" ON "public"."activity_logs" USING "btree" ("created_at");



CREATE INDEX "idx_activity_logs_user_id" ON "public"."activity_logs" USING "btree" ("user_id");



CREATE INDEX "idx_balance_ops_activation" ON "public"."balance_operations" USING "btree" ("activation_id");



CREATE INDEX "idx_balance_ops_related_tx" ON "public"."balance_operations" USING "btree" ("related_transaction_id");



CREATE INDEX "idx_balance_ops_rental" ON "public"."balance_operations" USING "btree" ("rental_id");



CREATE INDEX "idx_balance_ops_type" ON "public"."balance_operations" USING "btree" ("operation_type", "created_at" DESC);



CREATE INDEX "idx_balance_ops_user" ON "public"."balance_operations" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_countries_active" ON "public"."countries" USING "btree" ("active");



CREATE INDEX "idx_countries_code" ON "public"."countries" USING "btree" ("code");



CREATE INDEX "idx_countries_display_order" ON "public"."countries" USING "btree" ("display_order" DESC);



CREATE INDEX "idx_countries_flag_url" ON "public"."countries" USING "btree" ("flag_url") WHERE ("flag_url" IS NOT NULL);



CREATE INDEX "idx_countries_popularity" ON "public"."countries" USING "btree" ("popularity_score" DESC);



CREATE INDEX "idx_countries_provider" ON "public"."countries" USING "btree" ("provider");



CREATE INDEX "idx_logs_provider_action" ON "public"."logs_provider" USING "btree" ("action");



CREATE INDEX "idx_logs_provider_action_status" ON "public"."logs_provider" USING "btree" ("action", "response_status");



CREATE INDEX "idx_logs_provider_activation_id" ON "public"."logs_provider" USING "btree" ("activation_id") WHERE ("activation_id" IS NOT NULL);



CREATE INDEX "idx_logs_provider_created_at" ON "public"."logs_provider" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_logs_provider_error" ON "public"."logs_provider" USING "btree" ("error_message") WHERE ("error_message" IS NOT NULL);



CREATE INDEX "idx_logs_provider_provider" ON "public"."logs_provider" USING "btree" ("provider");



CREATE INDEX "idx_logs_provider_user_id" ON "public"."logs_provider" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("read");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_payment_providers_active" ON "public"."payment_providers" USING "btree" ("is_active");



CREATE INDEX "idx_payment_providers_priority" ON "public"."payment_providers" USING "btree" ("priority");



CREATE INDEX "idx_popular_services_featured" ON "public"."popular_services" USING "btree" ("is_featured", "display_order");



CREATE INDEX "idx_popular_services_type" ON "public"."popular_services" USING "btree" ("type");



CREATE INDEX "idx_promo_code_uses_code" ON "public"."promo_code_uses" USING "btree" ("promo_code_id");



CREATE INDEX "idx_promo_code_uses_user" ON "public"."promo_code_uses" USING "btree" ("user_id");



CREATE INDEX "idx_promo_codes_active" ON "public"."promo_codes" USING "btree" ("is_active", "start_date", "end_date");



CREATE INDEX "idx_promo_codes_code" ON "public"."promo_codes" USING "btree" ("code");



CREATE INDEX "idx_provider_logs_admin" ON "public"."payment_provider_logs" USING "btree" ("admin_id");



CREATE INDEX "idx_provider_logs_provider" ON "public"."payment_provider_logs" USING "btree" ("provider_id");



CREATE INDEX "idx_rental_messages_rent_id" ON "public"."rental_messages" USING "btree" ("rent_id");



CREATE INDEX "idx_rental_messages_rental_id" ON "public"."rental_messages" USING "btree" ("rental_id");



CREATE UNIQUE INDEX "idx_rental_messages_unique" ON "public"."rental_messages" USING "btree" ("rent_id", "phone_from", "text", "received_at");



CREATE INDEX "idx_rentals_country" ON "public"."rentals" USING "btree" ("country");



CREATE INDEX "idx_rentals_created_at" ON "public"."rentals" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_rentals_expires_at" ON "public"."rentals" USING "btree" ("expires_at");



CREATE INDEX "idx_rentals_frozen" ON "public"."rentals" USING "btree" ("user_id", "status") WHERE ("frozen_amount" > (0)::numeric);



CREATE INDEX "idx_rentals_phone" ON "public"."rentals" USING "btree" ("phone");



CREATE INDEX "idx_rentals_reconcile" ON "public"."rentals" USING "btree" ("status", "created_at" DESC) WHERE (("frozen_amount" > (0)::numeric) AND ("status" = ANY (ARRAY['expired'::"text", 'failed'::"text", 'cancelled'::"text"])));



CREATE INDEX "idx_rentals_rent_id" ON "public"."rentals" USING "btree" ("rent_id");



CREATE INDEX "idx_rentals_rental_id" ON "public"."rentals" USING "btree" ("rental_id");



CREATE INDEX "idx_rentals_service" ON "public"."rentals" USING "btree" ("service");



CREATE INDEX "idx_rentals_status" ON "public"."rentals" USING "btree" ("status");



CREATE INDEX "idx_rentals_user_id" ON "public"."rentals" USING "btree" ("user_id");



CREATE INDEX "idx_service_icons_code" ON "public"."service_icons" USING "btree" ("service_code");



CREATE INDEX "idx_services_active" ON "public"."services" USING "btree" ("active");



CREATE INDEX "idx_services_category" ON "public"."services" USING "btree" ("category");



CREATE INDEX "idx_services_category_active" ON "public"."services" USING "btree" ("category", "active") WHERE ("active" = true);



CREATE INDEX "idx_services_code" ON "public"."services" USING "btree" ("code");



CREATE INDEX "idx_services_icon_url" ON "public"."services" USING "btree" ("icon_url") WHERE ("icon_url" IS NOT NULL);



CREATE INDEX "idx_services_name_search" ON "public"."services" USING "gin" ("to_tsvector"('"english"'::"regconfig", (("name" || ' '::"text") || COALESCE("display_name", ''::"text"))));



CREATE INDEX "idx_services_popularity" ON "public"."services" USING "btree" ("popularity_score" DESC);



CREATE INDEX "idx_services_popularity_sort" ON "public"."services" USING "btree" ("popularity_score" DESC, "total_available" DESC) WHERE ("active" = true);



CREATE INDEX "idx_services_provider" ON "public"."services" USING "btree" ("provider");



CREATE INDEX "idx_sms_messages_user_id" ON "public"."sms_messages" USING "btree" ("user_id");



CREATE INDEX "idx_sms_messages_virtual_number_id" ON "public"."sms_messages" USING "btree" ("virtual_number_id");



CREATE INDEX "idx_system_logs_category" ON "public"."system_logs" USING "btree" ("category");



CREATE INDEX "idx_system_logs_created_at" ON "public"."system_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_system_logs_level" ON "public"."system_logs" USING "btree" ("level");



CREATE INDEX "idx_system_logs_metadata" ON "public"."system_logs" USING "gin" ("metadata");



CREATE INDEX "idx_system_logs_user_id" ON "public"."system_logs" USING "btree" ("user_id");



CREATE INDEX "idx_transactions_external_id" ON "public"."transactions" USING "btree" ("external_id");



CREATE INDEX "idx_transactions_metadata" ON "public"."transactions" USING "gin" ("metadata");



CREATE INDEX "idx_transactions_provider" ON "public"."transactions" USING "btree" ("provider");



CREATE INDEX "idx_transactions_reference" ON "public"."transactions" USING "btree" ("reference");



CREATE INDEX "idx_transactions_related_rental_id" ON "public"."transactions" USING "btree" ("related_rental_id");



CREATE INDEX "idx_transactions_status" ON "public"."transactions" USING "btree" ("status");



CREATE INDEX "idx_transactions_type" ON "public"."transactions" USING "btree" ("type");



CREATE INDEX "idx_transactions_user_id" ON "public"."transactions" USING "btree" ("user_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_frozen_balance" ON "public"."users" USING "btree" ("frozen_balance");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE INDEX "idx_virtual_numbers_external_id" ON "public"."virtual_numbers" USING "btree" ("external_id");



CREATE INDEX "idx_virtual_numbers_status" ON "public"."virtual_numbers" USING "btree" ("status");



CREATE INDEX "idx_virtual_numbers_user_id" ON "public"."virtual_numbers" USING "btree" ("user_id");



CREATE INDEX "idx_webhook_logs_activation_id" ON "public"."webhook_logs" USING "btree" ("activation_id");



CREATE INDEX "idx_webhook_logs_created_at" ON "public"."webhook_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_webhook_logs_processed" ON "public"."webhook_logs" USING "btree" ("processed");



CREATE UNIQUE INDEX "referrals_referee_unique" ON "public"."referrals" USING "btree" ("referee_id");



CREATE INDEX "referrals_referrer_idx" ON "public"."referrals" USING "btree" ("referrer_id");



CREATE INDEX "referrals_referrer_rewarded_idx" ON "public"."referrals" USING "btree" ("referrer_id", "rewarded_at") WHERE ("status" = 'rewarded'::"text");



CREATE INDEX "referrals_status_created_idx" ON "public"."referrals" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "referrals_status_idx" ON "public"."referrals" USING "btree" ("status");



CREATE INDEX "rental_logs_created_at_idx" ON "public"."rental_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "rental_logs_rent_id_idx" ON "public"."rental_logs" USING "btree" ("rent_id");



CREATE INDEX "rental_logs_rental_id_idx" ON "public"."rental_logs" USING "btree" ("rental_id");



CREATE INDEX "rental_logs_user_id_idx" ON "public"."rental_logs" USING "btree" ("user_id");



CREATE INDEX "rentals_charged_idx" ON "public"."rentals" USING "btree" ("charged");



CREATE INDEX "users_referral_code_idx" ON "public"."users" USING "btree" ("referral_code") WHERE ("referral_code" IS NOT NULL);



CREATE UNIQUE INDEX "ux_balance_operations_related_credit_admin" ON "public"."balance_operations" USING "btree" ("related_transaction_id") WHERE ("operation_type" = 'credit_admin'::"text");



CREATE OR REPLACE TRIGGER "activations_updated_at" BEFORE UPDATE ON "public"."activations" FOR EACH ROW EXECUTE FUNCTION "public"."update_activations_updated_at"();



CREATE OR REPLACE TRIGGER "contact_settings_updated_at" BEFORE UPDATE ON "public"."contact_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_contact_settings_updated_at"();



CREATE OR REPLACE TRIGGER "enforce_balance_ledger" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_user_balance_ledger"();



CREATE OR REPLACE TRIGGER "payment_providers_updated_at" BEFORE UPDATE ON "public"."payment_providers" FOR EACH ROW EXECUTE FUNCTION "public"."update_payment_providers_updated_at"();



CREATE OR REPLACE TRIGGER "prevent_direct_frozen_amount_update" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_direct_frozen_amount_update"();



CREATE OR REPLACE TRIGGER "prevent_direct_frozen_clear_activation" BEFORE UPDATE ON "public"."activations" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_direct_frozen_clear_activation"();



CREATE OR REPLACE TRIGGER "prevent_direct_frozen_clear_rental" BEFORE UPDATE ON "public"."rentals" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_direct_frozen_clear_rental"();



CREATE OR REPLACE TRIGGER "protect_frozen_amount_activations" BEFORE UPDATE ON "public"."activations" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_direct_frozen_amount_update"();



CREATE OR REPLACE TRIGGER "protect_frozen_amount_rentals" BEFORE UPDATE ON "public"."rentals" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_direct_frozen_amount_update"();



CREATE OR REPLACE TRIGGER "trigger_update_activation_packages_updated_at" BEFORE UPDATE ON "public"."activation_packages" FOR EACH ROW EXECUTE FUNCTION "public"."update_activation_packages_updated_at"();



CREATE OR REPLACE TRIGGER "update_countries_updated_at" BEFORE UPDATE ON "public"."countries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_popular_services_updated_at" BEFORE UPDATE ON "public"."popular_services" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rentals_updated_at" BEFORE UPDATE ON "public"."rentals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rentals_updated_at_trigger" BEFORE UPDATE ON "public"."rentals" FOR EACH ROW EXECUTE FUNCTION "public"."update_rentals_updated_at"();



CREATE OR REPLACE TRIGGER "update_service_icons_updated_at" BEFORE UPDATE ON "public"."service_icons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_services_updated_at" BEFORE UPDATE ON "public"."services" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_system_settings_updated_at" BEFORE UPDATE ON "public"."system_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_transactions_updated_at" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_virtual_numbers_updated_at" BEFORE UPDATE ON "public"."virtual_numbers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."activations"
    ADD CONSTRAINT "activations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."balance_operations"
    ADD CONSTRAINT "balance_operations_activation_id_fkey" FOREIGN KEY ("activation_id") REFERENCES "public"."activations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."balance_operations"
    ADD CONSTRAINT "balance_operations_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "public"."rentals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."balance_operations"
    ADD CONSTRAINT "balance_operations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_campaigns"
    ADD CONSTRAINT "email_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."favorite_services"
    ADD CONSTRAINT "favorite_services_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."logs_provider"
    ADD CONSTRAINT "logs_provider_activation_id_fkey" FOREIGN KEY ("activation_id") REFERENCES "public"."activations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."logs_provider"
    ADD CONSTRAINT "logs_provider_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "public"."rentals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."logs_provider"
    ADD CONSTRAINT "logs_provider_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_provider_logs"
    ADD CONSTRAINT "payment_provider_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."payment_provider_logs"
    ADD CONSTRAINT "payment_provider_logs_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."payment_providers"("id");



ALTER TABLE ONLY "public"."promo_code_uses"
    ADD CONSTRAINT "promo_code_uses_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."promo_code_uses"
    ADD CONSTRAINT "promo_code_uses_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."promo_code_uses"
    ADD CONSTRAINT "promo_code_uses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rental_messages"
    ADD CONSTRAINT "rental_messages_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "public"."rentals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rentals"
    ADD CONSTRAINT "rentals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_icons"
    ADD CONSTRAINT "service_icons_service_code_fkey" FOREIGN KEY ("service_code") REFERENCES "public"."services"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sms_messages"
    ADD CONSTRAINT "sms_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sms_messages"
    ADD CONSTRAINT "sms_messages_virtual_number_id_fkey" FOREIGN KEY ("virtual_number_id") REFERENCES "public"."virtual_numbers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_logs"
    ADD CONSTRAINT "system_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_related_activation_id_fkey" FOREIGN KEY ("related_activation_id") REFERENCES "public"."activations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_virtual_number_id_fkey" FOREIGN KEY ("virtual_number_id") REFERENCES "public"."virtual_numbers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."virtual_numbers"
    ADD CONSTRAINT "virtual_numbers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admin can view all logs" ON "public"."system_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admin full access" ON "public"."activation_packages" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admin full access to system_settings" ON "public"."system_settings" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete users" ON "public"."users" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."users" "users_1"
  WHERE (("users_1"."id" = "auth"."uid"()) AND ("users_1"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert contact settings" ON "public"."contact_settings" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert providers" ON "public"."payment_providers" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage countries" ON "public"."countries" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage popular services" ON "public"."popular_services" USING (((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text") OR (("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text")));



CREATE POLICY "Admins can manage promo codes" ON "public"."promo_codes" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage service icons" ON "public"."service_icons" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage services" ON "public"."services" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage settings" ON "public"."system_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read all activations" ON "public"."activations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read all promo uses" ON "public"."promo_code_uses" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update all rentals" ON "public"."rentals" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update contact settings" ON "public"."contact_settings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update providers" ON "public"."payment_providers" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all logs" ON "public"."logs_provider" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all numbers" ON "public"."virtual_numbers" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all providers" ON "public"."payment_providers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all rentals" ON "public"."rentals" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all transactions" ON "public"."transactions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "Admins can view logs" ON "public"."activity_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view logs" ON "public"."payment_provider_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Anyone can read active promo codes" ON "public"."promo_codes" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can read contact settings" ON "public"."contact_settings" FOR SELECT USING (true);



CREATE POLICY "Anyone can read settings" ON "public"."system_settings" FOR SELECT USING (true);



CREATE POLICY "Anyone can read users" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Anyone can view active countries" ON "public"."countries" FOR SELECT USING ((("active" = true) OR ("auth"."uid"() IS NOT NULL)));



CREATE POLICY "Anyone can view active providers" ON "public"."payment_providers" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active services" ON "public"."services" FOR SELECT USING ((("active" = true) OR ("auth"."uid"() IS NOT NULL)));



CREATE POLICY "Anyone can view service icons" ON "public"."service_icons" FOR SELECT USING (true);



CREATE POLICY "Anyone can view services" ON "public"."services" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can insert activations" ON "public"."activations" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can view countries" ON "public"."countries" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view service icons" ON "public"."service_icons" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view services" ON "public"."services" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Block user mutations" ON "public"."referrals" TO "authenticated" USING (false) WITH CHECK (false);



COMMENT ON POLICY "Block user mutations" ON "public"."referrals" IS 'Empêche les utilisateurs de créer/modifier/supprimer des referrals directement';



CREATE POLICY "Block user transaction mutations" ON "public"."transactions" TO "authenticated" USING (false) WITH CHECK (false);



COMMENT ON POLICY "Block user transaction mutations" ON "public"."transactions" IS 'Empêche les utilisateurs de manipuler les transactions directement';



CREATE POLICY "Enable insert for authenticated users" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Enable user registration" ON "public"."users" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public can view countries" ON "public"."countries" FOR SELECT USING (true);



CREATE POLICY "Public can view popular services" ON "public"."popular_services" FOR SELECT USING (true);



CREATE POLICY "Public can view service icons" ON "public"."service_icons" FOR SELECT USING (true);



CREATE POLICY "Public can view services" ON "public"."services" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."activation_packages" FOR SELECT USING (true);



CREATE POLICY "Public read referral settings" ON "public"."system_settings" FOR SELECT USING (("category" = 'referral'::"text"));



CREATE POLICY "Service role can insert logs" ON "public"."logs_provider" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can insert logs" ON "public"."payment_provider_logs" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role can insert promo uses" ON "public"."promo_code_uses" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role can insert rental messages" ON "public"."rental_messages" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can manage activations" ON "public"."activations" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all users" ON "public"."users" USING ((((("current_setting"('request.jwt.claims'::"text", true))::json ->> 'role'::"text") = 'service_role'::"text") OR (("auth"."uid"() = "id") AND ("role" = 'admin'::"text"))));



CREATE POLICY "Service role can manage webhook logs" ON "public"."webhook_logs" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can update activations" ON "public"."activations" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."activations" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."payment_providers" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."referrals" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."users" USING (((("current_setting"('request.jwt.claims'::"text", true))::json ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access rentals" ON "public"."rentals" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role transactions full access" ON "public"."transactions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "System can insert logs" ON "public"."system_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert messages" ON "public"."sms_messages" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users and admins can update" ON "public"."users" FOR UPDATE USING ((("auth"."uid"() = "id") OR (EXISTS ( SELECT 1
   FROM "public"."users" "users_1"
  WHERE (("users_1"."id" = "auth"."uid"()) AND ("users_1"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can create their own rentals" ON "public"."rentals" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own numbers" ON "public"."virtual_numbers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own rentals" ON "public"."rentals" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own favorites" ON "public"."favorite_services" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own activations" ON "public"."activations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can see their own promo uses" ON "public"."promo_code_uses" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own data" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own numbers" ON "public"."virtual_numbers" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own rentals" ON "public"."rentals" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own rentals" ON "public"."rentals" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own data" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own messages" ON "public"."sms_messages" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own numbers" ON "public"."virtual_numbers" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own referrals" ON "public"."referrals" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "referrer_id") OR ("auth"."uid"() = "referee_id")));



COMMENT ON POLICY "Users can view own referrals" ON "public"."referrals" IS 'Permet aux utilisateurs de voir les parrainages où ils sont parrain OU filleul';



CREATE POLICY "Users can view own rentals" ON "public"."rentals" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own transactions" ON "public"."transactions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own rentals" ON "public"."rentals" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their rental messages" ON "public"."rental_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."rentals"
  WHERE (("rentals"."id" = "rental_messages"."rental_id") AND ("rentals"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users insert own activations" ON "public"."activations" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("user_id" = "auth"."uid"()) OR (("user_id")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'sub'::"text"))));



CREATE POLICY "Users update own activations" ON "public"."activations" FOR UPDATE TO "authenticated", "anon" USING ((("user_id" = "auth"."uid"()) OR (("user_id")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'sub'::"text")))) WITH CHECK ((("user_id" = "auth"."uid"()) OR (("user_id")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'sub'::"text"))));



CREATE POLICY "Users update own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users view own activations" ON "public"."activations" FOR SELECT TO "authenticated", "anon" USING ((("user_id" = "auth"."uid"()) OR (("user_id")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'sub'::"text"))));



CREATE POLICY "Users view own transactions" ON "public"."transactions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



COMMENT ON POLICY "Users view own transactions" ON "public"."transactions" IS 'Permet aux utilisateurs de voir uniquement leurs propres transactions';



ALTER TABLE "public"."activation_packages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."countries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."favorite_services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."logs_provider" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_provider_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."popular_services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."promo_code_uses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."promo_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rental_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rentals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_icons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sms_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."virtual_numbers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webhook_logs" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."activations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."users";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

















































































































































































REVOKE ALL ON FUNCTION "public"."admin_add_credit"("p_user_id" "uuid", "p_amount" numeric, "p_admin_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_add_credit"("p_user_id" "uuid", "p_amount" numeric, "p_admin_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_add_credit"("p_user_id" "uuid", "p_amount" numeric, "p_admin_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_add_credit"("p_user_id" "uuid", "p_amount" numeric, "p_admin_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_referral_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_referral_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_referral_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_referrals_list"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_referrals_list"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_referrals_list"() TO "service_role";



GRANT ALL ON FUNCTION "public"."atomic_commit"("p_user_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_transaction_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."atomic_commit"("p_user_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_transaction_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."atomic_commit"("p_user_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_transaction_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."atomic_freeze"("p_user_id" "uuid", "p_amount" numeric, "p_transaction_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."atomic_freeze"("p_user_id" "uuid", "p_amount" numeric, "p_transaction_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."atomic_freeze"("p_user_id" "uuid", "p_amount" numeric, "p_transaction_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."atomic_refund"("p_user_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."atomic_refund"("p_user_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."atomic_refund"("p_user_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."atomic_refund"("p_user_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_transaction_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."atomic_refund"("p_user_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_transaction_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."atomic_refund"("p_user_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_transaction_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."atomic_refund_direct"("p_user_id" "uuid", "p_amount" numeric, "p_transaction_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."atomic_refund_direct"("p_user_id" "uuid", "p_amount" numeric, "p_transaction_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."atomic_refund_direct"("p_user_id" "uuid", "p_amount" numeric, "p_transaction_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_frozen_discrepancies"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_frozen_discrepancies"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_frozen_discrepancies"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_provider_logs"("retention_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_provider_logs"("retention_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_provider_logs"("retention_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_user_balance_ledger"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_user_balance_ledger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_user_balance_ledger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_rentals"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_rentals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_rentals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fix_frozen_balance_discrepancy"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fix_frozen_balance_discrepancy"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fix_frozen_balance_discrepancy"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cron_jobs"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_cron_jobs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cron_jobs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_setting"("setting_key" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_setting"("setting_key" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_setting"("setting_key" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "postgres";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "anon";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "postgres";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "anon";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "postgres";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "anon";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_promo_uses"("code_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_promo_uses"("code_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_promo_uses"("code_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."lock_user_wallet"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."lock_user_wallet"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lock_user_wallet"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_event"("p_level" "text", "p_category" "text", "p_message" "text", "p_metadata" "jsonb", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."log_event"("p_level" "text", "p_category" "text", "p_message" "text", "p_metadata" "jsonb", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_event"("p_level" "text", "p_category" "text", "p_message" "text", "p_metadata" "jsonb", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_direct_frozen_amount_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_direct_frozen_amount_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_direct_frozen_amount_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_direct_frozen_clear_activation"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_direct_frozen_clear_activation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_direct_frozen_clear_activation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_direct_frozen_clear_rental"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_direct_frozen_clear_rental"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_direct_frozen_clear_rental"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_expired_activations"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_expired_activations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_expired_activations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_sms_received"("p_order_id" "text", "p_code" "text", "p_text" "text", "p_source" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_sms_received"("p_order_id" "text", "p_code" "text", "p_text" "text", "p_source" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_sms_received"("p_order_id" "text", "p_code" "text", "p_text" "text", "p_source" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reconcile_frozen_balance"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reconcile_frozen_balance"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reconcile_frozen_balance"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reconcile_orphan_freezes"() TO "anon";
GRANT ALL ON FUNCTION "public"."reconcile_orphan_freezes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reconcile_orphan_freezes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reconcile_rentals_orphan_freezes"() TO "anon";
GRANT ALL ON FUNCTION "public"."reconcile_rentals_orphan_freezes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reconcile_rentals_orphan_freezes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."secure_freeze_balance"("p_user_id" "uuid", "p_amount" numeric, "p_activation_id" "uuid", "p_rental_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."secure_freeze_balance"("p_user_id" "uuid", "p_amount" numeric, "p_activation_id" "uuid", "p_rental_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."secure_freeze_balance"("p_user_id" "uuid", "p_amount" numeric, "p_activation_id" "uuid", "p_rental_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."secure_moneyfusion_credit"("p_transaction_id" "uuid", "p_token" "text", "p_reference" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."secure_moneyfusion_credit"("p_transaction_id" "uuid", "p_token" "text", "p_reference" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."secure_moneyfusion_credit"("p_transaction_id" "uuid", "p_token" "text", "p_reference" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."secure_moneyfusion_credit_v2"("p_transaction_id" "uuid", "p_token" "text", "p_reference" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."secure_moneyfusion_credit_v2"("p_transaction_id" "uuid", "p_token" "text", "p_reference" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."secure_moneyfusion_credit_v2"("p_transaction_id" "uuid", "p_token" "text", "p_reference" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."secure_referral_payout"("p_referral_id" "uuid", "p_bonus_referrer" numeric, "p_bonus_referee" numeric, "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."secure_referral_payout"("p_referral_id" "uuid", "p_bonus_referrer" numeric, "p_bonus_referee" numeric, "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."secure_referral_payout"("p_referral_id" "uuid", "p_bonus_referrer" numeric, "p_bonus_referee" numeric, "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."secure_unfreeze_balance"("p_user_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_refund_to_balance" boolean, "p_refund_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."secure_unfreeze_balance"("p_user_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_refund_to_balance" boolean, "p_refund_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."secure_unfreeze_balance"("p_user_id" "uuid", "p_activation_id" "uuid", "p_rental_id" "uuid", "p_refund_to_balance" boolean, "p_refund_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."transfer_service_stock"("source_code" "text", "target_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."transfer_service_stock"("source_code" "text", "target_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."transfer_service_stock"("source_code" "text", "target_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_activation_packages_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_activation_packages_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_activation_packages_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_activations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_activations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_activations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_contact_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_contact_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_contact_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_payment_providers_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_payment_providers_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_payment_providers_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_rentals_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_rentals_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_rentals_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_setting"("setting_key" character varying, "setting_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_setting"("setting_key" character varying, "setting_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_setting"("setting_key" character varying, "setting_value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_promo_code"("p_code" "text", "p_user_id" "uuid", "p_purchase_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_promo_code"("p_code" "text", "p_user_id" "uuid", "p_purchase_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_promo_code"("p_code" "text", "p_user_id" "uuid", "p_purchase_amount" numeric) TO "service_role";
























GRANT ALL ON TABLE "public"."activation_packages" TO "anon";
GRANT ALL ON TABLE "public"."activation_packages" TO "authenticated";
GRANT ALL ON TABLE "public"."activation_packages" TO "service_role";



GRANT ALL ON TABLE "public"."activations" TO "anon";
GRANT ALL ON TABLE "public"."activations" TO "authenticated";
GRANT ALL ON TABLE "public"."activations" TO "service_role";



GRANT ALL ON TABLE "public"."activation_stats" TO "anon";
GRANT ALL ON TABLE "public"."activation_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."activation_stats" TO "service_role";



GRANT ALL ON TABLE "public"."activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."rentals" TO "anon";
GRANT ALL ON TABLE "public"."rentals" TO "authenticated";
GRANT ALL ON TABLE "public"."rentals" TO "service_role";



GRANT ALL ON TABLE "public"."available_services" TO "anon";
GRANT ALL ON TABLE "public"."available_services" TO "authenticated";
GRANT ALL ON TABLE "public"."available_services" TO "service_role";



GRANT ALL ON TABLE "public"."balance_operations" TO "anon";
GRANT ALL ON TABLE "public"."balance_operations" TO "authenticated";
GRANT ALL ON TABLE "public"."balance_operations" TO "service_role";



GRANT ALL ON TABLE "public"."contact_settings" TO "anon";
GRANT ALL ON TABLE "public"."contact_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_settings" TO "service_role";



GRANT ALL ON TABLE "public"."countries" TO "anon";
GRANT ALL ON TABLE "public"."countries" TO "authenticated";
GRANT ALL ON TABLE "public"."countries" TO "service_role";



GRANT ALL ON TABLE "public"."email_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."email_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."email_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."email_logs" TO "anon";
GRANT ALL ON TABLE "public"."email_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_logs" TO "service_role";



GRANT ALL ON TABLE "public"."favorite_services" TO "anon";
GRANT ALL ON TABLE "public"."favorite_services" TO "authenticated";
GRANT ALL ON TABLE "public"."favorite_services" TO "service_role";



GRANT ALL ON TABLE "public"."logs_provider" TO "anon";
GRANT ALL ON TABLE "public"."logs_provider" TO "authenticated";
GRANT ALL ON TABLE "public"."logs_provider" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."payment_provider_logs" TO "anon";
GRANT ALL ON TABLE "public"."payment_provider_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_provider_logs" TO "service_role";



GRANT ALL ON TABLE "public"."payment_providers" TO "anon";
GRANT ALL ON TABLE "public"."payment_providers" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_providers" TO "service_role";



GRANT ALL ON TABLE "public"."popular_services" TO "anon";
GRANT ALL ON TABLE "public"."popular_services" TO "authenticated";
GRANT ALL ON TABLE "public"."popular_services" TO "service_role";



GRANT ALL ON TABLE "public"."pricing_rules_archive" TO "anon";
GRANT ALL ON TABLE "public"."pricing_rules_archive" TO "authenticated";
GRANT ALL ON TABLE "public"."pricing_rules_archive" TO "service_role";



GRANT ALL ON TABLE "public"."promo_code_uses" TO "anon";
GRANT ALL ON TABLE "public"."promo_code_uses" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_code_uses" TO "service_role";



GRANT ALL ON TABLE "public"."promo_codes" TO "anon";
GRANT ALL ON TABLE "public"."promo_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_codes" TO "service_role";



GRANT ALL ON TABLE "public"."referrals" TO "anon";
GRANT ALL ON TABLE "public"."referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."referrals" TO "service_role";



GRANT ALL ON TABLE "public"."rental_logs" TO "anon";
GRANT ALL ON TABLE "public"."rental_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."rental_logs" TO "service_role";



GRANT ALL ON TABLE "public"."rental_messages" TO "anon";
GRANT ALL ON TABLE "public"."rental_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."rental_messages" TO "service_role";



GRANT ALL ON TABLE "public"."service_icons" TO "anon";
GRANT ALL ON TABLE "public"."service_icons" TO "authenticated";
GRANT ALL ON TABLE "public"."service_icons" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON TABLE "public"."sms_messages" TO "anon";
GRANT ALL ON TABLE "public"."sms_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."sms_messages" TO "service_role";



GRANT ALL ON TABLE "public"."system_logs" TO "anon";
GRANT ALL ON TABLE "public"."system_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."system_logs" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."v_country_health" TO "anon";
GRANT ALL ON TABLE "public"."v_country_health" TO "authenticated";
GRANT ALL ON TABLE "public"."v_country_health" TO "service_role";



GRANT ALL ON TABLE "public"."v_dashboard_stats" TO "anon";
GRANT ALL ON TABLE "public"."v_dashboard_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."v_dashboard_stats" TO "service_role";



GRANT ALL ON TABLE "public"."v_frozen_balance_health" TO "anon";
GRANT ALL ON TABLE "public"."v_frozen_balance_health" TO "authenticated";
GRANT ALL ON TABLE "public"."v_frozen_balance_health" TO "service_role";



GRANT ALL ON TABLE "public"."v_frozen_balance_health_reconciliation" TO "anon";
GRANT ALL ON TABLE "public"."v_frozen_balance_health_reconciliation" TO "authenticated";
GRANT ALL ON TABLE "public"."v_frozen_balance_health_reconciliation" TO "service_role";



GRANT ALL ON TABLE "public"."v_frozen_discrepancies" TO "anon";
GRANT ALL ON TABLE "public"."v_frozen_discrepancies" TO "authenticated";
GRANT ALL ON TABLE "public"."v_frozen_discrepancies" TO "service_role";



GRANT ALL ON TABLE "public"."v_provider_stats_24h" TO "anon";
GRANT ALL ON TABLE "public"."v_provider_stats_24h" TO "authenticated";
GRANT ALL ON TABLE "public"."v_provider_stats_24h" TO "service_role";



GRANT ALL ON TABLE "public"."v_service_health" TO "anon";
GRANT ALL ON TABLE "public"."v_service_health" TO "authenticated";
GRANT ALL ON TABLE "public"."v_service_health" TO "service_role";



GRANT ALL ON TABLE "public"."v_service_response_time" TO "anon";
GRANT ALL ON TABLE "public"."v_service_response_time" TO "authenticated";
GRANT ALL ON TABLE "public"."v_service_response_time" TO "service_role";



GRANT ALL ON TABLE "public"."virtual_numbers" TO "anon";
GRANT ALL ON TABLE "public"."virtual_numbers" TO "authenticated";
GRANT ALL ON TABLE "public"."virtual_numbers" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_logs" TO "anon";
GRANT ALL ON TABLE "public"."webhook_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_logs" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































