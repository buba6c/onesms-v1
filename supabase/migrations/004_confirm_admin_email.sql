-- Confirmer l'email de l'utilisateur admin et lui donner le rôle admin

-- Étape 1: Confirmer l'email dans auth.users
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'admin@onesms.com';

-- Étape 2: S'assurer que l'utilisateur existe dans la table users avec le rôle admin
INSERT INTO users (id, email, name, role, balance, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', 'Admin Test'),
  'admin',
  10000,
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email = 'admin@onesms.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    balance = 10000,
    updated_at = NOW();

-- Vérifier le résultat
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  au.confirmed_at,
  u.role,
  u.balance
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
WHERE au.email = 'admin@onesms.com';
