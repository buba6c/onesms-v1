-- Creates an idempotent SECURITY DEFINER RPC to credit MoneyFusion deposits
-- Usage: select secure_moneyfusion_credit(p_transaction_id := 'uuid', p_token := 'token', p_reference := 'ref');

create or replace function public.secure_moneyfusion_credit(
  p_transaction_id uuid,
  p_token text default null,
  p_reference text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

comment on function public.secure_moneyfusion_credit(uuid, text, text) is 'Idempotent MoneyFusion credit via SECURITY DEFINER; writes balance_operations and updates users/transactions directly.';
