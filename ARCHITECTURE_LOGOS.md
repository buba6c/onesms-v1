# 🎨 Architecture Système de Logos - ONE SMS

## 📋 Résumé Exécutif

**Question Posée:** "Qu'est-ce qui charge les logos des services ? Les services chargent-ils les logos ou les logos chargent-ils les services ?"

**Réponse Courte:** **Les SERVICES chargent les LOGOS** (pas l'inverse)

- Dashboard charge la liste des services depuis la base de données
- Pour chaque service, le code génère une URL de logo via `getServiceLogo(code)`
- Le navigateur charge ensuite l'image depuis l'API externe Logo.dev
- Si échec, un fallback SVG avec emoji est généré dynamiquement

---

## 🔄 Flow Complet de Chargement

```
┌─────────────────────────────────────────────────────────────────┐
│                         1. CHARGEMENT INITIAL                   │
└─────────────────────────────────────────────────────────────────┘
                                ↓
    📱 DashboardPage.tsx charge les services depuis Supabase
    
    useEffect(() => {
      const { data } = await supabase
        .from('services')
        .select('code, name, icon, total_available, popularity_score')
        .eq('active', true)
        .gt('total_available', 0)
        .order('popularity_score', { ascending: false })
    }, [])

                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      2. RENDU DES SERVICES                      │
└─────────────────────────────────────────────────────────────────┘
                                ↓
    🎨 Pour chaque service dans la liste:
    
    {services.map((service) => (
      <img 
        src={getServiceLogo(service.code)}  // ← GÉNÉRATION URL
        alt={service.name}
        onError={(e) => handleLogoError(e, service.code)}
      />
    ))}

                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    3. GÉNÉRATION URL LOGO                       │
└─────────────────────────────────────────────────────────────────┘
                                ↓
    🌐 logo-service.ts → getServiceLogo(code)
    
    Exemple: service.code = "wa" (WhatsApp)
    
    1. Mapping dans SERVICE_DOMAINS:
       'wa' → 'whatsapp.com'
    
    2. Construction URL Logo.dev:
       https://img.logo.dev/whatsapp.com?token=pk_acOeajbNRKGsSDnJvJrcfw&size=200
    
    3. Retour de l'URL au composant <img>

                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                   4. CHARGEMENT PAR NAVIGATEUR                  │
└─────────────────────────────────────────────────────────────────┘
                                ↓
    🖼️ Le navigateur (Chrome/Firefox/Safari) fait une requête HTTP:
    
    GET https://img.logo.dev/whatsapp.com?token=xxx&size=200
    
    → Logo.dev API cherche le logo de whatsapp.com dans sa base
    → Retourne l'image PNG/SVG (200x200px)
    → Navigateur affiche l'image dans le <img>

                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      5. FALLBACK SI ERREUR                      │
└─────────────────────────────────────────────────────────────────┘
                                ↓
    ❌ Si Logo.dev échoue (404, timeout, bloqué...):
    
    onError={(e) => {
      e.currentTarget.src = getServiceLogoFallback(service.code)
    }}
    
    → Génère SVG inline avec emoji:
    
    <svg>
      <rect fill="linear-gradient(#4f46e5, #7c3aed)" />
      <text>💬</text>  ← Emoji WhatsApp
      <text>Whatsapp</text>
    </svg>
```

---

## 📊 Statistiques Base de Données

### État Actuel (2,429 services actifs)

| Métrique | Valeur | Pourcentage |
|----------|--------|-------------|
| **Total services actifs** | 2,429 | 100% |
| **Avec `icon_url` (DB)** | 995 | **41%** |
| **Sans `icon_url` (Logo.dev)** | 1,434 | **59%** |

### TOP 10 Services (par popularité)

| Rank | Service | Source Logo |
|------|---------|-------------|
| 1 | WhatsApp | Logo.dev API (mapping `wa` → `whatsapp.com`) |
| 2 | Telegram | Logo.dev API (mapping `tg` → `telegram.org`) |
| 3 | Viber | Logo.dev API (mapping `vi` → `viber.com`) |
| 4 | Instagram | Logo.dev API (mapping `ig` → `instagram.com`) |
| 5 | googlevoice | **icon_url (DB)** → S3 bucket |
| 6 | Facebook | Logo.dev API (mapping `fb` → `facebook.com`) |
| 7 | Twitter | Logo.dev API (mapping `tw` → `x.com`) |
| 8 | Discord | Logo.dev API (mapping `ds` → `discord.com`) |
| 9 | VKontakte | Logo.dev API (mapping `vk` → `vk.com`) |
| 10 | MM | Logo.dev API (fallback `mm.com`) |

---

## 🏗️ Architecture des Fichiers

### 1. **`src/lib/logo-service.ts`** (133 lignes)

Service centralisé gérant TOUS les logos de la plateforme.

```typescript
/**
 * Service Logo 2025 - 100% Logo.dev API
 * Simple, rapide, toujours à jour
 */

// 🔑 Token Logo.dev API
const LOGO_DEV_TOKEN = 'pk_acOeajbNRKGsSDnJvJrcfw'

// 🗺️ Mapping codes SMS-Activate → Domaines
const SERVICE_DOMAINS: Record<string, string> = {
  'whatsapp': 'whatsapp.com',
  'wa': 'whatsapp.com',         // Code SMS-Activate
  'telegram': 'telegram.org',
  'tg': 'telegram.org',         // Code SMS-Activate
  'instagram': 'instagram.com',
  'ig': 'instagram.com',        // Code SMS-Activate
  'oi': 'tinder.com',           // Code SMS-Activate pour Tinder
  'qv': 'badoo.com',            // Code SMS-Activate pour Badoo
  // ... 50+ services mappés
}

// 📡 Fonction principale: génère URL Logo.dev
export const getServiceLogo = (serviceCode: string): string => {
  const code = serviceCode.toLowerCase().trim()
  const domain = SERVICE_DOMAINS[code] || `${code}.com`
  return `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=200`
}

// 🔄 Fallback SVG avec emoji
export const getServiceLogoFallback = (serviceCode: string): string => {
  return generateFallbackLogo(serviceCode)
}

// 😊 Mapping emoji pour fallback
export const getServiceIcon = (serviceCode: string): string => {
  const iconMap = {
    'whatsapp': '💬',
    'telegram': '✈️',
    'instagram': '📸',
    'oi': '❤️',  // Tinder
    'qv': '💙',  // Badoo
    // ... 20+ emojis
  }
  return iconMap[serviceCode] || '📱'
}
```

**Fonctionnalités:**
- ✅ Mapping intelligent code → domaine
- ✅ Génération URL Logo.dev avec token
- ✅ Fallback SVG avec gradient + emoji
- ✅ Support codes SMS-Activate (wa, tg, oi, qv...)
- ✅ Pas de dépendance DB

---

### 2. **`src/pages/DashboardPage.tsx`** (1,487 lignes)

Interface principale où les logos sont affichés.

```typescript
import { getServiceLogo, getServiceLogoFallback, getServiceIcon } from '@/lib/logo-service'

// ... ligne 970
<img 
  src={getServiceLogo(service.code || service.name)}
  alt={service.name}
  className="w-12 h-12 rounded-lg object-cover"
  onError={(e) => {
    const target = e.currentTarget
    // Fallback vers SVG avec emoji
    target.src = getServiceLogoFallback(service.code || service.name)
  }}
/>

{/* Emoji caché pour accessibilité */}
<span className="hidden">{getServiceIcon(service.code)}</span>
```

**Workflow:**
1. **Chargement services** → `useEffect(() => loadServices())`
2. **Rendu liste** → `services.map(service => <ServiceCard />)`
3. **Génération URL** → `getServiceLogo(service.code)`
4. **Chargement image** → Navigateur fetch Logo.dev API
5. **Gestion erreur** → `onError` → `getServiceLogoFallback()`

---

### 3. **`src/pages/HistoryPage.tsx`** (similaire)

```typescript
import { getServiceLogo, getServiceLogoFallback } from '@/lib/logo-service'

// ligne 323
<img 
  src={getServiceLogo(order.service_code)}
  onError={(e) => {
    e.currentTarget.src = getServiceLogoFallback(order.service_code)
  }}
/>
```

---

## 🔍 Différence: `icon_url` (DB) vs Logo.dev API

### Option 1: `icon_url` dans la base de données (995 services - 41%)

```sql
SELECT code, name, icon_url 
FROM services 
WHERE icon_url IS NOT NULL 
LIMIT 5;

-- Résultat:
-- google    | https://onesms.s3.eu-north-1.amazonaws.com/icons/google.png
-- discord   | https://onesms.s3.eu-north-1.amazonaws.com/icons/discord.png
-- uber      | https://onesms.s3.eu-north-1.amazonaws.com/icons/uber.png
```

**Avantages:**
- ✅ Logos personnalisés (uploadés manuellement)
- ✅ Contrôle total sur l'apparence
- ✅ Pas de dépendance API externe

**Inconvénients:**
- ❌ Maintenance manuelle (upload 1 par 1)
- ❌ Stockage S3 requis (coûts)
- ❌ Mise à jour manuelle si logo change

### Option 2: Logo.dev API (1,434 services - 59%)

```typescript
getServiceLogo('wa')
// → https://img.logo.dev/whatsapp.com?token=xxx&size=200
```

**Avantages:**
- ✅ **Zéro maintenance** (automatique)
- ✅ Toujours à jour (Logo.dev met à jour)
- ✅ Pas de stockage requis
- ✅ Rapide à implémenter

**Inconvénients:**
- ❌ Dépendance API externe (si Logo.dev down, fallback SVG)
- ❌ Limites token (1M requêtes/mois)

---

## 🎯 Stratégie Actuelle (Hybride)

```typescript
// Dans DashboardPage.tsx
const getLogoUrl = (service) => {
  // 1. Si icon_url existe en DB → priorité
  if (service.icon_url) {
    return service.icon_url
  }
  
  // 2. Sinon → Logo.dev API avec mapping
  return getServiceLogo(service.code)
}
```

**Cascade de fallback:**
```
1. icon_url (DB) → S3 bucket
       ↓ (si null)
2. Logo.dev API → https://img.logo.dev/{domain}
       ↓ (si erreur 404/timeout)
3. SVG généré → data:image/svg+xml (emoji + gradient)
       ↓ (si désactivé JS)
4. Emoji natif → 💬 (texte Unicode)
```

---

## 📈 Recommandations

### 🔥 Priorité HAUTE

1. **Migrer vers 100% Logo.dev API** (supprimer `icon_url`)
   - **Gain:** Réduction maintenance, suppression coûts S3
   - **Action:** Script SQL `UPDATE services SET icon_url = NULL`
   - **Durée:** 5 min

2. **Étendre SERVICE_DOMAINS mapping**
   - **Actuellement:** 50 services mappés
   - **Objectif:** 100+ services (couvrir tous les populaires)
   - **Action:** Ajouter mappings dans `logo-service.ts`

### 🟡 Priorité MOYENNE

3. **Précharger logos TOP 20**
   - **Technique:** `<link rel="preload" as="image" href="https://img.logo.dev/whatsapp.com?..." />`
   - **Gain:** Dashboard charge 200ms plus vite
   - **Durée:** 30 min

4. **Cache navigateur optimisé**
   - **Actuellement:** Cache-Control par défaut Logo.dev (7 jours)
   - **Objectif:** Service Worker pour cache 30 jours
   - **Gain:** -90% requêtes Logo.dev après 1ère visite

### 🟢 Priorité BASSE

5. **Monitoring Logo.dev uptime**
   - **Outil:** UptimeRobot surveiller https://img.logo.dev
   - **Alertes:** Email si downtime > 5 min

6. **Fallback local pour TOP 10**
   - **Technique:** Copier logos WhatsApp/Telegram/Instagram en local
   - **Gain:** Garantie 100% uptime TOP services
   - **Trade-off:** +50KB bundle size

---

## 🧪 Tests

### Test 1: Vérifier Logo.dev fonctionne

```bash
curl -I "https://img.logo.dev/whatsapp.com?token=pk_acOeajbNRKGsSDnJvJrcfw&size=200"

# ✅ Attendu:
# HTTP/2 200
# content-type: image/png
# cache-control: public, max-age=604800
```

### Test 2: Vérifier fallback SVG

```javascript
// Dans Console DevTools
const url = getServiceLogoFallback('wa')
console.log(url)

// ✅ Attendu:
// data:image/svg+xml,%3Csvg...%3C/svg%3E
```

### Test 3: Compter services par source

```sql
-- Dans Supabase SQL Editor
SELECT 
  CASE 
    WHEN icon_url IS NOT NULL THEN 'icon_url (DB)'
    ELSE 'Logo.dev API'
  END AS source,
  COUNT(*) as total
FROM services
WHERE active = true
GROUP BY source;

-- ✅ Attendu:
-- icon_url (DB)    | 995
-- Logo.dev API     | 1,434
```

---

## 🐛 Troubleshooting

### Problème: Logo ne s'affiche pas (carré gris)

**Diagnostic:**
1. Ouvrir DevTools → Network
2. Chercher requête `logo.dev`
3. Vérifier status code:
   - **404** → Domaine inconnu de Logo.dev (ajouter mapping SERVICE_DOMAINS)
   - **429** → Token dépassé (1M req/mois)
   - **500** → Logo.dev down (fallback SVG devrait s'activer)

**Solution:**
```typescript
// Ajouter mapping dans logo-service.ts
const SERVICE_DOMAINS = {
  // ...
  'nouveauservice': 'domaine-correct.com',  // ← Ajouter ici
}
```

### Problème: SVG fallback ne s'affiche pas

**Cause:** Navigateur bloque `data:` URIs (CSP)

**Solution:** Ajouter dans `index.html`:
```html
<meta http-equiv="Content-Security-Policy" 
      content="img-src 'self' data: https://img.logo.dev https://*.amazonaws.com;">
```

### Problème: Emoji non supporté (⬜)

**Cause:** Système sans support Unicode 13.0+

**Solution:** Fallback vers première lettre:
```typescript
const emoji = getServiceIcon(code)
const fallbackText = emoji.codePointAt(0) > 0x1F600 ? code.charAt(0).toUpperCase() : emoji
```

---

## 📝 Changelog

### Version Actuelle (2025)
- ✅ Logo.dev API comme source principale
- ✅ 50 services mappés (wa, tg, ig, oi, qv...)
- ✅ Fallback SVG avec emoji et gradient
- ✅ Support hybride (icon_url DB + Logo.dev)

### Historique
- **2024 Q4:** Migration Clearbit → Logo.dev (Clearbit arrêté)
- **2024 Q3:** Tests DuckDuckGo API (qualité insuffisante)
- **2024 Q2:** Système icon_url S3 (995 logos uploadés)

---

## 🔗 Ressources

- **Logo.dev API:** https://logo.dev/docs
- **Token:** `pk_acOeajbNRKGsSDnJvJrcfw`
- **Limite:** 1,000,000 requêtes/mois (Free tier)
- **Support:** support@logo.dev

---

## ✅ Checklist Maintenance Mensuelle

- [ ] Vérifier limites token Logo.dev (Dashboard → Usage)
- [ ] Ajouter mappings pour nouveaux services SMS-Activate
- [ ] Tester TOP 20 services (logos s'affichent correctement)
- [ ] Vérifier logs erreurs navigateur (Console → Errors)
- [ ] Nettoyer icon_url obsolètes en DB (si migration 100% Logo.dev)

---

**Dernière mise à jour:** 2025-01-26  
**Auteur:** GitHub Copilot  
**Version:** 1.0
