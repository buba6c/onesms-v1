-- Mettre à jour le numéro WhatsApp dans contact_settings
UPDATE contact_settings 
SET 
  whatsapp = '+1 683 777 0410',
  updated_at = NOW()
WHERE id IS NOT NULL;

SELECT * FROM contact_settings;
