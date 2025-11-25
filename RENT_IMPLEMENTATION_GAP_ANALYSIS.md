# 🔍 ANALYSE DES MANQUES: Implémentation Mode RENT

**Date:** 25 novembre 2025  
**Statut:** 🔴 INCOMPLET - Plusieurs composants manquants

---

## 📊 Vue d'ensemble

### ✅ Ce qui existe déjà

1. **RentPage.tsx séparée** - Page dédiée au rent (mais déconnectée du DashboardPage)
2. **Edge Functions backend**:
   - `buy-sms-activate-rent` ✅
   - `get-rent-status` ✅  
   - `check-sms-activate-rent` ✅
   - `continue-sms-activate-rent` ✅
   - `set-rent-status` ✅
   - `get-sms-activate-inbox` ✅
   
3. **Table `rentals` en DB** ✅
4. **Mode toggle dans DashboardPage** ✅ (Activation/Rent)
5. **Variable `rentDuration`** ✅
6. **Logique de prix avec multiplicateurs** ✅

### 🔴 Ce qui MANQUE complètement

---

## 1️⃣ **SERVICES SPÉCIAUX: "Any other" & "Full rent"**

### 📋 Problème identifié
Dans `DashboardPage.tsx`, ligne 665+, la section services spéciaux a été ajoutée mais:

```tsx
{mode === 'rent' && (
  <div className="mb-4">
    <p className="text-[10px]...">IF THE REQUIRED SERVICE IS NOT IN THE LIST</p>
    <div className="space-y-2 mb-4">
      {/* Any other */}
      <div onClick={() => handleServiceSelect({
        id: 'any',
        name: 'Any other',
        code: 'any',  // ⚠️ PROBLÈME: Ce code n'existe pas en DB
        count: 3249,
        icon: '❓'
      })}>
        
      {/* Full rent */}
      <div onClick={() => handleServiceSelect({
        id: 'rent',
        name: 'Full rent',
        code: 'full',  // ⚠️ PROBLÈME: Ce code n'existe pas en DB
        count: 597,
        icon: '🏠'
      })}>
```

### ❌ Manques critiques

1. **Codes services inexistants en DB**
   - `any` n'existe pas dans table `services`
   - `full` n'existe pas dans table `services`
   - Quand l'utilisateur sélectionne ces services, l'appel API échouera

2. **Quantités hardcodées**
   - `count: 3249` et `count: 597` sont statiques
   - Ne reflètent pas la disponibilité réelle de SMS-Activate

3. **Pas de récupération dynamique**
   - Devrait appeler `getRentServicesAndCountries` pour obtenir les vrais prix/quantités

### ✅ Solution requise

```typescript
// 1. Ajouter ces services en DB
INSERT INTO services (code, name, display_name, icon, category, active, provider)
VALUES 
  ('any', 'Any other', 'Any other', '❓', 'other', true, 'sms-activate'),
  ('full', 'Full rent', 'Full rent', '🏠', 'other', true, 'sms-activate');

// 2. Récupérer les quantités dynamiquement
const { data: specialServices } = await supabase.functions.invoke('get-rent-services', {
  body: { 
    rentTime: 4,  // Par défaut 4h
    country: 2    // Kazakhstan par défaut
  }
});

// Réponse attendue:
{
  services: {
    "any": { cost: 10.5, quant: 3249 },
    "full": { cost: 42.93, quant: 597 }
  }
}
```

---

## 2️⃣ **AFFICHAGE LOCATIONS ACTIVES MANQUANT**

### 📋 Problème identifié

Dans `DashboardPage.tsx`, la section "Active numbers" (lignes 948-1050) affiche **uniquement les activations** (`activations` table), **PAS les rentals**.

```tsx
// ❌ ACTUEL: Charge seulement activations
const { data: dbActivations = [], refetch: refetchActivations } = useQuery({
  queryKey: ['active-numbers', user?.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('activations')  // ❌ Seulement activations!
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'waiting', 'received'])
  }
});

// ✅ REQUIS: Charger AUSSI les rentals
```

### ❌ Conséquences

1. Quand un utilisateur loue un numéro en mode RENT, il n'apparaît **nulle part** dans le Dashboard
2. Pas de moyen de voir les SMS reçus sur les locations
3. Pas d'actions possibles (extend, finish, copy)

### ✅ Solution requise

