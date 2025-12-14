-- Ajouter la colonne email_type à email_campaigns
ALTER TABLE email_campaigns 
ADD COLUMN IF NOT EXISTS email_type TEXT DEFAULT 'promo';

-- Mettre à jour les anciennes campagnes
UPDATE email_campaigns 
SET email_type = 'promo' 
WHERE email_type IS NULL;
