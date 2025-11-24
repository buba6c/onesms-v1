# 🔍 DEEP ANALYSE COMPLÈTE - API SMS-ACTIVATE

## 📌 **PROBLÈMES IDENTIFIÉS**

### ❌ **Problème 1: Services affichent "999 numbers"**
**Cause:** Le frontend utilise des données statiques qui retournent toujours `count: 999` comme fallback
**Localisation:** `src/pages/DashboardPage.tsx` ligne 147
```typescript
count: availabilityMap.get(s.code) || 999 // ⚠️ Fallback toujours 999
```

### ❌ **Problème 2: Page Rent vide**
**Cause:** L'API Rent de SMS-Activate n'est PAS ENCORE IMPLÉMENTÉE dans ton système
**Manquant:** 
- Edge Function `getRentServicesAndCountries`
- Edge Function `getRentNumber`
- Edge Function `getRentStatus`
- Frontend pour afficher les locations

---

## 🌐 **STRUCTURE COMPLÈTE DE L'API SMS-ACTIVATE**

### 📡 **Base URL**
```
https://api.sms-activate.ae/stubs/handler_api.php
```

### 🔑 **Authentication**
Tous les appels incluent: `?api_key=d29edd5e1d04c3127d5253d5eAe70de8`

---

## 1️⃣ **ACTIVATION API** (✅ Déjà implémenté)

### ✅ **getNumbersStatus** - Quantités disponibles
```http
GET /handler_api.php?action=getNumbersStatus&country=187&api_key=XXX
```

**Réponse:**
```json
{
  "wa_0": {
    "count": 150,
    "cost": "0.20"
  },
  "tg_0": {
    "count": 200,
    "cost": "0.15"
  }
}
```

**Usage actuel:** ✅ Utilisé dans `sync-sms-activate` et `fetchSMSActivateCountries`

---

### ✅ **getPrices** - Prix en temps réel
```http
GET /handler_api.php?action=getPrices&service=wa&country=187&api_key=XXX
```

**Réponse:**
```json
{
  "187": {
    "cost": "0.20",
    "count": 150
  }
}
```

**Usage actuel:** ✅ Utilisé dans `buy-sms-activate-number`

---

### ✅ **getNumber** - Acheter activation
```http
GET /handler_api.php?action=getNumber&service=wa&country=187&api_key=XXX
```

**Réponse:**
```json
{
  "status": "success",
  "phone": {
    "activation_id": 123456,
    "phoneNumber": "+16802784669"
  }
}
```

**Usage actuel:** ✅ Utilisé dans `buy-sms-activate-number`

---

### ✅ **getStatus** - Vérifier SMS reçu
```http
GET /handler_api.php?action=getStatus&id=123456&api_key=XXX
```

**Réponse:**
```json
"STATUS_OK:123456"
```

**Usage actuel:** ✅ Utilisé dans `check-sms-activate-sms`

---

### ✅ **setStatus** - Changer statut activation
```http
GET /handler_api.php?action=setStatus&id=123456&status=8&api_key=XXX
```

**Statuts:**
- `1` = Notify SMS sent (prolonge délai)
- `3` = Request another SMS
- `6` = Complete activation (finish)
- `8` = Cancel activation (refund)

**Usage actuel:** ✅ Utilisé dans `cancel-sms-activate-order`

---

## 2️⃣ **RENT API** (❌ PAS ENCORE IMPLÉMENTÉ)

### ❌ **getRentServicesAndCountries** - Services & pays pour location
```http
GET /handler_api.php?action=getRentServicesAndCountries&rent_time=4&api_key=XXX
```

**Paramètres:**
- `rent_time` (optionnel): Durée en heures (défaut: 2h)
- `operator` (optionnel): Opérateur mobile (ex: "beeline,altel")
- `country` (optionnel): Code pays (défaut: Kazakhstan)
- `currency` (optionnel): Code devise ISO
- `incomingCall` (optionnel): `true` pour recevoir appels vocaux

