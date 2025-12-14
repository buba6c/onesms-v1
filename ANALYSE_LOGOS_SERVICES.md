# 🔍 ANALYSE APPROFONDIE - SMS-Activate API & Services

## 📋 Ce que dit la documentation SMS-Activate

### 1. **Récupérer la liste des services**

**Endpoint**: `getServicesList`

```
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getServicesList&country=$country&lang=$lang
```

**Paramètres**:

- `country` (optionnel): ID du pays pour filtrer les services disponibles
- `lang` (optionnel): 'ru', 'en', 'es', 'cn' (défaut: 'en')

**Réponse**:

```json
{
  "status": "success",
  "services": [
    {
      "code": "aoo",
      "name": "Pegasus Airlines"
    }
  ]
}
```

⚠️ **PROBLÈME**: Cette API ne retourne PAS:

- Les logos/icons
- L'ordre de popularité
- Les catégories
- Les prix

---

### 2. **Récupérer les prix actuels**

**Endpoint**: `getPrices`

```
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getPrices&service=$service&country=$country
```

**Réponse**:

```json
{
  "187": {
    "wa": {
      "cost": "2.5",
      "count": "73575"
    }
  }
}
```

---

### 3. **Top 10 pays par service**

**Endpoint**: `getListOfTopCountriesByService`

```
https://api.sms-activate.ae/stubs/handler_api.php?api_key=$api_key&action=getListOfTopCountriesByService&service=$service
```

**Réponse**:

```json
[
  {
    "country": 2,
    "share": 50,
    "rate": 50
  }
]
```

---

## 🎯 ORDRE EXACT DES SERVICES (Homepage SMS-Activate)

D'après l'analyse du document et l'observation du site:

### **Ordre de popularité officiel**:

1. **ig** - Instagram 📷
2. **wa** - WhatsApp 💬
3. **tg** - Telegram ✈️
4. **go** - Google 🔍
5. **fb** - Facebook 👤
6. **vk** - VK 🔵
7. **tw** - Twitter 🐦
8. **ok** - OK 👌
9. **vi** - Viber 💜
10. **ds** - Discord 💬

### **Services populaires additionnels**:

11. **mb** - Microsoft/Bing 🪟
12. **am** - Amazon 📦
13. **nf** - Netflix 🎬
14. **ya** - Yandex 🟡
15. **ub** - Uber 🚗
16. **ym** - YouMail 📧
17. **tn** - Tinder 🔥
18. **bd** - Badoo 💕
19. **we** - WeChat 💬
20. **li** - LinkedIn 💼

---

## 🚨 PROBLÈMES IDENTIFIÉS

### 1. **Les logos ne sont PAS fournis par l'API**

L'API SMS-Activate ne fournit:

- ❌ Pas de logos/images
- ❌ Pas d'icons
- ✅ Seulement les codes (wa, ig, tg...)
- ✅ Seulement les noms ("WhatsApp", "Instagram"...)

**Solution actuelle**: On utilise un mapping manuel:

```typescript
// src/lib/logo-service.ts
getServiceLogo(serviceCode: string): string
getServiceIcon(serviceCode: string): string
```

### 2. **L'ordre n'est PAS fourni par l'API**

L'API ne fournit aucune information sur:

- ❌ Popularité globale
- ❌ Ordre d'affichage
- ❌ Catégories

**Solution actuelle**: On définit `popularity_score` manuellement dans la sync function

### 3. **Notre ordre actuel est INCORRECT**

**Ce qu'on affiche maintenant**:

1. WhatsApp (wa)
2. Telegram (tg)
3. PayPal (ts)
4. Badoo (bd)
5. Twitter (tw)

**Ce qu'on DEVRAIT afficher**:

1. Instagram (ig)
2. WhatsApp (wa)
3. Telegram (tg)
4. Google (go)
5. Facebook (fb)

---

## 💡 SOLUTIONS À IMPLÉMENTER

### **Solution 1: Ordre des services**

✅ **DÉJÀ FAIT** dans `sync-sms-activate/index.ts`:

```typescript
const smsActivateOrder: Record<string, number> = {
  'ig': 1000,
  'wa': 990,
  'tg': 980,
  'go': 970,
  'fb': 960,
  ...
}
```

### **Solution 2: Logos des services**

**Option A: Mapping manuel (ACTUEL)**

```typescript
// src/lib/logo-service.ts
const SERVICE_ICONS: Record<string, string> = {
  wa: '💬',
  ig: '📷',
  tg: '✈️',
  go: '🔍',
  fb: '👤',
  ...
}
```

**Option B: Utiliser des URLs d'images**

```typescript
const SERVICE_LOGOS: Record<string, string> = {
  wa: 'https://logo.clearbit.com/whatsapp.com',
  ig: 'https://logo.clearbit.com/instagram.com',
  tg: 'https://logo.clearbit.com/telegram.org',
  ...
}
```

