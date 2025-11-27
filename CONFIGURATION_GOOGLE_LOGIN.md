# 🔐 Configuration Google Login avec Supabase

**Date:** 27 novembre 2025  
**Projet:** ONE SMS V1

---

## 🎯 OBJECTIF

Activer l'authentification Google OAuth pour permettre aux utilisateurs de se connecter avec leur compte Google.

---

## 📋 PRÉREQUIS

- ✅ Compte Google Cloud Platform (gratuit)
- ✅ Projet Supabase actif
- ✅ Accès au dashboard Supabase

---

## 🚀 ÉTAPE 1: Configuration Google Cloud Console

### 1.1 Créer un projet Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Cliquez sur **"Select a project"** → **"New Project"**
3. Nom du projet: `ONE SMS V1`
4. Cliquez sur **"Create"**

### 1.2 Activer Google+ API

1. Dans le menu de gauche, allez à **"APIs & Services"** → **"Library"**
2. Recherchez **"Google+ API"**
3. Cliquez sur **"Enable"**

### 1.3 Configurer OAuth Consent Screen

1. Allez à **"APIs & Services"** → **"OAuth consent screen"**
2. Sélectionnez **"External"** (pour tous les utilisateurs)
3. Cliquez sur **"Create"**

#### Configuration App Information:
```
App name: ONE SMS V1
User support email: votre-email@example.com
App logo: (optionnel - logo de votre app)

Developer contact information:
Email addresses: votre-email@example.com
```

4. Cliquez sur **"Save and Continue"**

#### Scopes (Étape 2):
5. Cliquez sur **"Add or Remove Scopes"**
6. Sélectionnez:
   - ✅ `.../auth/userinfo.email`
   - ✅ `.../auth/userinfo.profile`
   - ✅ `openid`
7. Cliquez sur **"Update"** puis **"Save and Continue"**

#### Test users (Étape 3):
8. Si vous êtes en mode "Testing", ajoutez vos emails de test
9. Cliquez sur **"Save and Continue"**

10. Review et **"Back to Dashboard"**

### 1.4 Créer OAuth 2.0 Credentials

1. Allez à **"APIs & Services"** → **"Credentials"**
2. Cliquez sur **"+ Create Credentials"** → **"OAuth 2.0 Client IDs"**
3. Application type: **"Web application"**
4. Name: `ONE SMS V1 Web Client`

#### Authorized JavaScript origins:
```
http://localhost:5173
https://votre-domaine.com
```

#### Authorized redirect URIs:
```
https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/auth/v1/callback
```

⚠️ **Important:** Remplacez `[YOUR_SUPABASE_PROJECT_REF]` par votre référence de projet Supabase (ex: `gqvxrvxmfvlnhukbpdjb`)

5. Cliquez sur **"Create"**

### 1.5 Copier les identifiants

Vous recevrez:
- ✅ **Client ID**: `123456789-abcdefg.apps.googleusercontent.com`
- ✅ **Client Secret**: `GOCSPX-xxxxxxxxxxxxxxxxx`

**📝 Conservez-les précieusement !**

---

## 🔧 ÉTAPE 2: Configuration Supabase

### 2.1 Activer Google Provider

