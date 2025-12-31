-- ===================================================================
-- FIX SÉCURITÉ - Function Search Path
-- Date: 2025-12-15
-- ===================================================================
-- 
-- PROBLÈME : Les fonctions sans search_path fixe sont vulnérables à 
-- l'attaque "search path injection" où un attaquant peut créer des 
-- objets malveillants dans un schéma de priorité supérieure.
--
-- SOLUTION : Ajouter "SET search_path = ''" à chaque fonction pour
-- forcer l'utilisation de noms qualifiés (ex: public.users)
-- ===================================================================

-- ===================================================================
-- TRIGGERS updated_at
-- ===================================================================

CREATE OR REPLACE FUNCTION public.update_activation_packages_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_payment_providers_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_contact_messages_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_wave_payment_proofs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_activations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_contact_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_rentals_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ===================================================================
-- FONCTIONS CRON/CLEANUP
-- ===================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_provider_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.provider_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.admin_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- ===================================================================
-- FONCTIONS MÉTIER (à vérifier et recréer selon votre logique)
-- ===================================================================

-- Note: Les fonctions suivantes nécessitent que vous ajoutiez
-- "SET search_path = ''" dans leur définition existante.
-- Vous devrez les recréer avec cette modification.

-- Liste des fonctions à modifier manuellement:
-- 1. reconcile_frozen_balance
-- 2. fix_frozen_balance_discrepancy
-- 3. expire_rentals
-- 4. process_expired_activations
-- 5. log_event
-- 6. transfer_service_stock
-- 7. secure_unfreeze_balance
-- 8. process_sms_received
-- 9. lock_user_wallet
-- 10. get_cron_jobs
-- 11. get_setting
-- 12. update_setting
-- 13. admin_add_credit
-- 14. prevent_direct_frozen_clear_activation
-- 15. prevent_direct_frozen_clear_rental
-- 16. secure_freeze_balance
-- 17. atomic_refund
-- 18. check_frozen_discrepancies
-- 19. atomic_refund_direct
-- 20. atomic_commit
-- 21. prevent_direct_frozen_amount_update
-- 22. ensure_user_balance_ledger
-- 23. atomic_freeze

-- ===================================================================
-- TEMPLATE pour modifier vos fonctions existantes
-- ===================================================================

-- Pour chaque fonction, ajoutez simplement "SET search_path = ''"
-- Exemple:
/*
CREATE OR REPLACE FUNCTION public.votre_fonction(param TYPE)
RETURNS TYPE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- <-- AJOUTER CETTE LIGNE
AS $$
BEGIN
  -- votre code existant
  -- Utilisez des noms qualifiés: public.table au lieu de juste table
END;
$$;
*/

-- ===================================================================
-- VÉRIFICATION
-- ===================================================================

-- Lister toutes les fonctions sans search_path fixe
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE 
    WHEN p.proconfig IS NULL THEN 'NO search_path set'
    ELSE 'search_path is set'
  END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proconfig IS NULL
ORDER BY p.proname;
