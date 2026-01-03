# 📱 Brief Technique : Activation vs Rent

## 🎯 Vue d'Ensemble

Votre plateforme ONE SMS propose **2 systèmes distincts** pour obtenir des numéros de téléphone virtuels :

| Type | Usage | Durée | Prix | Cas d'usage |
|------|-------|-------|------|-------------|
| **Activation** | Recevoir 1 SMS unique | 10-20 min | 0.50-2 Ⓐ | Inscription rapide (WhatsApp, TikTok, Google) |
| **Rent (Location)** | Recevoir SMS multiples | 4h-30 jours | 2-50 Ⓐ | Compte permanent, 2FA récurrent, Tests |

---

## 📞 Système 1: Activation (Numéro Temporaire)

### Concept
- **Objectif :** Recevoir **UN SEUL SMS** pour vérifier un compte
- **Durée de vie :** 10-20 minutes en moyenne
- **Providers :** 5sim, SMS-Activate, HeroSMS, SMSPVA, OnlineSIM, **Grizzly SMS**, **TextVerified**

### Flux Technique

```
1. User sélectionne service (WhatsApp) + pays (USA)
2. Frontend → Edge Function `buy-number-intelligent`
3. Routing intelligent (priorité provider)
4. Provider sélectionné → Edge Function `buy-{provider}-number`
5. API Call Provider → Numéro activé
6. Balance frozen (atomic)
7. Activation créée (table `activations`)
8. Status check périodique → `check-{provider}-status`
9. SMS reçu → User notifié + Balance charged (atomic)
10. Activation terminée
```

### Tables DB

#### `activations`
```sql
- id (uuid)
- user_id (uuid)
- order_id (text) -- ID chez le provider
- phone (text)
- service_code (text) -- 'wa', 'tg', 'go'
- country_code (text) -- 'usa', 'russia'
- price (numeric)
- frozen_amount (numeric)
- status (text) -- 'pending', 'waiting', 'received', 'cancelled', 'failed'
- sms_code (text)
- sms_text (text)
- charged (boolean)
- provider (text) -- '5sim', 'grizzly', 'textverified'
- expires_at (timestamp)
- created_at (timestamp)
```

### États (`status`)
- **`pending`** : Numéro acheté, en attente du SMS
- **`waiting`** : Provider confirme attente du code
- **`received`** : ✅ SMS reçu, code extrait
- **`cancelled`** : ❌ Annulé (timeout, erreur provider)
- **`failed`** : ❌ Échec API
- **`orphaned`** : ⚠️ Acheté mais DB save failed (auto-refund)

### Logique de Refund Atomique

```typescript
// API Fail → Rollback complet
const { data: failedActivation } = await supabase
  .from('activations')
  .insert({
    status: 'failed',
    frozen_amount: price,
    ...
  }).select().single()

await supabase.rpc('atomic_refund', {
  p_activation_id: failedActivation.id
})
// → Unfreeze, Update balance_operations, Update provider_performance
```

### Providers Spécialisés

#### **Grizzly SMS** (Général)
- **Prix :** 0.50-1.50 Ⓐ
- **Fiabilité :** 90%
- **Cas d'usage :** Général, remplace 5sim

#### **TextVerified** (Premium USA/UK)
- **Prix :** 1-2.5 Ⓐ
- **Fiabilité :** 95%
- **Spécialité :** Non-VoIP USA/UK pour WhatsApp/TikTok
- **Routing :** Prioritaire si `country=USA/UK AND service=WhatsApp/TikTok`

---

## 🏠 Système 2: Rent (Location Longue Durée)

### Concept
- **Objectif :** Numéro **persistant** pour recevoir **SMS multiples**
- **Durée de vie :** 4 heures à 30 jours
- **Providers :** SMS-Activate (rent), OnlineSIM (rent)

### Flux Technique

```
1. User sélectionne service + pays + durée (4h-30 jours)
2. Frontend → Edge Function `rent-number-intelligent`
3. Provider routing (SMS-Activate ou OnlineSIM)
4. Edge Function `buy-{provider}-rent`
5. API Call Provider → Location activée
6. Balance frozen (atomic via secure_freeze_balance)
7. Rental créé (table `rentals`)
8. Cron job `check-{provider}-rent-status` (polling)
9. SMS multiples reçus → message_count++
10. Expiration → Rental terminé + Balance charged
```

### Tables DB

#### `rentals`
```sql
- id (uuid)
- user_id (uuid)
- rental_id (text) -- ID chez le provider
- rent_id (text) -- Alias pour OnlineSIM
- phone (text)
- service_code (text)
- country_code (text)
- operator (text)
- total_cost (numeric)
- hourly_rate (numeric)
- status (text) -- 'active', 'expired', 'cancelled'
- end_date (timestamp)
- expires_at (timestamp)
- rent_hours (integer)
- duration_hours (integer)
- provider (text) -- 'sms-activate', 'onlinesim'
- message_count (integer) -- Nombre de SMS reçus
- frozen_amount (numeric)
- created_at (timestamp)
```

