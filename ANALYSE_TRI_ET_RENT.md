# 🔍 ANALYSE COMPLÈTE - TRI DES PAYS & SYSTÈME RENT

## 📊 PARTIE 1: TRI DES PAYS SELON SMS-ACTIVATE

### 1.1 API SMS-Activate - Méthodes de Tri Disponibles

#### getTopCountriesByService

```
GET /stubs/handler_api.php?api_key=KEY&action=getTopCountriesByService&service=SERVICE&freePrice=true
```

**Réponse:**

```json
{
  "0": {
    "country": 2,
    "count": 43575,
    "price": 15.0,
    "retail_price": 30.0,
    "freePriceMap": {
      "15.00": 43242,
      "18.00": 333
    }
  }
}
```

**Avantages:**

- ✅ Tri automatique par popularité/disponibilité
- ✅ Retourne les meilleurs pays pour un service spécifique
- ✅ Inclut les prix et quantités réelles
- ✅ Support Free Price (pricing dynamique)

#### getTopCountriesByServiceRank

```
GET /stubs/handler_api.php?api_key=KEY&action=getTopCountriesByServiceRank&service=SERVICE&freePrice=true
```

**Réponse:** Même format mais **considère le rang de l'utilisateur** (premium = meilleurs prix)

#### getListOfTopCountriesByService

```
GET /stubs/handler_api.php?api_key=KEY&action=getListOfTopCountriesByService&service=SERVICE&length=10&page=1
```

**Réponse:**

```json
[
  {
    "country": 2,
    "share": 50, // % des achats de ce service par pays
    "rate": 50 // % de succès des activations
  }
]
```

**Avantages:**

- ✅ Statistiques de performance (taux de succès)
- ✅ Pourcentage de popularité
- ✅ Pagination (top 10, 20, 50, etc.)

---

### 1.2 Tri Actuel dans la Plateforme

#### Frontend (DashboardPage.tsx ligne 313-332)

```typescript
const mapped = availability
  .filter((c: any) => c.available > 0)
  .map((c: any) => {
    const price = priceMap.get(c.countryCode.toLowerCase()) || 1.0;
    const successRate = successRateMap.get(c.countryCode.toLowerCase()) || 95;

    return {
      id: c.countryId.toString(),
      name: c.countryName,
      code: c.countryCode,
      flag: getFlagEmoji(c.countryCode),
      successRate: Number(successRate.toFixed(1)),
      count: c.available,
      price: Number(price.toFixed(2)),
    };
  });
```

**Tri actuel:** Par quantité disponible (descendant) uniquement

#### Edge Function (get-country-availability/index.ts ligne 151-153)

```typescript
const availability = results
  .filter((r): r is CountryAvailability => r !== null)
  .sort((a, b) => b.available - a.available);
```

**Problème:** Ne prend pas en compte:

- ❌ Le taux de succès des activations
- ❌ La popularité du pays pour ce service
- ❌ Le coût (certains utilisateurs préfèrent pas cher)

---

### 1.3 Côté Admin - Gestion des Pays

#### AdminCountries.tsx (ligne 23-28)

```typescript
const { data: countries = [], isLoading } = useQuery({
  queryKey: ["admin-countries", searchTerm, statusFilter],
  queryFn: () =>
    getCountries({
      search: searchTerm || undefined,
      active: statusFilter === "all" ? undefined : statusFilter === "active",
    }),
});
```

#### sync-service.ts (ligne 345-356)

```typescript
export const getCountries = async (filters?: {
  active?: boolean
  search?: string
}): Promise<Country[]> => {
  let query = supabase
    .from('countries')
    .select('*')
    // TRI COMME 5SIM: display_order DESC puis available_numbers DESC
    .order('display_order', { ascending: false })
    .order('available_numbers', { ascending: false })
```

**Points:**

- ✅ Admin peut définir `display_order` manuellement
- ✅ Tri par `available_numbers` en fallback
- ❌ Pas de synchronisation avec les stats réelles SMS-Activate
- ❌ Pas de tri par `success_rate` ou `share`

---

### 1.4 Base de Données - Table countries

#### Schema actuel (supabase/schema.sql)

