# 🐛 BUG CRITIQUE : DOUBLE DÉDUCTION DE LA BALANCE

## 📋 Description du Bug

### Symptômes Observés

- **Balance avant achat** : 36 Ⓐ, Frozen : 5 Ⓐ
- **Après achat WhatsApp 5 Ⓐ** : Balance : **26 Ⓐ** ❌, Frozen : 10 Ⓐ ✅
- **Après annulation** : Balance : **36 Ⓐ** ✅, Frozen : 5 Ⓐ ✅

### Le Problème

La balance était **débitée immédiatement** lors de l'achat, puis **remboursée** lors de l'annulation.

Ce comportement causait :

1. **Réduction visible incorrecte** : L'utilisateur voyait sa balance diminuer alors que les fonds étaient censés être "gelés"
2. **Expérience utilisateur déroutante** : La balance "revient" magiquement après annulation
3. **Incohérence conceptuelle** : Le système de "frozen balance" implique que les fonds sont **réservés**, pas **dépensés**

---

## 🔍 Analyse Technique

### Flux AVANT Correction (INCORRECT)

#### 1. Achat d'activation

```typescript
// buy-sms-activate-number/index.ts (ligne 263-270)
const newBalance = currentBalance - price; // ❌ Débit immédiat
const newFrozenBalance = frozenBalance + price;

await supabase.from("users").update({
  balance: newBalance, // Balance diminue
  frozen_balance: newFrozenBalance,
});
```

**Résultat** :

- Balance : 36 - 5 = **31 Ⓐ** ❌
- Frozen : 5 + 5 = **10 Ⓐ** ✅

#### 2. Annulation

```typescript
// cancel-sms-activate-order/index.ts (ligne 195)
const newBalance = user.balance + actualUnfreezeAmount; // ❌ Remboursement
const newFrozenBalance = frozen - actualUnfreezeAmount;

await supabase.from("users").update({
  balance: newBalance, // Balance augmente
  frozen_balance: newFrozenBalance,
});
```

**Résultat** :

- Balance : 31 + 5 = **36 Ⓐ** ✅ (revenu normal mais incorrect conceptuellement)
- Frozen : 10 - 5 = **5 Ⓐ** ✅

---

### Flux APRÈS Correction (CORRECT)

#### 1. Achat d'activation ✅

```typescript
// buy-sms-activate-number/index.ts (ligne 261-268)
const newFrozenBalance = frozenBalance + price;

await supabase.from("users").update({
  frozen_balance: newFrozenBalance, // Seulement geler
});
```

**Résultat** :

- Balance : **36 Ⓐ** ✅ (inchangée)
- Frozen : 5 + 5 = **10 Ⓐ** ✅

#### 2. Annulation ✅

```typescript
// cancel-sms-activate-order/index.ts (ligne 193)
const newBalance = user.balance; // ✅ Balance inchangée
const newFrozenBalance = frozen - actualUnfreezeAmount;

await supabase.from("users").update({
  balance: newBalance, // Balance reste identique
  frozen_balance: newFrozenBalance,
});
```

**Résultat** :

- Balance : **36 Ⓐ** ✅ (inchangée)
- Frozen : 10 - 5 = **5 Ⓐ** ✅

#### 3. SMS Reçu ✅

```typescript
// check-sms-activate-status/index.ts (ligne 700-701)
await supabase.from("users").update({
  balance: user.balance - activation.price, // ✅ Débit uniquement quand SMS reçu
  frozen_balance: newFrozenBalance,
});
```

**Résultat** :

- Balance : 36 - 5 = **31 Ⓐ** ✅
- Frozen : 10 - 5 = **5 Ⓐ** ✅

---

## 🔧 Corrections Appliquées

### Fichier 1 : `supabase/functions/buy-sms-activate-number/index.ts`

#### Ligne 261-278 (Achat)

**AVANT** :

```typescript
const newBalance = currentBalance - price;
const newFrozenBalance = frozenBalance + price;

await supabaseClient.from("users").update({
  balance: newBalance,
  frozen_balance: newFrozenBalance,
});
```

**APRÈS** :

```typescript
// ✅ FIX: Ne pas débiter la balance, seulement geler les fonds !
const newFrozenBalance = frozenBalance + price;

await supabaseClient.from("users").update({
  frozen_balance: newFrozenBalance,
});
```

#### Ligne 321-327 (Rollback en cas d'erreur API)

**AVANT** :

```typescript
await supabaseClient.from("users").update({
  balance: currentBalance, // Restore
  frozen_balance: frozenBalance,
});
```

**APRÈS** :

```typescript
await supabaseClient.from("users").update({
  frozen_balance: frozenBalance, // Balance n'a pas changé
});
```

