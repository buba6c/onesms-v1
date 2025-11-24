SELECT 
  id, 
  order_id, 
  phone, 
  service_code, 
  country_code, 
  status, 
  sms_code, 
  sms_text, 
  sms_received_at, 
  expires_at, 
  created_at,
  charged
FROM activations 
WHERE phone LIKE '%7429215087%' 
ORDER BY created_at DESC 
LIMIT 5;