**Option 1: Fusionner dans une seule liste**
```typescript
interface ActiveItem {
  id: string;
  type: 'activation' | 'rental';  // Nouveau champ
  phone: string;
  service: string;
  country: string;
  status: string;
  price: number;
  expiresAt: string;
  // Spécifique rental:
  duration?: number;
  messagesCount?: number;
  // Spécifique activation:
  smsCode?: string;
  smsText?: string;
}

const { data: activeItems = [] } = useQuery({
  queryKey: ['active-items', user?.id],
  queryFn: async () => {
    // Charger activations
    const { data: activations } = await supabase
      .from('activations')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'waiting', 'received']);
    
    // Charger rentals
    const { data: rentals } = await supabase
      .from('rentals')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active');
    
    // Fusionner et formater
    return [
      ...activations.map(a => ({
        id: a.id,
        type: 'activation' as const,
        phone: a.phone,
        service: a.service_code,
        country: a.country_code,
        status: a.status,
        price: a.price,
        expiresAt: a.expires_at,
        smsCode: a.sms_code,
        smsText: a.sms_text
      })),
      ...rentals.map(r => ({
        id: r.id,
        type: 'rental' as const,
        phone: r.phone,
        service: r.service_code,
        country: r.country_code,
        status: r.status,
        price: r.price,
        expiresAt: r.expires_at,
        duration: r.duration_hours,
        messagesCount: r.message_count
      }))
    ];
  }
});
```

**Option 2: Deux sections séparées**
```tsx
<div className="space-y-6">
  {/* Section Activations */}
  {mode === 'activation' && (
    <div>
      <h2>Active Activations</h2>
      {activations.map(act => <ActivationCard />)}
    </div>
  )}

  {/* Section Rentals */}
  {mode === 'rent' && (
    <div>
      <h2>Active Rentals</h2>
      {rentals.map(rent => <RentalCard />)}
    </div>
  )}
</div>
```

---

## 3️⃣ **COMPOSANT RENTAL CARD MANQUANT**

### 📋 Problème identifié

Il n'existe **aucun composant** pour afficher une location active dans le Dashboard.

### ✅ Composant requis

```tsx
interface RentalCardProps {
  rental: {
    id: string;
    rental_id: string;  // ID SMS-Activate
    phone: string;
    service_code: string;
    country_code: string;
    price: number;
    duration_hours: number;
    expires_at: string;
    status: 'active' | 'finished' | 'expired';
    message_count?: number;
  };
}

const RentalCard = ({ rental }: RentalCardProps) => {
  const [messages, setMessages] = useState([]);
  const [expanded, setExpanded] = useState(false);
  
  const loadMessages = async () => {
    const { data } = await supabase.functions.invoke('get-rent-status', {
      body: { rentId: rental.rental_id }
    });
    setMessages(data.messages || []);
  };
  
  const extendRental = async () => {
    await supabase.functions.invoke('continue-sms-activate-rent', {
      body: { rentalId: rental.rental_id, rentTime: 4 }
    });
  };
  
  const finishRental = async () => {
    await supabase.functions.invoke('set-rent-status', {
      body: { rentalId: rental.rental_id, status: 1 }
    });
  };
  
  return (
    <div className="rental-card">
      {/* Header */}
      <div className="flex items-center gap-4">
        <img src={getServiceLogo(rental.service_code)} />
        <div>
          <p>{formatPhoneNumber(rental.phone)}</p>
          <p>{rental.service_code} • {rental.country_code}</p>
        </div>
        <button onClick={() => copyToClipboard(rental.phone)}>
          <Copy />
        </button>
      </div>
      
      {/* Duration badge */}
      <div className="duration-badge">
        <Clock /> {rental.duration_hours}h rental
      </div>
      
      {/* Timer */}
      <div className="timer">
        ⏰ {calculateTimeRemaining(rental.expires_at)}
      </div>
      
      {/* Messages section (expandable) */}
      <button onClick={() => { setExpanded(!expanded); if(!expanded) loadMessages(); }}>
        📨 {rental.message_count || 0} messages
        {expanded ? <ChevronUp /> : <ChevronDown />}
      </button>
      
      {expanded && (
        <div className="messages-list">
          {messages.length === 0 ? (
            <p>No messages yet</p>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className="message">
                <div className="message-header">
                  <span>{msg.service}</span>
                  <span>{formatDate(msg.date)}</span>
                </div>
                <div className="message-text">{msg.text}</div>
                {msg.code && (
                  <div className="message-code">
                    <code>{msg.code}</code>
                    <button onClick={() => copyToClipboard(msg.code)}>
                      <Copy />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
      
      {/* Actions */}
      <div className="actions">
        <button onClick={extendRental}>
          <Plus /> Extend
        </button>
        <button onClick={finishRental}>
          <Check /> Finish
        </button>
      </div>
    </div>
  );
};
```

