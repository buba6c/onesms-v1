INSERT INTO system_settings (key, value)
VALUES 
  ('textverified_api_key', 'Mo0QgNge1xqwkEBkKGQB5649UzA5Nlung6LSVBe0hDQhJgUGzuuxb5lljwDRJjS'),
  ('textverified_api_username', 'buba6c@gmail.com')
ON CONFLICT (key) 
DO UPDATE SET value = EXCLUDED.value;