### États (`status`)
- **`active`** : Location en cours, numéro disponible
- **`expired`** : ⏳ Location terminée (naturellement)
- **`cancelled`** : ❌ Annulée par user ou erreur

### Différences Techniques avec Activation

| Aspect | Activation | Rent |
|--------|-----------|------|
| **Durée** | 10-20 min | 4h-30 jours |
| **SMS** | 1 seul | Illimité pendant durée |
| **Balance Freeze** | `frozen_amount` dans `activations` | `secure_freeze_balance()` RPC |
| **Charge Balance** | Quand SMS reçu | Quand location expire |
| **Status Check** | Polling 5-10s | Cron job toutes les 5 min |
| **Refund** | Si cancelled/timeout | Si erreur avant reception |

### Conversion Hours/Days (OnlineSIM)

OnlineSIM API utilise **days** au lieu de **hours** :

```typescript
const HOURS_TO_DAYS = {
  4: 1,      // 4 heures → 1 jour (minimum)
  24: 1,     // 1 jour
  48: 2,     // 2 jours
  72: 3,     // 3 jours
  168: 7,    // 1 semaine
  720: 30,   // 1 mois
}
```

---

## 🔄 Logique de Routing Intelligent

### Activation (`buy-number-intelligent`)

```typescript
// 1. Premium Routing (TextVerified priority)
if (service === 'WhatsApp/TikTok' && country === 'USA/UK') {
  try TextVerified
  fallback to Grizzly → 5sim → others
}

// 2. General Routing
Priority: [grizzly, herosms, 5sim, smspva, onlinesim]
Each provider checked for availability before purchase
```

### Rent (`rent-number-intelligent`)

```typescript
// Priority: SMS-Activate → OnlineSIM
if (SMS-Activate has stock) {
  use SMS-Activate
} else {
  fallback to OnlineSIM
}
```

---

## 💰 Gestion Financière Atomique

### Freeze (Réservation d'argent)

```sql
-- Méthode: secure_freeze_balance (RPC)
1. Vérifier balance disponible
2. Freeze amount dans users.frozen_balance
3. Créer balance_operations (freeze)
4. Lier à activation/rental
```

### Charge (Débit final)

```sql
-- Méthode: atomic_complete_activation (RPC)
1. Déduire de balance
2. Unfreeze frozen_balance
3. Créer balance_operations (charge)
4. Update transaction status → 'completed'
5. Update provider_performance (success++)
```

### Refund (Remboursement)

```sql
-- Méthode: atomic_refund (RPC)
1. Unfreeze frozen_balance
2. Créer balance_operations (refund)
3. Update transaction status → 'refunded'
4. Update provider_performance (failures++)
```

---

## 📊 Comparaison Finale

| Critère | Activation | Rent |
|---------|-----------|------|
| **Prix moyen** | 0.50-2 Ⓐ | 5-50 Ⓐ |
| **Durée** | 10-20 min | 4h-30 jours |
| **SMS** | 1 seul | Illimité |
| **Providers** | 7 (dont TextVerified) | 2 (SMS-Activate, OnlineSIM) |
| **Use Case** | Vérification rapide | Compte permanent |
| **Refund** | Si timeout (10-20 min) | Si erreur avant réception |
| **Status Check** | Polling rapide (5-10s) | Cron job (5 min) |
| **Tables DB** | `activations` | `rentals` |

---

## 🚀 Edge Functions Clés

### Activation
- `buy-number-intelligent` → Routing
- `buy-grizzly-number` → Grizzly purchase
- `buy-textverified-number` → TextVerified purchase
- `buy-5sim-number` → 5sim purchase
- `check-grizzly-status` → Polling Grizzly
- `check-textverified-status` → Polling TextVerified
- `check-5sim-status` → Polling 5sim

### Rent
- `rent-number-intelligent` → Routing
- `buy-sms-activate-rent` → SMS-Activate rent
- `buy-onlinesim-rent` → OnlineSIM rent
- `check-onlinesim-rent-status` → Polling OnlineSIM (cron)

---

## ✅ Résumé Exécutif

**Activation** = Numéro jetable, 1 SMS, 10-20 min, cheap, use case: inscription rapide

**Rent** = Numéro persistant, SMS multiples, 4h-30 jours, expensive, use case: compte permanent

Les deux systèmes partagent la même **logique financière atomique** (`secure_freeze_balance`, `atomic_refund`, `atomic_complete_activation`) pour garantir la cohérence.