---

## 4️⃣ **POLLING SMS POUR RENTALS MANQUANT**

### 📋 Problème identifié

Le système de polling actuel (`useSmsPolling`, `useRealtimeSms`) fonctionne **uniquement pour les activations**, pas pour les rentals.

```typescript
// ❌ ACTUEL: Seulement pour activations
export const useSmsPolling = (activationIds: string[]) => {
  useEffect(() => {
    const interval = setInterval(async () => {
      for (const activationId of activationIds) {
        await supabase.functions.invoke('check-sms-activate-status', {
          body: { activationId }
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activationIds]);
};
```

### ✅ Hook requis pour rentals

```typescript
// src/hooks/useRentPolling.ts
export const useRentPolling = (rentalIds: string[]) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (rentalIds.length === 0) return;
    
    const pollRentals = async () => {
      for (const rentalId of rentalIds) {
        try {
          const { data } = await supabase.functions.invoke('get-rent-status', {
            body: { rentId: rentalId }
          });
          
          if (data?.messages?.length > 0) {
            // Mettre à jour le rental dans la DB
            await supabase
              .from('rentals')
              .update({ 
                message_count: data.messages.length,
                last_message_date: data.messages[0].date,
                updated_at: new Date().toISOString()
              })
              .eq('rental_id', rentalId);
            
            // Rafraîchir l'UI
            queryClient.invalidateQueries(['active-items']);
          }
        } catch (error) {
          console.error(`Failed to poll rental ${rentalId}:`, error);
        }
      }
    };
    
    // Polling toutes les 5 secondes
    const interval = setInterval(pollRentals, 5000);
    
    // Check immédiat au montage
    pollRentals();
    
    return () => clearInterval(interval);
  }, [rentalIds, queryClient]);
};

// Utilisation dans DashboardPage:
const activeRentalIds = rentals
  .filter(r => r.status === 'active')
  .map(r => r.rental_id);

useRentPolling(activeRentalIds);
```

---

## 5️⃣ **SÉLECTEUR DE DURÉE NON AFFICHÉ**

### 📋 Problème identifié

Dans `DashboardPage.tsx`, ligne 847+, le sélecteur de durée existe mais n'est **affiché que si `mode === 'rent' && currentStep === 'confirm'`**.

```tsx
// ❌ ACTUEL: Seulement dans l'étape confirm
{mode === 'rent' && (
  <div className="mb-6">
    <p className="text-xs...">DURATION</p>
    <div className="grid grid-cols-2 gap-2">
      {/* Les 4 options de durée */}
    </div>
  </div>
)}
```

### ❌ Problème UX

1. L'utilisateur ne voit pas les durées disponibles avant de sélectionner un pays
2. Impossible de comparer les prix avant de s'engager

### ✅ Solution

Le sélecteur de durée devrait être visible **dès l'étape country** ou **dans une étape dédiée**.

```tsx
{/* STEP 2.5: Duration Selection (mode rent uniquement) */}
{mode === 'rent' && currentStep === 'country' && selectedCountry && (
  <>
    {/* Country info */}
    <div className="selected-country-card">
      <img src={getCountryFlag(selectedCountry.code)} />
      <span>{selectedCountry.name}</span>
      <button onClick={() => setSelectedCountry(null)}>
        <X />
      </button>
    </div>
    
    {/* Duration selector */}
    <div className="duration-selector">
      <p className="label">SELECT DURATION</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { value: '4hours', label: '4 Hours', mult: 1 },
          { value: '1day', label: '1 Day', mult: 3 },
          { value: '1week', label: '1 Week', mult: 15 },
          { value: '1month', label: '1 Month', mult: 50 }
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => {
              setRentDuration(opt.value);
              setCurrentStep('confirm');
            }}
            className={rentDuration === opt.value ? 'selected' : ''}
          >
            <div className="label">{opt.label}</div>
            <div className="price">
              {Math.ceil(selectedCountry.price * opt.mult)} Ⓐ
            </div>
          </button>
        ))}
      </div>
    </div>
  </>
)}
```

---

## 6️⃣ **GESTION EXPIRATION AUTOMATIQUE MANQUANTE**

### 📋 Problème identifié

Aucun système ne vérifie automatiquement si une location a expiré et met à jour son statut.

