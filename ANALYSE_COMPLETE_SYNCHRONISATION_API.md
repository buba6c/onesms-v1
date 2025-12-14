# 🎯 ANALYSE APPROFONDIE COMPLÈTE - SYNCHRONISATION SMS-ACTIVATE

> **Date:** 26 novembre 2025  
> **Objectif:** Comprendre EXACTEMENT ce qui doit être synchronisé et COMMENT le faire

---

## 📚 TABLE DES MATIÈRES

1. [APIs SMS-Activate disponibles](#apis-disponibles)
2. [Ce qui DOIT être synchronisé](#ce-qui-doit-etre-synchronise)
3. [Comment synchroniser CORRECTEMENT](#comment-synchroniser)
4. [Problèmes dans l'implémentation actuelle](#problemes-actuels)
5. [Solution optimale recommandée](#solution-optimale)

---

## 1️⃣ APIs SMS-ACTIVATE DISPONIBLES {#apis-disponibles}

### 📊 APIs de DONNÉES (pour synchronisation)

| API                              | Endpoint                                         | Fréquence  | Objectif                | Format réponse                                    |
| -------------------------------- | ------------------------------------------------ | ---------- | ----------------------- | ------------------------------------------------- |
| **getCountries**                 | `action=getCountries`                            | 1x/jour    | Liste tous les pays     | `{"0": {"rus":"Россия", "eng":"Russia", ...}}`    |
| **getServicesList**              | `action=getServicesList`                         | 1x/jour    | Liste tous les services | `{"services": [{"code":"wa","name":"WhatsApp"}]}` |
| **getPrices**                    | `action=getPrices&country=X`                     | Temps réel | Prix + stocks par pays  | `{"187": {"wa": {"cost":"0.50","count":100}}}`    |
| **getNumbersStatus**             | `action=getNumbersStatus&country=X`              | Temps réel | Stocks uniquement       | `{"wa":90,"tg":158,"fb":107}`                     |
| **getTopCountriesByServiceRank** | `action=getTopCountriesByServiceRank&service=wa` | Temps réel | TOP pays par service    | `[{"country":187,"count":43575,"price":15.00}]`   |

### 🔥 APIs TEMPS RÉEL (pour activations)

| API                      | Usage                      | Quand l'appeler       |
| ------------------------ | -------------------------- | --------------------- |
| **getNumber**            | Acheter un numéro          | À l'achat utilisateur |
| **getStatus**            | Vérifier si SMS reçu       | Polling 10-30s        |
| **getStatusV2**          | Idem + détails JSON        | Polling 10-30s        |
| **getActiveActivations** | Toutes activations actives | Polling 60s           |
| **setStatus**            | Annuler/Finir activation   | Action utilisateur    |

### 📈 APIs STATISTIQUES (optionnelles)

| API              | Usage               |
| ---------------- | ------------------- |
| **getBalance**   | Solde compte        |
| **getHistory**   | Historique achats   |
| **getOperators** | Opérateurs par pays |

---

## 2️⃣ CE QUI DOIT ÊTRE SYNCHRONISÉ {#ce-qui-doit-etre-synchronise}

### ✅ DONNÉES STATIQUES (sync 1x/jour ou moins)

#### A. **PAYS** (`countries` table)

**Source API:** `getCountries`

**Réponse:**

```json
{
  "0": {
    "rus": "Россия",
    "eng": "Russia",
    "chn": "俄罗斯",
    "visible": 1,
    "retry": 1,
    "rent": 1,
    "multiService": 1
  },
  "187": {
    "eng": "United States",
    "rus": "США",
    ...
  }
}
```

**Mapping vers DB:**

```typescript
countries {
  code: 'usa',              // → Votre mapping (187 → 'usa')
  name: 'United States',    // → data[187].eng
  active: true,             // → data[187].visible === 1
  provider: 'sms-activate',
  // Stats à remplir avec getPrices
  total_services_available: 0,
  total_numbers_available: 0
}
```

**Fréquence:** 1x par jour suffit (pays changent rarement)

---

#### B. **SERVICES** (`services` table)

**Source API:** `getServicesList` + `getPrices`

**Réponse getServicesList:**

```json
{
  "status": "success",
  "services": [
    { "code": "wa", "name": "WhatsApp" },
    { "code": "tg", "name": "Telegram" },
    { "code": "go", "name": "Google" }
  ]
}
```

**Mapping vers DB:**

```typescript
services {
  code: 'wa',                    // → API code
  name: 'WhatsApp',              // → API name
  display_name: 'WhatsApp',      // → Votre nom
  category: 'messenger',         // → Votre catégorie (pas dans API)
  icon: '💬',                    // → Votre icône (pas dans API)
  active: true,
  popularity_score: 100,         // → Votre ordre (pas dans API)
  total_available: 0             // → À calculer depuis pricing_rules
}
```

**⚠️ IMPORTANT:** API ne fournit PAS:

- Icons/emojis
- Catégories
- Ordre de popularité

**Solution:** Mapper manuellement (comme vous faites actuellement)

**Fréquence:** 1x par jour suffit (nouveaux services rares)

---

### 🔄 DONNÉES DYNAMIQUES (sync temps réel)

#### C. **PRICING_RULES** (`pricing_rules` table)

**Source API:** `getPrices`

**⚠️ CRUCIAL:** C'est LA source de vérité pour:

- Prix actuels
- Stocks disponibles (available_count)
- Quels pays ont quels services

**Call API:**

```
GET /stubs/handler_api.php?api_key=XXX&action=getPrices&country=187
```

**Réponse getPrices:**

```json
{
  "187": {
    "wa": {
      "cost": "0.50", // Prix retail
      "count": 12345, // Numéros disponibles
      "physicalCount": 100 // Numéros physiques
    },
    "tg": {
      "cost": "0.75",
      "count": 8900
    }
  }
}
```

**Mapping vers DB:**

```typescript
pricing_rules {
  service_code: 'wa',
  country_code: 'usa',          // Mapper 187 → 'usa'
  provider: 'sms-activate',
  operator: 'any',
  activation_cost: 0.40,        // cost * 0.8 (20% marge)
  activation_price: 0.50,       // cost retail
  available_count: 12345,       // count ← SOURCE DE VÉRITÉ!
  active: true,
  last_synced_at: '2025-11-26...'
}
```

**⚠️ APRÈS insertion pricing_rules:**

```sql
-- OBLIGATOIRE: Calculer services.total_available
SELECT calculate_service_totals();

-- Cette fonction SQL fait:
UPDATE services s
SET total_available = (
  SELECT COALESCE(SUM(pr.available_count), 0)
  FROM pricing_rules pr
  WHERE pr.service_code = s.code
    AND pr.active = true
)
```

**Fréquence:**

- **Production:** Toutes les 10-15 minutes
- **Développement:** Toutes les 30 minutes
- **Après chaque achat utilisateur:** Recalculer juste ce service

---

#### D. **PAYS TOP PAR SERVICE** (optionnel mais recommandé)

**Source API:** `getTopCountriesByServiceRank`

**Usage:** Afficher les meilleurs pays pour un service donné

**Call API:**

```
GET /stubs/handler_api.php?api_key=XXX&action=getTopCountriesByServiceRank&service=wa
```

**Réponse:**

```json
[
  {
    "country": 187, // USA
    "count": 43575, // Numéros disponibles
    "price": 0.5, // Prix
    "retail_price": 0.5
  },
  {
    "country": 4, // Philippines
    "count": 38000,
    "price": 0.3
  }
]
```

**Utilisation frontend:**

```typescript
// DashboardPage.tsx
const topCountries = await fetch(
  `${SUPABASE_URL}/functions/v1/get-top-countries-by-service`,
  { body: { service: "wa" } }
);

// Afficher les pays triés par:
// 1. Nombre disponible (count)
// 2. Taux de succès (success_rate)
// 3. Prix
```

**Fréquence:** Temps réel (à chaque sélection de service)

---

### 📞 DONNÉES UTILISATEUR (activations)

#### E. **ACTIVATIONS** (`activations` table)

**Sources API:**

1. **Achat:** `getNumber` → Créer activation
2. **Polling:** `getStatus` / `getStatusV2` → Update activation
3. **Sync global:** `getActiveActivations` → Sync toutes

**Flow complet:**

```typescript
// 1. ACHAT
const response = await fetch(
  `${SMS_ACTIVATE_BASE_URL}?action=getNumber&service=wa&country=187`
)
// → "ACCESS_NUMBER:635468024:79584123456"

await supabase.from('activations').insert({
  order_id: '635468024',       // ID SMS-Activate
  phone: '79584123456',
  service_code: 'wa',
  country_code: 'usa',
  status: 'pending',
  provider: 'sms-activate'
})

// 2. POLLING (toutes les 10-30s)
const statusResponse = await fetch(
  `${SMS_ACTIVATE_BASE_URL}?action=getStatusV2&id=635468024`
)

// Réponse quand SMS reçu:
{
  "verificationType": 0,  // 0=SMS, 1=call, 2=voice
  "sms": {
    "code": "123456",
    "text": "Your WhatsApp code is 123456",
    "dateTime": "2025-11-26 10:30:00"
  }
}

// → Update DB
await supabase.from('activations').update({
  status: 'received',
  sms_code: '123456',
  sms_text: 'Your WhatsApp code is 123456',
  received_at: '2025-11-26 10:30:00'
}).eq('order_id', '635468024')

// 3. SYNC GLOBAL (toutes les 60s)
const activeResponse = await fetch(
  `${SMS_ACTIVATE_BASE_URL}?action=getActiveActivations`
)

// Réponse:
{
  "status": "success",
  "activeActivations": [
    {
      "activationId": "635468024",
      "phoneNumber": "79584123456",
      "smsCode": ["123456"],
      "smsText": ["Your WhatsApp code is 123456"],
      "activationStatus": "4"  // 4=SMS reçu
    }
  ]
}

// → Sync toutes les activations d'un coup
```

**Fréquence:**

- **Polling individuel:** 10-30s par activation active
- **Sync global:** 60s pour toutes activations
- **Webhook (optionnel):** Instantané

---

## 3️⃣ COMMENT SYNCHRONISER CORRECTEMENT {#comment-synchroniser}

### 🏗️ ARCHITECTURE RECOMMANDÉE

```
┌─────────────────────────────────────────────────────────┐
│                SYNCHRONISATION SMS-ACTIVATE             │
└─────────────────────────────────────────────────────────┘

                              │
                              ↓

┌─────────────────┬─────────────────┬─────────────────────┐
│   SYNC DAILY    │  SYNC FREQUENT  │   SYNC REALTIME     │
│   (1x/jour)     │  (10-30 min)    │   (10-60s)          │
└─────────────────┴─────────────────┴─────────────────────┘
         │                  │                    │
         ↓                  ↓                    ↓

  getCountries      getPrices           getStatus
  getServicesList   (tous pays)         getActiveActivations
         │                  │                    │
         ↓                  ↓                    ↓

    countries         pricing_rules        activations
    services          (update)              (update status/sms)
    (insert once)          │
                           ↓
                  calculate_service_totals()
                           │
                           ↓
                   services.total_available
```

---

### 📝 IMPLÉMENTATION CORRECTE

#### A. **SYNC QUOTIDIEN** (Edge Function: `sync-static-data`)

```typescript
// supabase/functions/sync-static-data/index.ts

serve(async (req) => {
  // 1. SYNC COUNTRIES
  const countriesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${API_KEY}&action=getCountries`;
  const countriesData = await fetch(countriesUrl).then((r) => r.json());

  for (const [id, info] of Object.entries(countriesData)) {
    await supabase.from("countries").upsert(
      {
        code: COUNTRY_MAPPING[id] || `country_${id}`,
        name: info.eng,
        active: info.visible === 1,
        provider: "sms-activate",
      },
      { onConflict: "code" }
    );
  }

  // 2. SYNC SERVICES
  const servicesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${API_KEY}&action=getServicesList`;
  const servicesData = await fetch(servicesUrl).then((r) => r.json());

  for (const service of servicesData.services) {
    await supabase.from("services").upsert(
      {
        code: service.code,
        name: service.name,
        display_name: service.name,
        // Ajouter icons/categories manuellement
        icon: SERVICE_ICONS[service.code] || "📱",
        category: SERVICE_CATEGORIES[service.code] || "other",
        active: true,
      },
      { onConflict: "code" }
    );
  }

  return new Response(JSON.stringify({ success: true }));
});
```

**Cron:** `0 2 * * *` (2h du matin)

---

#### B. **SYNC FRÉQUENT** (Edge Function: `sync-prices-and-stocks`)

```typescript
// supabase/functions/sync-prices-and-stocks/index.ts

serve(async (req) => {
  // PAYS À SCANNER (TOP 50 minimum)
  const topCountries = [
    187,
    4,
    6,
    21,
    12, // Top 5: USA, Philippines, Indonesia, India, UK
    0,
    36,
    78,
    43,
    52, // Top 10
    61,
    72,
    51,
    10,
    94, // Top 15
    // ... jusqu'à 50
  ];

  const pricingRules = [];

  for (const countryId of topCountries) {
    // CALL API getPrices
    const pricesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${API_KEY}&action=getPrices&country=${countryId}`;
    const pricesData = await fetch(pricesUrl).then((r) => r.json());

    // FORMAT RÉPONSE:
    // { "187": { "wa": {"cost":"0.50","count":12345}, "tg": {...} } }

    const countryData = pricesData[countryId.toString()];
    if (!countryData) continue;

    for (const [serviceCode, priceInfo] of Object.entries(countryData)) {
      const cost = parseFloat(priceInfo.cost || 0);
      const count = parseInt(priceInfo.count || 0, 10);

      if (cost > 0 && count > 0) {
        pricingRules.push({
          service_code: serviceCode,
          country_code: COUNTRY_MAPPING[countryId],
          provider: "sms-activate",
          operator: "any",
          activation_cost: cost * 0.8, // 20% marge
          activation_price: cost,
          available_count: count, // ← SOURCE DE VÉRITÉ
          active: true,
          last_synced_at: new Date().toISOString(),
        });
      }
    }
  }

  // DELETE + INSERT en batch
  await supabase.from("pricing_rules").delete().eq("provider", "sms-activate");

  // Insert par batch de 100
  for (let i = 0; i < pricingRules.length; i += 100) {
    const batch = pricingRules.slice(i, i + 100);
    await supabase.from("pricing_rules").insert(batch);
  }

  // ⚠️ CRUCIAL: CALCULER services.total_available
  await supabase.rpc("calculate_service_totals");

  return new Response(
    JSON.stringify({
      success: true,
      pricing_rules: pricingRules.length,
      countries: topCountries.length,
    })
  );
});
```

**Cron:**

- `*/15 * * * *` (Production: toutes les 15 min)
- `*/30 * * * *` (Dev: toutes les 30 min)

---

#### C. **SYNC REALTIME** (Edge Function: `sync-active-activations`)

```typescript
// supabase/functions/sync-active-activations/index.ts

serve(async (req) => {
  // CALL API getActiveActivations
  const activeUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${API_KEY}&action=getActiveActivations`;
  const response = await fetch(activeUrl);
  const data = await response.json();

  if (data.status !== "success") {
    throw new Error("Failed to get active activations");
  }

  let updated = 0;

  for (const activation of data.activeActivations) {
    const orderId = activation.activationId;
    const smsCode = Array.isArray(activation.smsCode)
      ? activation.smsCode[0]
      : activation.smsCode;
    const smsText = Array.isArray(activation.smsText)
      ? activation.smsText[0]
      : activation.smsText;

    // Trouver activation dans DB
    const { data: dbActivation } = await supabase
      .from("activations")
      .select("*")
      .eq("order_id", orderId)
      .single();

    if (!dbActivation) continue;

    // Si SMS reçu, update
    if (smsCode && dbActivation.status !== "received") {
      await supabase
        .from("activations")
        .update({
          status: "received",
          sms_code: smsCode,
          sms_text: smsText,
          received_at: new Date().toISOString(),
        })
        .eq("order_id", orderId);

      updated++;
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      synced: data.activeActivations.length,
      updated,
    })
  );
});
```

**Cron:** `* * * * *` (toutes les 60s)

**Alternative:** Webhook (instantané, mais complexe à setup)

---

## 4️⃣ PROBLÈMES DANS L'IMPLÉMENTATION ACTUELLE {#problemes-actuels}

### ❌ Problème #1: Utilisation de `getNumbersStatus` au lieu de `getPrices`

**Code actuel (sync-service-counts):**

```typescript
// ❌ FAUX
const url = `${BASE_URL}?action=getNumbersStatus&country=${countryId}`;
const response = await fetch(url);
const data = await response.json();
// → { "wa": "90", "tg": "158" }  (SEULEMENT counts, PAS de prix!)
```

**Problème:**

- `getNumbersStatus` retourne SEULEMENT les counts
- Pas de prix (cost)
- Pas d'info opérateurs
- Format plus simple mais incomplet

**Solution:**

```typescript
// ✅ CORRECT
const url = `${BASE_URL}?action=getPrices&country=${countryId}`;
const response = await fetch(url);
const data = await response.json();
// → { "187": { "wa": {"cost":"0.50","count":90}, ... } }  (COMPLET!)
```

---

### ❌ Problème #2: Ne calcule PAS `services.total_available`

**Code actuel (sync-service-counts):**

```typescript
// Met à jour services.total_available manuellement
await supabase.from("services").update({
  total_available: totalCounts[serviceCode],
});

// ❌ Ne call PAS calculate_service_totals()
```

**Problème:**

- Met à jour SEULEMENT depuis 5 pays
- Ne synchronise PAS avec pricing_rules
- Écrase les calculs de sync-sms-activate

**Solution:**

```typescript
// ✅ CORRECT
// 1. Update pricing_rules FIRST
await supabase.from("pricing_rules").upsert(pricingRules);

// 2. THEN call SQL function
await supabase.rpc("calculate_service_totals");

// Cette fonction calcule depuis TOUS les pricing_rules actifs
```

---

### ❌ Problème #3: Coverage insuffisant (5-20 pays sur 200)

**Code actuel:**

```typescript
// sync-service-counts: 5 pays
const topCountries = [187, 4, 6, 22, 12]

// sync-countries: 20 pays
const topCountryIds = [187, 4, 6, 22, 12, ...]

// sync-sms-activate: 9 pays
const topCountries = [187, 4, 6, 22, 0, 12, 36, 78, 43]
```

**Problème:**

- 90-95% des pays jamais synchronisés
- Utilisateurs ne peuvent pas acheter de ces pays
- Stats biaisées

**Solution:**

```typescript
// ✅ CORRECT: TOP 50 minimum
const topCountries = [
  // Tier 1: TOP 10
  187, 4, 6, 21, 12, 0, 36, 78, 43, 52,
  // Tier 2: TOP 20
  61, 72, 51, 10, 94, 15, 73, 32, 33, 39,
  // Tier 3: TOP 30
  58, 56, 42, 82, 175, 22, 7, 1, 2, 3,
  // Tier 4: TOP 40
  // ...
  // Tier 5: TOP 50
  // ...
];
```

---

### ❌ Problème #4: Mapping country IDs incorrect

**Code actuel (sync-countries):**

```typescript
const COUNTRY_MAPPING = {
  12: { code: "usa", name: "United States" }, // ❌ FAUX!
  187: { code: "usa", name: "United States" }, // ✅ OK
  22: { code: "ireland", name: "Ireland" }, // ❌ FAUX!
};
```

**Selon API SMS-Activate:**

- ID 12 = **England** (UK)
- ID 187 = **USA**
- ID 21 = **India**
- ID 22 = **Ireland**

**Solution:**

```typescript
// ✅ CORRECT
const COUNTRY_MAPPING = {
  12: { code: "england", name: "United Kingdom" },
  187: { code: "usa", name: "United States" },
  21: { code: "india", name: "India" },
  22: { code: "ireland", name: "Ireland" },
};
```

---

### ❌ Problème #5: Redondance sync-service-counts vs sync-sms-activate

**Problème:**

- sync-sms-activate fait TOUT (countries, services, pricing_rules, totals)
- sync-service-counts refait calcul partiel 15 min plus tard
- ÉCRASE les totaux corrects!

**Solution:** SUPPRIMER sync-service-counts complètement

---

## 5️⃣ SOLUTION OPTIMALE RECOMMANDÉE {#solution-optimale}

### 🎯 NOUVELLE ARCHITECTURE

```
┌───────────────────────────────────────────────────────────┐
│              SYNCHRONISATION SMS-ACTIVATE                 │
└───────────────────────────────────────────────────────────┘

1. sync-static-data (1x/jour - 2h)
   ↓
   - getCountries → countries
   - getServicesList → services

2. sync-prices-stocks (15-30 min)
   ↓
   - getPrices (50 pays) → pricing_rules
   - calculate_service_totals() → services.total_available

3. sync-active-activations (60s)
   ↓
   - getActiveActivations → activations (update SMS)

4. Frontend polling (10-30s per activation)
   ↓
   - getStatusV2 → activations (update SMS individuel)
```

### 📋 FICHIERS À CRÉER/MODIFIER

#### 1. Créer: `sync-static-data`

```bash
supabase functions new sync-static-data
```

#### 2. Modifier: `sync-sms-activate` → `sync-prices-stocks`

```bash
# Renommer et simplifier
mv supabase/functions/sync-sms-activate \
   supabase/functions/sync-prices-stocks
```

#### 3. Garder: `sync-active-activations`

```bash
# Déjà existe, juste vérifier qu'il tourne
```

#### 4. Supprimer: `sync-service-counts` et `sync-countries`

```bash
# Redondants avec les nouveaux
rm -rf supabase/functions/sync-service-counts
rm -rf supabase/functions/sync-countries
```

### ⏰ CRON JOBS

```yaml
# .github/workflows/sync-static-data.yml
on:
  schedule:
    - cron: '0 2 * * *'  # 2h du matin

# .github/workflows/sync-prices-stocks.yml
on:
  schedule:
    - cron: '*/15 * * * *'  # Toutes les 15 min

# .github/workflows/sync-activations.yml
on:
  schedule:
    - cron: '* * * * *'  # Toutes les 60s
```

### 🎨 FRONTEND

**Pas de changement nécessaire!**

- Les données viennent toujours de la DB
- React Query refresh automatiquement
- Polling activations continue

---

## ✅ CHECKLIST DE MIGRATION

### Phase 1: URGENT

- [ ] Désactiver `sync-service-counts` (cause conflits)
- [ ] Corriger COUNTRY_MAPPING dans tous les fichiers
- [ ] Augmenter coverage (5 → 50 pays)

### Phase 2: IMPORTANT

- [ ] Créer `sync-static-data` (countries + services)
- [ ] Simplifier `sync-sms-activate` en `sync-prices-stocks`
- [ ] Vérifier `sync-active-activations` tourne bien

### Phase 3: CLEANUP

- [ ] Supprimer `sync-countries` (redondant)
- [ ] Mettre à jour workflows GitHub
- [ ] Documenter nouvelle architecture

### Phase 4: MONITORING

- [ ] Logs dans sync_logs table
- [ ] Alertes si sync échoue
- [ ] Dashboard admin pour voir status

---

## 🚀 COMMANDES POUR DÉPLOYER

```bash
# 1. Désactiver sync qui causent problèmes
mv .github/workflows/sync-service-counts.yml \
   .github/workflows/sync-service-counts.yml.DISABLED

# 2. Corriger mapping pays dans sync-sms-activate
# (Éditer manuellement lines 35-48)

# 3. Augmenter coverage pays
# (Éditer ligne 89: ajouter 50 pays)

# 4. Déployer
supabase functions deploy sync-sms-activate
git add .
git commit -m "fix: correct country mapping and increase coverage"
git push

# 5. Tester
curl -X POST 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sync-sms-activate' \
  -H "Authorization: Bearer YOUR_KEY"
```

---

## 📊 RÉSULTAT ATTENDU

**Avant:**

- ❌ Counts oscillent toutes les 15 min
- ❌ 5 pays seulement synchronisés
- ❌ Mapping pays incorrect
- ❌ Services invisible (total_available=0)

**Après:**

- ✅ Données cohérentes et stables
- ✅ 50 pays synchronisés
- ✅ Mapping correct
- ✅ Services visibles avec vrais totaux

---

**PRÊT À IMPLÉMENTER?** 🚀
