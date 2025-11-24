-- Ajouter la colonne metadata à la table transactions
-- Cette colonne permet de stocker des infos supplémentaires sur les transactions

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Index pour rechercher dans les métadonnées
CREATE INDEX IF NOT EXISTS idx_transactions_metadata 
ON transactions USING gin(metadata);

COMMENT ON COLUMN transactions.metadata IS 
'Métadonnées additionnelles (activation_id, order_id, phone, etc.)';
