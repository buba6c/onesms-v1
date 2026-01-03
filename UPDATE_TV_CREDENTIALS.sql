-- Insert or Update the Simple Access Token provided by user
INSERT INTO system_settings (key, value, category, type, description)
VALUES 
    ('textverified_simple_token', '1_RBhGTeqihAYiozC2Au39Wj9eiwCsbRwRz2E3sdOlOZuwUHvDkEQ83WXBiygGP9i6laeEmuXO', 'sms_provider', 'string', 'TextVerified Simple Access Token (direct auth)'),
    ('textverified_api_key', 'Mo0QgNge1xqwkEBkKGQB5649UzA5Nlung6LSVBe0hDQhJgUGzuuxb5lljwDRJjS', 'sms_provider', 'string', 'TextVerified API V2 Key')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
