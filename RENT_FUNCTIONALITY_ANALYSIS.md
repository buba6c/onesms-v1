# 🏠 ANALYSE COMPLÈTE: Fonctionnement du Mode RENT

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Différences Activation vs Rent](#différences-activation-vs-rent)
3. [Flow Complet du Processus Rent](#flow-complet-du-processus-rent)
4. [Services Spéciaux: "Any other" & "Full rent"](#services-spéciaux)
5. [Durées de Location](#durées-de-location)
6. [API SMS-Activate pour Rent](#api-sms-activate-pour-rent)
7. [Structure de Données](#structure-de-données)
8. [Fonctionnement de chaque étape](#fonctionnement-de-chaque-étape)

---

## 🎯 Vue d'ensemble

### Qu'est-ce que le mode RENT ?

Le mode **RENT** (Location) permet aux utilisateurs de **louer un numéro** pour une **durée déterminée** (4h, 1 jour, 1 semaine, 1 mois) et **recevoir plusieurs SMS** sur ce numéro pendant toute la durée de location.

### Différences clés vs Activation

| Critère         | Activation (SMS unique)        | Rent (Location)                   |
| --------------- | ------------------------------ | --------------------------------- |
| **Durée**       | 20 minutes                     | 4h à 1 mois                       |
| **SMS**         | 1 seul SMS attendu             | Multiple SMS possibles            |
| **Prix**        | Prix de base                   | Prix x multiplicateur selon durée |
| **Utilisation** | Vérification compte unique     | Tests multiples, développement    |
| **Statut**      | pending → received → completed | active → expired/cancelled        |
| **API**         | `getNumber`                    | `getRentNumber`                   |

---

## 🔄 Flow Complet du Processus Rent

```
┌─────────────────────────────────────────────────────────────┐
│                    ÉTAPE 1: SÉLECTION SERVICE               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔹 Mode: RENT activé                                      │
│                                                             │
│  📋 Section "IF THE REQUIRED SERVICE IS NOT IN THE LIST"   │
│     ┌─────────────────────────────────────────┐           │
│     │ ❓ Any other      3249 numbers          │           │
│     ├─────────────────────────────────────────┤           │
│     │ 🏠 Full rent      597 numbers           │           │
│     └─────────────────────────────────────────┘           │
│                                                             │
│  📋 Section "POPULAR"                                      │
│     ┌─────────────────────────────────────────┐           │
│     │ 📷 Instagram + Threads  3570 numbers    │           │
│     ├─────────────────────────────────────────┤           │
│     │ 🌐 Google,youtube,Gmail  2520 numbers   │           │
│     ├─────────────────────────────────────────┤           │
│     │ 💬 Whatsapp  2147 numbers              │           │
│     └─────────────────────────────────────────┘           │
│                                                             │
│  ➡️ Utilisateur clique sur un service                     │
└─────────────────────────────────────────────────────────────┘
                            ⬇️
┌─────────────────────────────────────────────────────────────┐
│                    ÉTAPE 2: SÉLECTION PAYS                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🌍 API Call: getRentServicesAndCountries                  │
│     Paramètres:                                            │
│     - service: code du service sélectionné                 │
│     - rent_time: 4 (par défaut)                           │
│     - country: 2 (Kazakhstan par défaut)                  │
│                                                             │
│  📥 Réponse:                                               │
│     {                                                      │
│       "countries": [2, 6, 7, ...],                        │
│       "operators": ["any", "beeline", "altel", ...],      │
│       "services": {                                       │
│         "ig": { "cost": 15.50, "quant": 120 },           │
│         "full": { "cost": 42.93, "quant": 20 }           │
│       }                                                    │
│     }                                                      │
│                                                             │
│  🗺️ Affichage liste pays avec:                            │
│     - Drapeau                                             │
│     - Nom du pays                                         │
│     - Quantité disponible                                 │
│     - Prix pour 4h                                        │
│                                                             │
│  ➡️ Utilisateur sélectionne un pays                       │
└─────────────────────────────────────────────────────────────┘
                            ⬇️
┌─────────────────────────────────────────────────────────────┐
│                  ÉTAPE 3: SÉLECTION DURÉE                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📋 SELECTED SERVICE                                       │
│     ┌─────────────────────────────────────────┐           │
│     │ 📷 Instagram + Threads                  │  ❌       │
│     │ 3570 numbers                            │           │
│     └─────────────────────────────────────────┘           │
│                                                             │
│  🗺️ COUNTRY SELECTION                                     │
│     ┌─────────────────────────────────────────┐           │
│     │ 🇰🇿 Kazakhstan                          │           │
│     │ • Less than 1000 numbers                │   15 Ⓐ   │
│     └─────────────────────────────────────────┘           │
│                                                             │
│  ⏱️ DURATION (4 options)                                  │
│     ┌──────────────┬──────────────┐                       │
│     │ 4 Hours      │ 1 Day        │                       │
│     │ 15 Ⓐ        │ 45 Ⓐ        │                       │
│     ├──────────────┼──────────────┤                       │
│     │ 1 Week       │ 1 Month      │                       │
│     │ 225 Ⓐ       │ 750 Ⓐ       │                       │
│     └──────────────┴──────────────┘                       │
│                                                             │
│  💰 Prix calculés:                                         │
│     - 4 Hours: price × 1                                  │
│     - 1 Day: price × 3                                    │
│     - 1 Week: price × 15                                  │
│     - 1 Month: price × 50                                 │
│                                                             │
│  🔵 Bouton: [Rent] 15 Ⓐ                                   │
│                                                             │
│  ➡️ Utilisateur clique sur Rent                           │
└─────────────────────────────────────────────────────────────┘
                            ⬇️
┌─────────────────────────────────────────────────────────────┐
│                 ÉTAPE 4: TRAITEMENT BACKEND                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1️⃣ Vérification balance utilisateur                      │
│     if (balance < price) → Error                          │
│                                                             │
│  2️⃣ API Call: getRentNumber                               │
│     https://api.sms-activate.ae/...?                      │
│     - action=getRentNumber                                │
│     - service=ig                                          │
│     - country=2                                           │
│     - rent_time=4                                         │
│     - operator=any (optionnel)                            │
│                                                             │
│  📥 Réponse SMS-Activate:                                  │
│     {                                                      │
│       "status": "success",                                │
│       "phone": {                                          │
│         "id": 1049,              // rental_id            │
│         "number": "79959707564", // numéro loué          │
│         "endDate": "2025-11-25T16:01:52"                 │
│       }                                                    │
│     }                                                      │
│                                                             │
│  3️⃣ Création enregistrement dans DB                       │
│     INSERT INTO rentals (                                 │
│       user_id, rental_id, phone,                         │
│       service_code, country_code,                        │
│       price, status='active',                            │
│       expires_at, duration_hours                         │
│     )                                                      │
│                                                             │
│  4️⃣ Déduction du balance                                  │
│     UPDATE users                                          │
│     SET balance = balance - price                         │
│                                                             │
│  5️⃣ Création transaction                                  │
│     INSERT INTO transactions (                            │
│       type='rental', amount=-price                       │
│     )                                                      │
│                                                             │
│  ✅ Retour succès au frontend                             │
└─────────────────────────────────────────────────────────────┘
                            ⬇️
┌─────────────────────────────────────────────────────────────┐
│                  ÉTAPE 5: AFFICHAGE ACTIF                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📱 Active numbers (section principale)                   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 📷🇰🇿  Instagram... Kazakhstan                       │ │
│  │ +7 995 970 75 64              [COPY] [MENU]         │ │
│  │ 📨 Waiting for SMS...                                │ │
│  │ ⏰ Expires in: 3h 45m                                │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  🔄 Polling actif toutes les 5s:                          │
│     GET /api/rentals/:id/status                           │
│                                                             │
│  🔔 Webhook (si configuré):                               │
│     SMS-Activate → POST vers notre serveur               │
│     {                                                      │
│       "rentalId": 1049,                                  │
│       "sms": [{                                          │
│         "phoneFrom": "79180230628",                      │
│         "text": "Your code is 12345",                    │
│         "date": "2025-11-25 14:31:58"                    │
│       }]                                                  │
│     }                                                      │
│                                                             │
│  📨 Quand SMS reçu:                                        │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 📷🇰🇿  Instagram... Kazakhstan                       │ │
│  │ +7 995 970 75 64              [COPY] [MENU]         │ │
│  │ 💬 SMS 1: Your code is 12345                        │ │
│  │ 💬 SMS 2: Welcome to Instagram                      │ │
│  │ ⏰ Expires in: 3h 30m                                │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  🎬 Actions disponibles (menu ...):                       │
│     - 🔄 Extend rental (prolonger)                        │
│     - ✅ Finish rental (terminer avant expiration)        │
│     - 📋 Copy phone                                       │
│     - 📋 Copy all SMS                                     │
└─────────────────────────────────────────────────────────────┘
                            ⬇️
┌─────────────────────────────────────────────────────────────┐
│                    FIN DE LOCATION                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔚 Deux scénarios possibles:                             │
│                                                             │
│  1️⃣ Expiration automatique                               │
│     - Temps écoulé → expires_at atteint                   │
│     - Status: active → expired                            │
│     - Numéro retiré de "Active numbers"                   │
│     - Historique conservé dans DB                         │
│                                                             │
│  2️⃣ Termination manuelle                                  │
│     - Utilisateur clique "Finish rental"                  │
│     - API Call: setRentStatus(id, status=1)              │
│     - Status: active → finished                           │
│     - ⚠️ PAS DE REMBOURSEMENT (règle SMS-Activate)       │
│                                                             │
│  3️⃣ Prolongation (extend)                                │
│     - Utilisateur clique "Extend rental"                  │
│     - API Call: continueRentNumber(id, rent_time)        │
│     - Nouveau prix calculé et déduit                      │
│     - expires_at mis à jour                               │
│                                                             │
│  📊 Données conservées:                                    │
│     - Historique complet des SMS reçus                    │
│     - Transactions                                        │
│     - Durée totale de location                            │
│     - Prix total payé                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Services Spéciaux

### 1️⃣ "Any other" (code: `any`)

**Cas d'usage:** Service non listé dans la liste populaire

```javascript
{
  id: 'any',
  name: 'Any other',
  code: 'any',
  count: 3249,
  icon: '❓'
}
```

**Comportement:**

- Disponible uniquement en mode RENT
- API SMS-Activate utilise le service "any other" spécial
- Prix généralement plus bas que services spécifiques
- Utile pour services rares ou nouveaux

### 2️⃣ "Full rent" (code: `rent` ou `full`)

**Cas d'usage:** Location du numéro pour TOUS les services

```javascript
{
  id: 'rent',
  name: 'Full rent',
  code: 'full',  // Code API SMS-Activate
  count: 597,
  icon: '🏠'
}
```

**Comportement:**

- Le numéro peut recevoir SMS de TOUS les services
- Prix plus élevé (prix de base × multiplicateur élevé)
- Idéal pour développeurs qui testent plusieurs services
- Maximum de flexibilité

**Exemple prix:**

```
Full rent - Kazakhstan - 4 hours: 42.93 Ⓐ
Full rent - Kazakhstan - 1 day: 128.79 Ⓐ
```

---

## ⏱️ Durées de Location

### Mapping durées → heures

```typescript
const RENT_DURATIONS = {
  "4hours": 4, // Minimum
  "1day": 24, // 1 jour
  "1week": 168, // 7 jours
  "1month": 720, // 30 jours
};
```

### Calcul des prix

```typescript
// Prix de base retourné par getRentServicesAndCountries pour 4h
const basePrice = 15.0;

// Multiplicateurs (estimés basés sur l'observation)
const priceMultipliers = {
  "4hours": 1, // 15 Ⓐ
  "1day": 3, // 45 Ⓐ
  "1week": 15, // 225 Ⓐ
  "1month": 50, // 750 Ⓐ
};

// Affichage dans l'interface
const displayPrice = Math.ceil(basePrice * multiplier);
```

### Limites SMS-Activate

- **Minimum:** 2 heures
- **Maximum:** 1344 heures (56 jours)
- **Validation:** `if (hours < 2 || hours > 1344) → INVALID_TIME`

---

## 🔌 API SMS-Activate pour Rent

### 1. getRentServicesAndCountries

**Récupère les options disponibles et prix**

```http
GET /stubs/handler_api.php
  ?action=getRentServicesAndCountries
  &api_key=YOUR_KEY
  &rent_time=4
  &country=2
  &operator=any
  &incomingCall=false
```

**Réponse:**

```json
{
  "countries": [2, 6, 7],
  "operators": ["any", "beeline", "altel"],
  "services": {
    "ig": { "cost": 15.5, "quant": 120 },
    "wa": { "cost": 12.0, "quant": 250 },
    "full": { "cost": 42.93, "quant": 20 }
  },
  "currency": 840 // ISO 4217 (USD)
}
```

### 2. getRentNumber

**Loue un numéro**

```http
GET /stubs/handler_api.php
  ?action=getRentNumber
  &api_key=YOUR_KEY
  &service=ig
  &country=2
  &rent_time=4
  &operator=any
  &url=https://your-webhook.com/sms  // Optionnel
```

**Réponse succès:**

```json
{
  "status": "success",
  "phone": {
    "id": 1049, // rental_id (à conserver!)
    "number": "79959707564",
    "endDate": "2025-11-25T16:01:52"
  }
}
```

**Erreurs possibles:**

```json
{ "status": "error", "message": "NO_BALANCE" }
{ "status": "error", "message": "NO_NUMBERS" }
{ "status": "error", "message": "BAD_SERVICE" }
```

### 3. getRentStatus

**Récupère les SMS reçus**

```http
GET /stubs/handler_api.php
  ?action=getRentStatus
  &api_key=YOUR_KEY
  &id=1049
  &page=1
  &size=10
```

**Réponse:**

```json
{
  "status": "success",
  "quantity": 2,
  "values": [
    {
      "phoneFrom": "79180230628",
      "text": "Your Instagram code is 12345",
      "service": "ig",
      "date": "2025-11-25 14:31:58"
    },
    {
      "phoneFrom": "79180230628",
      "text": "Welcome to Instagram!",
      "service": "ig",
      "date": "2025-11-25 14:35:12"
    }
  ]
}
```

**Status possibles:**

- `STATUS_WAIT_CODE` - En attente du premier SMS
- `STATUS_FINISH` - Location terminée normalement
- `STATUS_CANCEL` - Location annulée avec remboursement
- `STATUS_REVOKE` - Numéro bloqué, fonds retournés

### 4. setRentStatus

**Modifie le statut de la location**

```http
GET /stubs/handler_api.php
  ?action=setRentStatus
  &api_key=YOUR_KEY
  &id=1049
  &status=1  // 1=Finish, 2=Cancel
```

**Status codes:**

- `1` = Finish (terminer normalement, PAS de remboursement)
- `2` = Cancel (annuler, remboursement si < 20 min)

**⚠️ Important:** L'annulation avec remboursement n'est possible que dans les 20 premières minutes!

### 5. continueRentNumber

**Prolonge la location**

```http
GET /stubs/handler_api.php
  ?action=continueRentNumber
  &api_key=YOUR_KEY
  &id=1049
  &rent_time=4  // Heures supplémentaires
```

**Réponse:**

```json
{
  "status": "success",
  "phone": {
    "id": 1049, // Même ID si prolongation d'une location active
    "number": "79959707564",
    "endDate": "2025-11-25T20:01:52" // Nouvelle date
  }
}
```

**⚠️ Note:** Si la location est déjà terminée (finished), une NOUVELLE location sera créée avec un NOUVEL ID!

### 6. continueRentInfo

**Obtient le prix de prolongation**

```http
GET /stubs/handler_api.php
  ?action=continueRentInfo
  &api_key=YOUR_KEY
  &id=1049
  &hours=4
  &needHistory=true
```

**Réponse:**

```json
{
  "status": "success",
  "price": 15.5,
  "currency": 840,
  "hours": 4,
  "history": [
    {
      "createDate": "2025-11-25 12:10:47",
      "price": "15.50",
      "hours": 4
    }
  ]
}
```

---

## 💾 Structure de Données

### Table: `rentals`

```sql
CREATE TABLE rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  rental_id TEXT NOT NULL,           -- ID SMS-Activate (ex: "1049")
  phone TEXT NOT NULL,                -- Format: "79959707564"
  service_code TEXT NOT NULL,         -- Code service (ex: "ig", "full")
  country_code TEXT NOT NULL,         -- Code pays (ex: "kazakhstan")
  operator TEXT,                      -- Opérateur (ex: "beeline", "any")
  price DECIMAL(10,2) NOT NULL,       -- Prix payé
  status TEXT NOT NULL,               -- 'active', 'finished', 'expired', 'cancelled'
  expires_at TIMESTAMP NOT NULL,      -- Date d'expiration
  duration_hours INTEGER NOT NULL,    -- Durée en heures (4, 24, 168, 720)
  provider TEXT DEFAULT 'sms-activate',
  sms_received JSONB DEFAULT '[]',   -- Tableau des SMS reçus
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Format SMS reçus (JSONB)

```json
[
  {
    "phoneFrom": "79180230628",
    "text": "Your Instagram code is 12345",
    "code": "12345",
    "service": "ig",
    "date": "2025-11-25 14:31:58",
    "receivedAt": "2025-11-25T14:31:58Z"
  }
]
```

---

## 🎬 Fonctionnement de chaque étape

### Frontend: DashboardPage.tsx

#### État initial

```typescript
const [mode, setMode] = useState<"activation" | "rent">("activation");
const [rentDuration, setRentDuration] = useState<
  "4hours" | "1day" | "1week" | "1month"
>("4hours");
const [selectedService, setSelectedService] = useState<Service | null>(null);
const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
```

#### Affichage services spéciaux (mode RENT uniquement)

```tsx
{
  mode === "rent" && (
    <div className="mb-4">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-3">
        IF THE REQUIRED SERVICE IS NOT IN THE LIST
      </p>
      <div className="space-y-2 mb-4">
        {/* Any other */}
        <div
          onClick={() =>
            handleServiceSelect({
              id: "any",
              name: "Any other",
              code: "any",
              count: 3249,
              icon: "❓",
            })
          }
        >
          ❓ Any other - 3249 numbers
        </div>

        {/* Full rent */}
        <div
          onClick={() =>
            handleServiceSelect({
              id: "rent",
              name: "Full rent",
              code: "full",
              count: 597,
              icon: "🏠",
            })
          }
        >
          🏠 Full rent - 597 numbers
        </div>
      </div>
    </div>
  );
}
```

#### Sélection durée (mode RENT uniquement)

```tsx
{
  mode === "rent" && (
    <div className="mb-6">
      <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3">
        DURATION
      </p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { value: "4hours", label: "4 Hours", multiplier: 1 },
          { value: "1day", label: "1 Day", multiplier: 3 },
          { value: "1week", label: "1 Week", multiplier: 15 },
          { value: "1month", label: "1 Month", multiplier: 50 },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setRentDuration(option.value)}
            className={rentDuration === option.value ? "selected" : ""}
          >
            <div>{option.label}</div>
            <div>{Math.ceil(selectedCountry.price * option.multiplier)} Ⓐ</div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

#### Appel API pour louer

```typescript
const handleActivate = async () => {
  if (mode === "rent") {
    // Louer un numéro
    const { data, error } = await supabase.functions.invoke(
      "buy-sms-activate-rent",
      {
        body: {
          country: selectedCountry.code,
          product: selectedService.code,
          userId: user.id,
          duration: rentDuration, // '4hours', '1day', etc.
        },
      }
    );

    if (error) {
      toast({ title: "Erreur", description: error.message });
      return;
    }

    toast({
      title: "Numéro loué!",
      description: `${data.phone} pour ${rentDuration}`,
    });

    // Rafraîchir la liste des locations actives
    refetchRentals();
  }
};
```

### Backend: buy-sms-activate-rent Edge Function

#### 1. Vérification balance

```typescript
const { data: userProfile } = await supabase
  .from("users")
  .select("balance")
  .eq("id", userId)
  .single();

if (userProfile.balance < price) {
  throw new Error(`Insufficient balance. Required: ${price}Ⓐ`);
}
```

#### 2. Appel API getRentNumber

```typescript
const rentTime = RENT_DURATIONS[duration] || 4; // 4, 24, 168, 720

const rentUrl =
  `${SMS_ACTIVATE_BASE_URL}?` +
  `api_key=${SMS_ACTIVATE_API_KEY}` +
  `&action=getRentNumber` +
  `&service=${smsActivateService}` +
  `&country=${smsActivateCountry}` +
  `&rent_time=${rentTime}` +
  `&operator=any`;

const response = await fetch(rentUrl);
const data = await response.json();

if (data.status !== "success") {
  throw new Error(data.message || "Failed to rent number");
}
```

#### 3. Sauvegarde dans DB

```typescript
const { data: rental, error } = await supabase
  .from("rentals")
  .insert({
    user_id: userId,
    rental_id: data.phone.id.toString(),
    phone: data.phone.number,
    service_code: product,
    country_code: country,
    operator: "auto",
    price: price,
    status: "active",
    expires_at: data.phone.endDate,
    duration_hours: rentTime,
    provider: "sms-activate",
  })
  .select()
  .single();
```

#### 4. Déduction balance + Transaction

```typescript
await supabase
  .from("users")
  .update({ balance: userProfile.balance - price })
  .eq("id", userId);

await supabase.from("transactions").insert({
  user_id: userId,
  type: "rental",
  amount: -price,
  description: `Rent ${service.name} in ${country} for ${duration}`,
  status: "completed",
});
```

### Polling SMS (Frontend)

#### Hook personnalisé pour récupérer les SMS

```typescript
const useRentPolling = (rentalId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const pollSms = async () => {
      const { data } = await supabase.functions.invoke("get-rent-sms", {
        body: { rentalId },
      });

      if (data?.sms?.length > 0) {
        // Mettre à jour la DB locale
        await supabase
          .from("rentals")
          .update({ sms_received: data.sms })
          .eq("rental_id", rentalId);

        // Rafraîchir l'interface
        queryClient.invalidateQueries(["rentals"]);
      }
    };

    // Polling toutes les 5 secondes
    const interval = setInterval(pollSms, 5000);

    return () => clearInterval(interval);
  }, [rentalId]);
};
```

### Affichage SMS reçus

```tsx
<div className="rental-card">
  <div className="header">
    <img src={getServiceLogo(rental.service_code)} />
    <span>{rental.phone}</span>
    <button onClick={() => copyToClipboard(rental.phone)}>
      <Copy />
    </button>
  </div>

  {rental.sms_received?.length > 0 ? (
    <div className="sms-list">
      {rental.sms_received.map((sms, idx) => (
        <div key={idx} className="sms-item">
          <span className="sms-code">{sms.code || extractCode(sms.text)}</span>
          <span className="sms-text">{sms.text}</span>
          <span className="sms-date">{formatDate(sms.date)}</span>
        </div>
      ))}
    </div>
  ) : (
    <div className="waiting">📨 Waiting for SMS...</div>
  )}

  <div className="timer">
    ⏰ Expires in: {formatTimeRemaining(rental.expires_at)}
  </div>

  <div className="actions">
    <button onClick={() => extendRental(rental.id)}>🔄 Extend</button>
    <button onClick={() => finishRental(rental.id)}>✅ Finish</button>
  </div>
</div>
```

---

## 🔐 Sécurité & Validation

### Validation côté backend

```typescript
// Durée valide
if (rentTime < 2 || rentTime > 1344) {
  throw new Error("INVALID_TIME: Duration must be between 2 and 1344 hours");
}

// Service existe
const service = await supabase
  .from("services")
  .select("*")
  .eq("code", product)
  .single();

if (!service) {
  throw new Error("BAD_SERVICE: Service not found");
}

// Balance suffisant
if (userBalance < estimatedPrice) {
  throw new Error("NO_BALANCE: Insufficient funds");
}
```

### Gestion erreurs API

```typescript
const handleApiError = (error: string) => {
  const errorMessages = {
    NO_BALANCE: "Insufficient balance. Please top up.",
    NO_NUMBERS: "No numbers available for this service/country.",
    BAD_SERVICE: "Service not available for rent.",
    INVALID_TIME: "Invalid rental duration.",
    CANT_CANCEL: "Cannot cancel after 20 minutes.",
    CHANNELS_LIMIT: "Account blocked. Contact support.",
  };

  return errorMessages[error] || "An error occurred. Please try again.";
};
```

---

## 📊 Cas d'usage pratiques

### 1. Développeur testant Instagram API

```
Service: Instagram + Threads
Pays: Kazakhstan
Durée: 1 Day (24h)
Prix: 15 × 3 = 45 Ⓐ

Scénario:
- 10h00: Location du numéro +7 999 123 4567
- 10h05: Test inscription Instagram → SMS 1 reçu (code: 12345)
- 12h30: Test reset password → SMS 2 reçu (code: 67890)
- 15h00: Test 2FA login → SMS 3 reçu (code: 54321)
- 10h00 J+1: Expiration automatique
```

### 2. Testeur QA avec "Full rent"

```
Service: Full rent
Pays: Indonesia
Durée: 1 Week (168h)
Prix: 42.93 × 15 = 644 Ⓐ

Scénario:
- Peut recevoir SMS de WhatsApp, Telegram, Facebook, etc.
- Idéal pour tests end-to-end multi-services
- 7 jours d'accès continu
```

### 3. Utilisateur avec service rare

```
Service: Any other
Pays: Malaysia
Durée: 4 Hours
Prix: 10 Ⓐ

Scénario:
- Service non listé (ex: application locale)
- Test rapide de fonctionnalité SMS
- Prix économique
```

---

## 🚨 Points d'attention

### ⚠️ Différences critiques vs Activation

| Point             | Activation                 | Rent                    |
| ----------------- | -------------------------- | ----------------------- |
| **Remboursement** | Oui (si pas de SMS)        | Non (sauf < 20min)      |
| **Durée fixe**    | 20 min                     | Variable (4h-1mois)     |
| **Prix**          | Prix de base               | Prix × multiplicateur   |
| **SMS multiples** | Non attendu                | Oui, illimité           |
| **ID API**        | activationId               | rentalId                |
| **Table DB**      | activations                | rentals                 |
| **Statut**        | pending/received/completed | active/finished/expired |

### 🔄 Gestion du temps restant

```typescript
const calculateTimeRemaining = (expiresAt: string) => {
  const now = Date.now();
  const expiresAtMs = new Date(expiresAt).getTime();
  const remainingMs = expiresAtMs - now;

  if (remainingMs <= 0) return "⏱️ Expired";

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  return `⏰ ${hours}h ${minutes}m remaining`;
};
```

### 📱 Format numéro

```typescript
// SMS-Activate retourne: "79959707564"
// Affichage souhaité: "+7 995 970 75 64"

const formatRentPhone = (phone: string) => {
  // Extraire le code pays (premier chiffre(s))
  if (phone.startsWith("7")) {
    // Russie/Kazakhstan: +7 XXX XXX XX XX
    return phone.replace(/^7(\d{3})(\d{3})(\d{2})(\d{2})$/, "+7 $1 $2 $3 $4");
  } else if (phone.startsWith("62")) {
    // Indonésie: +62 XXX XXXX XXXX
    return phone.replace(/^62(\d{3})(\d{4})(\d{4})$/, "+62 $1 $2 $3");
  }
  // Format générique
  return "+" + phone;
};
```

---

## 🎯 Résumé: Flow complet en 1 schéma

```
USER CLICKS "RENT" MODE
         ↓
[STEP 1: SELECT SERVICE]
├─ Any other (❓)
├─ Full rent (🏠)
└─ Popular services (📷 💬 🌐)
         ↓
[STEP 2: SELECT COUNTRY]
API: getRentServicesAndCountries
├─ Returns: countries, prices, quantity
└─ Display: 🇰🇿 Kazakhstan - 120 numbers - 15 Ⓐ
         ↓
[STEP 3: SELECT DURATION]
├─ 4 Hours   (×1)  → 15 Ⓐ
├─ 1 Day     (×3)  → 45 Ⓐ
├─ 1 Week    (×15) → 225 Ⓐ
└─ 1 Month   (×50) → 750 Ⓐ
         ↓
[USER CLICKS "RENT" BUTTON]
         ↓
[BACKEND PROCESSING]
1. Check balance
2. API: getRentNumber → Returns {id, number, endDate}
3. Save to DB (rentals table)
4. Deduct balance
5. Create transaction
         ↓
[DISPLAY IN "ACTIVE NUMBERS"]
┌──────────────────────────────┐
│ 📷🇰🇿 Instagram... Kazakhstan│
│ +7 995 970 75 64  [COPY][⋮] │
│ 📨 Waiting for SMS...        │
│ ⏰ Expires in: 23h 55m       │
└──────────────────────────────┘
         ↓
[POLLING LOOP - Every 5s]
API: getRentStatus(rentalId)
         ↓
[SMS RECEIVED]
┌──────────────────────────────┐
│ 💬 SMS 1: Your code is 12345 │
│ 💬 SMS 2: Welcome!           │
│ ⏰ Expires in: 20h 30m       │
└──────────────────────────────┘
         ↓
[END OF RENTAL]
├─ Auto: expires_at reached → status='expired'
├─ Manual: User clicks "Finish" → status='finished'
└─ Extend: User clicks "Extend" → new expires_at, deduct price
```

---

## ✅ Checklist d'implémentation

### Frontend

- [ ] Afficher services spéciaux (Any other, Full rent) en mode RENT
- [ ] Sélecteur de durée (4h, 1j, 1sem, 1mois)
- [ ] Calcul prix avec multiplicateurs
- [ ] Affichage temps restant en temps réel
- [ ] Liste SMS reçus avec copie facile
- [ ] Actions: Extend, Finish, Copy

### Backend

- [ ] Edge Function: buy-sms-activate-rent
- [ ] Edge Function: get-rent-sms (polling)
- [ ] Edge Function: extend-rent
- [ ] Edge Function: finish-rent
- [ ] Webhook endpoint pour SMS en temps réel
- [ ] Cron job: vérifier expirations et mettre status='expired'

### Base de données

- [ ] Table `rentals` avec tous les champs nécessaires
- [ ] Index sur user_id, rental_id, status, expires_at
- [ ] RLS policies (users can only see their own rentals)
- [ ] Trigger pour updated_at

### Sécurité

- [ ] Validation durée (2-1344 heures)
- [ ] Vérification balance avant location
- [ ] Vérification ownership avant actions (extend, finish)
- [ ] Rate limiting sur les appels API
- [ ] Logging de toutes les transactions

---

## 📚 Documentation API complète

Voir: `/sms activate help/API_ANALYSIS_COMPLETE.md` section "Rent Api"

**URLs clés:**

- getRentServicesAndCountries: Liste services/pays/prix disponibles
- getRentNumber: Louer un numéro
- getRentStatus: Récupérer les SMS reçus
- setRentStatus: Terminer/annuler la location
- continueRentNumber: Prolonger la location
- continueRentInfo: Obtenir le prix de prolongation

---

**FIN DE L'ANALYSE** 🎉

Cette analyse couvre tous les aspects du mode RENT. Suivez ce document pour implémenter correctement toutes les fonctionnalités!