```sql
CREATE TABLE countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  success_rate DECIMAL DEFAULT 95,
  available_numbers INTEGER DEFAULT 0,
  price_multiplier DECIMAL DEFAULT 1.0,
  display_order INTEGER DEFAULT 0,
  popularity_score INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  provider TEXT DEFAULT 'sms-activate'
);

CREATE INDEX idx_countries_display_order ON countries(display_order DESC);
CREATE INDEX idx_countries_popularity ON countries(popularity_score DESC);
```

**Colonnes pour le tri:**

- ✅ `display_order`: Ordre manuel (admin)
- ✅ `popularity_score`: Score de popularité
- ✅ `success_rate`: Taux de succès (%)
- ✅ `available_numbers`: Quantité disponible
- ⚠️ Mais pas synchronisées avec SMS-Activate stats!

---

## 🎯 SOLUTION PROPOSÉE - TRI INTELLIGENT

### Phase 1: Créer Edge Function pour récupérer Top Countries SMS-Activate

**Nouvelle fonction:** `get-top-countries-by-service`

```typescript
// supabase/functions/get-top-countries-by-service/index.ts

interface TopCountryData {
  countryId: number;
  countryCode: string;
  countryName: string;
  count: number;
  price: number;
  share: number; // % des achats pour ce service
  successRate: number; // % de succès des activations
  rank: number; // Position dans le classement
}

async function getTopCountries(service: string): Promise<TopCountryData[]> {
  // 1. Appeler getTopCountriesByServiceRank (considère le rang utilisateur)
  const rankUrl = `${API_URL}?api_key=${KEY}&action=getTopCountriesByServiceRank&service=${service}&freePrice=true`;
  const rankResponse = await fetch(rankUrl);
  const rankData = await rankResponse.json();

  // 2. Appeler getListOfTopCountriesByService (stats de performance)
  const statsUrl = `${API_URL}?api_key=${KEY}&action=getListOfTopCountriesByService&service=${service}&length=50`;
  const statsResponse = await fetch(statsUrl);
  const statsData = await statsResponse.json();

  // 3. Merger les données
  const merged = rankData.map((country, index) => {
    const stats = statsData.find((s) => s.country === country.country);
    return {
      countryId: country.country,
      count: country.count,
      price: country.price,
      share: stats?.share || 0,
      successRate: stats?.rate || 95,
      rank: index + 1,
    };
  });

  // 4. Calculer un score composite
  return merged
    .map((c) => ({
      ...c,
      // 10% poids sur ranking
      compositeScore:
        c.successRate * 0.4 + // 40% poids sur succès
        c.share * 0.3 + // 30% poids sur popularité
        (c.count > 0 ? 20 : 0) + // 20 points si disponible
        (100 - c.rank) * 0.1,
    }))
    .sort((a, b) => b.compositeScore - a.compositeScore);
}
```

### Phase 2: Synchroniser les stats en DB

**Nouvelle fonction:** `sync-country-stats`

```typescript
// Cron job quotidien: Synchroniser les stats de tous les services
for (const service of TOP_SERVICES) {
  const topCountries = await getTopCountries(service.code);

  for (const country of topCountries) {
    await supabase.from("country_service_stats").upsert({
      country_code: country.countryCode,
      service_code: service.code,
      success_rate: country.successRate,
      popularity_share: country.share,
      ranking_position: country.rank,
      last_synced: new Date(),
    });
  }
}
```

### Phase 3: Modifier le tri frontend

```typescript
// DashboardPage.tsx - Nouveau tri intelligent
const sortedCountries = countries.sort((a, b) => {
  // Priorité 1: Success rate (40%)
  const scoreA_success = a.successRate * 0.4;
  const scoreB_success = b.successRate * 0.4;

  // Priorité 2: Popularité (30%)
  const scoreA_popularity = (a.popularityShare || 0) * 0.3;
  const scoreB_popularity = (b.popularityShare || 0) * 0.3;

  // Priorité 3: Disponibilité (20%)
  const scoreA_availability = a.count > 1000 ? 20 : a.count > 100 ? 10 : 5;
  const scoreB_availability = b.count > 1000 ? 20 : b.count > 100 ? 10 : 5;

  // Priorité 4: Prix (10%)
  const scoreA_price = (10 - a.price / 2) * 0.1;
  const scoreB_price = (10 - b.price / 2) * 0.1;

  const totalA =
    scoreA_success + scoreA_popularity + scoreA_availability + scoreA_price;
  const totalB =
    scoreB_success + scoreB_popularity + scoreB_availability + scoreB_price;

  return totalB - totalA;
});
```

