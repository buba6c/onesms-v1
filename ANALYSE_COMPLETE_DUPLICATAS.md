# 🔍 ANALYSE COMPLÈTE - DUPLICATAS ET SYNCHRONISATION

## 📊 PROBLÈME IDENTIFIÉ

### Situation actuelle:

- **Admin affiche**: 2425 services
- **Dashboard affiche**: 1290 services (avec stock > 0)
- **API SMS-Activate**: 2035 services officiels
- **Duplicatas**: 1388 codes invalides (n'existent pas dans l'API)

### Causes des duplicatas:

1. **Codes longs vs codes courts**:

   - ❌ Base de données contient: `whatsapp`, `telegram`, `instagram`, `facebook`, `google`, `discord`, `amazon`
   - ✅ API SMS-Activate utilise: `wa`, `tg`, `ig`, `fb`, `go`, `ds`, `am`

2. **Mapping incomplet** dans `/supabase/functions/sync-sms-activate/index.ts`:

   ```typescript
   const NORMALIZE_SERVICE_CODE: Record<string, string> = {
     whatsapp: "wa",
     telegram: "tg",
     // ... seulement 23 mappings
   };
   ```

   ⚠️ Ce mapping est utilisé pour normaliser les codes, **MAIS** l'API `getPrices` retourne déjà des codes COURTS, donc ce mapping crée des doublons au lieu de les résoudre.

3. **Source des codes invalides**:
   - 1388 services ont des codes qui n'existent PAS dans `getServicesList` de l'API
   - Exemples: `mrgreen`, `openpoint`, `taobao`, `roblox`, `discoverhongkong`, `zasilkovna`, etc.
   - Ces codes proviennent probablement d'une ancienne synchronisation ou d'une autre API

## 📋 RÉSULTATS DE L'ANALYSE API

### Services valides (exemples):

```
✅ wa  (WhatsApp)     - 348 numéros disponibles
✅ tg  (Telegram)     - 29,547 numéros
✅ ig  (Instagram)    - 309 numéros
✅ fb  (Facebook)     - 326,847 numéros
✅ go  (Google)       - 19 numéros
✅ ds  (Discord)      - 303,464 numéros
✅ am  (Amazon)       - 303,381 numéros
✅ nf  (Netflix)      - 303,555 numéros
```

### Services populaires avec duplicatas:

| Service   | Code VALIDE ✅ | Stock   | Code INVALIDE ❌ | Stock |
| --------- | -------------- | ------- | ---------------- | ----- |
| Google    | `go`           | 275,776 | `google`         | 0     |
| Discord   | `ds`           | 890,316 | `discord`        | 0     |
| Amazon    | `am`           | 876,382 | `amazon`         | 0     |
| Instagram | `ig`           | 773,461 | -                | -     |
| Facebook  | `fb`           | 437,201 | -                | -     |
| WhatsApp  | `wa`           | 348     | -                | -     |
| Telegram  | `tg`           | 29,547  | -                | -     |

### Duplicatas identifiés (10 services):

1. **Google**: `google` (invalide, stock=0) + `go` (valide, stock=275,776)
2. **Discord**: `discord` (invalide, stock=0) + `ds` (valide, stock=890,316)
3. **Amazon**: `amazon` (invalide, stock=0) + `am` (valide, stock=876,382)
4. **OLX**: `olx` (invalide, stock=2,229,287) + `oi` (valide, stock=0)
5. **Other**: `other` (invalide, stock=1,022,115) + `ot` (valide, stock=0)
6. **Yandex**: `yandex` (invalide, stock=43,741) + `ya` (valide, stock=0)
7. **VKontakte**: `vkontakte` (invalide, stock=43,743) + `vk` (valide, stock=0)
8. **LinkedIn**: `linkedin` (invalide, stock=0) + `li` (valide, stock=0)
9. **PayPal**: `paypal` (invalide, stock=0) + `ts` (valide, stock=0)
10. **Uber**: `uber` (invalide, stock=0) + `ub` (valide, stock=0)

## 💡 SOLUTION PROPOSÉE

### Option 1: Nettoyage SQL (RECOMMANDÉ)

**Fichier**: `/scripts/clean-duplicates.sql`

**Avantages**:

- Rapide et direct
- Supprime uniquement les codes invalides
- Préserve les données valides

**Commandes**:

1. Ouvrir Supabase Dashboard → SQL Editor
2. Copier le contenu de `clean-duplicates.sql`
3. Exécuter le script
4. Décommenter la ligne `DELETE FROM services...`
5. Réexécuter pour supprimer les duplicatas

### Option 2: Resynchronisation complète

**Commandes**:

```bash
# 1. Supprimer tous les services
DELETE FROM services WHERE active = true;

# 2. Relancer la synchronisation
# Via Supabase Edge Functions ou votre interface admin
```

### Option 3: Script automatisé (À CORRIGER)

Le script `/scripts/clean-duplicate-services.ts` nécessite:

