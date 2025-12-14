# ✅ Configuration Locale → Supabase Cloud

## 🎯 STATUS: ACTIF

Votre environnement local est maintenant configuré et fonctionne.

---

## 📊 CONFIGURATION ACTUELLE

### Serveur Local

- **URL**: http://localhost:3001/
- **Port**: 3001
- **Status**: ✅ En cours d'exécution

### Base de données

- **Provider**: Supabase Cloud (pas Coolify)
- **URL**: https://htfqmamvmhdoixqcbbbw.supabase.co
- **Status**: ✅ Connecté

---

## 🔗 URLS DISPONIBLES

### Application

```
http://localhost:3001/
http://localhost:3001/topup      ← Page TopUp avec Wave
http://localhost:3001/dashboard
http://localhost:3001/admin
```

### APIs (Supabase Cloud)

```
https://htfqmamvmhdoixqcbbbw.supabase.co/rest/v1/
https://htfqmamvmhdoixqcbbbw.supabase.co/auth/v1/
```

---

## 🌊 TESTER WAVE EN LOCAL

1. **Ouvrir le navigateur**

   ```
   http://localhost:3001/topup
   ```

2. **Se connecter** avec un compte

3. **Sélectionner un montant** (ex: 5000 FCFA)

4. **Choisir Wave** comme moyen de paiement

5. **Cliquer sur Payer**

6. **Vérifier la redirection** vers:
   ```
   https://pay.wave.com/m/M_2wPEpxMumWXY/c/sn/?amount=5000
   ```

---

## 🔍 VÉRIFICATION

### Confirmer la connexion à Supabase Cloud

```bash
# Afficher la config
cat .env.local | grep VITE_SUPABASE_URL

# Devrait afficher:
# VITE_SUPABASE_URL=https://htfqmamvmhdoixqcbbbw.supabase.co
```

### Tester l'API

```bash
curl http://localhost:3001
# Devrait retourner la page HTML
```

---

## 📁 FICHIERS DE CONFIGURATION

### `.env.local` (Utilisé en dev local)

```env
VITE_SUPABASE_URL=https://htfqmamvmhdoixqcbbbw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_APP_MODE=online
```

### `.env` (Fallback)

```env
VITE_SUPABASE_URL=https://htfqmamvmhdoixqcbbbw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### `.env.coolify` (Production Coolify - non utilisé en local)

```env
VITE_SUPABASE_URL=http://supabasekong-...sslip.io
```

---

## 🚀 COMMANDES UTILES

### Démarrer le serveur

```bash
npm run dev
# ou forcer le port
npm run dev -- --port 3001
```

### Arrêter le serveur

```bash
# Dans le terminal Vite
Ctrl + C

# Ou forcer l'arrêt
pkill -f "vite"
```

### Changer de port

```bash
npm run dev -- --port 3002
```

---

## 🔄 FLUX DES DONNÉES

```
┌──────────────────────┐
│  Navigateur Local    │
│  localhost:3001      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Serveur Vite Local  │
│  Port 3001           │
└──────────┬───────────┘
           │
           ▼
┌────────────────────────────────────┐
│  Supabase Cloud                    │
│  htfqmamvmhdoixqcbbbw.supabase.co │
│                                    │
│  ✅ Base de données                │
│  ✅ Auth                           │
│  ✅ Edge Functions                 │
│  ✅ Storage                        │
└────────────────────────────────────┘
```

---

## ✅ AVANTAGES DE CETTE CONFIG

1. **Développement local rapide** - Pas de délai réseau
2. **Données réelles** - Supabase Cloud avec vraies données
3. **Hot reload** - Modifications instantanées
4. **Debug facile** - Console développeur
5. **Wave fonctionnel** - Provider configuré et actif

---

## ⚠️ IMPORTANT

### Ce qui est LOCAL

- ✅ Interface React (frontend)
- ✅ Serveur Vite
- ✅ Hot Module Replacement

### Ce qui est CLOUD (Supabase)

- ✅ Base de données PostgreSQL
- ✅ Authentification
- ✅ Edge Functions
- ✅ Storage
- ✅ Real-time subscriptions

### Ce qui est IGNORÉ

- ❌ Coolify (pas utilisé en dev local)
- ❌ .env.coolify

---

## 🎨 DÉVELOPPEMENT

### Modifier le code

```bash
# Le code est rechargé automatiquement
# Ouvrir VSCode
code .

# Modifier src/pages/TopUpPage.tsx
# Voir les changements instantanément sur localhost:3001
```

### Tester Wave

```bash
# 1. Aller sur http://localhost:3001/topup
# 2. Sélectionner montant
# 3. Choisir Wave
# 4. Cliquer Payer
# 5. Vérifier la redirection
```

### Voir les logs

```bash
# Terminal Vite
# Affiche les requêtes et erreurs

# Console navigateur (F12)
# Voir les logs React et API calls
```

---

## 🔧 TROUBLESHOOTING

### Port 3001 déjà utilisé

```bash
# Libérer le port
lsof -ti:3001 | xargs kill -9

# Ou utiliser un autre port
npm run dev -- --port 3002
```

### Erreur de connexion Supabase

```bash
# Vérifier .env.local
cat .env.local | grep SUPABASE

# Tester la connexion
curl https://htfqmamvmhdoixqcbbbw.supabase.co
```

### Wave n'apparaît pas

```bash
# Vérifier que Wave est actif
node test_wave_integration.mjs

# Activer Wave si nécessaire
node configure_wave_provider.mjs
```

---

## 📝 PROCHAINES ÉTAPES

1. **Développer en local** sur http://localhost:3001
2. **Tester Wave** avec vrais montants
3. **Commit les changements** (TopUpPage.tsx déjà modifié)
4. **Déployer sur Coolify** quand prêt

---

**Date**: 12 Décembre 2024  
**Environment**: Development Local → Supabase Cloud  
**Status**: ✅ Opérationnel  
**Port**: 3001  
**URL**: http://localhost:3001/topup
