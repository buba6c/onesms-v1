
-- 🧹 CLEAR SMSPOOL VETO (From Activations Table)

-- The veto system checks the LAST activation for each user+service.
-- If SMSPool failed, it will be vetoed until a new activation succeeds.
-- This script clears the failed SMSPool activations to reset the veto.

BEGIN;

-- Option 1: Delete failed SMSPool activations (aggressive)
DELETE FROM activations 
WHERE provider = 'smspool' 
  AND status IN ('cancelled', 'timeout', 'expired', 'refunded')
  AND sms_code IS NULL
  AND created_at > NOW() - INTERVAL '7 days';

-- Alternative Option 2: Mark them as 'completed' to fake success (not recommended)
-- UPDATE activations SET status = 'completed', sms_code = 'RESET' WHERE ...

COMMIT;

-- Verification
SELECT COUNT(*) as failed_smspool_remaining 
FROM activations 
WHERE provider = 'smspool' 
  AND status IN ('cancelled', 'timeout', 'expired', 'refunded')
  AND sms_code IS NULL;