- Correction de l'authentification Supabase
- Utilisation de la clé `service_role` pour les opérations DELETE

## 🔧 CORRECTIONS À APPORTER

### 1. Supprimer le mapping NORMALIZE_SERVICE_CODE

**Fichier**: `/supabase/functions/sync-sms-activate/index.ts`

**Ligne 127-151**: Ce mapping n'est plus nécessaire car:

- L'API `getServicesList` retourne déjà les codes COURTS
- L'API `getPrices` utilise les mêmes codes COURTS
- Le mapping crée de la confusion

**Action**: Supprimer complètement ce mapping ou le convertir en documentation.

### 2. Utiliser uniquement `getServicesList` comme source de vérité

**Ligne 228-245**: ✅ Déjà implémenté correctement

```typescript
const servicesListUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getServicesList`;
const servicesListResponse = await fetch(servicesListUrl);
const servicesListData = await servicesListResponse.json();
```

Cette API retourne la liste officielle de 2035 services avec leurs codes courts.

### 3. Filtrer les services lors de la sync

**Ligne 375-408**: Ajouter une validation:

```typescript
// Avant d'ajouter un service:
if (!apiCodes.has(serviceCode)) {
  console.warn(`⚠️ Skipping invalid service code: ${serviceCode}`);
  continue;
}
```

## 📈 RÉSULTAT ATTENDU

Après nettoyage:

- **Total services**: 2035 (= API SMS-Activate)
- **Services avec stock**: ~1290 (selon disponibilité)
- **Services sans stock**: ~745
- **Duplicatas**: 0 ✅

## 🎯 PROCHAINES ÉTAPES

1. ✅ **Analyse terminée** - Problème identifié
2. ⏳ **Décision**: Choisir Option 1, 2 ou 3
3. ⏳ **Exécution**: Nettoyer les duplicatas
4. ⏳ **Vérification**: Confirmer 2035 services
5. ⏳ **Correction code**: Supprimer NORMALIZE_SERVICE_CODE
6. ⏳ **Resync**: Relancer synchronisation
7. ⏳ **Test**: Vérifier dashboard et admin

## 📝 NOTES IMPORTANTES

### Pourquoi Admin affiche 2425 et Dashboard 1290?

C'est **INTENTIONNEL** et **CORRECT**:

**Admin** (2425 services):

- Affiche TOUS les services (`active=true`)
- Inclut les services sans stock
- Pour monitoring et statistiques
- Requête: `SELECT * FROM services WHERE active = true`

**Dashboard** (1290 services):

- Affiche seulement les services DISPONIBLES (`total_available > 0`)
- Exclut 1135 services sans stock
- Interface client (seulement services achetables)
- Requête: `SELECT * FROM services WHERE active = true AND total_available > 0`

**Différence**: 2425 - 1290 = **1135 services sans stock** (normal!)

### Services populaires affectés

Les 14 services populaires (score > 800) sont **tous valides** avec des codes courts:

1. `fb` - Facebook (✅ valide)
2. `ds` - Discord (✅ valide)
3. `am` - Amazon (✅ valide)
4. `ig` - Instagram (✅ valide)
5. `go` - Google (✅ valide)
6. `mm` - Microsoft (✅ valide)
7. `nf` - Netflix (✅ valide)
8. `mb` - Yahoo (✅ valide)
9. `wa` - WhatsApp (✅ valide si score > 800)
10. `tg` - Telegram (✅ valide si score > 800)

❌ Services invalides à supprimer:

- `googlevoice` (pas dans l'API)
- `spotify` (pas dans l'API)
- `coinswitchkuber` (pas dans l'API)
- `apple` → code valide: `wx`
- `skype` (pas dans l'API)
- `tiktok` → code valide: `lf`

## 🔗 DOCUMENTATION API

**Base URL**: `https://api.sms-activate.ae/stubs/handler_api.php`

**Endpoints utilisés**:

1. `action=getServicesList` - Liste officielle des 2035 services
2. `action=getPrices&country=X` - Prix et stock par pays
3. `action=getNumbersStatus&country=X` - Stock disponible uniquement

**Format des codes**: Tous les codes sont COURTS (2-3 caractères)

- ✅ `wa`, `tg`, `ig`, `fb`, `go`, `ds`, `am`, `nf`
- ❌ `whatsapp`, `telegram`, `instagram`, `facebook`, `google`

## ⚠️ AVERTISSEMENT

Avant de supprimer les 1388 services invalides:

1. **Backup**: Exporter la table `services` (Supabase → Table Editor → Export)
2. **Vérification**: S'assurer que les codes à supprimer sont bien invalides
3. **Test**: Exécuter d'abord sur une copie de la base si possible
4. **Synchronisation**: Prévoir une resync après nettoyage

---

**Date de l'analyse**: 26 novembre 2025
**API Version**: SMS-Activate v1
**Base de données**: Supabase (htfqmamvmhdoixqcbbbw)
