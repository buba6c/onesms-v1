# 🔍 ANALYSE ROOT CAUSE: Transaction f98201ba-531b-4803-b21e-ebb9278514e2

**Date**: 5 décembre 2025  
**Transaction ID**: f98201ba-531b-4803-b21e-ebb9278514e2  
**User**: buba6c@gmail.com (e108c02a-2012-4043-bbc2-fb09bb11f824)  
**Montant**: 5Ⓐ (500 FCFA)

---

## 📊 **ÉTAT ACTUEL**

### **Transaction**

```json
{
  "id": "f98201ba-531b-4803-b21e-ebb9278514e2",
  "user_id": "e108c02a-2012-4043-bbc2-fb09bb11f824",
  "type": "deposit",
  "amount": 5,
  "balance_before": 25,
  "balance_after": 30,  ← ATTENDU
  "status": "pending",  ← 🔴 PROBLÈME
  "reference": "ONESMS_e108c02a_1764977401805",
  "metadata": {
    "moneyfusion_token": "69336afc8ce3cea0b4c4e22d",
    "activations": 5,
    "amount_xof": 500,
    "payment_provider": "moneyfusion"
  },
  "created_at": "2025-12-05T23:30:08"
}
```

### **User Balance**

```
Balance actuelle: 25Ⓐ
Balance attendue: 30Ⓐ (25 + 5)
Différence: -5Ⓐ ❌
```

### **Balance Operations**

```
❌ Aucune balance_operation de type "credit_admin"
❌ Transaction non complétée
```

---

## 🔍 **ROOT CAUSE ANALYSIS**

### **Cause Primaire**

🔴 **Le webhook MoneyFusion n'a jamais été appelé par MoneyFusion**

### **Preuves**

1. ✅ Transaction créée le 5 déc à 23:30:08
2. ❌ Status = "pending" (jamais passé à "completed")
3. ❌ Aucune balance_operation créée
4. ❌ User non crédité

### **Flow Normal vs Flow Actuel**

#### **Flow Normal** ✅

```
1. User paie 500 FCFA sur MoneyFusion
   ↓
2. MoneyFusion confirme le paiement
   ↓
3. MoneyFusion appelle le webhook:
   POST https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/moneyfusion-webhook
   Body: {
     "event": "payin.session.completed",
     "tokenPay": "69336afc8ce3cea0b4c4e22d",
     "Montant": 500,
     ...
   }
   ↓
4. Webhook trouve la transaction par tokenPay
   ↓
5. Webhook appelle admin_add_credit(userId, 5Ⓐ)
   ↓
6. User crédité, balance: 25 → 30Ⓐ
   ↓
7. Transaction.status = "completed"
```

#### **Flow Actuel** ❌

```
1. User paie 500 FCFA sur MoneyFusion
   ↓
2. ❌ MoneyFusion ne confirme PAS le paiement
   OU
   ❌ MoneyFusion n'appelle PAS le webhook
   ↓
3. ❌ Transaction reste en "pending"
   ↓
4. ❌ User non crédité
```

---

## 🔎 **HYPOTHÈSES**

### **Hypothèse 1: Webhook URL incorrecte** 🟡

MoneyFusion a peut-être une URL de webhook mal configurée.

**Vérification**:

- Aller sur le dashboard MoneyFusion
- Vérifier la configuration webhook
- URL attendue: `https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/moneyfusion-webhook`

### **Hypothèse 2: Paiement en test mode** 🟡

Si MoneyFusion est en mode test, le webhook peut ne pas être appelé.

**Vérification**:

- Vérifier si l'API key MoneyFusion est en mode test
- Les paiements test peuvent nécessiter confirmation manuelle

### **Hypothèse 3: Webhook secret incorrect** 🟢

Le webhook vérifie la signature HMAC-SHA256. Si le secret est incorrect, MoneyFusion peut rejeter.

**Code actuel** (lines 24-30):

```typescript
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return expectedSignature === signature;
}
```

Si `MONEYFUSION_WEBHOOK_SECRET` est incorrect, MoneyFusion ne peut pas signer correctement.

### **Hypothèse 4: Paiement non confirmé** 🔴

Le paiement est peut-être encore en attente de confirmation par MoneyFusion.

**Action**: Vérifier le dashboard MoneyFusion pour voir le statut du paiement.

---

## 🔧 **SOLUTIONS**

### **Solution 1: Crédit Manuel Immédiat** ⚡

Créditer manuellement le user en attendant de corriger le webhook.

