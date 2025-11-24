# SYNCHRONISATION TEMPS RÉEL AVEC 5SIM API

## 🎯 Problème Identifié

**Symptôme**: Quand l'utilisateur sélectionne un service, les pays ne sont PAS triés par les meilleurs taux de réussite. Les pays avec 99% de succès devraient être en haut, mais ils sont mélangés avec ceux à 70%.

**Cause Racine**: 
- L'application chargeait les taux de réussite (`success_rate`) depuis la base de données locale
- Ces taux étaient statiques et mis à jour manuellement via Edge Functions
- **5sim API fournit les taux EN TEMPS RÉEL** dans son endpoint public

## 🔍 Analyse de l'API 5sim

### Endpoint Utilisé
```
GET https://5sim.net/v1/guest/prices?product={serviceCode}
```

### Structure de Réponse
```json
{
  "whatsapp": {
    "czech": {
      "virtual52": {
        "cost": 185.8,
        "count": 0,
        "rate": 85.71    // ⭐ TAUX EN TEMPS RÉEL (0-100)
      },
      "virtual4": {
        "cost": 22.3,
        "count": 25000,
        "rate": 19.05
      }
    },
    "finland": {
      "virtual12": {
        "cost": 106.4,
        "count": 556,
        "rate": 79.37
      }
    }
  }
}
```

### Champs Importants
- **`cost`**: Prix en roubles (₽)
- **`count`**: Numéros disponibles en temps réel
- **`rate`**: Taux de livraison/réussite (%) - OMIS si < 20% ou peu de commandes

## ✅ Solution Implémentée

### 1. Nouvelle Fonction `fetch5simPricesForService()` 
**Fichier**: `src/lib/sync-service.ts`

```typescript
export const fetch5simPricesForService = async (serviceCode: string): Promise<Sim5CountryData[]> => {
  // 1. Appel API 5sim public (pas d'auth nécessaire)
  const response = await fetch(`https://5sim.net/v1/guest/prices?product=${serviceCode.toLowerCase()}`)
  const data = await response.json()
  
  // 2. Extraction des données par pays
  const serviceData = data[serviceCode.toLowerCase()]
  const countries: Sim5CountryData[] = []
  
  for (const [countryName, operators] of Object.entries(serviceData)) {
    let maxRate = 0  // Meilleur taux parmi les opérateurs
    let totalCount = 0
    let avgCost = 0
    
    for (const [operatorName, operatorData] of Object.entries(operators)) {
      totalCount += operatorData.count || 0
      avgCost += operatorData.cost || 0
      const rate = operatorData.rate || 0
      if (rate > maxRate) maxRate = rate
    }
    
    countries.push({
      countryCode: countryName,
      maxRate,      // ⭐ TAUX TEMPS RÉEL
      totalCount,   // 📊 STOCK TEMPS RÉEL
      avgCost
    })
  }
  
  // 3. Tri automatique par taux DESC, puis stock DESC
  countries.sort((a, b) => {
    if (b.maxRate !== a.maxRate) return b.maxRate - a.maxRate
    return b.totalCount - a.totalCount
  })
  
  return countries
}
```

### 2. Modification DashboardPage
**Fichier**: `src/pages/DashboardPage.tsx`

**AVANT** (DB statique):
```typescript
const { data: countries } = useQuery({
  queryKey: ['countries', selectedService?.name],
  queryFn: async () => {
    // Récupération depuis pricing_rules (taux statiques)
    const { data: pricingData } = await supabase
      .from('pricing_rules')
      .select('country_code, delivery_rate')
      
    // Calcul manuel du taux moyen...
  }
})
```

**APRÈS** (API 5sim temps réel):
```typescript
const { data: countries, isLoading: loadingCountries } = useQuery({
  queryKey: ['countries-live', selectedService?.code],
  queryFn: async () => {
    // 1️⃣ Appel 5sim API en temps réel
    const liveData = await fetch5simPricesForService(selectedService.code)
    
    // 2️⃣ Enrichissement avec noms FR depuis DB
    const countryInfo = await supabase
      .from('countries')
      .select('name, flag_emoji')
      
    // 3️⃣ Combinaison: taux 5sim + noms DB + prix local
    return liveData.map(live => ({
      name: countryInfo[live.countryCode]?.name,
      successRate: live.maxRate,  // ⭐ TEMPS RÉEL
      count: live.totalCount,      // 📊 TEMPS RÉEL
      price: priceMap[live.countryCode]
    }))
  },
  staleTime: 30000,      // Cache 30 sec
  refetchInterval: 60000 // Auto-refresh 1 min
})
```

### 3. UI avec Loading State
```tsx
{loadingCountries ? (
  <div className="animate-spin">
    🌐 Chargement des taux en temps réel depuis 5sim...
  </div>
) : (
  <div>
    {filteredCountries.map(country => (
      <div>
        <p>{country.name}</p>
        <span className={getBadgeColor(country.successRate)}>
          {country.successRate}%
        </span>
      </div>
    ))}
  </div>
)}
```

## 📊 Résultats de Test

### Script de Test: `test-5sim-live.js`
```bash
node test-5sim-live.js
```

**Output pour WhatsApp**:
```
🏆 TOP 10 PAYS (triés par taux de réussite):
════════════════════════════════════════════
 1. czech        | Rate: 85.71% | Stock:  25093 | Prix: 112.55₽
 2. finland      | Rate: 79.37% | Stock:    556 | Prix: 106.40₽
 3. canada       | Rate: 77.33% | Stock:  46391 | Prix:  48.55₽
 4. srilanka     | Rate: 72.41% | Stock:      0 | Prix:  20.53₽
 5. usa          | Rate:  67.8% | Stock:  20069 | Prix: 150.00₽
 6. france       | Rate: 64.86% | Stock:      0 | Prix: 214.18₽
 7. lithuania    | Rate: 57.14% | Stock:  25000 | Prix:  74.61₽
 8. georgia      | Rate: 54.55% | Stock:  25217 | Prix:  59.26₽
 9. austria      | Rate: 54.17% | Stock:    394 | Prix: 244.07₽
