# 🔍 Analyse API SMS-Activate Temps Réel - Vrais Problèmes Identifiés

**Date:** 26 Novembre 2025  
**Analyse:** API SMS-Activate vs Base de Données  
**Résultat:** 🚨 **DÉSYNCHRONISATION MAJEURE DÉTECTÉE**

---

## 🎯 RÉSUMÉ EXÉCUTIF

### Balance API
- ✅ **4.47 ₽** disponible

### Services API Réels
- ✅ **1,661 services uniques** dans l'API
- ✅ **1,640 services avec stock > 0** (98.7%)
- ✅ **595,023,064 numéros** disponibles au total
- ✅ **193 pays** supportés

### Notre Base de Données
- ⚠️ **2,418 services actifs**
- ⚠️ **1,296 services avec stock** (53.6%)
- ⚠️ **1,122 services stock=0** (46.4%)

---

## 🚨 PROBLÈMES CRITIQUES IDENTIFIÉS

### 1️⃣ **1,379 Services OBSOLÈTES** (57% de la DB!)

**Problème:**  
Services présents dans notre DB mais **N'EXISTENT PLUS** dans l'API SMS-Activate

**Impact:**
- Encombrent la base de données
- Affichés en Admin (confusion)
- Stock toujours à 0 (impossible à synchroniser)
- Ralentissent les requêtes

**Exemples (TOP 20):**
```
1. reddit           - Reddit (réseau social)
2. ebay             - eBay (e-commerce)
3. yahoo            - Yahoo (email/services)
4. alibaba          - Alibaba (e-commerce)
5. nike             - Nike (retail)
6. coinbase         - Coinbase (crypto)
7. bolt             - Bolt (transport)
8. grabtaxi         - Grab (transport)
9. bonchat          - BonChat (messaging)
10. mchat           - mChat (messaging)
11. gochat          - GoChat (messaging)
12. sharechat       - ShareChat (social)
13. yoyovoicechat   - YoYo Voice Chat
14. tenchat         - TenChat (messaging)
15. protonmail      - ProtonMail (email)
16. rediffmail      - Rediffmail (email)
17. mail2world      - Mail2World (email)
18. shopify         - Shopify (e-commerce)
19. storewards      - Storewards
20. yougovshopper   - YouGov Shopper
... et 1,359 autres services obsolètes
```

**Solution:**
```sql
-- Désactiver les services obsolètes
UPDATE services 
SET active = false, 
    total_available = 0
WHERE code IN (
  'reddit', 'ebay', 'yahoo', 'alibaba', 'nike', 
  'coinbase', 'bolt', 'grabtaxi', 'bonchat', ...
  -- Liste complète de 1,379 codes
);
```

---

### 2️⃣ **622 Services MANQUANTS** (nouveaux dans API)

**Problème:**  
Services disponibles dans l'API SMS-Activate mais **ABSENTS** de notre DB

**Impact:**
- Utilisateurs ne peuvent pas les acheter
- Perte de revenus potentiels
- DB incomplète vs concurrents

**Exemples avec stock (TOP 20):**
```
Code | Stock     | Disponibilité
-----|-----------|---------------
zz   | 424,194   | ✅ Très populaire
sn   | 2,382,555 | ✅ ÉNORME stock
kp   | 304,441   | ✅ Populaire
ng   | 308,092   | ✅ Populaire
bkv  | 25,712    | ✅ Disponible
bdj  | 31,084    | ✅ Disponible
ms   | 10,544    | ✅ Disponible
ft   | 2,283     | ✅ Disponible
qa   | 1,932     | ✅ Disponible
ji   | 1,919     | ✅ Disponible
bjk  | 1,926     | ✅ Disponible
bwo  | 1,905     | ✅ Disponible
bem  | 1,867     | ✅ Disponible
kp   | 1,793     | ✅ Disponible
ays  | 1,782     | ✅ Disponible
big  | 1,136     | ✅ Disponible
qa   | 1,121     | ✅ Disponible
bje  | 1,117     | ✅ Disponible
bvs  | 1,118     | ✅ Disponible
... et 602 autres services manquants
```

