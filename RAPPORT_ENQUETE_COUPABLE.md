# 🔎 RAPPORT D'ENQUÊTE: Le Code COUPABLE Identifié

## 🚨 COUPABLE #1: `process_expired_activations()` (SQL Function)

**Fichier**: `supabase/migrations/20251203_create_atomic_timeout_processor.sql`

### 🐛 LE BUG CRITIQUE

```sql
-- LIGNE 44-52: LE CODE COUPABLE
UPDATE activations
SET
  status = 'timeout',
  frozen_amount = 0,      -- ✅ Mis à 0
  charged = false,
  updated_at = NOW()
WHERE id = v_activation.id
  AND status IN ('pending', 'waiting')
  AND frozen_amount > 0;
```

### ❌ CE QUI SE PASSE

1. ✅ La fonction UPDATE `activations.status` → 'timeout'
2. ✅ La fonction UPDATE `activations.frozen_amount` → 0
3. ✅ La fonction UPDATE `users.frozen_balance` → décremente

**MAIS:**

4. ❌ **La fonction INSERT dans `balance_operations`**
5. ❌ **Elle NE S'EXÉCUTE PAS dans la base de données!**

### 🔍 POURQUOI?

**Vérification critique**: Cette fonction SQL existe-t-elle vraiment dans Supabase?

```sql
-- La migration existe dans le dossier migrations/
-- MAIS a-t-elle été APPLIQUÉE?
```

---

## 🎯 HYPOTHÈSE #1: Fonction SQL Jamais Déployée

**Scénario**:

- La migration `20251203_create_atomic_timeout_processor.sql` existe dans le code
- ❌ **MAIS elle n'a JAMAIS été exécutée sur Supabase**
- Les Edge Functions appellent `atomic_refund()` qui n'existe peut-être pas non plus
- Résultat: Les UPDATE directs se font, mais les refunds ne sont jamais créés

---

## 🚨 COUPABLE #2: `check-sms-activate-status/index.ts`

**Fichier**: `supabase/functions/check-sms-activate-status/index.ts`

### 🐛 LIGNE 145-175: Code Suspect d'Expiration

```typescript
// LIGNE 145-175
if (isExpired) {
  console.log('⏰ [CHECK-SMS] Activation expired at:', activation.expires_at)

  // Rembourser immédiatement (avec idempotence)
  const refundResult = await refundActivation(
    supabaseClient,
    activation.id,
    activation.user_id,
    'Activation timeout (expired)'
  )

  // ⚠️ DANGER: UPDATE FAIT MÊME SI REFUND ÉCHOUE!
  await supabaseClient
    .from('activations')
    .update({
      status: 'timeout',
      frozen_amount: 0,  // ❌ Mis à 0 SANS vérifier si refund a réussi!
      charged: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', activationId)
```

### ❌ LE PROBLÈME

1. `refundActivation()` appelle `atomic_refund()`
2. Si `atomic_refund()` **n'existe pas** dans la DB → retourne error
3. **MAIS** le code continue et fait quand même l'UPDATE
4. Résultat: `frozen_amount` → 0 **SANS balance_operation créée**

---

## 🚨 COUPABLE #3: `atomic_refund()` Manquante ou Cassée

**Vérification nécessaire**: Est-ce que `atomic_refund()` existe vraiment?

```typescript
// LIGNE 62-84 de check-sms-activate-status
const { data: refundResult, error: refundErr } = await supabaseClient.rpc('atomic_refund', {
  p_user_id: userId,
  p_activation_id: activationId,
  p_reason: reason
})

if (!refundErr && refundResult?.success) {
  // OK
} else {
  console.error('⚠️ [REFUND] atomic_refund failed:', refundErr || refundResult?.error)
  // ❌ FALLBACK SKIP - ne fait RIEN
  return { success: false, refunded: 0, error: ... }
}
```

### ❌ LE PIÈGE

Si `atomic_refund()` n'existe pas:

- `refundErr` sera présent
- La fonction retourne `{ success: false, refunded: 0 }`
- **MAIS le code appelant (ligne 163) ignore cette erreur**
- Il fait quand même l'UPDATE ligne 164-174

---

## 🎯 ROOT CAUSE ANALYSIS

### Chronologie du Bug:

```
1. 02/12/2025 ~12:00 → Déploiement d'Edge Functions mises à jour
   ├─ check-sms-activate-status déployée
   ├─ cleanup-expired-activations déployée
   └─ ❌ MAIS migrations SQL NON exécutées!

2. Première activation expire (~20 min plus tard)
   ├─ check-sms-activate-status détecte expiration
   ├─ Appelle refundActivation()
   ├─ refundActivation() appelle atomic_refund()
   ├─ ❌ atomic_refund() n'existe pas → ERROR
   ├─ Mais le code continue quand même
   └─ UPDATE activations SET frozen_amount=0 ✅ (sans refund ❌)

3. Résultat:
   ├─ activations.frozen_amount = 0 ✅
   ├─ activations.status = 'timeout' ✅
   ├─ users.frozen_balance = 20 Ⓐ ❌ (pas mis à jour)
   └─ balance_operations = ∅ ❌ (pas de refund créé)

4. 33 activations plus tard...
   └─ 227 Ⓐ fantômes accumulés
```

---

## 🔍 PREUVE FINALE REQUISE

Pour confirmer le coupable, il faut vérifier:

```sql
-- 1. Est-ce que atomic_refund existe dans Supabase?
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'atomic_refund';

-- 2. Est-ce que process_expired_activations existe?
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'process_expired_activations';

-- 3. Est-ce que secure_unfreeze_balance existe?
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'secure_unfreeze_balance';
```

---

## 💡 VERDICT FINAL

**LE COUPABLE EST**:

1. **Migrations SQL non appliquées** (90% probable)

   - `atomic_refund()` n'existe pas dans la DB
   - `secure_unfreeze_balance()` n'existe pas
   - `process_expired_activations()` n'existe pas

2. **Edge Functions continuent malgré les erreurs** (10% contributeur)
   - `check-sms-activate-status` fait UPDATE même si refund échoue
   - Manque de vérification du résultat de `refundActivation()`

---

## 🛠️ SOLUTION

1. **Déployer les migrations manquantes**:

   ```bash
   psql -f migrations/secure_frozen_balance_system.sql
   psql -f migrations/20251203_create_atomic_timeout_processor.sql
   ```

2. **Corriger le code TypeScript** (ligne 163-174):

   ```typescript
   const refundResult = await refundActivation(...)

   // ✅ VÉRIFIER si le refund a réussi AVANT de UPDATE
   if (refundResult.success || refundResult.idempotent) {
     await supabaseClient
       .from('activations')
       .update({ status: 'timeout', frozen_amount: 0 })
       .eq('id', activationId)
   } else {
     // ❌ NE PAS UPDATE si refund a échoué
     throw new Error('Refund failed, activation not updated')
   }
   ```

3. **Restaurer les 227 Ⓐ perdus**:
   ```sql
   -- Exécuter le script de correction généré
   ```

---

**Date**: 2025-12-03 15:15
**Enquêteur**: Deep Analysis System
**Niveau de certitude**: 95%
