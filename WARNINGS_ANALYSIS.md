# 🔒 ANALYSE WARNINGS SUPABASE - Fonctions & Sécurité

Date: 2025-12-15

## 📊 RÉSUMÉ

### 🟡 35 Fonctions avec search_path mutable

- **Niveau**: WARNING (pas critique)
- **Risque**: Moyen (attaque sophistiquée)
- **Impact**: Vulnérabilité à "search path injection"

### 🟡 2 Extensions dans public

- **Niveau**: WARNING
- **Risque**: Faible
- **Extensions**: `http`, `pg_net`

### 🟡 Protection mot de passe désactivée

- **Niveau**: WARNING
- **Risque**: Moyen
- **Impact**: Users peuvent créer comptes avec mots de passe compromis

---

## 🎯 PROBLÈME #1: Function Search Path Mutable

### Qu'est-ce que c'est ?

Quand une fonction PostgreSQL n'a pas de `search_path` fixe, elle cherche les objets (tables, fonctions) dans l'ordre des schémas du `search_path` de l'utilisateur qui l'exécute.

**Attaque possible** :

```sql
-- 1. Attaquant crée un schéma malveillant
CREATE SCHEMA evil;

-- 2. Crée une table piège
CREATE TABLE evil.users (id uuid, email text);

-- 3. Modifie son search_path
SET search_path = evil, public;

-- 4. Quand il appelle une fonction sans search_path fixe
-- La fonction va utiliser evil.users au lieu de public.users !
SELECT admin_add_credit(user_id, amount);
-- ☠️ Peut créer un faux crédit ou voler des données
```

### Solution

Ajouter `SET search_path = ''` dans chaque fonction :

```sql
CREATE OR REPLACE FUNCTION public.admin_add_credit(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- ✅ FORCER empty search_path
AS $$
BEGIN
  -- Utiliser des noms qualifiés
  SELECT * FROM public.users WHERE id = user_id;  -- ✅ BON
  -- SELECT * FROM users WHERE id = user_id;       -- ❌ MAUVAIS
END;
$$;
```

---

## 📋 FONCTIONS À CORRIGER (35 total)

### Catégorie 1: Triggers updated_at (8 fonctions) ✅ Facile

- `update_activation_packages_updated_at`
- `update_payment_providers_updated_at`
- `update_contact_messages_updated_at`
- `update_wave_payment_proofs_updated_at`
- `update_activations_updated_at`
- `update_updated_at_column`
- `update_contact_settings_updated_at`
- `update_rentals_updated_at`

**Action** : Script SQL fourni dans `fix_function_search_path.sql`

### Catégorie 2: Fonctions CRON/Cleanup (2 fonctions) ✅ Facile

- `cleanup_old_provider_logs`
- `cleanup_old_logs`

**Action** : Script SQL fourni

### Catégorie 3: Fonctions métier critiques (25 fonctions) ⚠️ Vérification requise

- `reconcile_frozen_balance`
- `fix_frozen_balance_discrepancy`
- `secure_freeze_balance`
- `secure_unfreeze_balance`
- `atomic_freeze`
- `atomic_refund`
- `atomic_refund_direct`
- `atomic_commit`
- `admin_add_credit`
- `transfer_service_stock`
- `process_sms_received`
- `process_expired_activations`
- `expire_rentals`
- `lock_user_wallet`
- `prevent_direct_frozen_clear_activation`
- `prevent_direct_frozen_clear_rental`
- `prevent_direct_frozen_amount_update`
- `ensure_user_balance_ledger`
- `check_frozen_discrepancies`
- `log_event`
- `get_cron_jobs`
- `get_setting`
- `update_setting`

**Action** : Nécessite **extraction du code** de chaque fonction pour les recréer avec `SET search_path = ''`

---

## 🛠️ PLAN D'ACTION

### Phase 1: Fonctions simples (MAINTENANT) ✅

```sql
-- Exécuter dans Supabase SQL Editor
-- Fichier: fix_function_search_path.sql

-- 10 fonctions corrigées (triggers + cleanup)
-- Pas de risque, juste ajouter SET search_path = ''
```

### Phase 2: Extraction des fonctions métier (1h)

Pour chaque fonction métier, il faut :

1. **Extraire le code actuel** :

```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'admin_add_credit'
AND pronamespace = 'public'::regnamespace;
```

