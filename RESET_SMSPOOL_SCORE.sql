
-- 🧹 RESET SMSPOOL SCORE (Clear Recent Failed Transactions)

-- This will delete recent failed transactions, removing the "Personal Veto" 
-- that prevents SMSPool from being selected automatically.

BEGIN;

-- 1. Delete failed transactions from the last 24 hours
-- (Adjust interval if needed, e.g. '1 hour')
DELETE FROM transactions 
WHERE status = 'failed' 
  AND created_at > NOW() - INTERVAL '24 hours';

-- 2. Optional: Reset provider performance stats if you use them strictly
-- UPDATE provider_performance SET fail_count = 0 WHERE provider = 'smspool';

COMMIT;

-- Verification
SELECT count(*) as failed_txns_remaining 
FROM transactions 
WHERE status = 'failed' 
  AND created_at > NOW() - INTERVAL '24 hours';