---

## 🏠 PARTIE 2: SYSTÈME RENT (LOCATION DE NUMÉROS)

### 2.1 API SMS-Activate Rent - Endpoints Disponibles

#### 1. getRentServicesAndCountries

```
GET /stubs/handler_api.php?api_key=KEY&action=getRentServicesAndCountries&rent_time=4&country=2&incomingCall=true
```

**Réponse:**

```json
{
  "countries": { "0": 2, "1": 6 },
  "operators": { "0": "any", "1": "beeline", "2": "altel" },
  "services": {
    "full": { "cost": 42.93, "quant": 20 },
    "vk": { "cost": 21.95, "quant": 20 },
    "wa": { "cost": 7.68, "quant": 55 }
  },
  "currency": 840
}
```

**Usage:** Découvrir quels services/pays sont disponibles en location

#### 2. getRentNumber

```
GET /stubs/handler_api.php?api_key=KEY&action=getRentNumber&service=wa&rent_time=24&country=2&url=WEBHOOK_URL&incomingCall=true
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

**Paramètres:**

- `service`: Code du service (wa, tg, fb, etc.)
- `rent_time`: Durée en heures (4, 24, 168, 720)
- `country`: ID du pays
- `operator`: Opérateur mobile (optionnel)
- `url`: Webhook pour recevoir les SMS
- `incomingCall`: true si on veut recevoir des appels

#### 3. getRentStatus

```
GET /stubs/handler_api.php?api_key=KEY&action=getRentStatus&id=1049&page=1&size=10
```

**Réponse:**

```json
{
  "status": "success",
  "quantity": "2",
  "values": {
    "0": {
      "phoneFrom": "79180230628",
      "text": "Your code is 5",
      "service": "ot",
      "date": "2020-01-30 14:31:58"
    },
    "1": {
      "phoneFrom": "79180230628",
      "text": "Your code is 4",
      "service": "ot",
      "date": "2020-01-30 14:04:16"
    }
  }
}
```

**Usage:** Récupérer les SMS reçus sur le numéro loué

#### 4. setRentStatus

```
GET /stubs/handler_api.php?api_key=KEY&action=setRentStatus&id=1049&status=1
```

**Status:**

- `1`: Finish (terminer la location)
- `2`: Cancel (annuler et rembourser, seulement < 20 min)

#### 5. continueRentNumber

```
GET /stubs/handler_api.php?api_key=KEY&action=continueRentNumber&id=1049&rent_time=24
```

**Réponse:**

```json
{
  "status": "success",
  "phone": {
    "id": 1049,
    "endDate": "2020-02-01T12:01:52",
    "number": "79959707564"
  }
}
```

**Usage:** Prolonger la location (max 1344h = 56 jours)

#### 6. getRentList

```
GET /stubs/handler_api.php?api_key=KEY&action=getRentList&length=10&page=1
```

**Réponse:**

```json
{
  "status": "success",
  "values": {
    "0": { "id": "12345", "phone": "79181234567" },
    "1": { "id": "12346", "phone": "79181234568" }
  }
}
```

**Usage:** Liste de toutes les locations actives

#### 7. continueRentInfo

```
GET /stubs/handler_api.php?api_key=KEY&action=continueRentInfo&id=1049&hours=24&needHistory=true
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

**Usage:** Obtenir le prix et l'historique avant de prolonger

---

### 2.2 Architecture Actuelle de Rent dans la Plateforme

#### Table `rentals` (supabase/schema.sql)

