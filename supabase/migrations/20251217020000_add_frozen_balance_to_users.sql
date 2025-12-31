-- Add frozen_balance column to users table
-- This column tracks the total amount of credits frozen for pending activations

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS frozen_balance DECIMAL(10,2) DEFAULT 0 NOT NULL;

-- Add comment
COMMENT ON COLUMN users.frozen_balance IS 'Total amount of credits frozen for pending activations and rentals';

-- Add constraint to ensure frozen_balance is never negative
ALTER TABLE users
ADD CONSTRAINT check_frozen_balance_non_negative 
CHECK (frozen_balance >= 0);

-- Initialize frozen_balance for existing users
UPDATE users 
SET frozen_balance = 0 
WHERE frozen_balance IS NULL;
