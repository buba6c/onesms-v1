# 🔒 RAPPORT D'ANALYSE DE SÉCURITÉ - Supabase Database Linter

Date: 2025-12-15

## 📊 RÉSUMÉ DES PROBLÈMES

### ❌ Problèmes CRITIQUES (3)

1. **activations** - Table avec politiques RLS mais RLS désactivé
2. **activations** - Table publique sans RLS actif
3. **Plusieurs tables sensibles** - Sans protection RLS

### ⚠️ Problèmes MAJEURS (18 total)

- 6 tables publiques sans RLS
- 11 vues avec SECURITY DEFINER

---

## 🔍 DÉTAIL DES PROBLÈMES

### 1. Policy Exists RLS Disabled - `activations`

**Gravité**: 🔴 CRITIQUE  
**Impact**: Données d'activation exposées sans protection

**Problème**:

- 9 politiques RLS définies mais RLS n'est PAS activé
- Les politiques sont ignorées → Aucune sécurité

**Politiques existantes**:

```
- "Admins can read all activations"
- "Authenticated users can insert activations"
- "Service role can manage activations"
- "Service role can update activations"
- "Service role full access"
- "Users can read own activations"
- "Users insert own activations"
- "Users update own activations"
- "Users view own activations"
```

**Solution**: `ALTER TABLE public.activations ENABLE ROW LEVEL SECURITY;`

---

### 2. RLS Disabled in Public (6 tables)

#### a) `activations` 🔴

**Type**: Données utilisateur critiques  
**Risque**: Lecture/modification non autorisée d'activations  
**Action**: Activer RLS (déjà des politiques définies)

#### b) `rental_logs` 🟠

**Type**: Logs de location  
**Risque**: Exposition de l'historique des locations  
**Action**: Activer RLS + créer politiques admin/user

#### c) `balance_operations` 🔴

**Type**: Opérations financières  
**Risque**: CRITIQUE - Exposition des mouvements de balance  
**Action**: Activer RLS + politiques strictes (admin + service_role)

#### d) `pricing_rules_archive` 🟡

**Type**: Archive des règles de pricing  
**Risque**: Faible - données historiques  
**Action**: Activer RLS + lecture admin uniquement

#### e) `email_campaigns` 🟡

**Type**: Campagnes email  
**Risque**: Moyen - informations marketing  
**Action**: Activer RLS + admin uniquement

#### f) `email_logs` 🟠

**Type**: Logs d'envoi email  
**Risque**: Moyen - exposition emails utilisateurs  
**Action**: Activer RLS + users voient leurs propres logs

---

### 3. Security Definer Views (11 vues)

**Qu'est-ce que SECURITY DEFINER ?**
Les vues avec `SECURITY DEFINER` s'exécutent avec les permissions du **créateur** de la vue, pas de l'utilisateur qui la requête.

**Vues concernées**:

```
1. activation_stats
2. v_frozen_discrepancies
3. v_service_health
4. v_frozen_balance_health
5. v_service_response_time
6. v_dashboard_stats
7. v_frozen_balance_health_reconciliation
8. v_provider_stats_24h
9. v_country_health
10. available_services
11. (autres vues de stats)
```

**Impact**:

- ✅ **Positif**: Permet aux users de voir des stats agrégées sans accès direct aux tables
- ⚠️ **Risque**: Si mal configurée, peut exposer des données sensibles

**Recommandation**:

- Garder SECURITY DEFINER pour les vues de **stats agrégées** (dashboard, analytics)
- Vérifier que chaque vue ne retourne QUE des données agrégées
- Ajouter des filtres WHERE pour limiter les données exposées si besoin

---

## 🛠️ PLAN D'ACTION

### Phase 1: URGENT (À faire maintenant)

```sql
-- 1. Activer RLS sur activations (CRITIQUE)
ALTER TABLE public.activations ENABLE ROW LEVEL SECURITY;

-- 2. Activer RLS sur balance_operations (données financières)
ALTER TABLE public.balance_operations ENABLE ROW LEVEL SECURITY;
```

### Phase 2: Important (Cette semaine)

```sql
-- 3. Activer RLS sur rental_logs
ALTER TABLE public.rental_logs ENABLE ROW LEVEL SECURITY;

-- 4. Activer RLS sur email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
```

### Phase 3: Maintenance (Ce mois)

```sql
-- 5. Activer RLS sur les tables archive/campaigns
ALTER TABLE public.pricing_rules_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
```

### Phase 4: Audit des vues

- Revoir chaque vue SECURITY DEFINER
- Vérifier qu'elles ne retournent QUE des données agrégées
- Documenter leur usage

---

## 📋 FICHIER SQL FOURNI

J'ai créé **`fix_rls_security.sql`** qui contient:

- ✅ Activation RLS sur toutes les tables
- ✅ Création des politiques RLS pour chaque table
- ✅ Permissions admin/user appropriées
- ✅ Requêtes de vérification

**Pour l'exécuter**:

1. Ouvrir Supabase SQL Editor
2. Copier/coller le contenu de `fix_rls_security.sql`
3. Exécuter
4. Vérifier que tout fonctionne

---

## ⚠️ AVERTISSEMENT

**Avant d'exécuter le SQL**:

1. ✅ Tester sur un environnement de staging si possible
2. ✅ Vérifier que votre service_role key fonctionne dans Edge Functions
3. ✅ Sauvegarder les politiques existantes
4. ⚠️ Activer RLS peut CASSER les requêtes existantes si elles n'utilisent pas service_role

**Test après activation**:

```bash
# Vérifier que les Edge Functions fonctionnent toujours
curl https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/moneroo-webhook
curl https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/check-pending-payments
```

---

## 📚 RESSOURCES

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Linter Docs](https://supabase.com/docs/guides/database/database-linter)
- [Security Best Practices](https://supabase.com/docs/guides/auth/managing-user-data)
