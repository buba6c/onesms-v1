-- Ajouter 'moneroo' aux valeurs autorisées pour payment_method
-- Exécuter ce script dans le SQL Editor de Supabase:
-- https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql

-- Modifier la contrainte pour inclure 'moneroo'
ALTER TABLE transactions 
  DROP CONSTRAINT transactions_payment_method_check,
  ADD CONSTRAINT transactions_payment_method_check 
    CHECK (payment_method IS NULL OR payment_method IN (
      'wave', 
      'om', 
      'moneyfusion', 
      'paydunya', 
      'paytech', 
      'moneroo', 
      'bonus', 
      'manual', 
      'admin'
    ));
