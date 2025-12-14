# 🐛 RAPPORT: Pourquoi 30Ⓐ sont gelés fantômes?

**Date**: 2 décembre 2025  
**User**: buba6c@gmail.com (e108c02a-2012-4043-bbc2-fb09bb11f824)  
**Problème**: 35Ⓐ frozen_balance au lieu de 5Ⓐ attendus  
**Différence**: 30Ⓐ gelés en trop (phantom frozen funds)

---

## 🔍 CAUSE RACINE IDENTIFIÉE

### Le Bug: `cron-check-pending-sms` NE CALL PAS `atomic_refund()`

**Fichier**: `/supabase/functions/cron-check-pending-sms/index.ts`  
**Lignes**: 50-110

```typescript
// ❌ BUG: Code ANCIEN qui ne call PAS atomic_refund
if (now > expiresAt) {
  console.log(`⏰ [CRON-CHECK-SMS] Expired: ${activation.order_id}`);

  // ❌ Met le status à timeout
  await supabaseClient
    .from("activations")
    .update({ status: "timeout" })
    .eq("id", activation.id);

  // ❌ PROBLÈME: Code MANUEL qui NE call PAS atomic_refund
  const { data: transaction } = await supabaseClient
    .from("transactions")
    .select("*")
    .eq("related_activation_id", activation.id)
    .eq("status", "pending")
    .single();

  if (transaction) {
    await supabaseClient
      .from("transactions")
      .update({ status: "refunded" })
      .eq("id", transaction.id);

    const { data: user } = await supabaseClient
      .from("users")
      .select("frozen_balance")
      .eq("id", activation.user_id)
      .single();

    if (user) {
      // ❌ BUG: NE crée PAS de balance_operations[refund]
      // ❌ BUG: Diminue frozen_balance MAIS sans atomic_refund
      const frozenAmountToUnfreeze = activation.frozen_amount || 0;

      if (frozenAmountToUnfreeze > 0) {
        const actualUnfreeze = Math.min(
          frozenAmountToUnfreeze,
          user.frozen_balance || 0
        );

        if (actualUnfreeze > 0) {
          // ❌ UPDATE DIRECT sans atomic_refund
          await supabaseClient
            .from("users")
            .update({
              frozen_balance: Math.max(
                0,
                (user.frozen_balance || 0) - actualUnfreeze
              ),
            })
            .eq("id", activation.user_id);

          // ❌ Reset frozen_amount sur activation
          await supabaseClient
            .from("activations")
            .update({ frozen_amount: 0 })
            .eq("id", activation.id);
        }
      }
    }
  }
}
```

---

## 🆚 COMPARAISON: `cron-check-pending-sms` vs `check-sms-activate-status`

### ✅ check-sms-activate-status (CORRECT)

**Fichier**: `/supabase/functions/check-sms-activate-status/index.ts`  
**Lignes**: 17-86

```typescript
// ✅ BON: Utilise un helper qui appelle atomic_refund
async function refundActivation(
  supabaseClient: any,
  activationId: string,
  userId: string,
  reason: string
): Promise<{
  success: boolean;
  refunded: number;
  error?: string;
  idempotent?: boolean;
}> {
  // ... vérifications ...

  // ✅ APPEL atomic_refund
  const { data: refundResult, error: refundErr } = await supabaseClient.rpc(
    "atomic_refund",
    {
      p_user_id: userId,
      p_activation_id: activationId,
      p_reason: reason,
    }
  );

  if (!refundErr && refundResult?.success) {
    console.log("✅ [REFUND] atomic_refund SUCCESS:", refundResult);
    return { success: true, refunded: refundResult.refunded || refundAmount };
  }
}

// Et lors du timeout (ligne 148-177):
if (now > expiresAt) {
  // ✅ BON: Appelle refundActivation qui call atomic_refund
  const refundResult = await refundActivation(
    supabaseClient,
    activation.id,
    activation.user_id,
    "Activation timeout (expired)"
  );

  await supabaseClient
    .from("activations")
    .update({
      status: "timeout",
      frozen_amount: 0,
      charged: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", activationId);
}
```

### ❌ cron-check-pending-sms (BUG)

- NE call PAS `atomic_refund()`
- NE crée PAS de `balance_operations[refund]`
- UPDATE direct de `users.frozen_balance`
- Résultat: frozen_amount sur activation mis à 0 MAIS frozen_balance reste bloqué!

---

## 📊 IMPACT DU BUG

### Activations Affectées (8 au total)

