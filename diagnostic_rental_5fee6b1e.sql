-- Diagnostic rental 5fee6b1e-bba2-4235-9661-c7cbd402fed7

-- 1. Vérifier le rental
SELECT 
  id,
  user_id,
  rent_id,
  rental_id,
  phone,
  status,
  frozen_amount,
  total_cost,
  created_at,
  end_date,
  updated_at
FROM rentals
WHERE id = '5fee6b1e-bba2-4235-9661-c7cbd402fed7';

-- 2. Vérifier les logs
SELECT 
  created_at,
  action,
  status,
  response_text,
  payload
FROM rental_logs
WHERE rental_id IN (
  SELECT rent_id FROM rentals WHERE id = '5fee6b1e-bba2-4235-9661-c7cbd402fed7'
  UNION
  SELECT rental_id FROM rentals WHERE id = '5fee6b1e-bba2-4235-9661-c7cbd402fed7'
)
ORDER BY created_at DESC
LIMIT 10;

-- 3. Vérifier la transaction
SELECT 
  id,
  type,
  amount,
  status,
  created_at,
  metadata
FROM transactions
WHERE related_rental_id = '5fee6b1e-bba2-4235-9661-c7cbd402fed7';

-- 4. Vérifier le solde user
SELECT 
  u.id,
  u.balance,
  u.frozen_balance,
  r.frozen_amount as rental_frozen
FROM users u
JOIN rentals r ON r.user_id = u.id
WHERE r.id = '5fee6b1e-bba2-4235-9661-c7cbd402fed7';

-- 5. Vérifier balance_operations
SELECT 
  created_at,
  operation_type,
  amount,
  balance_before,
  balance_after,
  frozen_before,
  frozen_after,
  reason
FROM balance_operations
WHERE rental_id = '5fee6b1e-bba2-4235-9661-c7cbd402fed7'
ORDER BY created_at DESC
LIMIT 10;