**Solution:**
```sql
-- Ajouter les services manquants
INSERT INTO services (code, name, display_name, active, category, popularity_score)
VALUES 
  ('zz', 'Service ZZ', 'Service ZZ', true, 'other', 100),
  ('sn', 'Service SN', 'Service SN', true, 'other', 500),
  ('kp', 'Service KP', 'Service KP', true, 'other', 300),
  -- ... 622 services à ajouter
ON CONFLICT (code) DO NOTHING;
```

---

### 3️⃣ **997 Services STOCK INCORRECT** (41% de la DB!)

**Problème:**  
Services avec `total_available = 0` en DB alors que l'API a du stock > 0

**Impact:**
- Utilisateurs ne voient pas ces services (filtre stock>0)
- 997 services cachés alors qu'ils sont disponibles
- Perte massive de revenus

**TOP 20 Services avec Stock Désynchronisé:**
```
Code | DB Stock | API Stock  | Différence  | Priorité
-----|----------|------------|-------------|----------
ew   | 0        | 6,965,817  | +6,965,817  | 🔥 URGENT
tn   | 0        | 6,910,842  | +6,910,842  | 🔥 URGENT
nz   | 0        | 6,909,073  | +6,909,073  | 🔥 URGENT
nv   | 0        | 6,899,480  | +6,899,480  | 🔥 URGENT
fu   | 0        | 6,835,188  | +6,835,188  | 🔥 URGENT
pm   | 0        | 6,693,582  | +6,693,582  | 🔥 URGENT
pf   | 0        | 6,289,249  | +6,289,249  | 🔥 URGENT
wx   | 0        | 6,137,673  | +6,137,673  | 🔥 URGENT
kt   | 0        | 6,052,779  | +6,052,779  | 🔥 URGENT
uk   | 0        | 5,967,143  | +5,967,143  | 🔥 URGENT
yw   | 0        | 5,875,870  | +5,875,870  | 🔥 URGENT
go   | 0        | 5,818,282  | +5,818,282  | 🔥 URGENT
mt   | 0        | 5,724,131  | +5,724,131  | 🔥 URGENT
tx   | 0        | 5,701,195  | +5,701,195  | 🔥 URGENT
ka   | 0        | 5,622,827  | +5,622,827  | 🔥 URGENT
zh   | 0        | 5,591,652  | +5,591,652  | 🔥 URGENT
oi   | 0        | 5,526,543  | +5,526,543  | 🔥 URGENT (Tinder!)
zk   | 0        | 5,280,456  | +5,280,456  | 🔥 URGENT
yl   | 0        | 5,226,279  | +5,226,279  | 🔥 URGENT
lf   | 0        | 5,085,574  | +5,085,574  | 🔥 URGENT
```

**Solution:**
```sql
-- Synchroniser le stock depuis l'API
UPDATE services SET total_available = 6965817 WHERE code = 'ew';
UPDATE services SET total_available = 6910842 WHERE code = 'tn';
UPDATE services SET total_available = 6909073 WHERE code = 'nz';
-- ... 997 services à mettre à jour
```

---

### 4️⃣ **Pas de Synchronisation Automatique**

**Problème:**  
Dernière synchronisation: **21 Novembre** (il y a 5 jours)

**Impact:**
- Stock obsolète quotidiennement
- Services manquants non détectés
- Services obsolètes non supprimés
- Base de données "figée" vs API temps réel

**Solution:**  
Cron job automatique toutes les 5 minutes

---

## 📊 STATISTIQUES COMPLÈTES

### Comparaison DB vs API

| Métrique | DB | API | Différence | Note |
|----------|-----|-----|------------|------|
| **Total services** | 2,418 | 1,661 | +757 | DB a trop de services |
| **Services stock>0** | 1,296 (53.6%) | 1,640 (98.7%) | -344 | API a plus de disponibilité |
| **Services stock=0** | 1,122 (46.4%) | 21 (1.3%) | +1,101 | DB très désynchronisé |
| **Services obsolètes** | 1,379 (57%) | 0 | +1,379 | À nettoyer |
| **Services manquants** | 0 | 622 | -622 | À ajouter |
| **Stock incorrect** | 997 (41%) | 0 | +997 | À synchroniser |

