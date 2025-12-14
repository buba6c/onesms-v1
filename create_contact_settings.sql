-- Table pour les paramètres de contact
CREATE TABLE IF NOT EXISTS contact_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL DEFAULT 'support@onesms-sn.com',
  whatsapp VARCHAR(50) DEFAULT '+221 77 123 45 67',
  address VARCHAR(255) DEFAULT 'Dakar, Sénégal',
  address_detail VARCHAR(255) DEFAULT 'Afrique de l''Ouest',
  hours_weekday VARCHAR(100) DEFAULT 'Lundi - Vendredi: 9h - 18h',
  hours_saturday VARCHAR(100) DEFAULT 'Samedi: 9h - 14h',
  hours_sunday VARCHAR(100) DEFAULT 'Dimanche: Fermé',
  email_response_time VARCHAR(100) DEFAULT 'Réponse sous 24h',
  whatsapp_hours VARCHAR(100) DEFAULT 'Lun-Sam, 9h-18h',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer les valeurs par défaut si la table est vide
INSERT INTO contact_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM contact_settings LIMIT 1);

-- RLS policies
ALTER TABLE contact_settings ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les paramètres de contact
CREATE POLICY "Anyone can read contact secd "/Users/mac/Desktop/ONE SMS V1" && npx supabase functions deploy get-rent-status set-rent-statusttings" ON contact_settings
  FOR SELECT USING (true);

-- Seuls les admins peuvent modifier
CREATE POLICY "Admins can update contact settings" ON contact_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert contact settings" ON contact_settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_contact_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contact_settings_updated_at ON contact_settings;
CREATE TRIGGER contact_settings_updated_at
  BEFORE UPDATE ON contact_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_settings_updated_at();
