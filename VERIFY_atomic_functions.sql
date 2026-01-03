-- Vérifier que atomic_refund ET atomic_complete_activation existent
-- Exécutez dans Supabase SQL Editor

-- 1. Vérifier atomic_refund
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as parameters
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname = 'atomic_refund';
-- Résultat attendu: 1 ligne

-- 2. Vérifier atomic_complete_activation
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as parameters
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname = 'atomic_complete_activation';
-- Résultat attendu: 1 ligne

-- Si atomic_complete_activation n'existe PAS (0 lignes), exécutez ceci:
-- (Décommentez les lignes ci-dessous si besoin)

/*
CREATE OR REPLACE FUNCTION atomic_complete_activation(
  p_activation_id UUID,
  p_sms_code TEXT DEFAULT NULL,
  p_sms_text TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Récupérer user_id
  SELECT user_id INTO v_user_id
  FROM activations
  WHERE id = p_activation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Activation not found: %', p_activation_id;
  END IF;
  
  -- Mettre à jour SMS code/text
  UPDATE activations
  SET 
    sms_code = p_sms_code,
    sms_text = p_sms_text
  WHERE id = p_activation_id;
  
  -- Appeler atomic_commit
  SELECT atomic_commit(
    v_user_id,
    p_activation_id,
    NULL,
    NULL,
    'SMS received'
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION atomic_complete_activation TO authenticated, service_role, anon;
*/
