# 🍎 Configuration Apple Login (Sign in with Apple)

**Date:** 27 novembre 2025  
**Projet:** ONE SMS V1

---

## ⚠️ IMPORTANT

L'authentification Apple est **plus complexe** que Google et nécessite :

- ✅ Un compte Apple Developer (99$/an)
- ✅ Configuration dans Apple Developer Portal
- ✅ Création d'un Service ID
- ✅ Génération d'une clé privée

---

## 🎯 ACTIVATION RAPIDE DANS SUPABASE

### Étape 1: Activer Apple Provider

1. **Supabase Dashboard** → **Authentication** → **Sign In / Providers**
2. Trouvez **"Apple"** et cliquez dessus
3. **Activez le toggle** "Enable Sign in with Apple" ✅
4. Supabase vous demandera :
   - **Client ID (Bundle ID)** : `com.onesms.app`
   - **Secret Key** : Clé privée générée depuis Apple Developer

---

## 📋 CONFIGURATION COMPLÈTE (Apple Developer)

### Prérequis

- Compte Apple Developer actif (https://developer.apple.com/)
- Coût : **99$/an**

---

### Étape 1: Créer un App ID

1. **Apple Developer Portal** : https://developer.apple.com/account/
2. Menu → **Certificates, Identifiers & Profiles**
3. Section **Identifiers** → Cliquez **"+"**

**Configuration:**

```
Type: App IDs
Description: ONE SMS V1
Bundle ID: com.onesms.v1
```

4. Scrollez et trouvez **"Sign in with Apple"**
5. ✅ Cochez **"Sign in with Apple"**
6. Cliquez **"Configure"** :
   - Enable as primary App ID
7. Cliquez **"Continue"** → **"Register"**

---

### Étape 2: Créer un Service ID

1. Dans **Identifiers**, cliquez **"+"**
2. Sélectionnez **"Services IDs"**
3. Cliquez **"Continue"**

**Configuration:**

```
Description: ONE SMS V1 Web
Identifier: com.onesms.v1.web
```

4. ✅ Cochez **"Sign in with Apple"**
5. Cliquez **"Configure"** :

**Primary App ID:**

```
Select: com.onesms.v1 (celui créé à l'étape 1)
```

**Website URLs:**

```
Domains and Subdomains:
- gqvxrvxmfvlnhukbpdjb.supabase.co

Return URLs:
- https://gqvxrvxmfvlnhukbpdjb.supabase.co/auth/v1/callback
```

⚠️ Remplacez `gqvxrvxmfvlnhukbpdjb` par votre vrai Project ID Supabase

6. Cliquez **"Next"** → **"Done"** → **"Continue"** → **"Register"**

---

### Étape 3: Créer une Clé (Key)

1. Dans le menu, allez à **"Keys"**
2. Cliquez **"+"** pour créer une nouvelle clé
3. **Key Name:** `ONE SMS Apple Login Key`
4. ✅ Cochez **"Sign in with Apple"**
5. Cliquez **"Configure"** :
   - Sélectionnez **Primary App ID** : `com.onesms.v1`
6. Cliquez **"Save"**
7. Cliquez **"Continue"** → **"Register"**

**⚠️ IMPORTANT :** 8. **Téléchargez la clé** immédiatement (fichier `.p8`) 9. **Notez le Key ID** (ex: `ABC123DEF4`) 10. **Cette clé ne peut être téléchargée qu'une seule fois !**

---

### Étape 4: Récupérer le Team ID

1. En haut à droite du Apple Developer Portal
2. Cliquez sur votre nom → **"View Membership"**
3. **Team ID** : ex : `XYZ789ABC1`
4. **Copiez-le**

---

## 🔧 CONFIGURATION DANS SUPABASE

Retournez dans **Supabase Dashboard** → **Authentication** → **Sign In / Providers** → **Apple**

### Remplissez les champs :

**1. Enable Sign in with Apple:**

```
✅ Activé
```

**2. Client ID (Bundle ID):**

```
com.onesms.v1.web
```

(Le Service ID créé à l'étape 2)

**3. Team ID:**

```
XYZ789ABC1
```

(Récupéré à l'étape 4)

**4. Key ID:**

```
ABC123DEF4
```

(Noté lors du téléchargement de la clé)

**5. Secret Key:**

```
-----BEGIN PRIVATE KEY-----
[Contenu du fichier .p8 téléchargé]
-----END PRIVATE KEY-----
```

6. Cliquez **"Save"**

---

## 🧪 TESTER

### 1. Lancer l'application

```bash
npm run dev
```

### 2. Tester le login

1. Ouvrez : http://localhost:5173/login
2. Cliquez sur le bouton **"Apple"**
3. Authentifiez-vous avec votre Apple ID
4. Choisissez si vous voulez partager votre email
5. Redirection vers `/dashboard` ✅

---

## 🔍 VÉRIFICATIONS

### Dans Supabase

**Authentication → Users:**

```
✅ Utilisateur créé
✅ Provider = "apple"
✅ Email présent (ou masqué si l'utilisateur a choisi de cacher)
```

**Table users:**

```sql
SELECT * FROM users WHERE email LIKE '%appleid.com';
```

Si l'utilisateur masque son email, Apple crée un email relay :

```
abc123def456@privaterelay.appleid.com
```

---

## 🛠️ TROUBLESHOOTING

### Erreur: "invalid_client"

**Cause:** Client ID, Team ID ou Key ID incorrect

**Solution:**

1. Vérifiez les 3 identifiants dans Supabase
2. Comparez avec Apple Developer Portal

---

### Erreur: "invalid_grant"

**Cause:** Clé privée (.p8) incorrecte ou mal formatée

**Solution:**

1. Ouvrez le fichier .p8 dans un éditeur de texte
2. Copiez TOUT le contenu (y compris BEGIN et END)
3. Collez dans Supabase exactement tel quel

---

### Erreur: "redirect_uri_mismatch"

**Cause:** URL de callback mal configurée

**Solution:**

1. Apple Developer → Service ID → Configure
2. Vérifiez que le Return URL est exactement :
   ```
   https://[PROJECT].supabase.co/auth/v1/callback
   ```

---

### Utilisateur créé mais email vide

**Cause:** L'utilisateur a choisi "Hide My Email"

**Solution:**

- C'est normal ! Apple protège la vie privée
- Email relay utilisé : `xxx@privaterelay.appleid.com`
- Toujours fonctionnel pour l'authentification

---

## 💡 ALTERNATIVE SIMPLE

### Si vous n'avez PAS de compte Apple Developer :

**Option 1: Désactiver le bouton Apple**

```tsx
// LoginPage.tsx et RegisterPage.tsx
// Commentez ou supprimez le bouton Apple

{
  /* <Button variant="outline" onClick={handleAppleLogin}>
  <svg>...</svg>
  Apple
</Button> */
}
```

**Option 2: Utiliser uniquement Google**

Gardez seulement le bouton Google qui fonctionne déjà ! 🎉

---

## 📊 COMPARAISON Google vs Apple

| Critère            | Google           | Apple              |
| ------------------ | ---------------- | ------------------ |
| **Coût**           | Gratuit          | 99$/an             |
| **Difficulté**     | ⭐⭐ Facile      | ⭐⭐⭐⭐ Difficile |
| **Configuration**  | 5 min            | 20 min             |
| **Email**          | Toujours visible | Peut être masqué   |
| **Recommandation** | ✅ Oui           | ⚠️ Si nécessaire   |

---

## ✅ RECOMMANDATION

Pour **ONE SMS V1**, je recommande de :

1. ✅ **Garder Google** (déjà configuré et gratuit)
2. ⚠️ **Reporter Apple** pour plus tard (nécessite 99$/an)
3. 🎯 **Lancer avec Google uniquement** pour commencer

Apple peut être ajouté plus tard quand vous aurez des revenus ! 💰

---

## 📝 RÉSUMÉ

**Pour activer Apple Login :**

- ✅ Compte Apple Developer (99$/an)
- ✅ Créer App ID avec "Sign in with Apple"
- ✅ Créer Service ID avec callback URL
- ✅ Générer clé privée (.p8)
- ✅ Configurer dans Supabase (5 champs)
- ✅ Tester l'authentification

**OU simplement :**

- ✅ Utiliser seulement Google pour l'instant ! 🚀

---

## 🎉 CONCLUSION

Apple Login est **plus complexe et coûteux** que Google.

**Mon conseil :** Commence avec Google uniquement, c'est amplement suffisant ! Tu pourras toujours ajouter Apple plus tard si besoin. 😊
