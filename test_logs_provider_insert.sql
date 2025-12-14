-- Test d'insertion directe dans logs_provider

INSERT INTO logs_provider (
  provider,
  action,
  request_url,
  response_status,
  response_body,
  user_id,
  activation_id,
  created_at
) VALUES (
  'sms-activate',
  'TEST_DIRECT_SQL',
  'https://test-direct.com',
  200,
  'Test insertion directe SQL',
  'e108c02a-2012-4043-bbc2-fb09bb11f824',
  '217d8923-1bfc-45a8-b7ca-66a830ef03b2',
  NOW()
) RETURNING *;

-- Vérifier
SELECT * FROM logs_provider WHERE action = 'TEST_DIRECT_SQL';