**Réponse:**
```json
{
  "counties": [2, 4, 187],
  "operators": ["beeline", "altel", "verizon"],
  "services": {
    "full": {
      "cost": 2.33,
      "retail_cost": "3.495",
      "quant": {
        "current": 100,
        "total": 110,
        "search_name": "Full rent"
      }
    },
    "wa": {
      "cost": 1.50,
      "retail_cost": "2.25",
      "quant": {
        "current": 50,
        "total": 60,
        "search_name": "WhatsApp"
      }
    }
  }
}
```

**Usage prévu:** Liste les services et pays disponibles pour location

---

### ❌ **getRentNumber** - Louer un numéro
```http
GET /handler_api.php?action=getRentNumber&service=wa&rent_time=4&country=187&api_key=XXX
```

**Paramètres:**
- `service` (obligatoire): Code service (ex: "wa", "tg", "full")
- `rent_time` (optionnel): Durée en heures (2, 12, 24, 48, 72...)
- `operator` (optionnel): Opérateur mobile
- `country` (optionnel): Code pays
- `url` (optionnel): Webhook URL pour notifications
- `incomingCall` (optionnel): `true` pour appels vocaux

**Réponse:**
```json
{
  "status": "success",
  "phone": {
    "id": 123456,
    "endDate": "2025-11-24 16:00:00",
    "number": "16802784669",
    "lock_cancel_time": 120
  }
}
```

**Champs:**
- `id`: ID de la location (pour getRentStatus)
- `endDate`: Date d'expiration
- `number`: Numéro de téléphone (SANS +)
- `lock_cancel_time`: Secondes avant pouvoir annuler (120s = 2min)

**Erreurs possibles:**
- `NO_NUMBERS`: Pas de numéros disponibles
- `NO_BALANCE`: Solde insuffisant
- `BAD_SERVICE`: Service invalide
- `RENT_NOT_AUTHORIZED`: Location non autorisée pour ce compte

---

### ❌ **getRentStatus** - Voir les SMS reçus
```http
GET /handler_api.php?action=getRentStatus&id=123456&api_key=XXX
```

**Paramètres:**
- `id` (obligatoire): ID de la location (reçu dans getRentNumber)
- `page` (optionnel): Numéro de page (défaut: 0, du plus récent au plus ancien)
- `size` (optionnel): Taille de page (défaut: 10)

**Réponse:**
```json
{
  "status": "success",
  "quantity": "3",
  "values": [
    {
      "phoneFrom": "12345",
      "text": "Your WhatsApp code is 123456",
      "service": "wa",
      "date": "2025-11-24 14:30:00"
    },
    {
      "phoneFrom": "54321",
      "text": "Your verification code: 789012",
      "service": "tg",
      "date": "2025-11-24 14:25:00"
    },
    {
      "phoneFrom": "99999",
      "text": "Code: 456789",
      "service": "ig",
      "date": "2025-11-24 14:20:00"
    }
  ]
}
```

**Pagination:** Si `quantity > size`, utiliser `page=1, 2, 3...` pour voir plus

---

### ❌ **setRentStatus** - Changer statut location
```http
GET /handler_api.php?action=setRentStatus&id=123456&status=1&api_key=XXX
```

**Statuts:**
- `1` = Cancel rent (annuler la location)

**Réponse:**
```json
{
  "status": "success"
}
```

**Note:** Impossible d'annuler pendant les `lock_cancel_time` premières secondes (120s)

---

### ❌ **getRentList** - Liste des locations actives
```http
GET /handler_api.php?action=getRentList&api_key=XXX
```

**Réponse:**
```json
{
  "status": "success",
  "values": [
    {
      "id": 123456,
      "phone": "16802784669",
      "endDate": "2025-11-24 16:00:00",
      "service": "wa",
      "status": "active"
    },
    {
      "id": 123457,
      "phone": "16802784670",
      "endDate": "2025-11-24 18:00:00",
      "service": "full",
      "status": "active"
    }
  ]
}
```

**⚠️ Limite:** Affiche seulement les 10 derniers numéros. Utiliser `getRentStatus` pour statuts individuels.

---

### ❌ **continueRentNumber** - Prolonger location
```http
GET /handler_api.php?action=continueRentNumber&id=123456&rent_time=4&api_key=XXX
```

