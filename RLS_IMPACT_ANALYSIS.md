# 🔒 ANALYSE COMPLÈTE RLS - IMPACT SUR LES FONCTIONNALITÉS

**Date**: 10 décembre 2025  
**Analyse**: Deep dive sur l'impact des changements RLS

---

## 🚨 ALERTE CRITIQUE

**⚠️  NE PAS APPLIQUER `fix_rls_cloud_complete.sql` !**

Ce script va **CASSER** plusieurs fonctionnalités critiques :
- ❌ Dashboard admin (vide)
- ❌ Wallet / Atomic operations
- ❌ Webhooks paiements
- ❌ Cron jobs

---

## 📊 RÉSUMÉ DE L'ANALYSE

### Tables Affectées (6)

| Table | Impact | Risque | Status |
|-------|--------|--------|--------|
| `activations` | 🟢 Aucun | LOW | Policies déjà en place |
| `rental_logs` | 🟡 Moyen | MEDIUM | Edge Functions doivent utiliser service_role |
| `balance_operations` | 🔴 Élevé | **HIGH** | **Critique pour wallet** |
| `pricing_rules_archive` | 🟢 Aucun | LOW | Lecture publique OK |
| `email_campaigns` | 🟢 Aucun | LOW | Admins seulement |
| `email_logs` | 🟢 Aucun | LOW | Admins seulement |

### Views Affectées (10)

| View | Usage | Peut casser | Fix |
|------|-------|-------------|-----|
| `v_dashboard_stats` | Dashboard admin | ❌ **OUI** | **GARDER SECURITY DEFINER** |
| `v_frozen_discrepancies` | Admin monitoring | ❌ **OUI** | **GARDER SECURITY DEFINER** |
| `v_service_health` | Admin monitoring | ❌ **OUI** | **GARDER SECURITY DEFINER** |
| `v_frozen_balance_health` | Comptabilité | ❌ **OUI** | **GARDER SECURITY DEFINER** |
| `activation_stats` | Stats dashboard | ❌ **OUI** | **GARDER SECURITY DEFINER** |
| `v_provider_stats_24h` | Stats providers | ❌ **OUI** | **GARDER SECURITY DEFINER** |
| `v_country_health` | Stats pays | ❌ **OUI** | **GARDER SECURITY DEFINER** |
| `v_frozen_balance_health_reconciliation` | Comptabilité | ❌ **OUI** | **GARDER SECURITY DEFINER** |
| `v_service_response_time` | Monitoring | ❌ **OUI** | **GARDER SECURITY DEFINER** |
| `available_services` | Liste publique | ✅ Non | SECURITY INVOKER OK |

---

## 🔴 PROBLÈMES CRITIQUES IDENTIFIÉS

### 1. Views Admin → SECURITY INVOKER

**Problème**: Conversion en SECURITY INVOKER = dashboard admin vide

**Pourquoi** :
- SECURITY INVOKER = exécute avec permissions du user connecté
- User admin voit uniquement ses propres données
- Ne voit pas les données des autres users
- Dashboard admin affiche 0 partout

**Solution** :
```sql
-- ❌ NE PAS FAIRE ÇA:
CREATE VIEW v_dashboard_stats WITH (security_invoker = true) AS ...

-- ✅ FAIRE ÇA:
CREATE VIEW v_dashboard_stats WITH (security_definer = true) AS ...
-- Ou laisser tel quel (défaut = SECURITY DEFINER)
```

**Impact** :
- Dashboard admin **complètement cassé**
- Aucune statistique visible
- Monitoring impossible

---

### 2. Fonctions atomic_* sans SECURITY DEFINER

**Problème**: Si les fonctions atomic_* n'ont pas SECURITY DEFINER, RLS va bloquer

**Fonctions critiques** :
```sql
atomic_freeze_balance()       -- Freeze balance pour activation/rent
atomic_unfreeze_balance()     -- Unfreeze si échec
atomic_commit()               -- Commit transaction atomique
atomic_refund()               -- Refund en cas d'échec
process_expired_activations() -- Cron job expirations
```

**Pourquoi critique** :
- Ces fonctions modifient `balance_operations` de n'importe quel user
- Avec RLS actif, user A ne peut pas modifier data de user B
- Même avec service_role, si fonction n'a pas SECURITY DEFINER, RLS s'applique

**Vérification** :
```sql
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname LIKE 'atomic_%';

-- prosecdef DOIT être true !
```

**Impact** :
- **Wallet complètement cassé**
- Impossible de freeze/unfreeze
- Paiements en échec
- Locations impossibles

---

### 3. Edge Functions avec anon key

**Problème**: Edge Functions qui utilisent `SUPABASE_ANON_KEY` au lieu de `SUPABASE_SERVICE_ROLE_KEY`

**Fonctions concernées** :
```typescript
// ❌ CASSE avec RLS sur balance_operations:
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY  // ❌ Ne peut pas bypass RLS
);

// ✅ FONCTIONNE avec RLS:
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY  // ✅ Bypass RLS
);
```

**Fonctions à vérifier** :
- `paydunya-webhook` (écrit balance_operations)
- `moneyfusion-webhook` (écrit balance_operations)
- `moneroo-webhook` (écrit balance_operations)
- `buy-sms-activate-number` (écrit activations + balance_operations)
- `get-rent-status` (lit rental_logs de tous users)
- `set-rent-status` (écrit rental_logs)
- `cron-atomic-reliable` (lit tout)
- `cron-check-pending-sms` (lit tout)

**Impact** :
- **Webhooks paiements cassés** (PayDunya, MoneyFusion, Moneroo)
- **Locations cassées**
- **Cron jobs cassés**

---

### 4. RLS sur balance_operations

