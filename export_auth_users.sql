-- Script pour exporter auth.users (à exécuter sur Cloud)
-- Copier le résultat de cette requête

SELECT 
    'INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, role, aud) VALUES (' ||
    quote_literal(id::text) || ', ' ||
    quote_literal(email) || ', ' ||
    quote_literal(encrypted_password) || ', ' ||
    quote_nullable(email_confirmed_at) || ', ' ||
    quote_nullable(created_at) || ', ' ||
    quote_nullable(updated_at) || ', ' ||
    quote_literal(raw_user_meta_data::text) || ', ' ||
    quote_literal(role) || ', ' ||
    quote_literal(aud) ||
    ') ON CONFLICT (id) DO NOTHING;'
FROM auth.users;