```sql
-- Créditer le user
SELECT admin_add_credit(
  'e108c02a-2012-4043-bbc2-fb09bb11f824'::UUID,
  5.0,
  'Manual credit - MoneyFusion payment 69336afc8ce3cea0b4c4e22d completed but webhook not received'
);

-- Mettre à jour la transaction
UPDATE transactions
SET
  status = 'completed',
  balance_after = 30,
  updated_at = NOW(),
  metadata = metadata || '{"manually_completed": true, "completed_at": "2025-12-05T23:45:00Z"}'::jsonb
WHERE id = 'f98201ba-531b-4803-b21e-ebb9278514e2';
```

### **Solution 2: Tester le Webhook Manuellement** 🧪

Simuler un appel webhook pour vérifier si le code fonctionne.

```bash
curl -X POST https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/moneyfusion-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUPABASE_ANON_KEY" \
  -d '{
    "event": "payin.session.completed",
    "tokenPay": "69336afc8ce3cea0b4c4e22d",
    "Montant": 500,
    "moyen": "wave",
    "personal_Info": [{
      "userId": "e108c02a-2012-4043-bbc2-fb09bb11f824",
      "paymentRef": "ONESMS_e108c02a_1764977401805",
      "activations": 5
    }]
  }'
```

### **Solution 3: Configurer le Webhook MoneyFusion** ⚙️

**Dashboard MoneyFusion** → **Paramètres** → **Webhooks**

1. URL du webhook: `https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/moneyfusion-webhook`
2. Événements à écouter:
   - `payin.session.completed`
   - `payin.session.cancelled`
   - `payin.session.pending`
3. Secret: Copier dans `MONEYFUSION_WEBHOOK_SECRET` de Supabase

### **Solution 4: Logs Webhook** 📋

Ajouter des logs pour debugger:

```typescript
// Dans moneyfusion-webhook/index.ts
console.log("📥 [WEBHOOK] Raw body:", rawBody);
console.log("📥 [WEBHOOK] Headers:", Object.fromEntries(req.headers));
console.log("📥 [WEBHOOK] Signature:", signature);
console.log("📥 [WEBHOOK] Expected signature:", expectedSignature);
```

---

## 🎯 **PLAN D'ACTION**

### **Phase 1: Résolution Immédiate** (5 min)

1. ✅ Crédit manuel du user (5Ⓐ)
2. ✅ Compléter la transaction

### **Phase 2: Investigation** (30 min)

1. Vérifier dashboard MoneyFusion

   - Statut du paiement 69336afc8ce3cea0b4c4e22d
   - Configuration webhook
   - Logs d'appels webhook

2. Tester le webhook manuellement

   - Simuler un appel réussi
   - Vérifier les logs Edge Function

3. Vérifier les secrets Supabase
   - `MONEYFUSION_WEBHOOK_SECRET` existe?
   - Correspond au dashboard MoneyFusion?

### **Phase 3: Prévention** (1h)

1. Créer un cron job de réconciliation

   - Toutes les 30 min
   - Chercher transactions pending > 10 min
   - Vérifier le statut sur MoneyFusion API
   - Auto-compléter si payé

2. Ajouter monitoring
   - Alert si transaction pending > 1h
   - Log tous les webhooks reçus
   - Dashboard admin des paiements en attente

---

## 📊 **IMPACT**

### **Utilisateur Affecté**

- 1 user (buba6c@gmail.com)
- 5Ⓐ non crédités
- Perte: 500 FCFA

### **Système**

- ⚠️ Webhook MoneyFusion non fonctionnel
- ⚠️ Tous les futurs paiements MoneyFusion sont à risque
- ⚠️ Besoin de crédit manuel pour chaque paiement

### **Urgence**

🔴 **CRITIQUE** - Corriger immédiatement avant le prochain paiement

---

## 🔐 **SÉCURITÉ**

### **Vérification Signature**

Le webhook vérifie la signature HMAC-SHA256, c'est bien ✅

### **Problème Potentiel**

Si `MONEYFUSION_WEBHOOK_SECRET` est vide/incorrect:

- Le code log un warning mais accepte le webhook
- **Risque**: N'importe qui peut appeler le webhook et créditer des users

**Ligne 73**:

```typescript
console.warn(
  "⚠️ [MONEYFUSION-WEBHOOK] No signature verification (MONEYFUSION_WEBHOOK_SECRET not set)"
);
```

### **Recommandation**

```typescript
// Rejeter si pas de secret
if (!MONEYFUSION_WEBHOOK_SECRET || !signature) {
  return new Response(JSON.stringify({ error: "Signature required" }), {
    status: 403,
  });
}
```

---

**FIN DE L'ANALYSE**

## 🎯 NEXT STEPS

1. ✅ Crédit manuel immédiat (script ci-dessous)
2. 🔍 Vérifier config MoneyFusion
3. 🧪 Tester webhook manuellement
4. 🚀 Créer système de réconciliation auto