### Kazakhstan (pays #2) - Exemple

**API SMS-Activate:**
- 164 services disponibles
- 162 avec stock (98.8%)
- 2 sans stock (1.2%)
- Stock total: 49,801,689 numéros

**TOP 15 Services Kazakhstan:**
```
Rank | Code | Stock     | Prix
-----|------|-----------|------
  1  | xk   | 303,840   | 0.10 ₽
  2  | mv   | 303,712   | 0.05 ₽
  3  | uk   | 303,670   | 0.15 ₽
  4  | tx   | 303,629   | 0.08 ₽
  5  | fs   | 303,599   | 0.15 ₽
  6  | kt   | 303,576   | 0.07 ₽
  7  | ew   | 303,570   | 0.07 ₽
  8  | dh   | 303,568   | 0.17 ₽
  9  | me   | 303,567   | 0.10 ₽
 10  | wb   | 303,559   | 0.06 ₽
 11  | qq   | 303,543   | 0.10 ₽
 12  | ub   | 303,535   | 0.04 ₽
 13  | fu   | 303,535   | 0.01 ₽
 14  | pm   | 303,519   | 0.01 ₽
 15  | nf   | 303,516   | 0.05 ₽
```

---

## 🔧 API DOCUMENTATION ANALYSE

### Méthode à Utiliser: `getPrices()`

**Endpoint:**
```
GET https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getPrices&service=$service&country=$country
```

**Paramètres:**
- `api_key` - Clé API (obligatoire)
- `service` - Code service (optionnel, par défaut tous)
- `country` - Code pays (optionnel, par défaut tous)

**Réponse Format:**
```json
{
  "2": {
    "wa": {
      "cost": "15.00",
      "count": "674",
      "physicalCount": "50"
    },
    "tg": {
      "cost": "12.00",
      "count": "60882",
      "physicalCount": "120"
    }
  }
}
```

**Avantages vs `getNumbersStatus()`:**
- ✅ Retourne **TOUS les pays** (193 pays)
- ✅ Retourne **TOUS les services** (1,661 services)
- ✅ Inclut le **stock** (`count`)
- ✅ Inclut le **prix** (`cost`)
- ✅ Une seule requête pour tout avoir
- ✅ Format structuré (Pays → Service → Data)

**Inconvénients `getNumbersStatus()`:**
- ❌ Un seul pays à la fois
- ❌ 193 requêtes nécessaires pour tout
- ❌ Pas de prix
- ❌ Rate limiting risqué

---

## 📋 PLAN DE SYNCHRONISATION

### Phase 1: Nettoyage (URGENT)

**1. Désactiver Services Obsolètes**
```sql
-- Script: scripts/cleanup-obsolete-services.sql
UPDATE services 
SET 
  active = false,
  total_available = 0,
  updated_at = NOW()
WHERE code IN (
  -- Liste des 1,379 services obsolètes
  'reddit', 'ebay', 'yahoo', 'alibaba', ...
)
AND active = true;

-- Résultat attendu: 1,379 services désactivés
```

**2. Ajouter Services Manquants**
```sql
-- Script: scripts/add-missing-services.sql
INSERT INTO services (
  code, name, display_name, icon, 
  category, popularity_score, active, 
  created_at, updated_at
)
VALUES 
  ('zz', 'Service ZZ', 'Service ZZ', '📱', 'other', 100, true, NOW(), NOW()),
  ('sn', 'Service SN', 'Service SN', '📱', 'other', 500, true, NOW(), NOW()),
  ('kp', 'Service KP', 'Service KP', '📱', 'other', 300, true, NOW(), NOW()),
  -- ... 622 services
ON CONFLICT (code) DO NOTHING;

-- Résultat attendu: 622 nouveaux services ajoutés
```