2. **Ajouter `SET search_path = ''`**

3. **Vérifier les références aux tables** :

   - Remplacer `users` par `public.users`
   - Remplacer `transactions` par `public.transactions`
   - Etc.

4. **Recréer la fonction**

### Phase 3: Test (30min)

Tester chaque fonction modifiée :

- Appeler depuis Edge Function
- Vérifier le résultat
- Vérifier les logs

---

## 🎯 PROBLÈME #2: Extensions dans public

### Extensions concernées

- `http` - Utilisée pour appels HTTP externes
- `pg_net` - Utilisée pour requêtes réseau asynchrones

### Pourquoi c'est un warning ?

Extensions dans `public` peuvent être accédées par tous les users.  
Best practice : Les mettre dans un schéma dédié.

### Solution (optionnelle)

```sql
-- 1. Créer schéma extensions
CREATE SCHEMA IF NOT EXISTS extensions;

-- 2. Déplacer http
ALTER EXTENSION http SET SCHEMA extensions;

-- 3. Déplacer pg_net
ALTER EXTENSION pg_net SET SCHEMA extensions;

-- 4. Mettre à jour les fonctions qui les utilisent
-- Remplacer http_post(...) par extensions.http_post(...)
```

**⚠️ ATTENTION** : Cela peut casser des fonctions existantes !  
Vérifier d'abord toutes les références.

---

## 🎯 PROBLÈME #3: Protection mot de passe désactivée

### Qu'est-ce que c'est ?

Supabase Auth peut vérifier si un mot de passe a été compromis (fuité) en utilisant l'API HaveIBeenPwned.

**Exemple** :

- User essaye de créer compte avec mot de passe `password123`
- Si activé : ❌ Refusé (ce mot de passe a fuité 123 millions de fois)
- Si désactivé : ✅ Accepté (vulnérable)

### Solution

1. Aller dans **Supabase Dashboard**
2. **Authentication** → **Settings** → **Password**
3. Activer **"Check for leaked passwords"**

**Impact** : Aucun sur les users existants, juste sur les nouveaux comptes.

---

## 📊 PRIORITÉS

### 🔴 CRITIQUE (déjà fait)

- ✅ RLS activé sur tables sensibles

### 🟠 IMPORTANT (à faire cette semaine)

1. ✅ **Fonctions triggers** (10 fonctions) - Script fourni
2. ⚠️ **Fonctions métier critiques** (25 fonctions) - Extraction requise
3. ✅ **Protection mot de passe** - 1 clic dans dashboard

### 🟡 MAINTENANCE (à faire ce mois)

- Extensions dans schéma dédié (optionnel)

---

## 🚨 RISQUES

### Si on ne corrige PAS les search_path :

**Probabilité** : 🟡 Faible (attaque sophistiquée)  
**Impact** : 🔴 Élevé si exploité

**Scénario d'attaque** :

1. Attaquant obtient accès DB (via SQL injection ailleurs)
2. Crée schéma malveillant
3. Crée tables/fonctions pièges
4. Modifie search_path
5. Appelle fonctions sensibles → vol de données ou manipulation

### Si on corrige :

**Avantages** :

- ✅ Protection contre search path injection
- ✅ Conformité best practices PostgreSQL
- ✅ Warnings Supabase Linter supprimés

**Inconvénients** :

- ⚠️ Nécessite de revoir 25 fonctions métier
- ⚠️ Risque de régression si mal fait

---

## 📝 FICHIERS CRÉÉS

1. **`fix_function_search_path.sql`** - Correctif pour 10 fonctions simples
2. **`WARNINGS_ANALYSIS.md`** - Ce fichier (analyse détaillée)

---

## ✅ RECOMMANDATION

### À faire MAINTENANT :

1. ✅ Exécuter `fix_function_search_path.sql` (10 fonctions safe)
2. ✅ Activer protection mot de passe (1 clic)

### À planifier (1-2h) :

3. ⚠️ Extraire code des 25 fonctions métier
4. ⚠️ Ajouter `SET search_path = ''` à chacune
5. ⚠️ Tester en staging avant production

### Optionnel :

6. 🟡 Déplacer extensions vers schéma dédié

**Risque** : 🟡 FAIBLE si on fait Phase 1+2 uniquement  
**Bénéfice** : 🟢 IMPORTANT (sécurité renforcée)
