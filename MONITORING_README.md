# 🎯 ONE SMS - Outils de Monitoring et Analyse

Ce dossier contient tous les outils de monitoring, analyse et correction du système ONE SMS.

---

## 📋 TABLE DES MATIÈRES

1. [Scripts de Monitoring](#-scripts-de-monitoring)
2. [Scripts d'Analyse](#-scripts-danalyse)
3. [Scripts de Correction](#-scripts-de-correction)
4. [Documentation](#-documentation)
5. [Quick Start](#-quick-start)

---

## 🔍 Scripts de Monitoring

### `live_dashboard.mjs` - Dashboard en temps réel

**Usage**: Monitoring live avec refresh automatique toutes les 30s

```bash
node live_dashboard.mjs
```

**Affiche**:

- Status global (CRITICAL/WARNING/GOOD)
- Taux de succès 24h
- Top 5 services avec leur santé
- Top 3 pays
- Alertes actives

**Quand l'utiliser**: Pour surveiller le système en continu pendant les déploiements ou incidents

---

### `verify_monitoring_views.mjs` - Vérification vues

**Usage**: Vérifier que les vues SQL sont créées et fonctionnelles

```bash
node verify_monitoring_views.mjs
```

**Vérifie**:

- `v_dashboard_stats`
- `v_service_health`
- `v_country_health`
- `v_service_response_time`

---

### `generate_daily_report.mjs` - Rapport quotidien

**Usage**: Générer un rapport markdown quotidien

```bash
node generate_daily_report.mjs
```

**Génère**: `daily_report_YYYY-MM-DD.md` avec:

- Statistiques 24h
- Top services/pays
- Recommandations automatiques
- Alertes

**Automatisation**: Ajouter à cron

```bash
0 9 * * * cd /path/to/project && node generate_daily_report.mjs
```

---

## 📊 Scripts d'Analyse

### `deep_analysis_production.mjs` - Analyse complète

**Usage**: Analyse deep du système (race conditions, cohérence, patterns)

```bash
node deep_analysis_production.mjs
```

**Analyse**:

- État système (balance, frozen)
- Activations 24h (par status)
- Transactions (par type)
- Race conditions (concurrent access)
- Cohérence frozen_balance
- Patterns suspects

**Durée**: ~5-10 secondes

---

### `analyze_cancellation_rate.mjs` - Taux d'annulation

**Usage**: Analyser le taux d'annulation sur 30 jours

```bash
node analyze_cancellation_rate.mjs
```

**Analyse**:

- Stats par status (cancelled, timeout, received)
- Top services/pays par taux d'annulation
- Temps moyen avant annulation
- Services 0% success
- Recommandations

**Durée**: ~10-15 secondes

---

## 🔧 Scripts de Correction

### `implement_quick_wins.mjs` - Quick wins

**Usage**: Vérifier état et générer SQL pour corrections rapides

```bash
node implement_quick_wins.mjs
```

**Génère SQL pour**:

- Désactiver services 100% échec
- Ajouter warnings sur services <30%
- Blacklister pays 0% success

---

## 📚 Documentation

### Documents d'Analyse

- **`PRODUCTION_CANCELLATION_ANALYSIS.md`**

  - Analyse détaillée taux annulation
  - Recommandations par priorité
  - Objectifs SMART

- **`FES_CORRECTION_RENT.md`**

  - Corrections système Rent
  - Flux FES (Freeze-Execute-Settle)
  - Avant/Après comparaison

- **`WALLET_ATOMIC_DEEP_ANALYSIS.md`**

  - Architecture atomic wallet proposée
  - Migration en 6 phases
  - ROI: 27,000 Ⓐ/an

- **`SESSION_SUMMARY.md`**

  - Récapitulatif session complète
  - Tous les fichiers créés
  - Checklist finale

- **`FINAL_ACTION_PLAN.md`**
  - Plan d'action immédiat
  - SQL ready-to-execute
  - Métriques de succès

### SQL

- **`create_health_views.sql`**
  - 4 vues de monitoring
  - `v_service_health`
  - `v_country_health`
  - `v_service_response_time`
  - `v_dashboard_stats`

---

## 🚀 Quick Start

### 1. Première Installation

```bash
# Créer les vues de monitoring dans Supabase SQL Editor
# Copier/coller le contenu de create_health_views.sql
```

### 2. Vérifier Installation

```bash
node verify_monitoring_views.mjs
```

### 3. Analyse Initiale

```bash
# Analyse complète du système
node deep_analysis_production.mjs

# Analyse taux annulation
node analyze_cancellation_rate.mjs
```

### 4. Quick Wins

```bash
# Générer SQL pour corrections rapides
node implement_quick_wins.mjs

# Exécuter le SQL dans Supabase
```

### 5. Monitoring Continu

```bash
# Option 1: Dashboard live
node live_dashboard.mjs

# Option 2: Rapport quotidien
node generate_daily_report.mjs
```

---

## 📈 Métriques Clés

### Success Rate

| Niveau       | Taux   | Action                |
| ------------ | ------ | --------------------- |
| 🔴 CRITICAL  | <20%   | Urgent - Vérifier API |
| 🟠 WARNING   | 20-35% | Quick wins requis     |
| 🟡 GOOD      | 35-60% | Optimisations         |
| 🟢 EXCELLENT | >60%   | Maintenir             |

### Services

- **HEALTHY**: Success rate >35%
- **WARNING**: Success rate 15-35%
- **CRITICAL**: Success rate <15%
- **INSUFFICIENT_DATA**: <3 activations

---

## 🎯 Workflow Quotidien

### Matin (9h)

```bash
# 1. Générer rapport quotidien
node generate_daily_report.mjs

# 2. Lire daily_report_YYYY-MM-DD.md

# 3. Si CRITICAL, analyser
node deep_analysis_production.mjs
```

### En cas d'incident

```bash
# 1. Dashboard live
node live_dashboard.mjs

# 2. Analyse complète
node deep_analysis_production.mjs

# 3. Quick wins si besoin
node implement_quick_wins.mjs
```

### Fin de semaine

```bash
# Analyse taux annulation
node analyze_cancellation_rate.mjs

# Réviser FINAL_ACTION_PLAN.md
```

---

## 🔐 Sécurité

### Variables d'environnement requises

```env
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Permissions

- Scripts utilisent `ANON_KEY` (read-only via RLS)
- Modifications SQL via Supabase Dashboard (admin)

---

## 📊 Vues SQL Disponibles

### `v_dashboard_stats`

Statistiques globales 24h:

- `total_activations_24h`
- `successful_24h`, `cancelled_24h`, `timeout_24h`
- `global_success_rate_pct`
- `global_health_status`

### `v_service_health`

Santé par service 24h:

- `service_code`
- `total_activations_24h`
- `successful_activations`, `cancelled_activations`, `timeout_activations`
- `success_rate_pct`
- `health_status` (CRITICAL/WARNING/HEALTHY)

### `v_country_health`

Santé par pays 24h:

- `country_code`
- `total_activations_24h`
- `successful_activations`
- `success_rate_pct`
- `health_status`

### `v_service_response_time`

Temps de réponse 7j (services avec succès):

- `service_code`
- `successful_count`
- `avg_wait_minutes`, `min_wait_minutes`, `max_wait_minutes`

---

## 🔄 Automatisation

### Cron Jobs Recommandés

```bash
# Rapport quotidien à 9h
0 9 * * * cd /path/to/project && node generate_daily_report.mjs

# Analyse complète hebdomadaire (Lundi 8h)
0 8 * * 1 cd /path/to/project && node analyze_cancellation_rate.mjs > weekly_analysis.txt

# Vérification monitoring toutes les heures
0 * * * * cd /path/to/project && node verify_monitoring_views.mjs > /dev/null
```

---

## 🆘 Troubleshooting

### Erreur "Invalid API key"

```bash
# Vérifier .env
cat .env | grep SUPABASE
```

### Erreur "relation does not exist"

```bash
# Créer les vues SQL
# Copier create_health_views.sql dans Supabase SQL Editor
```

### Pas de données dans les vues

```bash
# Normal si pas d'activations dans les 24h
# Vérifier avec:
node verify_monitoring_views.mjs
```

---

## 📞 Support

**Documentation complète**: Voir fichiers `*.md` dans ce dossier

**Quick wins**: `FINAL_ACTION_PLAN.md`

**Architecture**: `WALLET_ATOMIC_DEEP_ANALYSIS.md`

---

**Dernière mise à jour**: 30 novembre 2025
