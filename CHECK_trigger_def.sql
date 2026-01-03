-- Retrieve Trigger Definition
SELECT 
    pg_get_triggerdef(oid) as trigger_def
FROM pg_trigger
WHERE tgname = 'users_balance_guard';

-- Also retrieve the function it calls
SELECT 
    p.proname,
    pg_get_functiondef(p.oid) as func_def
FROM pg_proc p
JOIN pg_trigger t ON t.tgfoid = p.oid
WHERE t.tgname = 'users_balance_guard';