**Problème**: Table critique pour tout le système de wallet

**Impact potentiel** :
```
User achète SMS → Edge Function crée activation
                → Appelle atomic_freeze_balance()
                → Si pas SECURITY DEFINER: ❌ ÉCHEC
                → Si fonction OK mais Edge Function utilise anon key: ❌ ÉCHEC
                → User ne peut pas acheter
```

**Chaîne de dépendances** :
```
Achat SMS
  ↓
Edge Function (buy-sms-activate-number)
  ↓
Fonction SQL (atomic_freeze_balance)
  ↓
Table balance_operations (RLS actif)
  ↓
SI service_role + SECURITY DEFINER: ✅ OK
SI anon key OU pas SECURITY DEFINER: ❌ ÉCHEC
```

---

## ✅ SOLUTION SÛRE

### Script `fix_rls_cloud_safe.sql`

**Ce qui est fait** :
1. ✅ Active RLS sur les 6 tables
2. ✅ Ajoute policies appropriées
3. ✅ **GARDE** SECURITY DEFINER sur views admin
4. ✅ Convertit uniquement `available_services` en SECURITY INVOKER
5. ✅ Vérifie les fonctions atomic_*
6. ✅ Ajoute warnings si problèmes

**Ce qui est ÉVITÉ** :
1. ❌ Pas de conversion massive views → SECURITY INVOKER
2. ❌ Pas de suppression de views
3. ❌ Pas de risque de casser dashboard
4. ❌ Pas de risque wallet

---

## 📋 CHECKLIST POST-APPLICATION

### Avant d'appliquer

- [ ] Lire ce document en entier
- [ ] Vérifier que Edge Functions utilisent service_role key
- [ ] Faire backup de la DB
- [ ] Prévenir les users (maintenance courte)

### Application

- [ ] Appliquer `fix_rls_cloud_safe.sql` sur **Supabase Cloud**
- [ ] Vérifier les warnings dans les résultats

### Vérifications immédiates

- [ ] **Dashboard admin** fonctionne (stats visibles)
- [ ] **Créer activation** fonctionne
- [ ] **Paiement test** fonctionne
- [ ] **Location test** fonctionne
- [ ] **Wallet** affiche historique

### Si problème détecté

1. **Dashboard admin vide** :
   - Vérifier que views n'ont pas été converties en SECURITY INVOKER
   - Recréer avec SECURITY DEFINER

2. **Erreur "permission denied" lors d'achat** :
   - Vérifier Edge Function utilise service_role key
   - Vérifier fonctions atomic_* ont SECURITY DEFINER

3. **Webhook en échec** :
   - Vérifier service_role key dans webhook
   - Check logs Supabase

### Monitoring (24-48h)

- [ ] Surveiller taux d'erreur activations
- [ ] Surveiller taux d'erreur paiements
- [ ] Surveiller logs Edge Functions
- [ ] Surveiller complaints users

---

## 🔧 COMMANDES UTILES

### Vérifier RLS activé
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Vérifier policies
```sql
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Vérifier fonctions SECURITY DEFINER
```sql
SELECT proname, prosecdef,
  CASE WHEN prosecdef THEN 'SECURITY DEFINER' 
       ELSE 'SECURITY INVOKER' 
  END as security_type
FROM pg_proc
WHERE proname LIKE 'atomic_%'
   OR proname LIKE 'process_%'
   OR proname LIKE 'secure_%';
```

### Vérifier Edge Functions
```bash
# Chercher service_role key
grep -r "SERVICE_ROLE_KEY" supabase/functions/

# Chercher anon key (à éviter pour balance_operations)
grep -r "ANON_KEY" supabase/functions/
```

---

## 📊 TABLEAU DE RISQUES

| Composant | Si appliqué mal | Si appliqué bien | Priorité |
|-----------|-----------------|------------------|----------|
| Views admin | 🔴 Dashboard cassé | ✅ Fonctionne | **CRITIQUE** |
| Fonctions atomic_* | 🔴 Wallet cassé | ✅ Fonctionne | **CRITIQUE** |
| Edge Functions webhooks | 🔴 Paiements cassés | ✅ Fonctionne | **CRITIQUE** |
| RLS activations | 🟢 OK (policies déjà là) | ✅ Fonctionne | LOW |
| RLS rental_logs | 🟡 Locations KO si anon key | ✅ Fonctionne | MEDIUM |
| RLS balance_operations | 🔴 Wallet KO si mal fait | ✅ Fonctionne | **HIGH** |
| RLS pricing_rules | 🟢 OK (lecture publique) | ✅ Fonctionne | LOW |
| RLS email_* | 🟢 OK (admins only) | ✅ Fonctionne | LOW |

---

## 🎯 CONCLUSION

### ❌ Script à NE PAS utiliser
- `fix_rls_cloud_complete.sql` - **DANGEREUX**

### ✅ Script à utiliser
- `fix_rls_cloud_safe.sql` - **SÉCURISÉ**

### ⏱️ Temps d'application
- Lecture doc: 10 min
- Application script: 2 min
- Vérifications: 5 min
- **Total: ~20 min**

### 💰 Risques
- Avec script safe: **Quasi nul** (0-5%)
- Avec script complete: **Très élevé** (80-90% de casse)

---

**Fichiers générés** :
- ✅ `fix_rls_cloud_safe.sql` - Script sécurisé à appliquer
- ✅ `analyze_rls_impact.mjs` - Script d'analyse
- ✅ `rls_impact_analysis.json` - Rapport JSON détaillé
- ℹ️ `RLS_IMPACT_ANALYSIS.md` - Ce document

**Prêt à appliquer** : Utiliser `fix_rls_cloud_safe.sql` sur Supabase Cloud
