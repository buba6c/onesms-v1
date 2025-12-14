-- Ensure rentals has a charged flag used by secure_unfreeze_balance
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS charged boolean DEFAULT false;

-- Backfill a safe default based on terminal states
UPDATE rentals
SET charged = CASE
  WHEN status IN ('finished', 'completed') THEN true
  WHEN status IN ('cancelled', 'expired') THEN false
  ELSE COALESCE(charged, false)
END;

-- Index to filter charged quickly (optional but cheap)
CREATE INDEX IF NOT EXISTS rentals_charged_idx ON rentals(charged);