10. indonesia    | Rate: 44.12% | Stock:  29180 | Prix:  45.75₽
```

**✅ Confirmation**: Les meilleurs pays (Czech 85%, Finland 79%) sont bien en tête !

## 📈 Avantages de cette Approche

### ✅ Temps Réel
- **Avant**: Taux mis à jour toutes les 6h via cron job
- **Après**: Taux mis à jour toutes les 60 secondes (auto-refresh)

### ✅ Fiabilité
- **Avant**: Calculs basés sur historique local (orders table)
- **Après**: Données directement depuis 5sim (source de vérité)

### ✅ Performance
- Cache de 30 secondes (staleTime)
- Refresh automatique en arrière-plan
- Pas de surcharge serveur (endpoint public 5sim)

### ✅ UX Améliorée
- Loader pendant chargement: "🌐 Chargement des taux en temps réel..."
- Badges colorés selon taux:
  - 🟢 Vert (≥95%): Excellent
  - 🟡 Jaune (≥85%): Bon
  - 🟠 Orange (≥70%): Moyen
  - 🔴 Rouge (<70%): Faible

## 🔄 Flux Utilisateur Optimisé

```
1. Utilisateur sélectionne un SERVICE
   └─> App affiche loader

2. Appel API 5sim: /v1/guest/prices?product=whatsapp
   └─> Réponse en ~500ms

3. Traitement des données:
   ├─> Extraction taux par pays
   ├─> Tri par maxRate DESC
   └─> Enrichissement avec noms FR

4. Affichage des PAYS:
   ├─> 🇨🇿 Czech Republic (85.71%) ← MEILLEUR
   ├─> 🇫🇮 Finland (79.37%)
   ├─> 🇨🇦 Canada (77.33%)
   └─> ...
```

## 📝 Fichiers Modifiés

1. **src/lib/sync-service.ts**
   - Ajout interface `Sim5CountryData`
   - Ajout fonction `fetch5simPricesForService()`
   - ~90 lignes ajoutées

2. **src/pages/DashboardPage.tsx**
   - Import `fetch5simPricesForService`
   - Modification query `countries-live`
   - Ajout loader UI
   - ~50 lignes modifiées

3. **test-5sim-live.js** (nouveau)
   - Script de test standalone
   - Validation API 5sim
   - ~120 lignes

## 🚀 Prochaines Étapes (Optionnelles)

### 1. Optimisation Cache
```typescript
// Cache plus intelligent avec React Query
queryFn: async () => {
  const cacheKey = `5sim_${serviceCode}`
  const cached = localStorage.getItem(cacheKey)
  
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    if (Date.now() - timestamp < 60000) return data
  }
  
  const fresh = await fetch5simPricesForService(serviceCode)
  localStorage.setItem(cacheKey, JSON.stringify({
    data: fresh,
    timestamp: Date.now()
  }))
  
  return fresh
}
```

### 2. Fallback Intelligent
```typescript
// Si API 5sim échoue, utiliser DB comme fallback
try {
  return await fetch5simPricesForService(serviceCode)
} catch (error) {
  console.warn('⚠️ Fallback sur DB locale')
  return await fetchCountriesFromDB(serviceCode)
}
```

### 3. Métriques de Performance
```typescript
const startTime = performance.now()
const countries = await fetch5simPricesForService(serviceCode)
const duration = performance.now() - startTime

console.log(`⚡ API 5sim répondu en ${duration.toFixed(0)}ms`)
// Typiquement: 300-800ms
```

## ✅ Validation Finale

### Test Manuel
1. Démarrer l'app: `npm run dev`
2. Aller sur Dashboard
3. Sélectionner "WhatsApp"
4. Observer:
   - ✅ Loader pendant 0.5-1s
   - ✅ Czech Republic en premier (85%)
   - ✅ Finland en deuxième (79%)
   - ✅ Badge vert pour ≥95%, jaune pour ≥85%

### Test Automatique
```bash
node test-5sim-live.js
# ✅ Top 10 triés par taux DESC
# ✅ Czech Republic #1 avec 85.71%
```

## 📚 Références

- **5sim API Docs**: https://5sim.net/docs
- **Endpoint utilisé**: `/v1/guest/prices?product={service}`
- **Taux de limite**: 100 req/sec par IP (largement suffisant)
- **Cache recommandé**: 30-60 secondes

---

**Résumé**: Les pays sont maintenant triés par **taux de réussite EN TEMPS RÉEL** depuis l'API 5sim, garantissant que les meilleurs pays (Czech 85%, Finland 79%, Canada 77%) sont toujours affichés en premier pour chaque service. 🎯