---

### Fichier 2 : `supabase/functions/cancel-sms-activate-order/index.ts`

#### Ligne 193-198 (Annulation)

**AVANT** :

```typescript
const newFrozenBalance = Math.max(0, frozen - actualUnfreezeAmount);
const newBalance = user.balance + actualUnfreezeAmount; // ❌ Remboursement
```

**APRÈS** :

```typescript
const newFrozenBalance = Math.max(0, frozen - actualUnfreezeAmount);
// ✅ FIX: Balance reste inchangée (car elle n'a jamais été débitée)
const newBalance = user.balance;
```

---

## ✅ Vérification

### État du Système Après Correction

```
Balance: 41.84 Ⓐ
Frozen: 5 Ⓐ
Disponible: 36.84 Ⓐ

Activations actives: 1
  - go/6285834615011: 5 Ⓐ frozen

✅ COHÉRENCE PARFAITE !
```

---

## 🎯 Comportement Attendu Désormais

### Scénario 1 : Achat → Annulation

1. **Avant** : Balance 36 Ⓐ, Frozen 5 Ⓐ
2. **Achat 5 Ⓐ** : Balance **36 Ⓐ** ✅, Frozen **10 Ⓐ** ✅
3. **Annulation** : Balance **36 Ⓐ** ✅, Frozen **5 Ⓐ** ✅

### Scénario 2 : Achat → SMS Reçu

1. **Avant** : Balance 36 Ⓐ, Frozen 5 Ⓐ
2. **Achat 5 Ⓐ** : Balance **36 Ⓐ** ✅, Frozen **10 Ⓐ** ✅
3. **SMS reçu** : Balance **31 Ⓐ** ✅, Frozen **5 Ⓐ** ✅

### Scénario 3 : Achat → Timeout

1. **Avant** : Balance 36 Ⓐ, Frozen 5 Ⓐ
2. **Achat 5 Ⓐ** : Balance **36 Ⓐ** ✅, Frozen **10 Ⓐ** ✅
3. **Timeout (20min)** : Balance **31 Ⓐ** ✅, Frozen **5 Ⓐ** ✅

---

## 🚀 Déploiement

```bash
# Déployer les fonctions corrigées
npx supabase functions deploy buy-sms-activate-number --no-verify-jwt
npx supabase functions deploy cancel-sms-activate-order --no-verify-jwt
```

**Status** : ✅ Déployé le 30 novembre 2025

---

## 📝 Notes Importantes

### Concept du Frozen Balance

Le **frozen_balance** représente des fonds **gelés mais toujours présents** dans la balance totale.

- **Balance totale** : Le montant total possédé par l'utilisateur
- **Frozen** : La partie gelée (réservée pour des activations/rentals en cours)
- **Disponible** : Balance - Frozen (ce qui peut être utilisé)

### Quand la Balance est-elle débitée ?

La balance est débitée **UNIQUEMENT** dans ces cas :

1. ✅ **SMS reçu** (status → completed)
2. ✅ **Timeout** (status → timeout, après 20 minutes)
3. ❌ **JAMAIS lors de l'achat** (seulement gel)
4. ❌ **JAMAIS lors de l'annulation** (seulement dégel)

---

## 🔄 Bugs Connexes Corrigés

### 1. Rentals Expirés Non Nettoyés

**Problème** : 4 rentals expirés depuis novembre gardaient status='active' et frozen_amount > 0

**Correction** : Script `fix_expired_rentals_cancelled.mjs`

- 25.65 Ⓐ libérés
- Rentals mis à status='cancelled'

### 2. Cleanup Automatique Manquant

**Problème** : Pas de fonction automatique de nettoyage des rentals expirés

**TODO** : Créer `cleanup-expired-rentals` Edge Function (comme pour activations)

---

## 📊 Impact Utilisateur

### Avant

- ❌ Balance diminue immédiatement → Utilisateur pense avoir perdu l'argent
- ❌ Balance "revient" après annulation → Confusion
- ❌ Perception de bug ou de manipulation

### Après

- ✅ Balance reste stable → Transparence
- ✅ Seul le "Disponible" diminue → Clarté
- ✅ Comportement cohérent avec le concept de "gel"

---

## 🎓 Leçons Apprises

1. **Frozen Balance ≠ Déduction** : Geler n'est pas débiter
2. **Transaction Atomique** : Status + frozen_amount doivent être mis à jour ensemble
3. **Idempotence** : Toujours vérifier si l'opération a déjà été effectuée
4. **Cleanup Automatique** : Les ressources expirées doivent être nettoyées automatiquement

---

**Auteur** : GitHub Copilot  
**Date** : 30 novembre 2025  
**Status** : ✅ Résolu et déployé
