-- Création d'un utilisateur de test avec rôle admin
-- Note: L'utilisateur doit d'abord s'inscrire via l'interface d'authentification
-- Cette migration ne fait que mettre à jour le rôle

-- Si vous avez déjà un compte utilisateur, remplacez l'email ci-dessous
-- UPDATE users SET role = 'admin' WHERE email = 'votre@email.com';

-- Créer un utilisateur de test directement (pour développement uniquement)
-- Ceci insère un utilisateur dans la table users, mais PAS dans auth.users
-- L'utilisateur doit quand même s'inscrire via l'interface pour avoir accès à l'authentification

INSERT INTO users (id, email, name, role, balance, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@onesms.test',
  'Admin Test',
  'admin',
  10000, -- 10,000 FCFA de balance initiale
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET role = 'admin',
    balance = 10000,
    updated_at = NOW();

-- Afficher l'utilisateur créé
SELECT id, email, name, role, balance FROM users WHERE email = 'admin@onesms.test';
