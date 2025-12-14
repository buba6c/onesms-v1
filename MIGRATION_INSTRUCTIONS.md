# 🎯 Migration: Suppression Système de Synchronisation

## ✅ CE QUI A ÉTÉ FAIT

### 1. Migration SQL Créée
- **Fichier**: `supabase/migrations/20251129_remove_pricing_sync.sql`
- **Actions**:
  - ✅ Supprime table `pricing_rules` (cache prix)
  - ✅ Supprime table `sync_logs` (logs synchronisation)
  - ✅ Supprime table `country_service_stats` (stats)
  - ✅ Archive les données dans `pricing_rules_archive`
  - ✅ Crée vue `available_services` pour historique
  - ✅ Crée table `popular_services` (sans prix, juste metadata)

### 2. Edge Function Déployée
- **Fonction**: `get-real-time-prices` ✅ DEPLOYED
- **URL**: `https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/get-real-time-prices`
- **Usage**: Récupère prix en temps réel depuis SMS-Activate API
- **Params**:
  - `type`: 'activation' | 'rental' | 'all'
  - `service`: code service (optionnel)
  - `country`: code pays (optionnel)

### 3. Frontend Modifié
- **Fichier**: `src/pages/DashboardPage.tsx`
- **Changements**:
  - ❌ Supprimé: Requête `pricing_rules` table
  - ✅ Ajouté: Fallback vers `get-real-time-prices` function
  - ✅ Utilise déjà `get-top-countries-by-service` (prix dynamiques)

### 4. Buy Function Déjà OK
- **Fonction**: `buy-sms-activate-number`
- ✅ Calcule déjà le prix dynamiquement via `getPrices` API
- ✅ Pattern freeze-before-call intact
- ✅ Pas de changement nécessaire

## 🚀 PROCHAINES ÉTAPES

### Étape 1: Appliquer la Migration
```sql
-- Ouvrir Supabase Dashboard → SQL Editor
-- Copier/coller le contenu de:
supabase/migrations/20251129_remove_pricing_sync.sql

-- Exécuter
-- ⚠️ ATTENTION: Ceci va supprimer pricing_rules, sync_logs, country_service_stats
```

### Étape 2: Vérifier le Déploiement
```bash
# Tester la nouvelle fonction
curl -X POST 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/get-real-time-prices' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"type":"activation","service":"wa","country":"6"}'

# Devrait retourner:
# {
#   "success": true,
#   "data": [{
#     "serviceCode": "wa",
#     "countryCode": "6",
#     "priceUSD": 0.50,
#     "priceFCFA": 300,
#     "priceCoins": 33,
#     "count": 100,
#     "type": "activation"
#   }]
# }
```

### Étape 3: Tester sur l'Application
1. Ouvrir http://localhost:3004
2. Connectez-vous
3. Sélectionner WhatsApp
4. Vérifier que les pays s'affichent avec prix
5. Acheter 1 activation pour valider

### Étape 4: Nettoyer les Edge Functions Obsolètes (OPTIONNEL)
```bash
# Ces functions ne sont plus nécessaires:
npx supabase functions delete sync-services-unified
npx supabase functions delete sync-all-services

# ⚠️ NE PAS supprimer:
# - get-top-countries-by-service (utilisée par frontend)
# - buy-sms-activate-number (achats)
# - check-sms-activate-status (vérifications)
```

## 📊 NOUVELLE ARCHITECTURE

### Avant (Synchronisation)
```
Frontend
  ↓ SELECT
pricing_rules (cache)
  ↓ sync-services-unified (cron)
SMS-Activate API
```

### Après (Temps Réel)
```
Frontend
  ↓ get-real-time-prices
SMS-Activate API
```

### Avantages
- ✅ Pas de cache périmé
- ✅ Prix toujours à jour
- ✅ Moins de tables (simplifié)
- ✅ Pas de jobs de synchronisation
- ✅ Code plus simple

### Considérations
- ⚠️ Latence légèrement supérieure (appel API vs cache)
- ✅ Mitigation: Frontend cache 30s avec React Query
- ✅ Fallback automatique si API SMS-Activate en panne

## �� VALIDATION

### Vérifier que tout fonctionne:

1. **Achats Activations**
   - [ ] Sélectionner service (WhatsApp)
   - [ ] Voir liste pays avec prix
   - [ ] Acheter 1 numéro
   - [ ] Vérifier balance débité
   - [ ] Vérifier frozen_balance gelé pendant attente SMS

2. **Locations**
   - [ ] Mode Location
   - [ ] Voir prix par durée (4h, 1jour, etc.)
   - [ ] Louer 1 numéro
   - [ ] Vérifier messages reçus

3. **Dashboard**
   - [ ] Voir activations actives
   - [ ] Voir locations actives
   - [ ] Vérifier header balance + frozen

## 📝 ROLLBACK (si problème)

Si problème après migration:

```sql
-- 1. Restaurer pricing_rules depuis l'archive
CREATE TABLE pricing_rules AS 
SELECT * FROM pricing_rules_archive;

-- 2. Recréer les indexes
CREATE INDEX idx_pricing_service_country ON pricing_rules(service_code, country_code);
CREATE INDEX idx_pricing_active ON pricing_rules(active);

-- 3. Enable RLS
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view" ON pricing_rules FOR SELECT USING (true);

-- 4. Resynchroniser
-- Appeler sync-services-unified manuellement
```

## ✅ CHECKLIST FINALE

- [x] Migration SQL créée
- [x] Edge Function get-real-time-prices déployée
- [x] Frontend modifié (fallback)
- [ ] Migration appliquée dans Dashboard
- [ ] Tests achats OK
- [ ] Tests locations OK
- [ ] Monitoring production 24h

---

**Prêt à appliquer?** Ouvrez Supabase Dashboard SQL Editor et collez le SQL! 🚀