### ✅ Solution requise

**Edge Function Cron Job**

```typescript
// supabase/functions/cleanup-expired-rentals/index.ts
serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Trouver toutes les locations expirées
  const { data: expiredRentals } = await supabase
    .from('rentals')
    .select('*')
    .eq('status', 'active')
    .lt('expires_at', new Date().toISOString());
  
  console.log(`Found ${expiredRentals?.length || 0} expired rentals`);
  
  // Mettre à jour le statut
  if (expiredRentals && expiredRentals.length > 0) {
    await supabase
      .from('rentals')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .in('id', expiredRentals.map(r => r.id));
    
    console.log('✅ Updated expired rentals');
  }
  
  return new Response(JSON.stringify({ 
    success: true,
    expired: expiredRentals?.length || 0
  }));
});
```

**Cron Job Config**
```yaml
# supabase/functions/.cron
cleanup-expired-rentals:
  schedule: "*/5 * * * *"  # Toutes les 5 minutes
```

---

## 7️⃣ **RÉCUPÉRATION PAYS POUR RENT INCORRECTE**

### 📋 Problème identifié

Dans `DashboardPage.tsx`, ligne 280+, la récupération des pays utilise `get-top-countries-by-service` qui est conçu pour **les activations**, pas les rentals.

```typescript
// ❌ ACTUEL: Utilise l'API d'activation
const { data: availabilityData } = await supabase.functions.invoke(
  'get-top-countries-by-service',
  { body: { service: apiServiceCode }}
);
```

### ❌ Différence critique

- **Activation**: `getTopCountriesByService` → Retourne pays avec quantités pour activation
- **Rent**: `getRentServicesAndCountries` → Retourne pays avec quantités pour location

Ces deux APIs retournent **des données différentes** et **des prix différents**.

### ✅ Solution requise

```typescript
const { data: countries = [], isLoading: loadingCountries } = useQuery({
  queryKey: ['countries-live', selectedService?.code, mode],  // Ajouter mode
  queryFn: async () => {
    if (!selectedService?.code) return [];
    
    if (mode === 'rent') {
      // ✅ Pour RENT: Utiliser getRentServicesAndCountries
      const { data } = await supabase.functions.invoke('get-rent-services', {
        body: { 
          service: selectedService.code,
          rentTime: parseInt(rentDuration.replace(/\D/g, '')),  // Extraire les heures
          country: 2  // Optionnel: pays par défaut
        }
      });
      
      // Réponse SMS-Activate:
      // {
      //   "countries": [2, 6, 7, ...],
      //   "services": {
      //     "ig": { "cost": 15.50, "quant": 120 }
      //   }
      // }
      
      // Transformer en format Country[]
      return data.countries.map(countryId => ({
        id: countryId.toString(),
        name: getCountryName(countryId),
        code: getCountryCode(countryId),
        flag: getCountryFlag(countryId),
        count: data.services[selectedService.code]?.quant || 0,
        price: data.services[selectedService.code]?.cost || 0,
        successRate: 100
      }));
      
    } else {
      // ✅ Pour ACTIVATION: Utiliser getTopCountriesByService
      const { data } = await supabase.functions.invoke('get-top-countries-by-service', {
        body: { service: selectedService.code }
      });
      
      return data.countries;
    }
  }
});
```

**Edge Function manquante à créer:**

