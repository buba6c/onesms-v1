-- URGENT FIX: Add frozen_balance column to users table
-- Execute this SQL in Supabase Dashboard > SQL Editor

-- Add column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS frozen_balance DECIMAL(10,2) DEFAULT 0 NOT NULL;

-- Initialize for existing users  
UPDATE users 
SET frozen_balance = 0 
WHERE frozen_balance IS NULL;

-- Add constraint
ALTER TABLE users
DROP CONSTRAINT IF EXISTS check_frozen_balance_non_negative;

ALTER TABLE users
ADD CONSTRAINT check_frozen_balance_non_negative 
CHECK (frozen_balance >= 0);

-- Verify
SELECT 
  'users table now has frozen_balance column' as status,
  COUNT(*) as total_users,
  SUM(frozen_balance) as total_frozen
FROM users;
