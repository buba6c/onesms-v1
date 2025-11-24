-- Vérifier si le SMS pour le numéro +6283187992496 a été reçu

-- 1. Chercher l'activation par numéro de téléphone
SELECT 
  id,
  order_id,
  phone,
  service_code,
  country_code,
  status,
  sms_code,
  sms_text,
  price,
  created_at,
  expires_at,
  updated_at
FROM activations
WHERE phone LIKE '%83187992496%'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Si aucun résultat, chercher dans toutes les activations récentes (dernières 24h)
SELECT 
  id,
  order_id,
  phone,
  service_code,
  status,
  sms_code,
  LEFT(sms_text, 50) as sms_preview,
  created_at
FROM activations
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- 3. Vérifier les transactions associées
SELECT 
  t.id,
  t.type,
  t.amount,
  t.status,
  t.related_activation_id,
  t.created_at,
  a.phone,
  a.sms_code
FROM transactions t
LEFT JOIN activations a ON t.related_activation_id = a.id
WHERE a.phone LIKE '%83187992496%'
ORDER BY t.created_at DESC;

-- 4. Statistiques globales des SMS reçus aujourd'hui
SELECT 
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN sms_code IS NOT NULL THEN 1 END) as with_code,
  COUNT(CASE WHEN sms_text IS NOT NULL THEN 1 END) as with_text
FROM activations
WHERE created_at > CURRENT_DATE
GROUP BY status
ORDER BY count DESC;
