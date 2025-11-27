# 🚀 Guide Installation Synchronisation Temps Réel

## Vue d'Ensemble

Système intelligent de synchronisation automatique entre votre base de données et l'API SMS-Activate, s'exécutant toutes les 5 minutes en arrière-plan.

---

## 📋 Pré-requis

- ✅ Node.js 18+ installé
- ✅ npm packages installés (`npm install`)
- ✅ Fichier `.env` configuré avec:
  - `VITE_SMS_ACTIVATE_API_KEY`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_SERVICE_ROLE_KEY` (important pour bypass RLS)

---

## 🔧 Installation en 3 Étapes

### Étape 1: Créer la Table `sync_logs`

Exécutez la migration SQL dans Supabase:

```bash
# Ouvrir le fichier de migration
cat supabase/migrations/create_sync_logs_table.sql
```

Copiez le contenu et exécutez-le dans **Supabase SQL Editor** (Dashboard → SQL Editor → New Query)

**Vérification:**
```sql
SELECT COUNT(*) FROM sync_logs;
-- Devrait retourner 0 (table vide mais créée)
```

---

### Étape 2: Tester la Synchronisation Manuellement

```bash
# Test en mode DRY_RUN (aucune modification DB)
cd "/Users/mac/Desktop/ONE SMS V1"
DRY_RUN=true node scripts/sync-services-realtime.js
```

**Résultat attendu:**
```
🔄 Sync API → DB started...
✅ API: 1,661 services trouvés
✅ DB: 2,418 services chargés
🗑️  1,379 services obsolètes (seraient désactivés)
➕ 622 services manquants (seraient ajoutés)
🔄 997 services désynchronisés (seraient mis à jour)
✅ SYNCHRONISATION TERMINÉE
```

Si tout est OK, **exécutez la vraie sync:**
```bash
# Synchronisation RÉELLE (modifie la DB)
node scripts/sync-services-realtime.js
```

**Vérification:**
```sql
-- Voir dernière sync
SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 1;

-- Compter services actifs avec stock
SELECT COUNT(*) FROM services WHERE active = true AND total_available > 0;
-- Devrait passer de ~1,296 à ~2,640
```

---

### Étape 3: Activer Cron Job Automatique

```bash
# Installer le cron job
./scripts/setup-cron.sh
```

Le script va:
1. ✅ Vérifier Node.js et dépendances
2. ✅ Créer dossier `logs/`
3. ✅ Tester sync en dry run
4. ✅ Configurer cron job (5 min)
5. ✅ Afficher résumé installation

**Vérification:**
```bash
# Voir cron jobs actifs
crontab -l

# Devrait afficher:
# */5 * * * * cd "/Users/mac/Desktop/ONE SMS V1" && node scripts/sync-services-realtime.js >> logs/sync-cron.log 2>&1
```

**Logs temps réel:**
```bash
# Suivre les logs de synchronisation
tail -f logs/sync-cron.log
```

---

## 📊 Monitoring Dashboard Admin

### Ajouter Route dans `App.tsx`

```tsx
import AdminSyncStatusPage from '@/pages/admin/AdminSyncStatusPage';

// Dans vos routes admin
<Route path="/admin/sync-status" element={<AdminSyncStatusPage />} />
```

### Ajouter Lien Menu Admin

```tsx
// Dans votre navigation admin
<Link to="/admin/sync-status">
  <RefreshCw className="w-4 h-4" />
  Synchronisation
</Link>
```

**Accès Dashboard:**
```
http://localhost:5173/admin/sync-status
```

---

## 🎯 Ce Qui Va Être Synchronisé

### 1. Services Obsolètes (1,379 services)
**Action:** Désactivés (`active = false`, `total_available = 0`)

Exemples:
- reddit, ebay, yahoo, alibaba, nike, coinbase, bolt, etc.

**Pourquoi?** Ces services n'existent plus dans l'API SMS-Activate

---

### 2. Services Manquants (622 services)
**Action:** Ajoutés dans la DB avec stock actuel

TOP services:
- `sn` (Snapchat) - 2,382,555 numéros
- `zz` - 424,194 numéros
- `ng` - 308,092 numéros
- `kp` - 304,441 numéros

**Pourquoi?** Nouveaux services dans l'API, absents de notre DB

---

### 3. Stocks Incorrects (997 services)
**Action:** Stock mis à jour depuis API

Exemples:
- `go` (Google): 0 → 5,818,282
- `oi` (Tinder): 0 → 5,526,543
- `ew`: 0 → 6,965,817
- `tn`: 0 → 6,910,842

**Pourquoi?** DB désynchronisée (dernière sync: 21 Nov)

---

## 📈 Résultats Attendus

### Avant Sync
```
Services visibles User: 1,296
Services cachés:      1,122
Services obsolètes:   1,379
Stock Google:         0
Stock Tinder:         0
```

### Après Sync
```
Services visibles User: ~2,640  (+104% 🚀)
Services cachés:      ~21       (-98% ✅)
Services obsolètes:   0         (-100% ✅)
Stock Google:         5,818,282 ✅
Stock Tinder:         5,526,543 ✅
```

---

## ⚡ Commandes Utiles

### Synchronisation

```bash
# Sync manuelle complète
node scripts/sync-services-realtime.js

