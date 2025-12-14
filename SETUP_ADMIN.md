# Configuration de l'Administrateur Initial

## Problème Actuel

L'application utilise encore les valeurs par défaut car les vraies credentials Supabase ne sont pas configurées.

## Solution: Configuration en Base de Données

### Étape 1: Créer la table system_settings dans Supabase

1. Allez sur https://supabase.com/dashboard
2. Ouvrez votre projet
3. Cliquez sur "SQL Editor" dans le menu de gauche
4. Cliquez sur "New query"
5. Copiez tout le contenu du fichier: `supabase/migrations/002_system_settings.sql`
6. Collez-le dans l'éditeur SQL
7. Cliquez sur "Run" (ou Ctrl+Enter)

### Étape 2: Créer un utilisateur admin manuellement

Dans le même SQL Editor, exécutez cette commande:

```sql
-- Créer un utilisateur admin de test
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  'admin@onesms.test',
  crypt('Admin123!', gen_salt('bf')), -- Mot de passe: Admin123!
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Admin Test"}',
  false,
  'authenticated'
);

-- Créer l'entrée correspondante dans la table users
INSERT INTO users (
  id,
  email,
  name,
  role,
  balance,
  created_at,
  updated_at
)
SELECT
  id,
  'admin@onesms.test',
  'Admin Test',
  'admin',
  10000,
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'admin@onesms.test'
ON CONFLICT (email) DO UPDATE
SET role = 'admin',
    balance = 10000;
```

### Étape 3: Configurer les credentials Supabase

1. Dans Supabase Dashboard → Settings → API
2. Copiez votre **Project URL** (ex: https://abcdefghij.supabase.co)
3. Copiez votre **anon/public key**

4. Dans le SQL Editor de Supabase, exécutez:

```sql
-- Mettre à jour l'URL Supabase
UPDATE system_settings
SET value = 'https://VOTRE-PROJET-ID.supabase.co'
WHERE key = 'supabase_url';

-- Mettre à jour la clé anon
UPDATE system_settings
SET value = 'VOTRE_ANON_KEY_ICI'
WHERE key = 'supabase_anon_key';
```

### Étape 4: Redémarrer l'application

```bash
cd "/Users/mac/Desktop/ONE SMS V1"
pm2 restart onesms-frontend
```

### Étape 5: Se connecter

1. Allez sur http://localhost:3000/login
2. Email: `admin@onesms.test`
3. Mot de passe: `Admin123!`
4. Vous aurez accès au panel admin à http://localhost:3000/admin/settings

### Étape 6: Configurer les autres API (optionnel)

Une fois connecté, allez dans Admin Settings pour configurer:

- 5sim API (pour les numéros virtuels)
- PayTech API (pour les paiements)

## Notes

- La configuration est maintenant stockée en base de données
- Le cache est de 5 minutes pour réduire les requêtes DB
- Seuls les utilisateurs avec role='admin' peuvent voir/modifier les settings