```
[22:20:26] 3e776ab0 | dh | timeout | ❌ PAS DE REFUND
[22:20:26] 3d9b9f79 | dh | timeout | ❌ PAS DE REFUND
[22:20:26] 43ec2c29 | dh | timeout | ❌ PAS DE REFUND
[22:20:26] a1a38fe4 | dh | timeout | ❌ PAS DE REFUND
[22:18:37] 36de1214 | btv | timeout | ❌ PAS DE REFUND
[22:12:51] 53549a03 | fb | cancelled | ❌ PAS DE REFUND
[22:12:35] 044a080f | hw | cancelled | ❌ PAS DE REFUND
[22:18:04] Rental timeout | ❌ PAS DE REFUND
```

### État de la DB

```sql
-- balance_operations
8 operations FREEZE sans REFUND correspondant

-- activations
8 activations avec:
  - status = 'timeout' ou 'cancelled'
  - frozen_amount = 0 (mis à jour par le bug)
  - charged = false

-- users
  - frozen_balance = 35Ⓐ (ne diminue jamais!)
  - balance = 55Ⓐ
  - disponible = 20Ⓐ (devrait être 50Ⓐ!)
```

---

## 🎯 POURQUOI ÇA NE FONCTIONNE PAS?

### Flux Normal (ATTENDU)

```
1. Achat → atomic_freeze()
   - balance_operations[freeze] created
   - users.frozen_balance += 5Ⓐ
   - activations.frozen_amount = 5Ⓐ

2. Timeout → atomic_refund()
   - balance_operations[refund] created
   - users.frozen_balance -= 5Ⓐ
   - activations.frozen_amount = 0
   - activations.status = 'timeout'
```

### Flux Actuel (BUG)

```
1. Achat → atomic_freeze()
   - balance_operations[freeze] created ✅
   - users.frozen_balance += 5Ⓐ ✅
   - activations.frozen_amount = 5Ⓐ ✅

2. Timeout → cron-check-pending-sms
   - ❌ PAS de balance_operations[refund]
   - ❌ users.frozen_balance reste à 35Ⓐ (JAMAIS diminué!)
   - ✅ activations.frozen_amount = 0 (mis à jour MAIS orphelin)
   - ✅ activations.status = 'timeout'
```

**Résultat**: Les fonds sont "gelés fantômes" - l'activation dit frozen_amount=0 mais le user garde frozen_balance élevé!

---

## 🔧 SOLUTION

### 1. Corriger cron-check-pending-sms.ts

**Remplacer** les lignes 50-110 par:

```typescript
if (now > expiresAt) {
  console.log(`⏰ [CRON-CHECK-SMS] Expired: ${activation.order_id}`);

  // ✅ UTILISER atomic_refund
  const { data: refundResult, error: refundErr } = await supabaseClient.rpc(
    "atomic_refund",
    {
      p_user_id: activation.user_id,
      p_activation_id: activation.id,
      p_reason: "Cron timeout (expired)",
    }
  );

  if (refundErr) {
    console.error("⚠️ [CRON-CHECK-SMS] atomic_refund failed:", refundErr);
  } else {
    console.log("✅ [CRON-CHECK-SMS] atomic_refund SUCCESS:", refundResult);
  }

  // Mettre à jour le status
  await supabaseClient
    .from("activations")
    .update({
      status: "timeout",
      frozen_amount: 0,
      charged: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", activation.id);

  results.expired++;
  continue;
}
```

### 2. Libérer les 30Ⓐ gelés fantômes

Créer un script de cleanup pour appeler `atomic_refund()` sur chaque activation identifiée.

### 3. Déployer la correction

```bash
npx supabase functions deploy cron-check-pending-sms
```

---

## 📝 RÉSUMÉ

### Cause Racine

**`cron-check-pending-sms` utilise un code MANUEL ancien qui ne call PAS `atomic_refund()`**

### Conséquences

- 8 operations `freeze` sans `refund` correspondant
- 30Ⓐ bloqués dans `frozen_balance` sans raison
- Activations disent `frozen_amount=0` mais user reste avec fonds gelés
- Balance disponible réduite de 30Ⓐ injustement

### Fix

1. ✅ Identifier la cause: cron-check-pending-sms ne call pas atomic_refund
2. ⏳ Corriger le code pour utiliser atomic_refund
3. ⏳ Libérer les 30Ⓐ gelés avec un script de cleanup
4. ⏳ Déployer la fonction corrigée

---

## 🎯 NEXT STEPS

1. **Créer script de cleanup** pour libérer les 30Ⓐ
2. **Corriger cron-check-pending-sms.ts** pour utiliser atomic_refund
3. **Tester** le timeout flow avec la correction
4. **Déployer** la fonction corrigée
5. **Vérifier** que frozen_balance = 5Ⓐ après cleanup

---

**Auteur**: GitHub Copilot  
**Status**: ✅ CAUSE IDENTIFIÉE - EN ATTENTE DE FIX
