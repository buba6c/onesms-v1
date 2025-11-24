-- ============================================================================
-- Ajout du champ 'charged' pour tracer la facturation
-- ============================================================================

-- Ajouter le champ charged (booléen pour savoir si l'utilisateur a été facturé)
ALTER TABLE activations 
ADD COLUMN IF NOT EXISTS charged BOOLEAN DEFAULT FALSE;

-- Index pour les requêtes
CREATE INDEX IF NOT EXISTS idx_activations_charged ON activations(charged);

-- Mettre à jour les activations existantes avec status='received' pour qu'elles soient marquées comme facturées
UPDATE activations 
SET charged = TRUE 
WHERE status = 'received' AND charged = FALSE;

COMMENT ON COLUMN activations.charged IS 'TRUE si l\'utilisateur a été facturé pour cette activation, FALSE sinon';