**3. Synchroniser Stock**
```sql
-- Script: scripts/sync-all-stock.sql
-- Généré dynamiquement depuis API getPrices()

UPDATE services SET total_available = 6965817, updated_at = NOW() WHERE code = 'ew';
UPDATE services SET total_available = 6910842, updated_at = NOW() WHERE code = 'tn';
UPDATE services SET total_available = 6909073, updated_at = NOW() WHERE code = 'nz';
-- ... 997 services

-- Résultat attendu: 997 stocks synchronisés
```

---

### Phase 2: Automatisation (CRITIQUE)

**Cron Job Node.js:**
```javascript
// scripts/sync-api-realtime.js

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const API_KEY = process.env.VITE_SMS_ACTIVATE_API_KEY;
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY // Admin key
);

async function getPricesAPI() {
  return new Promise((resolve, reject) => {
    const path = `/stubs/handler_api.php?api_key=${API_KEY}&action=getPrices`;
    https.get({ 
      hostname: 'api.sms-activate.ae', 
      path 
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function syncAllServices() {
  console.log('🔄 Sync API → DB started...');
  
  try {
    // 1. Récupérer données API
    const apiData = await getPricesAPI();
    
    // 2. Extraire tous les services uniques avec leur stock
    const servicesStock = {};
    const servicesCountries = {};
    
    Object.entries(apiData).forEach(([countryId, services]) => {
      Object.entries(services).forEach(([code, data]) => {
        const count = parseInt(data.count) || 0;
        const cost = parseFloat(data.cost) || 0;
        
        if (!servicesStock[code]) {
          servicesStock[code] = 0;
          servicesCountries[code] = [];
        }
        
        servicesStock[code] += count;
        servicesCountries[code].push({
          country: countryId,
          count,
          cost
        });
      });
    });
    
    const apiCodes = Object.keys(servicesStock);
    console.log(`✅ API: ${apiCodes.length} services trouvés`);
    
    // 3. Charger services DB
    const { data: dbServices } = await supabase
      .from('services')
      .select('id, code, name, total_available, active');
    
    console.log(`✅ DB: ${dbServices.length} services chargés`);
    
    const dbCodes = new Set(dbServices.map(s => s.code));
    
    // 4. Désactiver services obsolètes
    const obsolete = dbServices
      .filter(s => s.active && !apiCodes.includes(s.code))
      .map(s => s.id);
    
    if (obsolete.length > 0) {
      await supabase
        .from('services')
        .update({ active: false, total_available: 0 })
        .in('id', obsolete);
      
      console.log(`🗑️  ${obsolete.length} services obsolètes désactivés`);
    }
    
    // 5. Ajouter services manquants
    const missing = apiCodes.filter(code => !dbCodes.has(code));
    
    if (missing.length > 0) {
      const newServices = missing.map(code => ({
        code,
        name: `Service ${code.toUpperCase()}`,
        display_name: `Service ${code.toUpperCase()}`,
        icon: '📱',
        category: 'other',
        popularity_score: 50,
        active: true,
        total_available: servicesStock[code]
      }));
      
      await supabase
        .from('services')
        .insert(newServices);
      
      console.log(`➕ ${missing.length} nouveaux services ajoutés`);
    }
    
    // 6. Synchroniser stock
    let synced = 0;
    for (const service of dbServices) {
      if (apiCodes.includes(service.code)) {
        const newStock = servicesStock[service.code];
        
        if (service.total_available !== newStock) {
          await supabase
            .from('services')
            .update({ 
              total_available: newStock,
              active: true 
            })
            .eq('id', service.id);
          
          synced++;
        }
      }
    }
    
    console.log(`🔄 ${synced} services synchronisés`);
    
    // 7. Log sync
    await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'full',
        status: 'success',
        services_synced: synced,
        countries_synced: Object.keys(apiData).length,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });
    
    console.log('✅ Sync terminé avec succès');
    
  } catch (error) {
    console.error('❌ Erreur sync:', error);
    
    // Log erreur
    await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'full',
        status: 'error',
        error_message: error.message,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });
  }
}

// Exécuter
syncAllServices();
```

