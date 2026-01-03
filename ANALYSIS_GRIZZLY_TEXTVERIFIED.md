# 🔍 Analyse Approfondie - Grizzly SMS & TextVerified

## ❌ Problèmes Critiques Identifiés

### 1. **MANQUE D'UTILISATION DE `atomic_refund`** (CRITIQUE)

#### Problème: `buy-grizzly-number/index.ts` (Lignes 117-132)
```typescript
// ❌ MAUVAIS: Rollback manuel au lieu d'atomic_refund
if (!text.includes('ACCESS_NUMBER')) {
    const { data: refundUser } = await supabaseClient.from('users').select('frozen_balance').eq('id', userId).single()
    const currentFrozen = refundUser?.frozen_balance || 0
    const newFrozen = Math.max(0, currentFrozen - price)
    
    await supabaseClient.from('users').update({ frozen_balance: newFrozen }).eq('id', userId)
    await supabaseClient.from('transactions').update({ status: 'failed', ... }).eq('id', txn.id)
}
```

**Impact:**
- ❌ Pas de création de `balance_operations` pour le unfreeze
- ❌ Transaction non atomique (race condition possible)
- ❌ Pas de mise à jour de `provider_performance`
- ❌ Pas de cohérence avec les autres providers (5sim, etc.)

#### Problème Identique: `buy-textverified-number/index.ts` (Lignes 159-168)
Même logique de rollback manuel.

---

### 2. **ROLLBACK INCOMPLET** (CRITIQUE)

#### Problème: `buy-textverified-number/index.ts` (Ligne 193)
```typescript
if (actError) throw new Error('DB Save Error')
```

**Impact:**
- ❌ Si l'insertion dans `activations` échoue, l'argent reste frozen SANS rollback
- ❌ L'activation a été achetée chez TextVerified mais pas sauvée
- ❌ Perte potentielle d'argent utilisateur + numéro acheté mais perdu

**Même problème:** `buy-grizzly-number/index.ts` (Ligne 163)

---

### 3. **INCOHÉRENCE: Logique de Balance**

#### `buy-grizzly-number` vs `buy-5sim-number`
- `buy-5sim-number` utilise `secure_freeze_balance()` (RPC atomique)
- `buy-grizzly-number` fait des UPDATE manuels (❌ non atomique)

---

## ✅ Ce Qui Fonctionne Correctement

### `check-grizzly-status/index.ts` et `check-textverified-status/index.ts`
- ✅ Utilisent `atomic_complete_activation` pour charge
- ✅ Utilisent `atomic_refund` pour annulations
- ✅ Cohérent avec les autres providers

---

## 🛠️ Solutions Requises

### Solution 1: Remplacer Rollback Manuel par `atomic_refund`
**Fichiers:** `buy-grizzly-number/index.ts` et `buy-textverified-number/index.ts`

Au lieu de:
```typescript
const { data: refundUser } = await supabaseClient.from('users').select('frozen_balance').eq('id', userId).single()
const currentFrozen = refundUser?.frozen_balance || 0
await supabaseClient.from('users').update({ frozen_balance: Math.max(0, currentFrozen - price) }).eq('id', userId)
await supabaseClient.from('transactions').update({ status: 'failed' }).eq('id', txn.id)
```

Utiliser:
```typescript
// Créer activation temporaire pour rollback
const { data: tempActivation } = await supabaseClient.from('activations').insert({
    user_id: userId,
    order_id: 'FAILED_API_CALL',
    phone: 'N/A',
    service_code: product,
    country_code: country,
    price: price,
    frozen_amount: price,
    status: 'failed',
    provider: 'grizzly' // or 'textverified'
}).select().single()

// Utiliser atomic_refund
await supabaseClient.rpc('atomic_refund', {
    p_activation_id: tempActivation.id
})
```

### Solution 2: Gérer l'Erreur Critique DB Save
**Fichiers:** `buy-grizzly-number/index.ts` (ligne 160-164) et `buy-textverified-number/index.ts` (ligne 193)

```typescript
if (actError) {
    console.error('❌ Critical DB Error - Activation bought but not saved:', actError)
    
    // Créer activation orpheline pour tracer + rollback
    const { data: orphanActivation } = await supabaseClient.from('activations').insert({
        user_id: userId,
        order_id: activationId, // From API (IMPORTANT: on a le numéro!)
        phone: phone || buyData.number,
        service_code: product,
        country_code: country,
        price: price,
        frozen_amount: price,
        status: 'orphaned', // Custom status for admin investigation
        provider: 'grizzly' // or 'textverified'
    }).select().single()
    
    // Refund user immédiatement
    if (orphanActivation) {
        await supabaseClient.rpc('atomic_refund', { p_activation_id: orphanActivation.id })
    }
    
    throw new Error('CRITICAL: Number purchased but DB save failed - Refunded automatically')
}
```

---

## 📊 Comparaison avec `buy-5sim-number`

| Aspect | buy-5sim-number | buy-grizzly-number | buy-textverified-number |
|--------|-----------------|-------------------|------------------------|
| **Freeze Balance** | ✅ `secure_freeze_balance()` RPC | ❌ UPDATE manuel | ❌ UPDATE manuel |
| **Rollback API Fail** | ✅ Vérifie + logique propre | ❌ Rollback manuel incomplet | ❌ Rollback manuel incomplet |
| **Rollback DB Fail** | ✅ Logique de rollback | ❌ Juste un throw | ❌ Juste un throw |
| **balance_operations** | ✅ Créé automatiquement | ❌ Uniquement pour freeze | ❌ Uniquement pour freeze |
| **provider_performance** | ✅ Via atomic_refund | ❌ Non mis à jour | ❌ Non mis à jour |

---

## 🚨 Actions Immédiates Requises

1. **Corriger `buy-grizzly-number/index.ts`** (rollback API fail + DB fail)
2. **Corriger `buy-textverified-number/index.ts`** (rollback API fail + DB fail)
3. **Optionnel mais recommandé:** Migrer vers `secure_freeze_balance()` RPC

---

## ⚠️ Impact si Non Corrigé

- 💰 **Argent bloqué** si API échoue (frozen_balance jamais libéré correctement)
- 📊 **Statistiques incorrectes** (`provider_performance` non mis à jour)
- 🔍 **Audit trail incomplet** (pas de `balance_operations` au unfreeze)
- 🐛 **Race conditions** possibles (UPDATE manuels non atomiques)
