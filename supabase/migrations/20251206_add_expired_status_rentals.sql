-- Add 'expired' to allowed statuses for rentals
ALTER TABLE rentals 
DROP CONSTRAINT IF EXISTS rentals_status_check;

ALTER TABLE rentals 
ADD CONSTRAINT rentals_status_check 
CHECK (status IN ('active', 'completed', 'cancelled', 'expired'));
