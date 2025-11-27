# 🚨 FIX: Erreur "Unsupported provider: provider is not enabled"

**Date:** 27 novembre 2025  
**Erreur:** `validation_failed - Unsupported provider: provider is not enabled`

---

## ❌ PROBLÈME

Le provider Google n'est **pas activé** dans votre projet Supabase.

---

## ✅ SOLUTION RAPIDE (5 minutes)

### Étape 1: Activer Google Provider dans Supabase

1. **Ouvrez Supabase Dashboard:**
   - Allez sur: https://app.supabase.com/
   - Connectez-vous

2. **Sélectionnez votre projet:**
   - Projet: `ONE SMS V1` ou `gqvxrvxmfvlnhukbpdjb`

3. **Navigation:**
   ```
   Sidebar → Authentication → Providers
   ```

4. **Trouvez "Google":**
   - Scrollez dans la liste des providers
   - Cliquez sur **"Google"**

5. **Activez le provider:**
   - Toggle **"Enable Sign in with Google"** → ✅ ON

---

## 🔑 Configuration Minimale (pour test)

### Option A: Mode Test (Recommandé pour commencer)

**Sans créer de projet Google Cloud**, vous pouvez utiliser les credentials de test:

1. Dans Supabase, section Google Provider:
   - Laissez les champs **Client ID** et **Client Secret** vides
   - Activez simplement le toggle
   - Cliquez **"Save"**

2. Supabase utilisera ses propres credentials de test (limités mais fonctionnels)

⚠️ **Limitations du mode test:**
- Maximum 100 utilisateurs
- Logo "Test App" affiché
- Ne fonctionne qu'avec les domaines autorisés par Supabase

---

### Option B: Configuration Complète (Production)

Si vous voulez votre propre configuration:

#### 1. Google Cloud Console

**A. Créer un projet:**
- Allez sur: https://console.cloud.google.com/
- Cliquez **"Select a project"** → **"New Project"**
- Nom: `ONE SMS V1`
- Cliquez **"Create"**

**B. OAuth Consent Screen:**
- Menu → **APIs & Services** → **OAuth consent screen**
- Type: **"External"**
- App name: `ONE SMS V1`
- User support email: votre email
- Developer email: votre email
- Cliquez **"Save and Continue"** (3 fois)

**C. Créer les credentials:**
- Menu → **APIs & Services** → **Credentials**
- **"+ Create Credentials"** → **"OAuth 2.0 Client IDs"**
- Type: **"Web application"**
- Name: `ONE SMS V1 Web`

**D. Authorized redirect URIs:**
```
https://gqvxrvxmfvlnhukbpdjb.supabase.co/auth/v1/callback
```

⚠️ Remplacez `gqvxrvxmfvlnhukbpdjb` par votre vrai Project ID Supabase

- Cliquez **"Create"**

**E. Copier les credentials:**
Vous obtenez:
```
Client ID: 123456789-abc123.apps.googleusercontent.com
Client Secret: GOCSPX-xxxxxxxxxxxxxx
```

#### 2. Retour dans Supabase

- Collez le **Client ID** dans Supabase
- Collez le **Client Secret** dans Supabase
- Cliquez **"Save"**

---

## 🧪 TEST IMMÉDIAT

### 1. Vérifier que le provider est activé

Dans Supabase Dashboard → Authentication → Providers:
- Google doit avoir un badge ✅ **"Enabled"**

### 2. Tester l'authentification

```bash
# Lancez votre app
npm run dev
```

1. Ouvrez: http://localhost:5173/login
2. Cliquez sur le bouton **"Google"**
3. Vous devriez voir:
   - **Mode Test:** Page de consentement Google générique
   - **Mode Production:** Votre écran OAuth personnalisé

### 3. Vérifier la redirection

Après authentification Google:
- ✅ Redirection vers `/dashboard`
- ✅ Utilisateur créé dans Supabase
- ✅ Profile créé dans table `users`

---

## 🔍 VÉRIFICATIONS

### A. Dans Supabase Dashboard

**Authentication → Users:**
```
✅ Nouvel utilisateur visible
✅ Email vérifié automatiquement
✅ Provider = "google"
✅ Avatar URL présent (photo Google)
```

**Table Editor → users:**
```sql
SELECT * FROM users WHERE email = 'votre-email@gmail.com';
```

Devrait retourner:
```
id: uuid
email: votre-email@gmail.com
full_name: Votre Nom (depuis Google)
avatar_url: https://lh3.googleusercontent.com/...
role: user
credits: 0
created_at: timestamp
```

---

## ⚠️ PROBLÈMES COURANTS

### Erreur: "redirect_uri_mismatch"

**Cause:** L'URL de redirection n'est pas autorisée

**Solution:**
1. Google Cloud Console → Credentials → Votre OAuth Client
2. Authorized redirect URIs doit contenir:
   ```
   https://[VOTRE-PROJECT-ID].supabase.co/auth/v1/callback
   ```
3. Sauvegardez et attendez 1 minute

---

### Erreur: "Access blocked: This app's request is invalid"

**Cause:** OAuth Consent Screen mal configuré

**Solution:**
1. Google Cloud Console → OAuth consent screen
2. Vérifiez les scopes:
   - ✅ `.../auth/userinfo.email`
   - ✅ `.../auth/userinfo.profile`
   - ✅ `openid`
3. Status doit être "In production" ou "Testing"

---

### Utilisateur créé mais pas de profil dans `users`

**Cause:** Trigger Supabase manquant

**Solution:**
```sql
-- Exécuter dans Supabase SQL Editor
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

-- Créer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 📝 CHECKLIST RAPIDE

Avant de tester:

- [ ] Google Provider activé dans Supabase (toggle ON)
- [ ] Site URL configuré dans Supabase (http://localhost:5173)
- [ ] Redirect URLs ajoutées (http://localhost:5173/dashboard)
- [ ] Application en cours d'exécution (npm run dev)
- [ ] Navigateur ouvert sur /login
- [ ] Bouton Google visible

Pour production:
- [ ] Client ID et Secret configurés
- [ ] Redirect URI ajoutée dans Google Cloud Console
- [ ] OAuth Consent Screen configuré
- [ ] Site URL en HTTPS

---

## 🎯 SOLUTION LA PLUS RAPIDE

**Si vous voulez juste tester MAINTENANT:**

1. Supabase Dashboard → Authentication → Providers → Google
2. Activez le toggle ✅
3. **Ne remplissez RIEN d'autre**
4. Cliquez "Save"
5. npm run dev
6. Testez le login

Supabase utilisera ses credentials de test. Ça fonctionne immédiatement ! 🚀

---

## 📞 SUPPORT

Si ça ne fonctionne toujours pas:

1. Vérifiez les logs du navigateur (F12 → Console)
2. Vérifiez les logs Supabase (Dashboard → Logs → Auth Logs)
3. Essayez en navigation privée
4. Videz le cache du navigateur

---

## ✅ RÉSULTAT ATTENDU

Après configuration:

```
1. Clic sur bouton "Google" ✅
2. Redirection vers Google ✅
3. Sélection du compte Google ✅
4. Redirection vers /dashboard ✅
5. Utilisateur connecté ✅
6. Profil créé automatiquement ✅
```

**🎉 Prêt à tester !**