# Test sans modification (dry run)
DRY_RUN=true node scripts/sync-services-realtime.js

# Sync avec logs détaillés
VERBOSE=true node scripts/sync-services-realtime.js
```

### Cron Job

```bash
# Voir cron jobs actifs
crontab -l

# Éditer cron jobs
crontab -e

# Désactiver sync automatique
crontab -l | grep -v sync-services-realtime | crontab -

# Réactiver sync automatique
./scripts/setup-cron.sh
```

### Logs

```bash
# Suivre logs temps réel
tail -f logs/sync-cron.log

# Voir derniers logs
tail -n 100 logs/sync-cron.log

# Rechercher erreurs
grep "❌" logs/sync-cron.log
```

### Database

```sql
-- Dernière sync
SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 1;

-- Stats dernières 24h
SELECT * FROM sync_stats LIMIT 24;

-- Services actifs avec stock
SELECT COUNT(*) FROM services WHERE active = true AND total_available > 0;

-- TOP 10 services par stock
SELECT code, name, total_available 
FROM services 
WHERE active = true 
ORDER BY total_available DESC 
LIMIT 10;

-- Nettoyer vieux logs (> 30 jours)
SELECT cleanup_old_sync_logs();
```

---

## 🐛 Dépannage

### Problème 1: "Cannot find module '@supabase/supabase-js'"

```bash
npm install
```

### Problème 2: "VITE_SUPABASE_SERVICE_ROLE_KEY not set"

Ajoutez dans `.env`:
```
VITE_SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
```

**Où trouver?** Supabase Dashboard → Settings → API → `service_role` key

### Problème 3: Cron job ne s'exécute pas

```bash
# Vérifier cron est actif
crontab -l

# Tester manuellement
node scripts/sync-services-realtime.js

# Voir logs système cron
tail -f /var/log/cron.log  # Linux
tail -f /var/log/system.log  # macOS
```

### Problème 4: "Row Level Security" erreur

Utilisez `VITE_SUPABASE_SERVICE_ROLE_KEY` au lieu de `VITE_SUPABASE_ANON_KEY` dans le script sync.

---

## 🔒 Sécurité

### Variables Sensibles

**❌ NE JAMAIS commit `.env` dans Git**

```bash
# Vérifier .gitignore
cat .gitignore | grep .env
# Devrait afficher: .env
```

### Service Role Key

La clé `service_role` bypass RLS (Row Level Security) - **ne l'utilisez QUE dans les scripts backend/cron**, jamais côté client!

```typescript
// ✅ BON (script backend/cron)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY  // OK ici
);

// ❌ MAUVAIS (code frontend)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY  // DANGER!
);
```

---

## 📊 Performance

### Consommation API

- **Fréquence:** 1 appel toutes les 5 minutes
- **Appels/jour:** ~288
- **Coût:** Gratuit (dans limites SMS-Activate)
- **Données:** ~2 MB/appel (1,661 services × 193 pays)

### Optimisations

Pour réduire charge si nécessaire:
```bash
# Sync toutes les 10 min au lieu de 5
*/10 * * * * cd "/Users/mac/Desktop/ONE SMS V1" && node scripts/sync-services-realtime.js >> logs/sync-cron.log 2>&1

# Sync seulement pendant heures ouvrables (9h-18h)
*/5 9-18 * * * cd "/Users/mac/Desktop/ONE SMS V1" && node scripts/sync-services-realtime.js >> logs/sync-cron.log 2>&1
```

---

## ✅ Checklist Installation

- [ ] Migration `sync_logs` exécutée dans Supabase
- [ ] Test sync manuel en dry run réussi
- [ ] Sync réelle exécutée (1,379 obsolètes + 622 ajoutés + 997 mis à jour)
- [ ] Cron job configuré (`crontab -l`)
- [ ] Logs visibles (`tail -f logs/sync-cron.log`)
- [ ] Dashboard admin accessible (`/admin/sync-status`)
- [ ] Services User passés de ~1,296 à ~2,640 ✅

---

## 🆘 Support

Si problème, vérifiez:

1. **Logs sync:** `tail -f logs/sync-cron.log`
2. **Dernière sync DB:** `SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 1;`
3. **API fonctionnelle:** https://api.sms-activate.ae/
4. **Balance API:** `curl "https://api.sms-activate.ae/stubs/handler_api.php?api_key=YOUR_KEY&action=getBalance"`

---

**Dernière mise à jour:** 26 Novembre 2025  
**Version:** 1.0.0  
**Auteur:** GitHub Copilot
