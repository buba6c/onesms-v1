-- ============================================================================
-- AJOUTER COLONNE external_id À LA TABLE transactions
-- Pour stocker les IDs des fournisseurs de paiement (PayDunya, MoneyFusion, etc.)
-- ============================================================================

-- Ajouter la colonne external_id si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'external_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN external_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON transactions(external_id);
  END IF;
END $$;

-- Ajouter la colonne provider si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'provider'
  ) THEN
    ALTER TABLE transactions ADD COLUMN provider TEXT DEFAULT 'moneyfusion';
    CREATE INDEX IF NOT EXISTS idx_transactions_provider ON transactions(provider);
  END IF;
END $$;

-- Vérifier que les colonnes ont été créées
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('external_id', 'provider');
