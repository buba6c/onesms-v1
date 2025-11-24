-- Mettre à jour l'activation annulée et rembourser l'utilisateur

-- 1. Vérifier l'état actuel
SELECT 
  a.id,
  a.phone,
  a.status,
  a.price,
  a.user_id,
  t.status as transaction_status,
  u.frozen_balance
FROM activations a
LEFT JOIN transactions t ON t.related_activation_id = a.id
LEFT JOIN users u ON u.id = a.user_id
WHERE a.phone = '6283187992496';

-- 2. Mettre à jour l'activation comme annulée
UPDATE activations
SET status = 'cancelled',
    updated_at = NOW()
WHERE phone = '6283187992496'
  AND status = 'pending';

-- 3. Rembourser la transaction (changer de pending à refunded)
UPDATE transactions
SET status = 'refunded',
    updated_at = NOW()
WHERE related_activation_id = (
  SELECT id FROM activations WHERE phone = '6283187992496'
)
AND status = 'pending';

-- 4. Dégeler le solde de l'utilisateur
UPDATE users
SET frozen_balance = GREATEST(0, frozen_balance - (
  SELECT price FROM activations WHERE phone = '6283187992496'
)),
updated_at = NOW()
WHERE id = (
  SELECT user_id FROM activations WHERE phone = '6283187992496'
);

-- 5. Vérifier le résultat final
SELECT 
  a.id,
  a.phone,
  a.status as activation_status,
  a.price,
  t.status as transaction_status,
  u.frozen_balance,
  u.balance
FROM activations a
LEFT JOIN transactions t ON t.related_activation_id = a.id
LEFT JOIN users u ON u.id = a.user_id
WHERE a.phone = '6283187992496';
