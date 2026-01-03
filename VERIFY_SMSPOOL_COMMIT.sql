-- Check the transaction and ledger for this activation
SELECT 
    'activations' as table_name,
    id::text as record_id,
    status,
    charged,
    sms_code,
    frozen_amount,
    created_at,
    updated_at
FROM activations
WHERE id = '5bde8e90-e0db-4308-9948-d504a3dabc84'

UNION ALL

SELECT 
    'transactions' as table_name,
    id::text as record_id,
    status,
    NULL as charged,
    NULL as sms_code,
    amount as frozen_amount,
    created_at,
    updated_at
FROM transactions
WHERE related_activation_id = '5bde8e90-e0db-4308-9948-d504a3dabc84'

UNION ALL

SELECT 
    'ledger' as table_name,
    id::text as record_id,
    transaction_type as status,
    NULL as charged,
    reason as sms_code,
    amount as frozen_amount,
    created_at,
    created_at as updated_at
FROM ledger
WHERE activation_id = '5bde8e90-e0db-4308-9948-d504a3dabc84'
ORDER BY table_name, created_at;
