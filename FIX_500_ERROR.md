# 🚨 FIX URGENT - Erreur 500 sur /users

## ❌ Problème
```
GET https://htfqmamvmhdoixqcbbbw.supabase.co/rest/v1/users?select=*&id=eq.xxx 500 (Internal Server Error)
```

**Cause** : Les politiques RLS (Row Level Security) sur la table `users` causent une erreur interne.

---

## ✅ Solution Immédiate

### Étape 1 : Ouvrir Supabase SQL Editor

1. Aller sur : https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql
2. Cliquer sur "New Query"

### Étape 2 : Copier le SQL

Ouvrir le fichier **`RUN_THIS_SQL.sql`** et copier TOUT le contenu.

### Étape 3 : Exécuter

1. Coller dans l'éditeur SQL
2. Cliquer sur **"RUN"** (ou Cmd+Enter / Ctrl+Enter)
3. Attendre la confirmation ✅

### Étape 4 : Tester

1. Rafraîchir l'application (F5)
2. Se connecter avec : admin@test.com / Admin123!
3. Vérifier que l'erreur 500 a disparu

---

## 🔧 Ce que fait le script

### 1. Fixe les politiques RLS (Résout l'erreur 500)
```sql
-- Supprime les anciennes politiques problématiques
DROP POLICY IF EXISTS "Users can view own profile" ON users;
-- Crée des politiques simples sans récursion
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
```

### 2. Ajoute success_rate aux pays
```sql
ALTER TABLE countries ADD COLUMN success_rate DECIMAL(5, 2) DEFAULT 99.00;
```

### 3. Crée la table service_icons
```sql
CREATE TABLE service_icons (
  service_code TEXT UNIQUE,
  icon_emoji TEXT,
  icon_type TEXT
);
```

---

## 🎯 Résultat Attendu

- ✅ Plus d'erreur 500 sur `/users`
- ✅ L'authentification fonctionne
- ✅ Le dashboard se charge correctement
- ✅ Prêt pour "Sync avec 5sim"

---

## 🚀 Après le Fix

Une fois le SQL exécuté avec succès :

1. **Tester l'app** : Connexion + Navigation
2. **Cliquer sur "Sync avec 5sim"** dans Admin → Services
3. **Attendre** : ~30-60 secondes pour ~1000 services
4. **Vérifier** : 
   - Services avec vraies disponibilités ✅
   - Pays avec success_rate calculé ✅
   - Prix réels affichés dans le dashboard ✅

---

## ⚠️ Si Erreur Persiste

Vérifie les logs Supabase :
1. Dashboard → Logs
2. Chercher "users" 
3. Regarder l'erreur exacte

Ou désactive temporairement RLS :
```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

(Mais **réactive-le après** pour la sécurité !)

---

**Fichier SQL à exécuter** : `RUN_THIS_SQL.sql`  
**Dashboard Supabase** : https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql
