-- Table pour stocker les statistiques de performance par pays et service
CREATE TABLE IF NOT EXISTS country_service_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code TEXT NOT NULL,
  service_code TEXT NOT NULL,
  success_rate DECIMAL DEFAULT 95,        -- Taux de succès des activations (%)
  popularity_share DECIMAL DEFAULT 0,     -- Part de marché pour ce service (%)
  ranking_position INTEGER DEFAULT 999,   -- Position dans le classement SMS-Activate
  available_count INTEGER DEFAULT 0,      -- Nombre de numéros disponibles
  price DECIMAL DEFAULT 0,                -- Prix actuel
  retail_price DECIMAL DEFAULT 0,         -- Prix de vente suggéré
  composite_score DECIMAL DEFAULT 0,      -- Score composite calculé
  last_synced TIMESTAMP DEFAULT NOW(),    -- Dernière synchronisation
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(country_code, service_code)
);

-- Index pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_country_service_stats_service ON country_service_stats(service_code, composite_score DESC);
CREATE INDEX IF NOT EXISTS idx_country_service_stats_country ON country_service_stats(country_code);
CREATE INDEX IF NOT EXISTS idx_country_service_stats_ranking ON country_service_stats(service_code, ranking_position ASC);
CREATE INDEX IF NOT EXISTS idx_country_service_stats_success ON country_service_stats(service_code, success_rate DESC);
CREATE INDEX IF NOT EXISTS idx_country_service_stats_synced ON country_service_stats(last_synced DESC);

-- Commentaires
COMMENT ON TABLE country_service_stats IS 'Statistiques de performance par pays et service (synchronisées avec SMS-Activate)';
COMMENT ON COLUMN country_service_stats.success_rate IS 'Taux de succès des activations (0-100%)';
COMMENT ON COLUMN country_service_stats.popularity_share IS 'Part de marché pour ce service (0-100%)';
COMMENT ON COLUMN country_service_stats.ranking_position IS 'Position dans le classement SMS-Activate (1 = meilleur)';
COMMENT ON COLUMN country_service_stats.composite_score IS 'Score composite: success*0.4 + popularity*0.3 + availability_bonus + ranking_bonus';

-- RLS Policies
ALTER TABLE country_service_stats ENABLE ROW LEVEL SECURITY;

-- Lecture publique
CREATE POLICY "Anyone can read country service stats"
  ON country_service_stats
  FOR SELECT
  TO public
  USING (true);

-- Écriture seulement par service_role
CREATE POLICY "Only service role can manage stats"
  ON country_service_stats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
