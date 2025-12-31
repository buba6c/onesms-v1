-- Unfreeze 6 credits for testbuba@onesms.com
-- Includes required ledger entry to satisfy 'ensure_user_balance_ledger' trigger

DO $$
DECLARE
  v_user_id UUID;
  v_current_balance DECIMAL;
  v_current_frozen DECIMAL;
  v_new_balance DECIMAL;
  v_new_frozen DECIMAL;
  v_amount DECIMAL := 6;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'testbuba@onesms.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User testbuba@onesms.com not found';
  END IF;

  -- Lock user row and get current values (prevents race conditions)
  SELECT balance, frozen_balance INTO v_current_balance, v_current_frozen
  FROM public.users
  WHERE id = v_user_id
  FOR UPDATE;

  -- Calculate new values
  v_new_balance := v_current_balance + v_amount;
  v_new_frozen := GREATEST(0, v_current_frozen - v_amount);

  -- Insert into ledger (balance_operations) - REQUIRED BY TRIGGER
  -- operation_type 'refund' fits: balance increases, frozen decreases
  INSERT INTO public.balance_operations (
    user_id,
    operation_type,
    amount,
    balance_before,
    balance_after,
    frozen_before,
    frozen_after,
    reason,
    created_at
  ) VALUES (
    v_user_id,
    'refund', 
    v_amount,
    v_current_balance,
    v_new_balance,
    v_current_frozen,
    v_new_frozen,
    'Manual unfreeze via SQL script',
    now() -- timestamp must be within 5 seconds of update
  );

  -- Update user balance
  UPDATE public.users
  SET 
    balance = v_new_balance,
    frozen_balance = v_new_frozen
  WHERE id = v_user_id;

  RAISE NOTICE 'Unfrozen % credits. New Balance: %, New Frozen: %', v_amount, v_new_balance, v_new_frozen;

END $$;