```typescript
// supabase/functions/get-rent-services/index.ts
serve(async (req) => {
  const { service, rentTime = 4, country } = await req.json();
  
  const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')!;
  const url = `https://api.sms-activate.ae/stubs/handler_api.php?` +
    `api_key=${SMS_ACTIVATE_API_KEY}` +
    `&action=getRentServicesAndCountries` +
    `&rent_time=${rentTime}` +
    (country ? `&country=${country}` : '');
  
  const response = await fetch(url);
  const data = await response.json();
  
  return new Response(JSON.stringify({
    success: true,
    data: data
  }));
});
```

---

## 8️⃣ **AFFICHAGE DIFFÉRENCIÉ ACTIVATION vs RENT**

### 📋 Problème identifié

Dans la section "Active numbers", il n'y a **aucune distinction visuelle** entre une activation et une location.

### ✅ Solution requise

```tsx
{activeItems.map(item => (
  <div key={item.id} className={`card ${item.type}`}>
    {/* Badge type */}
    {item.type === 'rental' && (
      <div className="rental-badge">
        <Home className="w-3 h-3" />
        <span>RENTAL</span>
      </div>
    )}
    
    {/* Durée (rental uniquement) */}
    {item.type === 'rental' && (
      <div className="duration-info">
        <Clock className="w-4 h-4" />
        <span>{item.duration}h rental</span>
      </div>
    )}
    
    {/* Messages count (rental uniquement) */}
    {item.type === 'rental' && (
      <div className="messages-count">
        <Mail className="w-4 h-4" />
        <span>{item.messagesCount || 0} messages</span>
      </div>
    )}
    
    {/* Actions différentes */}
    {item.type === 'rental' ? (
      <DropdownMenu>
        <DropdownMenuItem onClick={() => extendRental(item.id)}>
          <Plus /> Extend rental
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => viewMessages(item.id)}>
          <Mail /> View messages
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => finishRental(item.id)}>
          <Check /> Finish rental
        </DropdownMenuItem>
      </DropdownMenu>
    ) : (
      <DropdownMenu>
        <DropdownMenuItem onClick={() => retrySms(item.id)}>
          <RefreshCw /> Request new SMS
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => cancelActivation(item.id)}>
          <X /> Cancel activation
        </DropdownMenuItem>
      </DropdownMenu>
    )}
  </div>
))}
```

---

## 9️⃣ **WEBHOOK POUR RENTALS MANQUANT**

### 📋 Problème identifié

Le webhook actuel (`webhook-sms-activate`) gère uniquement les activations, pas les rentals.

### ✅ Solution requise

**Mise à jour du webhook existant:**

```typescript
// supabase/functions/webhook-sms-activate/index.ts
serve(async (req) => {
  const webhookData = await req.json();
  
  // Déterminer si c'est une activation ou un rental
  if (webhookData.rentalId) {
    // 🏠 C'est un rental
    const { rentalId, text, code, service, receivedAt } = webhookData;
    
    // Récupérer le rental
    const { data: rental } = await supabase
      .from('rentals')
      .select('*')
      .eq('rental_id', rentalId)
      .single();
    
    if (!rental) {
      return new Response(JSON.stringify({ error: 'Rental not found' }), {
        status: 404
      });
    }
    
    // Incrémenter le compteur de messages
    await supabase
      .from('rentals')
      .update({
        message_count: (rental.message_count || 0) + 1,
        last_message_date: receivedAt,
        updated_at: new Date().toISOString()
      })
      .eq('rental_id', rentalId);
    
    console.log(`✅ Webhook: New message for rental ${rentalId}`);
    
  } else if (webhookData.activationId) {
    // 📱 C'est une activation (logique existante)
    // ...
  }
  
  return new Response(JSON.stringify({ success: true }), {
    status: 200
  });
});
```

---

## 🔟 **DASHBOARD vs RENTPAGE: DUPLICATION**

### 📋 Problème identifié

Il existe **deux pages complètement séparées**:
- `DashboardPage.tsx` avec mode Activation/Rent
- `RentPage.tsx` page dédiée au rent

Cela crée:
1. Duplication de code
2. Confusion pour l'utilisateur (deux interfaces pour la même fonctionnalité)
3. Maintenance difficile

### ✅ Solution recommandée

**Option 1: Supprimer RentPage.tsx** ✅ RECOMMANDÉ
- Tout intégrer dans DashboardPage
- Le toggle Activation/Rent suffit
- Interface unifiée

**Option 2: Redirection**
```typescript
// Dans App.tsx
<Route path="/rent" element={<Navigate to="/dashboard?mode=rent" />} />