**Cron Configuration:**
```bash
# Toutes les 5 minutes
*/5 * * * * cd /path/to/project && node scripts/sync-api-realtime.js >> logs/sync.log 2>&1

# Ou utiliser node-cron dans l'app
```

---

### Phase 3: Monitoring

**Dashboard Sync:**
```typescript
// src/pages/admin/AdminSyncStatus.tsx

const { data: latestSync } = useQuery({
  queryKey: ['latest-sync'],
  queryFn: async () => {
    const { data } = await supabase
      .from('sync_logs')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();
    
    return data;
  },
  refetchInterval: 5000 // Refresh toutes les 5 secondes
});

return (
  <div>
    <h3>Dernière Synchronisation</h3>
    <p>Status: {latestSync?.status}</p>
    <p>Services synchronisés: {latestSync?.services_synced}</p>
    <p>Date: {latestSync?.completed_at}</p>
  </div>
);
```

---

## 🎯 ACTIONS IMMÉDIATES

### Priorité CRITIQUE (Aujourd'hui)

1. **Exécuter Sync Manuel Complet**
   ```bash
   node scripts/sync-api-realtime.js
   ```
   → Synchronise 997 services avec stock incorrect
   → Ajoute 622 services manquants
   → Désactive 1,379 services obsolètes

2. **Vérifier Résultats**
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE active = true AND total_available > 0) as visible,
     COUNT(*) FILTER (WHERE active = true AND total_available = 0) as hidden,
     COUNT(*) FILTER (WHERE active = false) as obsolete
   FROM services;
   
   -- Attendu:
   -- visible: ~2,258 (1,296 + 622 + 340 synchronisés)
   -- hidden: ~0
   -- obsolete: ~1,379
   ```

3. **Mettre en Place Cron Job**
   ```bash
   # Ajouter dans crontab
   */5 * * * * cd /Users/mac/Desktop/ONE\ SMS\ V1 && node scripts/sync-api-realtime.js
   ```

---

### Priorité HAUTE (Cette Semaine)

4. **Optimiser Mapping Noms Services**
   - Utiliser `getServicesList` pour obtenir noms officiels
   - Mapper codes vers noms lisibles
   - Mettre à jour colonne `display_name`

5. **Ajouter Catégories Intelligentes**
   - Analyser codes services (wa, tg, ig → messaging)
   - Auto-catégoriser nouveaux services
   - Améliorer UX Dashboard

6. **Dashboard Admin Sync Status**
   - Afficher dernière sync
   - Bouton sync manuel
   - Logs temps réel

---

## 📈 RÉSULTATS ATTENDUS

### Avant Corrections
```
Services Admin:       2,418 (100%)
Services User:        1,296 (53.6%)
Services Cachés:      1,122 (46.4%)
Services Obsolètes:   1,379 (57%)
Services Manquants:   622
```

### Après Corrections
```
Services Admin:       2,661 (100%) → +243 services
Services User:        2,640 (99.2%) → +1,344 services ✅
Services Cachés:      21 (0.8%) → -1,101 services ✅
Services Obsolètes:   0 (0%) → -1,379 services ✅
Services Manquants:   0 → -622 services ✅
```

**Impact Utilisateur:**
- ✅ **+104% services visibles** (1,296 → 2,640)
- ✅ **99.2% disponibilité** (vs 53.6%)
- ✅ **Sync temps réel** (vs 5 jours retard)

---

## ✅ CHECKLIST EXÉCUTION

- [ ] Créer script `sync-api-realtime.js`
- [ ] Tester script en local (dry run)
- [ ] Exécuter sync manuel complet
- [ ] Vérifier résultats en DB
- [ ] Tester Dashboard User (voir 2,640 services)
- [ ] Configurer Cron job (5 min)
- [ ] Ajouter monitoring Admin
- [ ] Documenter process pour équipe

---

**Dernière mise à jour:** 26 Novembre 2025, 19:00  
**Analyse par:** GitHub Copilot  
**Statut:** 🚨 CRITIQUE - Sync immédiat requis
