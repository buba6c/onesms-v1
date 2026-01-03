# 🔍 Analyse TextVerified API v2 - Configuration Requise

## ❌ Problème Identifié : Mauvaise Implémentation

### Ce que j'ai implémenté (INCORRECT)
```typescript
// ❌ FAUX: J'ai utilisé Client ID/Secret comme OAuth
const authString = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)
fetch(`${TEXTVERIFIED_BASE_URL}/SimpleAuthentication`, {
  headers: { 'Authorization': `Basic ${authString}` }
})
```

### Ce qu'il faut vraiment (CORRECT)
D'après la documentation officielle TextVerified API v2 :

**Authentification requise:**
1. **API Key** (obtenu depuis votre profil TextVerified)
2. **Email** (votre email de compte TextVerified)

**Processus:**
```
1. Obtenir API Key depuis Dashboard TextVerified
2. Générer Bearer Token: POST /api/auth
   Body: { "api_key": "...", "api_username": "email@example.com" }
3. Utiliser le Bearer Token dans tous les appels API
   Headers: { "Authorization": "Bearer <token>" }
4. Token expire après un certain temps → Regénérer
```

---

## ✅ Configuration Correcte Requise

### Base de Données (`system_settings`)
Au lieu de `textverified_client_id` et `textverified_client_secret`, il faut:

```sql
-- CORRECT
INSERT INTO system_settings (key, value, description, category, type) VALUES
('textverified_api_key', '', 'API Key from TextVerified profile', 'provider', 'secret'),
('textverified_api_username', '', 'Email (username) for TextVerified account', 'provider', 'string');

-- INCORRECT (à supprimer)
-- textverified_client_id
-- textverified_client_secret
```

### Admin UI (`AdminProviders.tsx`)
Au lieu d'afficher "Configurer les credentials", il faut:

**Dialog de Configuration:**
```
┌─────────────────────────────────────────┐
│ Configurer TextVerified                 │
├─────────────────────────────────────────┤
│                                         │
│ API Key:                                │
│ [__________________________________]    │
│                                         │
│ Account Email (Username):               │
│ [__________________________________]    │
│                                         │
│ ℹ️ Ces informations se trouvent dans   │
│   votre profil TextVerified.           │
│                                         │
│ [Annuler]              [Sauvegarder]   │
└─────────────────────────────────────────┘
```

---

## 🔧 Edge Function Correcte

### `buy-textverified-number/index.ts`

```typescript
// 1. Get API Key + Username
let API_KEY = Deno.env.get('TEXTVERIFIED_API_KEY')
let API_USERNAME = Deno.env.get('TEXTVERIFIED_API_USERNAME')

const { data: keyData } = await supabase
  .from('system_settings')
  .select('value')
  .eq('key', 'textverified_api_key')
  .single()
if (keyData?.value) API_KEY = keyData.value

const { data: usernameData } = await supabase
  .from('system_settings')
  .select('value')
  .eq('key', 'textverified_api_username')
  .single()
if (usernameData?.value) API_USERNAME = usernameData.value

if (!API_KEY || !API_USERNAME) {
  throw new Error('TextVerified API Key or Username not configured')
}

// 2. Generate Bearer Token
const authRes = await fetch('https://www.textverified.com/api/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    api_key: API_KEY,
    api_username: API_USERNAME
  })
})

if (!authRes.ok) throw new Error('TextVerified auth failed')

const authData = await authRes.json()
const bearerToken = authData.bearer_token // ou authData.token

// 3. Use Bearer Token for API calls
const response = await fetch('https://www.textverified.com/api/pub/v2/verifications', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${bearerToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    target: targetId // Service ID
  })
})
```

---

## 📊 Comparaison

| Aspect | Mon Implémentation (Mauvaise) | Réalité TextVerified |
|--------|-------------------------------|---------------------|
| **Auth Method** | Basic Auth (Client ID/Secret) | Bearer Token (API Key + Email) |
| **Settings DB** | `client_id`, `client_secret` | `api_key`, `api_username` |
| **Auth Endpoint** | `/SimpleAuthentication` | `/api/auth` |
| **Auth Header** | `Basic base64(id:secret)` | POST body `{api_key, api_username}` |
| **Token Usage** | ❌ N/A | `Bearer <token>` |

---

## 🚨 Actions Requises

### 1. ✅ Modifier SQL (`add_new_providers_settings.sql`)
```sql
-- Supprimer
DELETE FROM system_settings WHERE key IN ('textverified_client_id', 'textverified_client_secret');

-- Ajouter correct
INSERT INTO system_settings (key, value, description, category, type) VALUES
('textverified_api_key', '', 'API Key from TextVerified dashboard', 'provider', 'secret'),
('textverified_api_username', '', 'Account email (username) for TextVerified', 'provider', 'string');
```

### 2. ✅ Corriger `buy-textverified-number/index.ts`
- Remplacer logique CLIENT_ID/SECRET par API_KEY/USERNAME
- Changer endpoint auth vers `/api/auth`
- Utiliser POST body au lieu de Basic Auth

### 3. ✅ Corriger `check-textverified-status/index.ts`
- Même correction d'auth

### 4. ✅ Mettre à jour Admin UI
- Changer texte: "API Key" et "Account Email"
- 2 champs au lieu d'un seul

---

## 💡 Résumé Exécutif

**TextVerified n'utilise PAS OAuth2 Client Credentials.**

Ils utilisent un système simple:
1. API Key (statique, obtenu depuis dashboard)
2. Email du compte (username)
3. Ces 2 valeurs génèrent un Bearer Token temporaire
4. Le Bearer Token est utilisé pour tous les appels API

**Mes edge functions actuelles sont INCORRECTES et ne fonctionneront pas.**
Il faut tout corriger avant déploiement.
