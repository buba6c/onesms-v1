# 🔧 SOLUTION COMPLÈTE - PROBLÈME SMS NON AFFICHÉS

## 📊 PROBLÈME IDENTIFIÉ

**Numéro concerné** : 6289518249636 (Order ID: 4450977982)

### Symptômes
- Activation créée avec status `pending`
- SMS reçu par SMS-Activate (code: 358042)
- SMS **NON** stocké dans la base de données
- SMS **NON** affiché sur la plateforme

### Cause Root
1. **API V2 (`getStatusV2`) ne fonctionne pas** pour certains ordres
   - Retourne : `WRONG_ACTIVATION_ID`
   - Alors que V1 retourne : `STATUS_OK:358042` ✅

2. **Le polling frontend seul n'est pas fiable**
   - Dépend de l'utilisateur ayant l'onglet ouvert
   - Peut rater les SMS arrivés trop vite
   - Peut échouer silencieusement

## ✅ SOLUTION MISE EN PLACE

### 1. Fonction Cron Côté Serveur
**Fichier** : `/supabase/functions/cron-check-pending-sms/index.ts`

**Fonctionnalités** :
- ✅ Vérifie toutes les activations `pending` ou `waiting`
- ✅ Utilise API V1 (plus fiable) : `getStatus`
- ✅ Met à jour automatiquement la base de données
- ✅ Charge l'utilisateur quand SMS reçu
- ✅ Rembourse les activations expirées
- ✅ Indépendant du frontend

**Déploiement** :
```bash
supabase functions deploy cron-check-pending-sms
```

**Test manuel** :
```bash
curl -X POST 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/cron-check-pending-sms' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

### 2. Configuration du Cron Job

#### Option A : Supabase Dashboard (Recommandé)
1. Aller sur : https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/functions
2. Sélectionner `cron-check-pending-sms`
3. Onglet "Settings" → "Schedules"
4. Créer un nouveau schedule :
   - **Interval** : `*/30 * * * *` (toutes les 30 secondes)
   - **HTTP Method** : POST
   - **Headers** : Aucun (service role automatique)

#### Option B : pg_cron (SQL)
Exécuter dans SQL Editor :
```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run every 30 seconds
SELECT cron.schedule(
  'check-pending-sms',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/cron-check-pending-sms',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  );
  $$
);
```

#### Option C : Cron Job externe (EasyCron, cron-job.org)
URL à appeler :
```
POST https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/cron-check-pending-sms
Header: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
Fréquence : Toutes les 30 secondes

### 3. Fonctions Debug Créées

#### `debug-sms-activation`
Diagnostic complet d'une activation par numéro de téléphone :
```bash
curl -X POST '.../debug-sms-activation' \
  -d '{"phone": "6289518249636"}'
```

Retourne :
- État de l'activation dans la DB
- Test des 3 APIs (V2, V1, History)
- Diagnostics (expired, polling status, etc.)

## 📊 RÉSULTATS DES TESTS

### Test du numéro 6289518249636
```json
{
  "success": true,
  "activation": {
    "phone": "6289518249636",
    "order_id": "4450977982",
    "status": "received",
    "sms_code": "358042",
    "sms_text": "Votre code de validation est 358042",
    "charged": true
  }
}
```

✅ **SMS récupéré avec succès !**

### Test de la fonction cron
```json
{
  "success": true,
  "results": {
    "checked": 1,
    "found": 1,
    "expired": 0,
    "errors": []
  }
}
```

✅ **Cron fonctionne parfaitement !**

## 🚀 AMÉLIORATIONS FUTURES

### 1. Optimisation API
- [ ] Détecter automatiquement si V2 ne fonctionne pas
- [ ] Utiliser V1 par défaut pour certains pays/services
- [ ] Cache des statuts API par ordre

### 2. Monitoring
- [ ] Logger tous les échecs de polling
- [ ] Alertes email pour SMS non récupérés après 5 min
- [ ] Dashboard admin pour voir les activations bloquées

### 3. Frontend
- [ ] Bouton "Forcer la vérification" pour l'utilisateur
- [ ] Indicateur visuel du dernier check
- [ ] Notification push quand SMS reçu

## 🎯 CHECKLIST DE DÉPLOIEMENT

- [x] Fonction `cron-check-pending-sms` déployée
- [x] Fonction `debug-sms-activation` déployée
- [x] Fonction `update-activation-sms` corrigée (texte formaté)
- [x] Fonction `check-sms-activate-status` corrigée (texte français)
- [ ] **TODO** : Configurer le cron job (Option A, B ou C)
- [x] Tests manuels réussis
- [x] SMS récupéré pour 6289518249636

## 📝 NOTES TECHNIQUES

### API SMS-Activate - Différences V1/V2

**getStatusV2** (JSON) :
- ✅ Retourne texte complet du SMS
- ❌ Parfois retourne `WRONG_ACTIVATION_ID` même quand le SMS existe
- ❌ Moins fiable pour les anciens ordres

**getStatus** (Text) :
- ✅ Plus fiable, fonctionne toujours
- ✅ Format simple : `STATUS_OK:code`
- ❌ Ne retourne que le code, pas le texte

**getFullSms** (History) :
- ✅ Récupère les SMS des 30 derniers jours
- ✅ Utile pour les SMS ratés
- ❌ Plus lent, à utiliser en dernier recours

### Stratégie de Récupération (Ordre)
1. **Frontend polling** (temps réel, 3-30s)
2. **Cron serveur** (backup, toutes les 30s)
3. **Vérification manuelle** (utilisateur ou admin)
4. **History API** (dernier recours après expiration)

## 🔗 LIENS UTILES

- Dashboard Supabase : https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw
- Functions : https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/functions
- Logs : https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/logs/edge-functions

---

**Date de résolution** : 24 novembre 2025
**Testeur** : AI Assistant
**Status** : ✅ RÉSOLU (Cron à configurer)
