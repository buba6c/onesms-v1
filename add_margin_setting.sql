-- Ajouter le paramètre de marge globale
INSERT INTO system_settings (key, value, category, description)
VALUES (
  'pricing_margin_percentage',
  '30',
  'pricing',
  'Marge automatique appliquée sur les prix SMS-Activate (en %)'
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description;
