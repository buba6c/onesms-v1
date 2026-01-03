-- Find latest SMSPool activations for direct API check
SELECT 
    id,
    order_id,
    phone,
    service_code,
    status,
    sms_code,
    provider,
    created_at,
    expires_at
FROM activations
WHERE provider = 'smspool'
ORDER BY created_at DESC
LIMIT 5;
