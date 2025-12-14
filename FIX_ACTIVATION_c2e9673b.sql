-- ============================================================================
-- CORRECTION ACTIVATION c2e9673b: SMS reçu mais pas chargé
-- ============================================================================
-- Cette activation a frozen_amount=5 alors que SMS est reçu
-- On utilise la fonction atomic_commit() maintenant corrigée
-- ============================================================================

SELECT * FROM atomic_commit(
  'e108c02a-2012-4043-bbc2-fb09bb11f824'::uuid,
  'c2e9673b-0aae-458e-b1ff-86d966c27810'::uuid,
  NULL,
  'Manual fix: SMS received but not charged (frozen_amount=5)'
);

-- Vérification après correction
SELECT 
  id,
  phone,
  status,
  frozen_amount,
  charged,
  sms_code,
  price
FROM activations 
WHERE id = 'c2e9673b-0aae-458e-b1ff-86d966c27810';

-- Vérifier la balance de l'utilisateur
SELECT 
  email,
  balance,
  frozen_balance
FROM users 
WHERE id = 'e108c02a-2012-4043-bbc2-fb09bb11f824';