```sql
CREATE TABLE rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  rental_id TEXT NOT NULL,           -- ID SMS-Activate
  phone TEXT NOT NULL,
  service_code TEXT NOT NULL,
  country_code TEXT NOT NULL,
  price DECIMAL NOT NULL,
  rent_hours INTEGER NOT NULL,
  status TEXT NOT NULL,              -- active, finished, cancelled
  end_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Edge Functions Existantes

**1. rent-sms-activate-number**

- Appelle `getRentNumber` de SMS-Activate
- Crée l'entrée en DB
- Débite l'utilisateur

**2. get-sms-activate-inbox**

- Appelle `getRentStatus` pour récupérer les SMS
- Retourne les messages reçus

**3. continue-sms-activate-rent**

- Appelle `continueRentNumber`
- Met à jour `end_date` en DB

#### Frontend (RentPage.tsx)

**Composants:**

- Sélection service
- Sélection pays
- Sélection durée (4h, 24h, 1 semaine, 1 mois)
- Liste des locations actives
- Inbox des SMS reçus

**Fonctionnalités manquantes:**

- ❌ Pas de webhook pour recevoir SMS en temps réel
- ❌ Pas de notification quand SMS arrive
- ❌ Pas d'option "incoming call" (recevoir appels)
- ❌ Pas de filtre par opérateur
- ❌ Pas d'historique des prolongations
- ❌ Pas de calcul du prix avant prolongation
- ❌ Pas de sync automatique des SMS (polling manuel)

---

### 2.3 Améliorations à Implémenter

#### Phase 1: Webhooks pour SMS en temps réel

**1. Créer Edge Function webhook**

```typescript
// supabase/functions/sms-activate-webhook/index.ts
serve(async (req) => {
  const { activationId, service, text, code, country, receivedAt } =
    await req.json();

  // 1. Trouver la location correspondante
  const { data: rental } = await supabase
    .from("rentals")
    .select("*")
    .eq("rental_id", activationId)
    .single();

  // 2. Sauvegarder le SMS
  await supabase.from("rental_sms").insert({
    rental_id: rental.id,
    from_phone: extractPhone(text),
    text: text,
    code: code,
    service: service,
    received_at: receivedAt,
  });

  // 3. Envoyer notification push à l'utilisateur
  await sendPushNotification(rental.user_id, {
    title: `New SMS on ${rental.phone}`,
    body: code ? `Code: ${code}` : text.substring(0, 50),
  });

  return new Response("OK", { status: 200 });
});
```

**2. Configurer webhook dans SMS-Activate**

- URL: `https://YOUR_PROJECT.supabase.co/functions/v1/sms-activate-webhook`
- Whitelist IPs: 188.42.218.183, 142.91.156.119

#### Phase 2: Support des appels entrants

**1. Ajouter option dans UI**

```typescript
<Switch
  checked={incomingCall}
  onCheckedChange={setIncomingCall}
  label="Receive incoming calls (+$0.50)"
/>
```

**2. Modifier l'appel API**

```typescript
const { data } = await supabase.functions.invoke("rent-sms-activate-number", {
  body: {
    service: selectedService.code,
    country: selectedCountry.code,
    rentHours: selectedDuration.hours,
    incomingCall: incomingCall,
    userId: user?.id,
  },
});
```

#### Phase 3: Gestion avancée des locations

**1. Table d'historique des prolongations**

```sql
CREATE TABLE rental_extensions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID REFERENCES rentals(id),
  hours_added INTEGER NOT NULL,
  price DECIMAL NOT NULL,
  extended_at TIMESTAMP DEFAULT NOW()
);
```

**2. Calcul du prix avant prolongation**

```typescript
const getProlongationPrice = async (rentalId: string, hours: number) => {
  const { data } = await supabase.functions.invoke(
    "get-rent-prolongation-info",
    {
      body: { rentalId, hours },
    }
  );
  return data.price;
};
```

**3. UI pour choisir la durée de prolongation**

```typescript
<Select value={extendHours} onValueChange={setExtendHours}>
  <SelectItem value="4">4 hours (+$0.50)</SelectItem>
  <SelectItem value="24">24 hours (+$1.00)</SelectItem>
  <SelectItem value="168">7 days (+$5.00)</SelectItem>
</Select>
```

#### Phase 4: Polling automatique des SMS

**1. Hook pour polling**

```typescript
// hooks/useRentPolling.ts
export const useRentPolling = (rentals: Rental[]) => {
  useEffect(() => {
    const activeRentals = rentals.filter((r) => r.status === "active");

    const intervals = activeRentals.map((rental) => {
      return setInterval(async () => {
        const { data } = await supabase.functions.invoke(
          "get-sms-activate-inbox",
          {
            body: { rentalId: rental.rental_id, userId: user?.id },
          }
        );

        if (data.messages.length > 0) {
          // Afficher notification
          toast.success(`New SMS on ${rental.phone}`);
        }
      }, 30000); // Check every 30 seconds
    });

    return () => intervals.forEach(clearInterval);
  }, [rentals]);
};
```

#### Phase 5: Admin - Monitoring des locations

**Nouvelle page:** `AdminRentals.tsx`

