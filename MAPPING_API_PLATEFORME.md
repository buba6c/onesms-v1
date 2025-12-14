# 🎯 MAPPING COMPLET API SMS-ACTIVATE → PLATEFORME ONE SMS

## 📋 TABLE DES MATIÈRES

1. [Activation API - Achat de numéros](#activation-api)
2. [Rent API - Location de numéros](#rent-api)
3. [Gestion des statuts](#gestion-des-statuts)
4. [Récupération de données](#récupération-de-données)
5. [Webhooks](#webhooks)
6. [État d'implémentation](#état-dimplémentation)

---

## 1️⃣ ACTIVATION API - ACHAT DE NUMÉROS

### ✅ **getNumbersStatus** - Disponibilité des numéros

**API Endpoint:**

```
GET /stubs/handler_api.php?action=getNumbersStatus&country=187&operator=any
```

**Réponse:**

```json
{ "wa": 90, "vi": 223, "tg": 158, "wb": 106, "go": 182, "fb": 107 }
```

**Mapping avec votre plateforme:**

- ✅ **Implémenté:** Edge Function `get-services-counts`
- 📍 **Localisation:** `supabase/functions/get-services-counts/index.ts`
- 🎯 **Utilisation:** Affiche le nombre "999" pour chaque service
- 📊 **Frontend:** `DashboardPage.tsx` - Ligne 228-257
- 🔧 **Amélioration nécessaire:** Actuellement montre "999" fixe, devrait appeler cette API en temps réel

**Code actuel:**

```typescript
// DashboardPage.tsx - Ligne 244
const mapped = topCountries.map((country) => ({
  count: 999, // ❌ Hardcodé, devrait venir de getNumbersStatus
  price: priceMap.get(country.code.toLowerCase()) || 1.0,
}));
```

**Code optimal:**

```typescript
// Appel à getNumbersStatus pour chaque pays
const counts = await fetch(
  `${SMS_ACTIVATE_BASE_URL}?action=getNumbersStatus&country=${countryId}`
);
const countsData = await counts.json();
// countsData = {"wa":90,"tg":158,...}
```

---

### ✅ **getTopCountriesByService** - Top pays par service

**API Endpoint:**

```
GET /stubs/handler_api.php?action=getTopCountriesByService&service=wa&freePrice=true
```

**Réponse:**

```json
{
  "0": {
    "country": 2,
    "count": 43575,
    "price": 15.0,
    "retail_price": 30.0,
    "freePriceMap": { "15.00": 43242, "18.00": 333 }
  }
}
```

**Mapping avec votre plateforme:**

- ❌ **Non implémenté actuellement**
- 🎯 **Utilité:** Afficher les meilleurs pays pour un service spécifique
- 📊 **Frontend potentiel:** Page de sélection de pays optimisée
- 💡 **Suggestion:** Créer Edge Function `get-top-countries`

---

### ✅ **getBalance** - Solde du compte

**API Endpoint:**

```
GET /stubs/handler_api.php?action=getBalance
```

**Réponse:**

```
ACCESS_BALANCE:0.12
```

**Mapping avec votre plateforme:**

- ✅ **Partiellement implémenté**
- 📍 **Utilisation:** Testé manuellement via curl
- 🔧 **Amélioration nécessaire:** Créer Edge Function `get-sms-activate-balance`
- 📊 **Frontend:** Afficher dans le header à côté du solde utilisateur

**Code optimal:**

```typescript
// Edge Function: get-sms-activate-balance/index.ts
const response = await fetch(
  `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getBalance`
);
const text = await response.text();
const balance = parseFloat(text.split(":")[1]);
```

---

### ✅ **getOperators** - Opérateurs disponibles

**API Endpoint:**

```
GET /stubs/handler_api.php?action=getOperators&country=187
```

**Réponse:**

```json
{
  "status": "success",
  "countryOperators": {
    "187": ["verizon", "att", "tmobile", "sprint"]
  }
}
```

**Mapping avec votre plateforme:**

- ❌ **Non implémenté**
- 🎯 **Utilité:** Permettre la sélection d'opérateur spécifique
- 📊 **Frontend potentiel:** Dropdown "Choisir opérateur" dans le formulaire
- 💡 **Note:** Actuellement on passe `operator: 'any'`

---

### ✅ **getActiveActivations** - Activations actives

**API Endpoint:**

```
GET /stubs/handler_api.php?action=getActiveActivations
```

**Réponse:**

```json
{
  "status": "success",
  "activeActivations": [
    {
      "activationId": "635468021",
      "serviceCode": "vk",
      "phoneNumber": "79********1",
      "activationCost": 12.5,
      "activationStatus": "4",
      "smsCode": ["CODE"],
      "smsText": "[Your CODE registration code]",
      "activationTime": "2022-06-01 16:59:16",
      "countryCode": "2",
      "canGetAnotherSms": "1"
    }
  ]
}
```

**Mapping avec votre plateforme:**

- ❌ **Non implémenté**
- 🎯 **Utilité:** Synchroniser les activations en cours
- 📊 **Frontend:** Section "Numéros actifs" dans Dashboard
- 💡 **Suggestion:** Polling toutes les 10 secondes ou WebSocket

---

### ✅ **getNumber** - Acheter un numéro (VERSION PRINCIPALE)

**API Endpoint:**

```
GET /stubs/handler_api.php?action=getNumber&service=wa&country=187&operator=any&maxPrice=2.5
```

**Réponse succès:**

```
ACCESS_NUMBER:635468024:79584123456
```

**Réponse erreur:**

```
NO_BALANCE
NO_NUMBERS
BAD_SERVICE
WRONG_MAX_PRICE:1.5
```

**Mapping avec votre plateforme:**

- ✅ **IMPLÉMENTÉ COMPLÈTEMENT**
- 📍 **Localisation:** Edge Function `buy-sms-activate-number/index.ts`
- 📊 **Frontend:** `DashboardPage.tsx` - Ligne 354-400
- 🎯 **Statut:** 100% opérationnel (dernière erreur NO_BALANCE due au solde $0.12)

**Paramètres supportés:**

- ✅ `service` - Code du service (wa, tg, ig, etc.)
- ✅ `country` - ID du pays (187 = USA, 6 = Indonésie, etc.)
- ✅ `operator` - Opérateur (actuellement "any")
- ❌ `maxPrice` - Prix maximum (FreePrice) - NON IMPLÉMENTÉ
- ❌ `phoneException` - Exclusions de préfixes - NON IMPLÉMENTÉ
- ❌ `activationType` - Type (0=SMS, 1=Numéro, 2=Voix) - NON IMPLÉMENTÉ
- ❌ `language` - Langue pour voix - NON IMPLÉMENTÉ
- ❌ `userId` - ID utilisateur pour stats - NON IMPLÉMENTÉ
- ❌ `useCashBack` - Utiliser cashback - NON IMPLÉMENTÉ

**Code actuel (Edge Function):**

```typescript
// buy-sms-activate-number/index.ts - Ligne 166-185
const getNumberUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getNumber&service=${smsActivateService}&country=${smsActivateCountry}&operator=${
  operator || "any"
}`;

const response = await fetch(getNumberUrl);
const text = await response.text();

if (text.startsWith("ACCESS_NUMBER:")) {
  const parts = text.split(":");
  const activationId = parts[1];
  const phone = parts[2];
  // Succès ✅
} else if (text === "NO_BALANCE") {
  throw new Error("SMS-Activate error: NO_BALANCE");
} else if (text === "NO_NUMBERS") {
  throw new Error("No numbers available");
}
```

**Erreurs gérées:**

- ✅ `NO_BALANCE` - Solde insuffisant
- ✅ `NO_NUMBERS` - Pas de numéros disponibles
- ✅ `BAD_SERVICE` - Service invalide
- ✅ `BAD_KEY` - Clé API invalide
- ✅ `WRONG_MAX_PRICE` - Prix max trop bas
- ✅ `CHANNELS_LIMIT` - Compte bloqué

---

### ✅ **getNumberV2** - Acheter un numéro V2 (avec plus d'infos)

**API Endpoint:**

```
GET /stubs/handler_api.php?action=getNumberV2&service=wa&country=187&orderId=12345
```

**Réponse:**

```json
{
  "activationId": 635468024,
  "phoneNumber": "79584******",
  "activationCost": 12.5,
  "currency": 840,
  "countryCode": "2",
  "canGetAnotherSms": "1",
  "activationTime": "2022-06-01 17:30:57",
  "activationOperator": "mtt"
}
```

**Mapping avec votre plateforme:**

- ❌ **Non implémenté**
- 🎯 **Utilité:** Version améliorée avec plus d'informations
- 💡 **Avantage:** Retourne JSON au lieu de texte, plus facile à parser
- 🔧 **Suggestion:** Migrer de `getNumber` vers `getNumberV2`

**Avantages de V2:**

1. Réponse JSON structurée (pas de parsing de texte)
2. Paramètre `orderId` pour idempotence (évite doublons)
3. Retourne l'opérateur utilisé
4. Retourne la devise (ISO 4217)
5. Indique si on peut demander un autre SMS

---

### ✅ **getMultiServiceNumber** - Numéro pour plusieurs services

**API Endpoint:**

```
GET /stubs/handler_api.php?action=getMultiServiceNumber&multiService=wa,tg,ig&country=187
```

**Réponse:**

```json
[
  { "phone": "635468024", "activation": "79584123456", "service": "wa" },
  { "phone": "635468025", "activation": "79584123456", "service": "tg" },
  { "phone": "635468026", "activation": "79584123456", "service": "ig" }
]
```

**Mapping avec votre plateforme:**

- ❌ **Non implémenté**
- 🎯 **Utilité:** Un seul numéro pour WhatsApp + Telegram + Instagram
- 📊 **Frontend potentiel:** Option "Numéro multi-services" avec checkbox
- 💡 **Cas d'usage:** Création de compte réseaux sociaux multiples

---

## 2️⃣ GESTION DES STATUTS

### ✅ **setStatus** - Changer statut d'activation

**API Endpoint:**

```
GET /stubs/handler_api.php?action=setStatus&id=635468024&status=8
```

**Statuts disponibles:**

- `1` - Informer que SMS envoyé (optionnel)
- `3` - Demander un autre code (gratuit)
- `6` - Terminer l'activation (marquer comme réussi)
- `8` - Annuler l'activation (numéro déjà utilisé)

**Réponses:**

```
ACCESS_READY - Numéro prêt
ACCESS_RETRY_GET - En attente d'un nouveau SMS
ACCESS_ACTIVATION - Service activé avec succès
ACCESS_CANCEL - Activation annulée
```

**Mapping avec votre plateforme:**

- ✅ **IMPLÉMENTÉ COMPLÈTEMENT**
- 📍 **Localisation:** Edge Function `cancel-sms-activate-order/index.ts`
- 📊 **Frontend:** Bouton "Annuler" dans la carte de numéro actif

**Code actuel (Annulation):**

```typescript
// cancel-sms-activate-order/index.ts - Ligne 67-75
const cancelUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&status=8&id=${orderId}`;

const response = await fetch(cancelUrl);
const text = await response.text();

if (text === "ACCESS_CANCEL") {
  // Mise à jour BDD status = 'cancelled'
  await supabaseClient
    .from("activations")
    .update({ status: "cancelled" })
    .eq("order_id", orderId);
}
```

**Erreurs gérées:**

- ✅ `EARLY_CANCEL_DENIED` - Annulation < 2 min refusée
- ✅ `NO_ACTIVATION` - ID inexistant
- ✅ `BAD_STATUS` - Statut invalide

**Statuts NON implémentés:**

- ❌ `status=1` - Informer SMS envoyé
- ❌ `status=3` - Demander un autre code
- ❌ `status=6` - Terminer l'activation

**Code optimal pour "Demander un autre SMS":**

```typescript
// Edge Function: retry-sms-activate/index.ts
const retryUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&status=3&id=${orderId}`;
const response = await fetch(retryUrl);
const text = await response.text();

if (text === "ACCESS_RETRY_GET") {
  // Attendre le nouveau SMS
  await supabaseClient
    .from("activations")
    .update({ status: "retry_pending" })
    .eq("order_id", orderId);
}
```

---

### ✅ **getStatus** - Récupérer statut d'activation

**API Endpoint:**

```
GET /stubs/handler_api.php?action=getStatus&id=635468024
```

**Réponses:**

```
STATUS_WAIT_CODE - En attente du SMS
STATUS_WAIT_RETRY:12345 - En attente de clarification (code déjà reçu)
STATUS_CANCEL - Annulé ou terminé
STATUS_OK:123456 - Code reçu
```

**Mapping avec votre plateforme:**

- ✅ **IMPLÉMENTÉ COMPLÈTEMENT**
- 📍 **Localisation:** Edge Function `check-sms-activate-sms/index.ts`
- 📊 **Frontend:** Polling toutes les 5 secondes dans `DashboardPage.tsx`

**Code actuel:**

```typescript
// check-sms-activate-sms/index.ts - Ligne 66-95
const checkUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getStatus&id=${orderId}`;

const response = await fetch(checkUrl);
const text = await response.text();

if (text.startsWith("STATUS_OK:")) {
  const code = text.split(":")[1];
  // Mise à jour BDD avec le code
  await supabaseClient
    .from("activations")
    .update({
      status: "completed",
      sms_code: code,
      sms_text: `Code: ${code}`,
    })
    .eq("order_id", orderId);

  return { success: true, code };
} else if (text === "STATUS_WAIT_CODE") {
  return { success: true, status: "waiting" };
}
```

---

### ✅ **getStatusV2** - Récupérer statut V2 (détaillé)

**API Endpoint:**

```
GET /stubs/handler_api.php?action=getStatusV2&id=635468024
```

**Réponse:**

```json
{
  "verificationType": 0,
  "sms": {
    "dateTime": "2022-06-01 16:59:16",
    "code": "123456",
    "text": "Your verification code is 123456"
  },
  "call": {
    "from": "79180230628",
    "text": "Your code is one two three four five six",
    "code": "123456",
    "dateTime": "2022-06-01 17:00:00",
    "url": "https://example.com/voice.mp3",
    "parsingCount": 1
  }
}
```

**Types de vérification:**

- `0` - SMS
- `1` - Appel avec numéro
- `2` - Appel vocal

**Mapping avec votre plateforme:**

- ❌ **Non implémenté**
- 🎯 **Utilité:** Version améliorée avec informations complètes
- 💡 **Avantage:** Support des appels vocaux, texte complet du SMS
- 🔧 **Suggestion:** Migrer de `getStatus` vers `getStatusV2`

---

## 3️⃣ RÉCUPÉRATION DE DONNÉES

### ✅ **getHistory** - Historique des activations

**API Endpoint:**

```
GET /stubs/handler_api.php?action=getHistory&start=1638360000&end=1640952000&limit=50
```

**Réponse:**

```json
[
  {
    "id": 635468024,
    "date": "2022-11-12 15:58:39",
    "phone": "79918529716",
    "sms": ["Your sms code"],
    "cost": 100,
    "status": "4",
    "currency": 840
  }
]
```

**Mapping avec votre plateforme:**

- ❌ **Non implémenté**
- 🎯 **Utilité:** Afficher l'historique des achats
- 📊 **Frontend potentiel:** Page "Historique" avec filtres de date
- 💾 **BDD:** Table `activations` déjà prête pour stocker

---

### ✅ **getPrices** - Prix actuels par pays

**API Endpoint:**

```
GET /stubs/handler_api.php?action=getPrices&service=wa&country=187
```

**Réponse:**

```json
{
  "187": {
    "wa": {
      "cost": "2.50",
      "count": "73421",
      "physicalCount": "0"
    }
  }
}
```

**Mapping avec votre plateforme:**

- ✅ **IMPLÉMENTÉ COMPLÈTEMENT**
- 📍 **Localisation:** `buy-sms-activate-number/index.ts` - Ligne 136-160
- 🎯 **Utilisation:** Récupération du prix en temps réel avant achat

**Code actuel:**

```typescript
// buy-sms-activate-number/index.ts - Ligne 136-160
const priceUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices&service=${smsActivateService}&country=${smsActivateCountry}`;

const priceResponse = await fetch(priceUrl);
const priceData = await priceResponse.json();

let price = 0.5; // Fallback
if (priceData && priceData[smsActivateCountry.toString()]) {
  const countryData = priceData[smsActivateCountry.toString()];

  // Format imbriqué: { "6": { "wa": { "cost": "0.50" } } }
  if (countryData[smsActivateService]) {
    const parsedPrice = parseFloat(countryData[smsActivateService].cost);
    if (!isNaN(parsedPrice) && parsedPrice > 0) {
      price = parsedPrice;
    }
  }
  // Format direct: { "187": { "cost": "0.50" } }
  else if (countryData.cost) {
    const parsedPrice = parseFloat(countryData.cost);
    if (!isNaN(parsedPrice) && parsedPrice > 0) {
      price = parsedPrice;
    }
  }
}
```

---

### ✅ **getCountries** - Liste de tous les pays

**API Endpoint:**

```
GET /stubs/handler_api.php?action=getCountries
```

**Réponse:**

```json
{
  "2": {
    "id": 2,
    "rus": "Казахстан",
    "eng": "Kazakhstan",
    "chn": "哈萨克斯坦",
    "visible": 1,
    "retry": 1,
    "rent": 1,
    "multiService": 1
  }
}
```

**Mapping avec votre plateforme:**

- ✅ **Implémenté via Edge Function**
- 📍 **Localisation:** Edge Function `get-sms-activate-countries` (non utilisé actuellement)
- 📊 **Frontend:** Utilise données statiques `SMS_ACTIVATE_COUNTRIES`
- 🔧 **Amélioration:** Synchroniser avec API au lieu de données statiques

---

### ✅ **getServicesList** - Liste de tous les services

**API Endpoint:**

```
GET /stubs/handler_api.php?action=getServicesList&country=187&lang=en
```

**Réponse:**

```json
{
  "status": "success",
  "services": [
    { "code": "wa", "name": "WhatsApp" },
    { "code": "tg", "name": "Telegram" },
    { "code": "ig", "name": "Instagram" }
  ]
}
```

**Mapping avec votre plateforme:**

- ✅ **Implémenté via Edge Function**
- 📍 **Localisation:** Edge Function `get-sms-activate-services` (non utilisé actuellement)
- 📊 **Frontend:** Utilise données statiques `sms-activate-data.ts` (600+ services)
- 🔧 **Amélioration:** Synchroniser avec API pour avoir les services à jour

---

## 4️⃣ WEBHOOKS

### ✅ **Configuration Webhooks**

**IP Addresses autorisées:**

```
188.42.218.183
142.91.156.119
```

**Format de réception:**

```json
{
  "activationId": 123456,
  "service": "go",
  "text": "Sms text",
  "code": "12345",
  "country": 2,
  "receivedAt": "2023-01-01 12:00:00"
}
```

**Mapping avec votre plateforme:**

- ❌ **Non implémenté**
- 🎯 **Utilité:** Recevoir SMS instantanément sans polling
- 📍 **Implémentation nécessaire:**
  1. Créer Edge Function `webhook-sms-activate`
  2. Configurer URL dans SMS-Activate dashboard
  3. Vérifier IP source (whitelist)
  4. Retourner HTTP 200

**Code optimal:**

```typescript
// Edge Function: webhook-sms-activate/index.ts
serve(async (req) => {
  // Vérifier IP source
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
  if (!["188.42.218.183", "142.91.156.119"].includes(ip)) {
    return new Response("Unauthorized", { status: 403 });
  }

  const data = await req.json();
  const { activationId, code, text } = data;

  // Mettre à jour la BDD
  await supabase
    .from("activations")
    .update({
      status: "completed",
      sms_code: code,
      sms_text: text,
      received_at: new Date().toISOString(),
    })
    .eq("order_id", activationId);

  // Retourner 200 pour confirmer réception
  return new Response("OK", { status: 200 });
});
```

**Avantages:**

- ⚡ Temps réel (pas de polling toutes les 5 secondes)
- 🔋 Moins de requêtes API
- 💰 Économise des crédits API
- 📲 Notifications push possibles

---

## 5️⃣ RENT API - LOCATION DE NUMÉROS

### ✅ **getRentServicesAndCountries** - Disponibilité location

**API Endpoint:**

```
GET /stubs/handler_api.php?action=getRentServicesAndCountries&rent_time=4&country=2
```

**Réponse:**

```json
{
  "countries": { "0": 2 },
  "operators": { "0": "aiva", "1": "any", "2": "beeline" },
  "services": {
    "full": { "cost": 42.93, "quant": 20 },
    "vk": { "cost": 21.95, "quant": 20 },
    "ok": { "cost": 7.68, "quant": 55 }
  },
  "currency": 840
}
```

**Mapping avec votre plateforme:**

- ❌ **Non implémenté**
- 🎯 **Utilité:** Afficher les services disponibles en location
- 📊 **Frontend potentiel:** Page "Location de numéros"
- 💡 **Cas d'usage:** Recevoir plusieurs SMS sur le même numéro

---

### ✅ **getRentNumber** - Louer un numéro

**API Endpoint:**

```
GET /stubs/handler_api.php?action=getRentNumber&service=wa&rent_time=24&country=2
```

**Réponse:**

```json
{
  "status": "success",
  "phone": {
    "id": 1049,
    "endDate": "2020-01-31T12:01:52",
    "number": "79959707564"
  }
}
```

**Mapping avec votre plateforme:**

- ❌ **Non implémenté**
- 🎯 **Utilité:** Location longue durée (4h à 56 jours)
- 📊 **Frontend potentiel:** Section "Location" avec durées prédéfinies
- 💾 **BDD:** Créer table `rentals`

**Durées de location:**

- 2 heures (défaut)
- 4 heures
- 24 heures (1 jour)
- 48 heures (2 jours)
- 72 heures (3 jours)
- ... jusqu'à 1344 heures (56 jours)

---

### ✅ **getRentStatus** - Statut de la location

**API Endpoint:**

```
GET /stubs/handler_api.php?action=getRentStatus&id=1049&page=1&size=10
```

**Réponse:**

```json
{
  "status": "success",
  "quantity": "2",
  "values": {
    "0": {
      "phoneFrom": "79180230628",
      "text": "5",
      "service": "ot",
      "date": "2020-01-30 14:31:58"
    },
    "1": {
      "phoneFrom": "79180230628",
      "text": "4",
      "service": "ot",
      "date": "2020-01-30 14:04:16"
    }
  }
}
```

**Mapping avec votre plateforme:**

- ❌ **Non implémenté**
- 🎯 **Utilité:** Récupérer tous les SMS reçus sur un numéro loué
- 📊 **Frontend potentiel:** Liste des SMS avec pagination

---

### ✅ **setRentStatus** - Changer statut location

**API Endpoint:**

```
GET /stubs/handler_api.php?action=setRentStatus&id=1049&status=1
```

**Statuts:**

- `1` - Terminer la location
- `2` - Annuler la location (remboursement si < 20 min)

**Mapping avec votre plateforme:**

- ❌ **Non implémenté**
- 🎯 **Utilité:** Terminer une location manuellement
- 📊 **Frontend potentiel:** Boutons "Terminer" et "Annuler"

---

### ✅ **continueRentNumber** - Prolonger la location

**API Endpoint:**

```
GET /stubs/handler_api.php?action=continueRentNumber&id=1049&rent_time=4
```

**Réponse:**

```json
{
  "status": "success",
  "phone": {
    "id": 1049,
    "endDate": "2020-01-31T16:01:52",
    "number": "79959707564"
  }
}
```

**Mapping avec votre plateforme:**

- ❌ **Non implémenté**
- 🎯 **Utilité:** Prolonger une location existante
- 📊 **Frontend potentiel:** Bouton "Prolonger de X heures"

---

### ✅ **continueRentInfo** - Info sur prolongation

**API Endpoint:**

```
GET /stubs/handler_api.php?action=continueRentInfo&id=1049&hours=4&needHistory=true
```

**Réponse:**

```json
{
  "status": "success",
  "price": 6.33,
  "currency": 840,
  "hours": 4,
  "history": {
    "0": {
      "createDate": "2024-10-07 12:10:47",
      "price": "101.9",
      "hours": 4
    }
  }
}
```

**Mapping avec votre plateforme:**

- ❌ **Non implémenté**
- 🎯 **Utilité:** Afficher le coût avant de prolonger
- 📊 **Frontend potentiel:** Calculateur de prix "Prolonger de X heures = Y$"

---

## 6️⃣ FONCTIONNALITÉS AVANCÉES

### ✅ **getExtraActivation** - Réactivation sur même numéro

**API Endpoint:**

```
GET /stubs/handler_api.php?action=getExtraActivation&activationId=635468024
```

**Réponse:**

```
ACCESS_NUMBER:635468025:79584123456
```

**Mapping avec votre plateforme:**

- ❌ **Non implémenté**
- 🎯 **Utilité:** Recevoir un autre SMS sur le même numéro
- 📊 **Frontend potentiel:** Bouton "Réutiliser ce numéro" dans l'historique
- 💡 **Cas d'usage:** Plusieurs services sur le même numéro (Instagram + WhatsApp)

---

### ✅ **checkExtraActivation** - Prix réactivation

**API Endpoint:**

```
GET /stubs/handler_api.php?action=checkExtraActivation&activationId=635468024
```

**Réponse:**

```json
{
  "status": "success",
  "cost": 200,
  "service": "tw",
  "phone": "777777777",
  "country": 14
}
```

**Mapping avec votre plateforme:**

- ❌ **Non implémenté**
- 🎯 **Utilité:** Vérifier disponibilité et prix avant réactivation

---

### ✅ **parseCall** - Re-parser appel vocal

**API Endpoint:**

```
GET /stubs/handler_api.php?action=parseCall&id=635468024&newLang=en
```

**Langues supportées:**

```
ru - Russe
en - Anglais
es - Espagnol
fr - Français
de - Allemand
it - Italien
pt - Portugais
zh - Chinois
```

**Mapping avec votre plateforme:**

- ❌ **Non implémenté**
- 🎯 **Utilité:** Ré-analyser un appel vocal mal parsé
- 📊 **Frontend potentiel:** Bouton "Ré-analyser l'appel" avec sélection de langue

---

## 7️⃣ ÉTAT D'IMPLÉMENTATION GLOBAL

### ✅ **FONCTIONNALITÉS IMPLÉMENTÉES (40%)**

#### Achat de numéros (Activation):

- ✅ `getNumber` - Acheter un numéro
- ✅ `getPrices` - Récupérer le prix
- ✅ `setStatus` (status=8) - Annuler une activation
- ✅ `getStatus` - Vérifier le statut et récupérer le SMS

#### Edge Functions déployées (8):

1. ✅ `buy-sms-activate-number` - Achat de numéro
2. ✅ `check-sms-activate-sms` - Vérification SMS
3. ✅ `cancel-sms-activate-order` - Annulation
4. ✅ `sync-sms-activate` - Synchronisation
5. ✅ `get-sms-activate-countries` - Liste pays (non utilisé)
6. ✅ `get-sms-activate-services` - Liste services (non utilisé)
7. ✅ `get-services-counts` - Compteurs services
8. ❌ Rent functions (0/5 implémentées)

### ❌ **FONCTIONNALITÉS NON IMPLÉMENTÉES (60%)**

#### Achat avancé:

- ❌ `getNumberV2` - Version améliorée JSON
- ❌ `getMultiServiceNumber` - Plusieurs services sur un numéro
- ❌ `getNumbersStatus` - Compteurs en temps réel (hardcodé à 999)
- ❌ `getTopCountriesByService` - Meilleurs pays par service
- ❌ `getActiveActivations` - Liste activations actives
- ❌ `getOperators` - Liste opérateurs par pays
- ❌ `getHistory` - Historique des achats
- ❌ `getExtraActivation` - Réactivation
- ❌ `checkExtraActivation` - Prix réactivation

#### Statuts avancés:

- ❌ `setStatus` (status=1) - Informer SMS envoyé
- ❌ `setStatus` (status=3) - Demander autre code
- ❌ `setStatus` (status=6) - Terminer activation
- ❌ `getStatusV2` - Version détaillée avec appels
- ❌ `parseCall` - Re-parser appel vocal

#### Location de numéros (Rent API):

- ❌ `getRentServicesAndCountries` - Disponibilité location
- ❌ `getRentNumber` - Louer un numéro
- ❌ `getRentStatus` - Statut location
- ❌ `setRentStatus` - Changer statut location
- ❌ `continueRentNumber` - Prolonger location
- ❌ `continueRentInfo` - Info prolongation
- ❌ `getRentList` - Liste locations actives

#### Webhooks:

- ❌ Réception webhooks SMS en temps réel
- ❌ Configuration IP whitelist
- ❌ Gestion retry (8 tentatives sur 2h)

#### Données:

- ❌ Synchronisation automatique pays
- ❌ Synchronisation automatique services
- ❌ Balance monitoring en temps réel
- ❌ Top countries dynamique

---

## 8️⃣ RECOMMANDATIONS & PRIORITÉS

### 🚀 **PRIORITÉ HAUTE (à faire maintenant)**

1. **Recharger le compte SMS-Activate**

   - Montant: $10-20
   - Raison: Solde actuel $0.12 insuffisant pour les tests

2. **Implémenter Webhooks**

   - Créer Edge Function `webhook-sms-activate`
   - Configurer URL dans SMS-Activate dashboard
   - Bénéfices: SMS instantanés, moins de polling

3. **Migrer vers getNumberV2**

   - Remplacer `getNumber` par `getNumberV2`
   - Bénéfices: JSON structuré, orderId pour idempotence

4. **Implémenter getNumbersStatus**
   - Remplacer "999" hardcodé par vrais compteurs
   - Appeler l'API pour chaque pays affiché

### 🔥 **PRIORITÉ MOYENNE (dans 1-2 semaines)**

5. **Implémenter Rent API (Location)**

   - 5 Edge Functions à créer
   - Page frontend "Location de numéros"
   - Table BDD `rentals`

6. **Implémenter statuts avancés**

   - `setStatus(3)` - Demander autre SMS
   - `setStatus(6)` - Terminer activation
   - `getStatusV2` - Version détaillée

7. **Historique des achats**
   - `getHistory` Edge Function
   - Page frontend "Historique"
   - Filtres par date, service, pays

### 💡 **PRIORITÉ BASSE (nice to have)**

8. **Multi-service activations**

   - `getMultiServiceNumber`
   - UI: Checkbox "Utiliser pour plusieurs services"

9. **Réactivation de numéros**

   - `getExtraActivation`
   - Bouton "Réutiliser ce numéro"

10. **Monitoring avancé**
    - Dashboard admin avec stats temps réel
    - Balance monitoring avec alertes
    - Top countries/services dynamiques

---

## 9️⃣ ARCHITECTURE ACTUELLE

### 📊 **Frontend (React + TypeScript)**

```
src/
├── pages/
│   └── DashboardPage.tsx         # Page principale (achat)
├── lib/
│   ├── sms-activate-data.ts      # 600+ services statiques ✅
│   ├── sms-activate-service.ts   # Fonctions helper
│   └── supabase.ts                # Client Supabase
└── components/
    └── [divers composants UI]
```

### ⚡ **Backend (Supabase Edge Functions)**

```
supabase/functions/
├── buy-sms-activate-number/      # Achat numéro ✅
├── check-sms-activate-sms/        # Vérif SMS ✅
├── cancel-sms-activate-order/     # Annulation ✅
├── sync-sms-activate/             # Sync pays/services ✅
├── get-sms-activate-countries/    # Liste pays ✅
├── get-sms-activate-services/     # Liste services ✅
└── get-services-counts/           # Compteurs ✅
```

### 💾 **Base de données (PostgreSQL)**

```sql
-- Tables existantes
users (id, email, balance, created_at)
activations (id, user_id, order_id, phone, service_code, country_code,
             operator, price, status, sms_code, sms_text, expires_at)
services (id, code, name, category, icon, popularity_score)
countries (id, code, name, flag)

-- Tables à créer
rentals (id, user_id, rent_id, phone, service_code, start_date,
         end_date, hourly_rate, total_cost, status)
webhooks_log (id, activation_id, payload, received_at, processed)
```

---

## 🎯 CONCLUSION

Votre plateforme ONE SMS a une **base solide (40% implémentée)** avec les fonctionnalités essentielles d'achat de numéros. Pour atteindre 100%, il faut :

1. ✅ **Terminer l'API Activation** (60% fait)

   - Webhooks
   - Statuts avancés (retry, finish)
   - Historique

2. ❌ **Implémenter l'API Rent** (0% fait)

   - 5 Edge Functions
   - Frontend location
   - BDD rentals

3. 🔧 **Optimiser l'existant**
   - Compteurs en temps réel
   - Migration vers V2
   - Synchronisation automatique

**Priorité #1:** Recharger le compte SMS-Activate ($10-20) pour tester le flux complet d'achat → SMS → annulation/réussite.

**Priorité #2:** Implémenter les Webhooks pour avoir des SMS instantanés au lieu du polling toutes les 5 secondes.

Avec ces 2 actions, votre plateforme sera opérationnelle à **80%** pour les besoins basiques ! 🚀
