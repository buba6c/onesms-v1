-- Ajouter 'number_purchase' aux types de transactions autorisés
-- Erreur: new row for relation "transactions" violates check constraint "transactions_type_check"

-- Supprimer l'ancienne contrainte
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Recréer avec les nouveaux types
ALTER TABLE transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('recharge', 'purchase', 'refund', 'bonus', 'number_purchase'));

COMMENT ON CONSTRAINT transactions_type_check ON transactions IS 
'Types de transactions: recharge (dépôt), purchase (achat ancien), number_purchase (achat numéro), refund (remboursement), bonus (bonus)';