```typescript
// Stats à afficher
- Locations actives
- Revenue total des locations
- Durée moyenne de location
- Taux de prolongation
- Services les plus loués
- Pays les plus demandés

// Fonctionnalités
- Liste de toutes les locations (actives, terminées, annulées)
- Filtrer par statut, service, pays
- Voir les SMS reçus pour chaque location
- Terminer une location manuellement (remboursement)
- Voir l'historique des prolongations
```

---

## 📋 PLAN D'ACTION DÉTAILLÉ

### TODO 1: Implémenter tri intelligent des pays ✅

- [x] Créer `get-top-countries-by-service` Edge Function
- [ ] Créer table `country_service_stats`
- [ ] Créer cron job `sync-country-stats`
- [ ] Modifier `get-country-availability` pour utiliser les stats
- [ ] Modifier frontend pour tri composite (success + popularity + availability + price)
- [ ] Ajouter filtres dans admin (tri par success rate, popularity, price)

### TODO 2: Améliorer système Rent existant ✅

- [ ] Créer `sms-activate-webhook` Edge Function
- [ ] Créer table `rental_sms` pour stocker les SMS
- [ ] Créer table `rental_extensions` pour l'historique
- [ ] Configurer webhook dans SMS-Activate (settings)
- [ ] Ajouter notifications push (Firebase)

### TODO 3: Fonctionnalités avancées Rent ✅

- [ ] Support incoming calls (option dans UI)
- [ ] Filtrer par opérateur mobile
- [ ] Calculer prix de prolongation avant confirmation
- [ ] UI pour choisir durée de prolongation
- [ ] Polling automatique des SMS (hook)
- [ ] Annulation < 20 min avec remboursement

### TODO 4: Admin - Monitoring Rent ✅

- [ ] Créer `AdminRentals.tsx`
- [ ] Stats globales (revenue, locations actives, etc.)
- [ ] Liste de toutes les locations
- [ ] Filtres (statut, service, pays, dates)
- [ ] Terminer location manuellement
- [ ] Export des données (CSV)

### TODO 5: Tests et optimisations ✅

- [ ] Tester webhook avec vraies locations
- [ ] Tester prolongation
- [ ] Tester annulation
- [ ] Tester avec différents services
- [ ] Load testing (100+ locations simultanées)
- [ ] Optimiser requêtes DB (indexes)

---

## 🎯 PRIORITÉS RECOMMANDÉES

### 🔥 URGENT (Cette semaine)

1. **Tri intelligent des pays** - Impact direct sur UX
2. **Webhook SMS** - Expérience temps réel essentielle

### ⚡ IMPORTANT (2 semaines)

3. **Support incoming calls** - Différenciateur vs concurrents
4. **Prolongation avancée** - Augmente revenue

### 📊 NICE TO HAVE (1 mois)

5. **Admin monitoring** - Meilleure gestion
6. **Polling automatique** - Fallback si webhook fail

---

## 💡 NOTES TECHNIQUES

### Webhooks SMS-Activate

- **IPs autorisées:** 188.42.218.183, 142.91.156.119
- **Format:** POST JSON avec activationId, text, code, etc.
- **Retry:** 8 tentatives sur 2h si erreur
- **Notification Telegram:** En cas d'erreurs (max 1 fois / 5 min)

### Limites SMS-Activate

- **Max rent duration:** 1344h (56 jours)
- **Cancel window:** 20 minutes
- **Prolongation:** Illimitée tant que < 1344h total
- **Incoming calls:** +$0.50 extra

### Optimisations DB

```sql
-- Index pour requêtes fréquentes
CREATE INDEX idx_rentals_user_status ON rentals(user_id, status);
CREATE INDEX idx_rentals_end_date ON rentals(end_date) WHERE status = 'active';
CREATE INDEX idx_rental_sms_rental_id ON rental_sms(rental_id, received_at DESC);
CREATE INDEX idx_country_stats_service ON country_service_stats(service_code, ranking_position);
```

---

## ✅ CHECKLIST FINALE

- [ ] Tri des pays synchronisé avec SMS-Activate
- [ ] Webhooks configurés et testés
- [ ] Notifications push fonctionnelles
- [ ] Support incoming calls
- [ ] Prolongation avec calcul de prix
- [ ] Admin peut monitorer les locations
- [ ] Tests de charge réussis
- [ ] Documentation utilisateur mise à jour
- [ ] Vidéo démo des nouvelles fonctionnalités
