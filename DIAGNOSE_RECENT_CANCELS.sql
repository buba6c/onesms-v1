
-- 🕵️ DIAGNOSE RECENT CANCELS/TIMEOUTS
-- Run this to see EXACTLY what happened to recent SMSPool orders.

SELECT 
    id,
    phone,
    order_id,
    provider,
    status,
    created_at,
    updated_at,
    (EXTRACT(EPOCH FROM (updated_at - created_at))) as duration_seconds,
    sms_code,
    sms_text
FROM activations
WHERE 
    provider = 'smspool' 
    AND (status = 'cancelled' OR status = 'timeout' OR status = 'expired' OR status = 'refunded')
    AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