**Paramètres:**
- `id` (obligatoire): ID de la location
- `rent_time` (obligatoire): Durée supplémentaire en heures (2, 12, 24...)

**Réponse:**
```json
{
  "status": "success",
  "endDate": "2025-11-24 20:00:00"
}
```

---

### ❌ **continueRentInfo** - Info de prolongation
```http
GET /handler_api.php?action=continueRentInfo&id=123456&api_key=XXX
```

**Réponse:**
```json
{
  "status": "success",
  "maxTime": 168,
  "prices": {
    "2": "1.50",
    "12": "7.00",
    "24": "12.00",
    "48": "22.00",
    "72": "30.00",
    "168": "60.00"
  }
}
```

**Champs:**
- `maxTime`: Durée maximale de prolongation (en heures)
- `prices`: Prix pour chaque durée

---

## 3️⃣ **API PARTNER SOFTWARE** (❌ Non analysé)

### Documentation externe:
- **OpenAPI v1:** https://sms-activate.io/docs/v1
- **OpenAPI v2:** https://sms-activate.io/docs/v2

**Usage:** API pour partenaires/revendeurs (probablement pas nécessaire pour ton cas)

---

## 🔧 **CE QUI DOIT ÊTRE FAIT**

### 1️⃣ **CORRIGER LES "999 NUMBERS"**

**Fichier:** `src/pages/DashboardPage.tsx`

**Problème actuel:**
```typescript
// LIGNE 147 - MAUVAIS FALLBACK
count: availabilityMap.get(s.code) || 999 // ⚠️ Toujours 999 si pas dans DB
```

**Solution:** Appeler `getNumbersStatus` en temps réel pour obtenir les vraies quantités

**Nouvelle approche:**
```typescript
// Au lieu de fallback 999, appeler l'API
const { data: services = [] } = useQuery({
  queryKey: ['services', selectedCategory],
  queryFn: async () => {
    const staticServices = selectedCategory === 'all' 
      ? getAllServices() 
      : getServicesByCategory(selectedCategory);
    
    // ⚡ Appeler getNumbersStatus pour CHAQUE pays top
    const topCountries = [187, 4, 6]; // USA, Philippines, Indonesia
    const totalCounts: Record<string, number> = {};
    
    for (const countryId of topCountries) {
      const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${API_KEY}&action=getNumbersStatus&country=${countryId}`;
      const data = await fetch(url).then(r => r.json());
      
      // Compter les stocks pour chaque service
      for (const service of staticServices) {
        const key = `${service.code}_0`; // wa_0, tg_0, etc.
        if (data[key]) {
          totalCounts[service.code] = (totalCounts[service.code] || 0) + parseInt(data[key].count || 0);
        }
      }
    }
    
    return staticServices.map(s => ({
      id: s.code,
      name: s.name,
      code: s.code,
      icon: s.code,
      count: totalCounts[s.code] || 0 // ✅ Vraies quantités ou 0
    }));
  }
});
```

---

### 2️⃣ **IMPLÉMENTER LA PAGE RENT COMPLÈTE**

#### **A. Créer Edge Functions Rent**

##### **1. getRentServicesAndCountries**
**Fichier:** `supabase/functions/get-rent-services/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'
const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')!

