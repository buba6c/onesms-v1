# 💰 SYSTÈME DE PRIX - Documentation Complète

## 🔍 Analyse du Problème

### Situation Actuelle

- **5sim utilise**: Roubles russes (₽)
- **Notre app utilise**: Pièces (Ⓐ)
- **Conversion**: 1₽ = 1Ⓐ (directement, sans conversion)
- **Marge appliquée**: 20% (cost \* 1.2)

### Exemple Concret

```
Service: Google Logo
Prix 5sim: 15₽
Prix dans notre app: 18Ⓐ (15 * 1.2)

Différence: 3Ⓐ de marge (20%)
```

## ❌ Pourquoi C'est Confus

1. **Unité monétaire différente**: ₽ vs Ⓐ
2. **Pas de taux de change**: 1:1 direct
3. **Marge cachée**: L'utilisateur ne sait pas d'où vient la différence
4. **Comparaison difficile**: Comment comparer avec 5sim?

## ✅ Solutions Possibles

### Option 1: Pièce = Rouble (Simple)

**Définition claire**: 1Ⓐ = 1₽ en valeur

- ✅ Simple à comprendre
- ✅ Pas de calcul complexe
- ✅ Affichage direct
- ❌ Lié au rouble (fluctuation)

```typescript
// Dans sync-5sim/index.ts
const sellingPrice = cost * 1.2; // 15₽ → 18Ⓐ
```

### Option 2: Taux de Change Configurable

**Ajout d'un taux**: 1₽ = X Ⓐ (configurable)

- ✅ Flexible
- ✅ Indépendant du rouble
- ✅ Permet ajustement
- ❌ Plus complexe

```typescript
// Dans .env
ROUBLE_TO_COIN_RATE=1.0

// Dans sync-5sim/index.ts
const roubleToC oin = parseFloat(Deno.env.get('ROUBLE_TO_COIN_RATE') || '1.0')
const sellingPrice = (cost * roubleToC oin) * 1.2
```

### Option 3: Double Affichage (Transparent)

**Afficher les deux**: "18Ⓐ (15₽ + 20% marge)"

- ✅ Totalement transparent
- ✅ Utilisateur informé
- ✅ Comparaison facile
- ❌ Interface plus chargée

```tsx
// Dans DashboardPage.tsx
<div>
  <span className="text-lg font-bold">{price}Ⓐ</span>
  <span className="text-xs text-gray-500">
    ({originalCost}₽ + {margin}% marge)
  </span>
</div>
```

## 🎯 Recommandation

### ⭐ Option 1 + 3 Hybride (Meilleure)

1. **Définir clairement**: 1Ⓐ = 1₽
2. **Afficher les deux** quand utile
3. **Marge visible** dans l'admin

```typescript
// Configuration
const COIN_DEFINITION = "1Ⓐ = 1₽";
const DEFAULT_MARGIN = 1.2; // 20%

// Calcul
const costInRubles = 15; // depuis 5sim
const priceInCoins = costInRubles * DEFAULT_MARGIN; // 18Ⓐ

// Affichage utilisateur
("18Ⓐ"); // Simple

// Affichage admin
("18Ⓐ (15₽ + 20%)"); // Transparent
```

## 🔧 Implémentation

### 1. Clarifier dans .env

```bash
# Configuration monétaire
COIN_TO_ROUBLE_RATE=1.0
DEFAULT_MARGIN_PERCENT=20
SHOW_ORIGINAL_COST=true
```

### 2. Mettre à jour sync-5sim

```typescript
const COIN_RATE = parseFloat(Deno.env.get("COIN_TO_ROUBLE_RATE") || "1.0");
const MARGIN =
  parseFloat(Deno.env.get("DEFAULT_MARGIN_PERCENT") || "20") / 100 + 1;

const sellingPrice = cost * COIN_RATE * MARGIN;
```

### 3. Afficher dans l'interface

```tsx
{/* Simple pour l'utilisateur */}
<span>{price}Ⓐ</span>

{/* Détaillé pour l'admin */}
<span>{price}Ⓐ</span>
<small className="text-gray-500">
  ({originalCost}₽ × {COIN_RATE} + {(MARGIN - 1) * 100}%)
</small>
```

## 📊 Impact sur les Prix

### Avec Option 1 (Actuel)

```
Service     5sim    Notre App   Marge
Google      15₽     18Ⓐ        3Ⓐ (20%)
WhatsApp    12₽     14.4Ⓐ      2.4Ⓐ (20%)
Telegram    10₽     12Ⓐ        2Ⓐ (20%)
```

### Avec Option 2 (Rate 0.85)

```
Service     5sim    Notre App   Marge
Google      15₽     15.3Ⓐ      2.55Ⓐ (20%)
WhatsApp    12₽     12.24Ⓐ     2.04Ⓐ (20%)
Telegram    10₽     10.2Ⓐ      1.7Ⓐ (20%)
```

## 🎓 Explication Utilisateur

### Page "À Propos"

```markdown
# Système de Pièces (Ⓐ)

Notre plateforme utilise des **Pièces (Ⓐ)** comme monnaie virtuelle.

**Équivalence**: 1Ⓐ = 1₽ (Rouble russe)

**Pourquoi?** Nous achetons les numéros depuis 5sim.net (Russie),
qui facture en roubles. Pour simplifier, nous utilisons la même
valeur en Pièces.

**Marge**: Nous appliquons 20% de marge sur les prix 5sim pour
couvrir les frais de plateforme et support.

**Exemple**:

- Prix 5sim: 15₽
- Prix ici: 18Ⓐ (15₽ + 20%)
```

## ✅ Actions Immédiates

1. ✅ Ajouter variables .env
2. ✅ Documenter dans le code
3. ✅ Afficher dans l'UI admin
4. ✅ Créer page d'explication
5. ✅ Tester avec vrais achats
