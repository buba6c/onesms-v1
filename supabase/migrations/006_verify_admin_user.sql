-- Vérifier et créer l'utilisateur admin dans la table users

-- 1. Vérifier si l'utilisateur existe dans auth.users
SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'admin@onesms.com';

-- 2. Vérifier si l'utilisateur existe dans users
SELECT * FROM users WHERE email = 'admin@onesms.com';

-- 3. Si l'utilisateur n'existe pas dans users, le créer
INSERT INTO users (id, email, name, role, balance, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  'Admin Test',
  'admin',
  10000,
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email = 'admin@onesms.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    balance = 10000,
    email = EXCLUDED.email,
    updated_at = NOW();

-- 4. Vérifier le résultat final
SELECT u.id, u.email, u.name, u.role, u.balance, au.email_confirmed_at
FROM users u
JOIN auth.users au ON au.id = u.id
WHERE u.email = 'admin@onesms.com';
