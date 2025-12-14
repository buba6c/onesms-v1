-- Diagnostic complet rental 30658643 (5fee6b1e-bba2-4235-9661-c7cbd402fed7)

-- 1. Balance operations liées à ce rental
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
ORDER BY created_at DESC;

-- 2. Transaction associée
SELECT 
  id,
  type,
  amount,
  status,
  created_at,
  balance_before,
  balance_after,
  metadata
FROM transactions
WHERE related_rental_id = '5fee6b1e-bba2-4235-9661-c7cbd402fed7';

-- 3. User frozen balance actuel
SELECT 
  u.id,
  u.balance,
  u.frozen_balance
FROM users u
WHERE u.id = (SELECT user_id FROM rentals WHERE id = '5fee6b1e-bba2-4235-9661-c7cbd402fed7');

-- 4. Tous les rentals de cet utilisateur (pour voir le pattern)
SELECT 
  id,
  rent_id,
  status,
  frozen_amount,
  total_cost,
  created_at
FROM rentals
WHERE user_id = (SELECT user_id FROM rentals WHERE id = '5fee6b1e-bba2-4235-9661-c7cbd402fed7')
ORDER BY created_at DESC
LIMIT 10;
