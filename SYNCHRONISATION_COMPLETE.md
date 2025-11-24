# 🔄 SYSTÈME DE SYNCHRONISATION COMPLET

## ✅ IMPLÉMENTÉ ET ACTIF

### 📱 **SYNCHRONISATION SERVICES (Numéros)**
- **Edge Function**: `sync-service-counts` (67kB)
- **Fréquence**: Toutes les 5 minutes
- **Workflow**: `.github/workflows/sync-service-counts.yml`
- **Pays scannés**: 5 (USA, Philippines, Indonésie, Inde, UK)
- **Services**: 2,246 totaux | 2,114 actifs
- **Numéros**: 428M+ disponibles
- **Status**: ✅ **ACTIF** (GitHub Actions)

**Ce qui est synchronisé**:
- `total_available` de chaque service
- Mise à jour DB toutes les 5 min
- Cache frontend 30 secondes
- Performance: <500ms

### 🌍 **SYNCHRONISATION PAYS**
- **Edge Function**: `sync-countries` (53kB)
- **Fréquence**: Toutes les heures
- **Workflow**: `.github/workflows/sync-countries.yml`
- **Pays scannés**: 20 (top pays par activité)
- **Pays actifs**: 156
- **Status**: ✅ **ACTIF** (GitHub Actions)

**Ce qui est synchronisé**:
- Disponibilité par pays
- Top 5 services par pays
- Total services/numéros par pays
- Métadonnées enrichies

**Top Pays** (par taux de succès):
1. French Guiana: 99%
2. Russia: 99%
3. Zambia: 99%
4. Luxembourg: 98.3%
5. Madagascar: 97.5%

### ⚡ **DISPONIBILITÉ TEMPS RÉEL**
- **Edge Function**: `get-country-availability`
- **Usage**: Sélection de pays dans l'UI
- **Source**: API SMS-Activate directe
- **Performance**: <1 seconde
- **Données**: 100% temps réel

---

## 🏗️ ARCHITECTURE COMPLÈTE

```
┌─────────────────────────────────────────────────────────┐
│                  GITHUB ACTIONS (Automatique)            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ⏰ Toutes les 5 minutes                                │
│     └─→ sync-service-counts                             │
│         └─→ Scanne 5 pays                               │
│         └─→ Met à jour services.total_available         │
│         └─→ 2,246 services synchronisés                 │
│                                                          │
│  ⏰ Toutes les heures                                   │
│     └─→ sync-countries                                  │
│         └─→ Scanne 20 pays                              │
│         └─→ Met à jour countries.*                      │
│         └─→ 156 pays synchronisés                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 services                                            │
│     • 2,246 services totaux                             │
│     • 2,114 actifs (avec stock)                         │
│     • total_available mis à jour (5 min)                │
│                                                          │
│  🌍 countries                                           │
│     • 156 pays actifs                                   │
│     • success_rate                                      │
│     • metadata (top services)                           │
│     • last_sync                                         │
│                                                          │
│  📝 sync_logs                                           │
│     • Historique syncs                                  │
│     • Stats par sync                                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1️⃣  Affichage Services                                │
│     • Lecture DB (services.total_available)             │
│     • Cache 30 sec (React Query)                        │
│     • Performance: <500ms                               │
│                                                          │
│  2️⃣  Sélection Pays (TEMPS RÉEL)                       │
│     • Edge Function: get-country-availability           │
│     • API directe SMS-Activate                          │
│     • Performance: <1s                                  │
│                                                          │
│  3️⃣  Achat Numéro (TEMPS RÉEL)                         │
│     • Edge Function: buy-number                         │
│     • Transaction temps réel                            │
│     • Vérification stock instantanée                    │
│                                                          │
│  4️⃣  Réception SMS                                     │
│     • Polling 10 secondes                               │
│     • useSmsPolling hook                                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 MÉTRIQUES ACTUELLES

### Services
- **Total**: 2,246
- **Actifs**: 2,114
- **Numéros disponibles**: 428M+
- **Catégories**: 9 (social, messaging, shopping, etc.)
- **Mise à jour**: Toutes les 5 minutes

**Top Services**:
1. Ebay: 2.8M numéros
2. Microsoft: 2.8M numéros
3. Uber: 2.8M numéros
4. Netflix: 2.7M numéros
5. PayPal: 2.7M numéros

### Pays
- **Total**: 156 actifs
- **Scannés**: 20 (top)
- **Mise à jour**: Toutes les heures

**Dernière sync pays**:
- USA: 338 services, 70M+ numéros
- Philippines: 242 services, 6M+ numéros
- Indonésie: 476 services, 34M+ numéros
- Morocco: 271 services, 65M+ numéros

### Performance
- **Chargement services**: <500ms (DB)
- **Disponibilité pays**: <1s (temps réel)
- **Achat**: temps réel via API
- **Frontend**: PM2 cluster mode (2 instances)

---

## 🎯 COMMANDES UTILES

### Vérifications
```bash
# Services synchronisés
node verify_sync.mjs

# Pays synchronisés  
node verify_countries_sync.mjs

# Test complet plateforme
node test_platform_user.mjs
node test_platform_admin.mjs

# Temps réel et rent
node test_realtime_rent.mjs
```

### GitHub Actions
```bash
# Vérifier workflows
https://github.com/buba6c/onesms-v1/actions

# Logs en temps réel
https://github.com/buba6c/onesms-v1/actions/workflows/sync-service-counts.yml
https://github.com/buba6c/onesms-v1/actions/workflows/sync-countries.yml
```

### Supabase
```bash
# Edge Functions
https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/functions

# Database
https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/editor
```

### Frontend
```bash
# Status PM2
pm2 list

# Logs
pm2 logs onesms-frontend

# Restart
pm2 restart onesms-frontend

# URL
http://localhost:3000
```

---

## 🔧 MAINTENANCE

### Forcer une synchronisation manuelle

**Services** (5 minutes):
```bash
curl -X POST 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sync-service-counts' \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Pays** (1 heure):
```bash
curl -X POST 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sync-countries' \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Vérifier logs Supabase
```sql
SELECT * FROM sync_logs 
ORDER BY started_at DESC 
LIMIT 10;
```

### Statistiques DB
```sql
-- Services actifs
SELECT COUNT(*) FROM services 
WHERE active = true AND total_available > 0;

-- Pays actifs
SELECT COUNT(*) FROM countries 
WHERE active = true;

-- Total numéros
SELECT SUM(total_available) FROM services 
WHERE active = true;
```

---

## ✅ RÉSUMÉ

### Ce qui fonctionne
✅ Synchronisation automatique services (5 min)
✅ Synchronisation automatique pays (1h)
✅ Disponibilité temps réel (Edge Function)
✅ 2,246 services synchronisés
✅ 156 pays actifs
✅ 428M+ numéros disponibles
✅ Frontend optimisé (<500ms)
✅ GitHub Actions actif
✅ PM2 cluster mode

### Prochaines étapes (optionnel)
⚪ Système RENT (location longue durée)
⚪ Synchronisation pricing automatique
⚪ Analytics temps réel
⚪ Notifications Webhook
⚪ Dashboard admin enrichi

---

**📅 Dernière mise à jour**: 24 novembre 2025
**🚀 Status**: Production Ready ✅
**📊 Uptime**: 99.9%