**Option C: Logos locaux (MEILLEUR)**

```
/public/logos/services/
  - wa.png (WhatsApp)
  - ig.png (Instagram)
  - tg.png (Telegram)
  - go.png (Google)
  ...
```

### **Solution 3: Synchroniser les noms depuis l'API**

Améliorer la sync pour utiliser `getServicesList`:

```typescript
// 1. Récupérer la liste complète des services
const servicesResponse = await fetch(
  `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${apiKey}&action=getServicesList&lang=en`
)
const servicesData = await servicesResponse.json()

// 2. Créer un mapping code -> name
const serviceNames = {}
servicesData.services.forEach(s => {
  serviceNames[s.code] = s.name
})

// 3. Utiliser les vrais noms
servicesToUpsert.push({
  code: serviceCode,
  name: serviceNames[serviceCode] || serviceCode,
  display_name: serviceNames[serviceCode] || serviceCode,
  ...
})
```

---

## 📊 MAPPING COMPLET DES SERVICES

Basé sur l'observation du site SMS-Activate:

| Code | Nom       | Icon | Catégorie | Score |
| ---- | --------- | ---- | --------- | ----- |
| ig   | Instagram | 📷   | social    | 1000  |
| wa   | WhatsApp  | 💬   | messenger | 990   |
| tg   | Telegram  | ✈️   | messenger | 980   |
| go   | Google    | 🔍   | tech      | 970   |
| fb   | Facebook  | 👤   | social    | 960   |
| vk   | VK        | 🔵   | social    | 950   |
| tw   | Twitter   | 🐦   | social    | 940   |
| ok   | OK        | 👌   | social    | 930   |
| vi   | Viber     | 💜   | messenger | 920   |
| ds   | Discord   | 💬   | messenger | 910   |
| mb   | Microsoft | 🪟   | tech      | 900   |
| am   | Amazon    | 📦   | shopping  | 890   |
| nf   | Netflix   | 🎬   | streaming | 880   |
| ya   | Yandex    | 🟡   | tech      | 870   |
| ub   | Uber      | 🚗   | transport | 860   |
| ym   | YouMail   | 📧   | email     | 850   |
| tn   | Tinder    | 🔥   | dating    | 840   |
| bd   | Badoo     | 💕   | dating    | 830   |
| we   | WeChat    | 💬   | messenger | 820   |
| li   | LinkedIn  | 💼   | social    | 810   |

---

## 🔧 CORRECTIONS À APPLIQUER

### **1. Corriger les icons dans sync-sms-activate**

```diff
+ const SERVICE_ICONS: Record<string, string> = {
+   'ig': '📷', 'wa': '💬', 'tg': '✈️', 'go': '🔍',
+   'fb': '👤', 'vk': '🔵', 'tw': '🐦', 'ok': '👌',
+   'vi': '💜', 'ds': '💬', 'mb': '🪟', 'am': '📦',
+   'nf': '🎬', 'ya': '🟡', 'ub': '🚗', 'ym': '📧',
+   'tn': '🔥', 'bd': '💕', 'we': '💬', 'li': '💼'
+ }

servicesToUpsert.push({
  code: serviceCode,
  name: serviceCode.charAt(0).toUpperCase() + serviceCode.slice(1),
  display_name: serviceCode.charAt(0).toUpperCase() + serviceCode.slice(1),
  category: 'social',
- icon: '📱',
+ icon: SERVICE_ICONS[serviceCode] || '📱',
  active: true,
  popularity_score: popularityScore,
  total_available: 0
})
```

### **2. Corriger les catégories**

```typescript
const SERVICE_CATEGORIES: Record<string, string> = {
  ig: "social",
  fb: "social",
  vk: "social",
  tw: "social",
  ok: "social",
  li: "social",
  wa: "messenger",
  tg: "messenger",
  vi: "messenger",
  ds: "messenger",
  we: "messenger",
  go: "tech",
  mb: "tech",
  ya: "tech",
  am: "shopping",
  nf: "streaming",
  ub: "transport",
  ym: "email",
  tn: "dating",
  bd: "dating",
};
```

### **3. Ajouter getServicesList dans la sync**

Récupérer les vrais noms depuis l'API au lieu de les deviner.

---

## ✅ CHECKLIST DE SYNCHRONISATION

- [x] Ordre des services (popularity_score) ✅ Déjà fait
- [ ] Icons appropriés pour chaque service
- [ ] Catégories correctes
- [ ] Noms depuis getServicesList API
- [ ] Logos locaux (optionnel)

---

## 🚀 PROCHAINES ÉTAPES

1. **Mettre à jour sync-sms-activate** avec les icons et catégories
2. **Appeler getServicesList** pour récupérer les vrais noms
3. **Redéployer** la Edge Function
4. **Tester** la synchronisation complète
5. **Vérifier** l'ordre et l'apparence dans le dashboard
