
-- ========================================================================
-- SYSTEME INTELLIGENT: Table de performance des fournisseurs
-- Permet de savoir quel fournisseur fonctionne le mieux pour quel service.
-- ========================================================================

CREATE TABLE IF NOT EXISTS provider_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    service_code TEXT NOT NULL,
    country_code TEXT DEFAULT 'ALL', -- On pourra affiner par pays plus tard si besoin
    
    attempts INT DEFAULT 0,
    successes INT DEFAULT 0,
    
    -- Score sur 100 (auto-calculé)
    score DECIMAL GENERATED ALWAYS AS (
        CASE WHEN attempts = 0 THEN 0 
        ELSE (successes::DECIMAL / attempts::DECIMAL) * 100 
        END
    ) STORED,
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unicité pour éviter les doublons
    UNIQUE(provider, service_code, country_code)
);

-- Index pour trouver rapidement le meilleur provider pour un service
CREATE INDEX IF NOT EXISTS idx_best_provider ON provider_performance(service_code, score DESC);

-- Permissions
ALTER TABLE provider_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read" ON provider_performance FOR SELECT USING (true);
CREATE POLICY "Service Role Write" ON provider_performance FOR ALL USING (auth.role() = 'service_role');