serve(async (req) => {
  try {
    const { rent_time = 4, country, operator } = await req.json()
    
    // Appeler l'API Rent
    const params = new URLSearchParams({
      api_key: SMS_ACTIVATE_API_KEY,
      action: 'getRentServicesAndCountries',
      rent_time: rent_time.toString()
    })
    
    if (country) params.append('country', country)
    if (operator) params.append('operator', operator)
    
    const response = await fetch(`${SMS_ACTIVATE_BASE_URL}?${params}`)
    const data = await response.json()
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

##### **2. getRentNumber**
**Fichier:** `supabase/functions/rent-sms-activate-number/index.ts`

```typescript
serve(async (req) => {
  const supabase = createClient(...)
  const { user_id, service, rent_time = 4, country = 187 } = await req.json()
  
  // 1. Vérifier le solde
  const { data: userData } = await supabase
    .from('users')
    .select('balance')
    .eq('id', user_id)
    .single()
  
  // 2. Obtenir le prix de location
  const priceUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentServicesAndCountries&rent_time=${rent_time}&country=${country}`
  const priceData = await fetch(priceUrl).then(r => r.json())
  const cost = priceData.services[service]?.cost || 5
  const finalPrice = cost * 1.2 // Marge 20%
  
  if (userData.balance < finalPrice) {
    return new Response(JSON.stringify({ error: 'Insufficient balance' }), { status: 400 })
  }
  
  // 3. Louer le numéro
  const rentUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentNumber&service=${service}&rent_time=${rent_time}&country=${country}`
  const rentData = await fetch(rentUrl).then(r => r.json())
  
  if (rentData.status !== 'success') {
    return new Response(JSON.stringify({ error: rentData }), { status: 400 })
  }
  
  // 4. Enregistrer dans la DB
  const { data: rental } = await supabase
    .from('rentals')
    .insert({
      user_id,
      rental_id: rentData.phone.id.toString(),
      phone: `+${rentData.phone.number}`,
      service_code: service,
      country_code: country.toString(),
      price: finalPrice,
      rent_duration_hours: rent_time,
      expires_at: rentData.phone.endDate,
      status: 'active'
    })
    .select()
    .single()
  
  // 5. Débiter le solde
  await supabase
    .from('users')
    .update({ balance: userData.balance - finalPrice })
    .eq('id', user_id)
  
  return new Response(JSON.stringify({
    success: true,
    rental: {
      id: rental.id,
      rental_id: rentData.phone.id,
      phone: `+${rentData.phone.number}`,
      expires_at: rentData.phone.endDate,
      lock_cancel_time: rentData.phone.lock_cancel_time
    }
  }), { headers: { 'Content-Type': 'application/json' } })
})
```

##### **3. getRentStatus**
**Fichier:** `supabase/functions/check-rent-messages/index.ts`

```typescript
serve(async (req) => {
  const { rental_id } = await req.json()
  
  const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentStatus&id=${rental_id}`
  const data = await fetch(url).then(r => r.json())
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

##### **4. continueRent**
**Fichier:** `supabase/functions/extend-rent/index.ts`

```typescript
serve(async (req) => {
  const supabase = createClient(...)
  const { rental_id, rent_time, user_id } = await req.json()
  
  // 1. Obtenir le prix de prolongation
  const infoUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=continueRentInfo&id=${rental_id}`
  const info = await fetch(infoUrl).then(r => r.json())
  const cost = parseFloat(info.prices[rent_time.toString()]) * 1.2 // Marge 20%
  
  // 2. Vérifier solde
  const { data: userData } = await supabase
    .from('users')
    .select('balance')
    .eq('id', user_id)
    .single()
  
  if (userData.balance < cost) {
    return new Response(JSON.stringify({ error: 'Insufficient balance' }), { status: 400 })
  }
  
  // 3. Prolonger
  const continueUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=continueRentNumber&id=${rental_id}&rent_time=${rent_time}`
  const result = await fetch(continueUrl).then(r => r.json())
  
  if (result.status !== 'success') {
    return new Response(JSON.stringify({ error: result }), { status: 400 })
  }
  
  // 4. Mettre à jour DB
  await supabase
    .from('rentals')
    .update({ expires_at: result.endDate })
    .eq('rental_id', rental_id)
  
  await supabase
    .from('users')
    .update({ balance: userData.balance - cost })
    .eq('id', user_id)
  
  return new Response(JSON.stringify({
    success: true,
    new_expiry: result.endDate
  }), { headers: { 'Content-Type': 'application/json' } })
})
```

##### **5. cancelRent**
**Fichier:** `supabase/functions/cancel-rent/index.ts`

```typescript
serve(async (req) => {
  const supabase = createClient(...)
  const { rental_id } = await req.json()
  
  // 1. Annuler sur SMS-Activate
  const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setRentStatus&id=${rental_id}&status=1`
  const result = await fetch(url).then(r => r.json())
  
  if (result.status !== 'success') {
    return new Response(JSON.stringify({ error: 'Cannot cancel yet (lock time)' }), { status: 400 })
  }
  
  // 2. Marquer comme cancelled dans DB
  await supabase
    .from('rentals')
    .update({ status: 'cancelled' })
    .eq('rental_id', rental_id)
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

---

#### **B. Créer le Frontend Rent**

**Fichier:** `src/pages/RentPage.tsx`

```typescript
export default function RentPage() {
  const [selectedService, setSelectedService] = useState<string>('full')
  const [rentDuration, setRentDuration] = useState<number>(4)
  const [selectedCountry, setSelectedCountry] = useState<number>(187)
  
  // 1. Charger les services disponibles pour location
  const { data: rentData } = useQuery({
    queryKey: ['rent-services', rentDuration, selectedCountry],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('get-rent-services', {
        body: { rent_time: rentDuration, country: selectedCountry }
      })
      return data
    }
  })
  
  // 2. Charger les locations actives
  const { data: activeRentals } = useQuery({
    queryKey: ['active-rentals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('rentals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      return data
    },
    refetchInterval: 30000 // Rafraîchir toutes les 30s
  })
  
  // 3. Louer un numéro
  const handleRent = async () => {
    const { data } = await supabase.functions.invoke('rent-sms-activate-number', {
      body: {
        user_id: user.id,
        service: selectedService,
        rent_time: rentDuration,
        country: selectedCountry
      }
    })
    
    if (data.success) {
      toast.success('Number rented successfully!')
      refetch()
    }
  }
  
  // 4. Afficher les SMS pour une location
  const [viewingRental, setViewingRental] = useState<string | null>(null)
  const { data: messages } = useQuery({
    queryKey: ['rent-messages', viewingRental],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('check-rent-messages', {
        body: { rental_id: viewingRental }
      })
      return data.values || []
    },
    enabled: !!viewingRental,
    refetchInterval: 5000 // Rafraîchir toutes les 5s
  })
  
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Colonne gauche: Louer un numéro */}
      <div>
        <h2>Rent a Number</h2>
        
        {/* Sélection durée */}
        <select value={rentDuration} onChange={(e) => setRentDuration(+e.target.value)}>
          <option value={2}>2 hours - ${rentData?.services[selectedService]?.cost * 1.2 * 2/4 || 'N/A'}</option>
          <option value={4}>4 hours - ${rentData?.services[selectedService]?.cost * 1.2 || 'N/A'}</option>
          <option value={12}>12 hours - ${rentData?.services[selectedService]?.cost * 1.2 * 12/4 || 'N/A'}</option>
          <option value={24}>1 day - ${rentData?.services[selectedService]?.cost * 1.2 * 24/4 || 'N/A'}</option>
        </select>
        
        {/* Services disponibles */}
        <div className="grid grid-cols-3 gap-2">
          {rentData?.services && Object.entries(rentData.services).map(([code, info]: any) => (
            <button
              key={code}
              onClick={() => setSelectedService(code)}
              className={selectedService === code ? 'border-blue-500' : ''}
            >
              {code === 'full' ? 'Full Rent (Any service)' : getServiceName(code)}
              <div>{info.quant.current} available</div>
              <div>${(info.cost * 1.2).toFixed(2)}</div>
            </button>
          ))}
        </div>
        
        <button onClick={handleRent}>
          Rent Number for {rentDuration}h
        </button>
      </div>
      
      {/* Colonne droite: Locations actives */}
      <div>
        <h2>Active Rentals</h2>
        {activeRentals?.map(rental => (
          <div key={rental.id} className="border rounded p-4">
            <div className="flex justify-between">
              <div>
                <p className="font-bold">{rental.phone}</p>
                <p className="text-sm">{rental.service_code}</p>
              </div>
              <div className="text-right">
                <p>Expires: {new Date(rental.expires_at).toLocaleString()}</p>
                <CountdownTimer expiresAt={rental.expires_at} />
              </div>
            </div>
            
            <button onClick={() => setViewingRental(rental.rental_id)}>
              View Inbox ({messages?.length || 0} messages)
            </button>
            
            {/* Inbox modal */}
            {viewingRental === rental.rental_id && (
              <div className="mt-4 border-t pt-4">
                <h3>Messages Inbox</h3>
                {messages?.map((msg: any, i: number) => (
                  <div key={i} className="bg-gray-50 p-3 mb-2 rounded">
                    <p className="text-xs text-gray-500">From: {msg.phoneFrom} | {msg.date}</p>
                    <p className="font-mono">{msg.text}</p>
                    <p className="text-xs text-gray-400">Service: {msg.service}</p>
                  </div>
                ))}
                {messages?.length === 0 && (
                  <p className="text-gray-400">No messages yet. Waiting...</p>
                )}
              </div>
            )}
            
            {/* Actions */}
            <div className="flex gap-2 mt-2">
              <button onClick={() => handleExtend(rental.rental_id)}>
                Extend +4h
              </button>
              <button onClick={() => handleCancel(rental.rental_id)} className="bg-red-500">
                Cancel
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 📊 **RÉSUMÉ DES ACTIONS**

### ✅ **CE QUI FONCTIONNE DÉJÀ**
1. ✅ Activation API complète (getNumber, getStatus, setStatus)
2. ✅ Sync des services et pays
3. ✅ Achat de numéros d'activation
4. ✅ Réception de SMS
5. ✅ Annulation d'activations

### ❌ **CE QUI MANQUE**
1. ❌ **Correction "999 numbers"** → Appeler `getNumbersStatus` en temps réel
2. ❌ **Rent API complète** → 5 Edge Functions à créer
3. ❌ **Page Rent frontend** → Interface complète avec inbox

---

## 🎯 **PLAN D'ACTION PRIORITAIRE**

### **Priorité 1: Corriger "999 numbers" (30 min)**
- Modifier `DashboardPage.tsx` pour appeler `getNumbersStatus` en temps réel
- Supprimer le fallback `999`
- Tester avec plusieurs services

### **Priorité 2: Implémenter Rent API (2-3 heures)**
- Créer 5 Edge Functions:
  1. `get-rent-services` (getRentServicesAndCountries)
  2. `rent-sms-activate-number` (getRentNumber)
  3. `check-rent-messages` (getRentStatus)
  4. `extend-rent` (continueRentNumber)
  5. `cancel-rent` (setRentStatus)

### **Priorité 3: Créer page Rent complète (2-3 heures)**
- Interface de sélection (service, durée, pays)
- Liste des locations actives
- Inbox pour chaque location
- Actions (extend, cancel)
- Countdown timer

---

## 📝 **NOTES IMPORTANTES**

### **Différences Activation vs Rent:**
| Aspect | Activation | Rent |
|--------|-----------|------|
| **Durée** | ~20 minutes | 2h à 7 jours (168h) |
| **Prix** | $0.20 - $1.00 | $2.00 - $60.00 |
| **Usage** | 1 SMS pour 1 service | SMS multiples, services multiples |
| **API** | getNumber → getStatus | getRentNumber → getRentStatus (pagination) |
| **Inbox** | 1 SMS attendu | Inbox complet avec historique |
| **Prolongation** | Non (mais reactivation possible) | Oui (continueRent) |

### **Service "full" = BEST VALUE**
- Permet de recevoir des SMS de **TOUS les services**
- Plus cher mais flexible
- Idéal pour créer plusieurs comptes

### **Lock Cancel Time (120s)**
- Impossible d'annuler pendant les 2 premières minutes
- Éviter les abus
- Afficher un countdown dans l'UI

---

## 🔗 **RESSOURCES**

- **Documentation officielle:** https://sms-activate.io/api2
- **OpenAPI v1:** https://sms-activate.io/docs/v1
- **OpenAPI v2:** https://sms-activate.io/docs/v2
- **Fichiers JSON fournis:**
  - `countries.json` - 204 pays
  - `services.json` - 1000+ services
  - `api-1.json` - Spec OpenAPI complète (4214 lignes)
  - `api-1 (1).json` - Spec supplémentaire

---

**Créé le:** 24 novembre 2025  
**API Key:** d29edd5e1d04c3127d5253d5eAe70de8  
**Balance:** $9.63