1. Connectez-vous à [Supabase Dashboard](https://app.supabase.com/)
2. Sélectionnez votre projet ONE SMS V1
3. Allez à **"Authentication"** → **"Providers"**
4. Trouvez **"Google"** dans la liste
5. Activez le toggle **"Enable Sign in with Google"**

### 2.2 Configurer les credentials

Dans la section Google Provider:

```
Client ID (for OAuth):
123456789-abcdefg.apps.googleusercontent.com

Client Secret (for OAuth):
GOCSPX-xxxxxxxxxxxxxxxxx
```

6. Cliquez sur **"Save"**

### 2.3 Copier le Callback URL

Supabase affiche automatiquement votre Callback URL:
```
https://gqvxrvxmfvlnhukbpdjb.supabase.co/auth/v1/callback
```

**Assurez-vous que cette URL est bien ajoutée dans Google Cloud Console (Étape 1.4)**

---

## 🔄 ÉTAPE 3: Configuration du Site URL

### 3.1 Définir les URLs de redirection

Dans **Supabase Dashboard** → **"Authentication"** → **"URL Configuration"**:

```
Site URL:
http://localhost:5173 (développement)
OU
https://votre-domaine.com (production)

Redirect URLs:
http://localhost:5173/dashboard
https://votre-domaine.com/dashboard
```

### 3.2 Additional Redirect URLs (optionnel)

```
http://localhost:5173/**
https://votre-domaine.com/**
```

---

## ✅ ÉTAPE 4: Tester l'authentification

### 4.1 Test en développement

1. Lancez votre application locale:
```bash
npm run dev
```

2. Ouvrez votre navigateur: `http://localhost:5173/login`

3. Cliquez sur le bouton **"Google"**

4. Vous devriez être redirigé vers la page de connexion Google

5. Après authentification, vous serez redirigé vers `/dashboard`

### 4.2 Vérification dans Supabase

1. Allez dans **"Authentication"** → **"Users"**
2. Vous devriez voir votre utilisateur avec:
   - ✅ Email vérifié automatiquement
   - ✅ Provider: `google`
   - ✅ Avatar URL (photo de profil Google)

---

## 🛠️ ÉTAPE 5: Gestion automatique du profil utilisateur

### 5.1 Trigger pour créer le profil

Le profil utilisateur est créé automatiquement grâce au trigger Supabase:

```sql
-- Ce trigger existe déjà dans votre base de données
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, role, credits)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    'user',
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.2 Vérification

Après connexion Google, vérifiez que la table `users` contient:
- ✅ `id` (UUID de l'utilisateur)
- ✅ `email` (email Google)
- ✅ `full_name` (nom complet depuis Google)
- ✅ `avatar_url` (photo de profil Google)
- ✅ `role` = 'user'
- ✅ `credits` = 0

---

## 🎨 ÉTAPE 6: Personnalisation du bouton Google

### 6.1 UI améliorée

Le bouton Google a été amélioré avec:
- ✅ Logo officiel Google (SVG multicolore)
- ✅ Style cohérent avec les guidelines Google
- ✅ Animation au hover
- ✅ Responsive

### 6.2 Code actuel

```tsx
<Button variant="outline" onClick={handleGoogleLogin} className="w-full">
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
  Google
</Button>
```

---

## 🔒 SÉCURITÉ

### 7.1 Variables d'environnement

Les clés API Google ne doivent JAMAIS être dans le code source. Elles sont gérées par Supabase.

### 7.2 HTTPS obligatoire en production

⚠️ **En production, HTTPS est obligatoire pour OAuth**

Assurez-vous que:
- ✅ Votre site utilise HTTPS
- ✅ Les redirect URIs dans Google Cloud Console utilisent HTTPS
- ✅ Le Site URL dans Supabase utilise HTTPS

### 7.3 Scope minimal

Nous demandons uniquement:
- ✅ `email` - Pour créer le compte
- ✅ `profile` - Pour le nom et la photo
- ✅ `openid` - Pour l'authentification

---

## 🐛 TROUBLESHOOTING

### Erreur: "redirect_uri_mismatch"

**Cause:** L'URL de redirection n'est pas autorisée dans Google Cloud Console

**Solution:**
1. Vérifiez que l'URL callback Supabase est dans "Authorized redirect URIs"
2. Format exact: `https://[PROJECT_REF].supabase.co/auth/v1/callback`

### Erreur: "Access blocked: This app's request is invalid"

**Cause:** OAuth Consent Screen mal configuré

**Solution:**
1. Retournez dans Google Cloud Console → OAuth consent screen
2. Vérifiez que les scopes sont bien configurés
3. Publiez l'application (si nécessaire)

### Utilisateur créé mais pas de profil dans la table `users`

**Cause:** Le trigger `handle_new_user` n'existe pas ou ne fonctionne pas

**Solution:**
```sql
-- Vérifier si le trigger existe
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Si absent, exécutez le SQL de création (voir schéma Supabase)
```

### Redirection échoue après login

**Cause:** Site URL mal configuré dans Supabase

**Solution:**
1. Supabase Dashboard → Authentication → URL Configuration
2. Vérifiez le "Site URL" et les "Redirect URLs"

---

## 📱 BONUS: Login Google sur mobile

### 8.1 Configuration pour iOS/Android

Si vous développez une app mobile React Native:

1. Installez le package:
```bash
npm install @react-native-google-signin/google-signin
```

2. Configurez les deep links dans Supabase
3. Ajoutez les URL schemes iOS/Android

Documentation: [Supabase Mobile Auth](https://supabase.com/docs/guides/auth/social-login/auth-google?platform=react-native)

---

## ✅ CHECKLIST FINALE

Avant de déployer en production:

- [ ] OAuth Consent Screen publié (pas en mode Testing)
- [ ] Client ID et Secret configurés dans Supabase
- [ ] Callback URL ajoutée dans Google Cloud Console
- [ ] Site URL configuré avec HTTPS
- [ ] Trigger `handle_new_user` vérifié
- [ ] Test de connexion réussi
- [ ] Profil utilisateur créé automatiquement
- [ ] Photo de profil Google récupérée

---

## 📚 RESSOURCES

- [Supabase Google OAuth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

---

## 🎉 RÉSULTAT

Après configuration:

✅ Bouton "Sign in with Google" sur `/login` et `/register`  
✅ Logo Google officiel avec couleurs  
✅ Authentification en 1 clic  
✅ Profil créé automatiquement  
✅ Photo de profil importée  
✅ Email vérifié automatiquement  
✅ Redirection vers dashboard après login  

**L'authentification Google est maintenant opérationnelle ! 🚀**
