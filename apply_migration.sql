-- Migration rapide SMS-Activate
-- À exécuter dans Supabase SQL Editor
-- Version corrigée - Ordre d'exécution optimal

-- ÉTAPE 1: Drop et recréer table rentals pour éviter les conflits
DROP TABLE IF EXISTS rentals CASCADE;

CREATE TABLE rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rental_id TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  service_code TEXT NOT NULL,
  country_code TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  rent_hours INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  end_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ÉTAPE 2: Indexes pour rentals
CREATE INDEX idx_rentals_user_id ON rentals(user_id);
CREATE INDEX idx_rentals_rental_id ON rentals(rental_id);
CREATE INDEX idx_rentals_status ON rentals(status);

-- ÉTAPE 3: RLS Policies pour rentals
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own rentals" ON rentals;
CREATE POLICY "Users can view own rentals" ON rentals FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own rentals" ON rentals;
CREATE POLICY "Users can create own rentals" ON rentals FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own rentals" ON rentals;
CREATE POLICY "Users can update own rentals" ON rentals FOR UPDATE USING (auth.uid() = user_id);

-- ÉTAPE 4: Ajouter colonne provider aux tables existantes
ALTER TABLE activations ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'sms-activate';
ALTER TABLE services ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'sms-activate';
ALTER TABLE countries ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'sms-activate';
ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'sms-activate';

-- ÉTAPE 5: Indexes pour provider
CREATE INDEX IF NOT EXISTS idx_activations_provider ON activations(provider);
CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider);
CREATE INDEX IF NOT EXISTS idx_countries_provider ON countries(provider);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_provider ON pricing_rules(provider);

-- ÉTAPE 6: Ajouter colonne related_rental_id à transactions (MAINTENANT que rentals existe)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS related_rental_id UUID REFERENCES rentals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_related_rental_id ON transactions(related_rental_id);

-- ÉTAPE 7: Update transaction types (supprimer l'ancienne contrainte seulement)
-- Ne pas ajouter de nouvelle contrainte pour éviter les conflits avec les données existantes
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