// Dans DashboardPage.tsx
const searchParams = new URLSearchParams(window.location.search);
const initialMode = searchParams.get('mode') as 'activation' | 'rent' || 'activation';
const [mode, setMode] = useState(initialMode);
```

---

## 📋 RÉCAPITULATIF: Checklist d'implémentation

### 🔴 Critique (bloque l'utilisation)

- [ ] **1. Ajouter services "any" et "full" en DB** avec codes SMS-Activate corrects
- [ ] **2. Créer composant RentalCard** pour afficher les locations actives
- [ ] **3. Fusionner activations + rentals** dans "Active numbers"
- [ ] **4. Implémenter polling SMS pour rentals** (hook `useRentPolling`)
- [ ] **5. Créer Edge Function `get-rent-services`** pour getRentServicesAndCountries

### 🟡 Important (améliore l'UX)

- [ ] **6. Afficher sélecteur de durée** avant confirmation
- [ ] **7. Distinction visuelle** activation vs rental dans la liste
- [ ] **8. Cron job expiration** pour marquer rentals expirés
- [ ] **9. Mise à jour webhook** pour gérer les messages de rentals

### 🟢 Nice to have (optimisations)

- [ ] **10. Décider: DashboardPage OU RentPage** (éliminer la duplication)
- [ ] **11. Récupération dynamique quantités** "Any other" / "Full rent"
- [ ] **12. Historique des messages** dans RentalCard (avec pagination)
- [ ] **13. Notifications temps réel** quand nouveau message reçu
- [ ] **14. Statistiques rental** (total dépensé, nombre SMS reçus, etc.)

---

## 🎯 Plan d'action recommandé

### Phase 1: Fondations (2-3h)
1. Ajouter services spéciaux en DB
2. Créer `get-rent-services` Edge Function
3. Modifier query pays pour utiliser API rent

### Phase 2: Affichage (3-4h)
4. Créer composant `RentalCard`
5. Fusionner activations + rentals dans liste unique
6. Ajouter badges visuels pour différencier

### Phase 3: Interactivité (2-3h)
7. Implémenter `useRentPolling` hook
8. Ajouter actions (Extend, Finish, View messages)
9. Intégrer sélecteur de durée dans flow

### Phase 4: Backend (1-2h)
10. Cron job expiration rentals
11. Mise à jour webhook pour rentals

### Phase 5: Cleanup (1h)
12. Supprimer RentPage.tsx OU rediriger vers Dashboard
13. Tests end-to-end

**Temps total estimé:** 9-13 heures

---

## 📊 Diagramme de dépendances

```
┌─────────────────────────────────────────────────────────────┐
│                    SERVICES SPÉCIAUX (any/full)             │
│                          ⬇️                                  │
│                 get-rent-services Edge Function             │
│                          ⬇️                                  │
│              Affichage services en mode RENT                │
└─────────────────────────────────────────────────────────────┘
                          ⬇️
┌─────────────────────────────────────────────────────────────┐
│                    SÉLECTION PAYS & DURÉE                   │
│                 (avec prix calculés dynamiquement)          │
└─────────────────────────────────────────────────────────────┘
                          ⬇️
┌─────────────────────────────────────────────────────────────┐
│              buy-sms-activate-rent (EXISTE ✅)              │
│                          ⬇️                                  │
│                 Création dans table rentals                 │
└─────────────────────────────────────────────────────────────┘
                          ⬇️
┌─────────────────────────────────────────────────────────────┐
│             AFFICHAGE DANS "ACTIVE NUMBERS"                 │
│                   (RentalCard component)                    │
│                          ⬇️                                  │
│              useRentPolling (toutes les 5s)                 │
│                          ⬇️                                  │
│          get-rent-status → Affiche messages                 │
└─────────────────────────────────────────────────────────────┘
                          ⬇️
┌─────────────────────────────────────────────────────────────┐
│                   ACTIONS UTILISATEUR                       │
│  ├─ Extend (continue-sms-activate-rent ✅)                  │
│  ├─ Finish (set-rent-status ✅)                             │
│  └─ View messages (get-rent-status ✅)                      │
└─────────────────────────────────────────────────────────────┘
                          ⬇️
┌─────────────────────────────────────────────────────────────┐
│                 CRON JOB: cleanup-expired                   │
│              (toutes les 5 min, mark as expired)            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Fichiers à créer/modifier

### À CRÉER ✨
```
✅ supabase/functions/get-rent-services/index.ts
✅ supabase/functions/cleanup-expired-rentals/index.ts
✅ src/components/RentalCard.tsx
✅ src/hooks/useRentPolling.ts
✅ migrations/add_special_rent_services.sql
```

### À MODIFIER 📝
```
✅ src/pages/DashboardPage.tsx
   - Fusionner activations + rentals
   - Afficher services spéciaux en mode rent
   - Utiliser API rent pour récupérer pays
   - Afficher sélecteur durée
   
✅ supabase/functions/webhook-sms-activate/index.ts
   - Gérer les webhooks de rentals
   
✅ src/App.tsx (optionnel)
   - Supprimer route /rent OU rediriger vers /dashboard
```

### À SUPPRIMER ❌ (optionnel)
```
❓ src/pages/RentPage.tsx (si on unifie tout dans Dashboard)
```

---

**FIN DE L'ANALYSE** 🎉

Cette analyse identifie **10 manques majeurs** dans l'implémentation actuelle du mode RENT. Suivez le plan d'action en 5 phases pour compléter l'implémentation.
