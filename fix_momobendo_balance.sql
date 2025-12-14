-- Correction balance doublon pour momobendo222@gmail.com
-- Le bonus referral a été crédité 2 fois par erreur

-- 1. Insérer l'opération de correction
INSERT INTO balance_operations (
  user_id, operation_type, amount,
  balance_before, balance_after, frozen_before, frozen_after,
  reason
) VALUES (
  'bc46c658-a5fe-45e3-b825-58edbf7a8264',
  'refund',
  5,
  15,
  10,
  0,
  0,
  'Correction doublon referral bonus'
);

-- 2. Mettre à jour la balance
UPDATE users SET balance = 10 WHERE id = 'bc46c658-a5fe-45e3-b825-58edbf7a8264';

-- 3. Vérifier
SELECT email, balance FROM users WHERE id = 'bc46c658-a5fe-45e3-b825-58edbf7a8264';
