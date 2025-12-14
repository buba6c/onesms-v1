-- Migration: Ajouter services spéciaux pour le mode RENT
-- Date: 25 novembre 2025
-- Description: Ajoute "Any other" et "Full rent" pour les locations

-- Ajouter le service "Any other" (code: any)
INSERT INTO public.services (
  code,
  name,
  display_name,
  icon,
  category,
  active,
  provider,
  total_available,
  popularity_score
) VALUES (
  'any',
  'Any other',
  'Any other',
  '❓',
  'other',
  true,
  'sms-activate',
  0,  -- Sera mis à jour par la Edge Function
  100
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  icon = EXCLUDED.icon,
  active = EXCLUDED.active;

-- Ajouter le service "Full rent" (code: full)
INSERT INTO public.services (
  code,
  name,
  display_name,
  icon,
  category,
  active,
  provider,
  total_available,
  popularity_score
) VALUES (
  'full',
  'Full rent',
  'Full rent',
  '🏠',
  'other',
  true,
  'sms-activate',
  0,  -- Sera mis à jour par la Edge Function
  50
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  icon = EXCLUDED.icon,
  active = EXCLUDED.active;

-- Vérification
SELECT code, name, icon, active, provider
FROM public.services
WHERE code IN ('any', 'full');
