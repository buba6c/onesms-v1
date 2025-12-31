# 🔍 ANALYSE DEEP: INTÉGRATION MONEROO POUR ONESMS

## 📚 DOCUMENTATION MONEROO - RÉSUMÉ COMPLET

### 🔐 **AUTHENTIFICATION**

- **Type**: Bearer Token (API Key)
- **Header**: `Authorization: Bearer YOUR_SECRET_KEY`
- **Keys**: Public (frontend) & Secret (backend uniquement)
- **Rate Limit**: 120 requêtes/minute
- **Test Mode**: Sandbox keys disponibles

**❗ IMPORTANT**: Ne JAMAIS exposer les clés secrètes côté client

---

### 💰 **FLOW PAIEMENT STANDARD**

#### **1. Initialisation du paiement**

**Endpoint**: `POST https://api.moneroo.io/v1/payments/initialize`

**Headers**:

```
Authorization: Bearer YOUR_SECRET_KEY
Content-Type: application/json
Accept: application/json
```

**Body (Requis)**:

```json
{
  "amount": 100, // Integer (en cents pour USD, XOF direct)
  "currency": "XOF", // XOF, USD, EUR
  "description": "...",
  "customer": {
    "email": "user@example.com", // REQUIS
    "first_name": "John", // Optionnel (auto-prompt si absent)
    "last_name": "Doe" // Optionnel
  },
  "return_url": "https://...", // URL redirection après paiement
  "metadata": {
    // Optionnel (key-value pairs, strings only)
    "transaction_id": "...",
    "activations": "5"
  },
  "methods": ["mtn_bj", "moov_bj"] // Optionnel (restrict payment methods)
}
```

**Response**:

```json
{
  "message": "Transaction initialized successfully",
  "data": {
    "id": "5f7b1b2c", // Payment ID
    "checkout_url": "https://checkout.moneroo.io/5f7b1b2c"
  }
}
```

#### **2. Redirection utilisateur**

Rediriger l'utilisateur vers `data.checkout_url`

#### **3. Après paiement**

**4 actions simultanées**:

1. **Redirection**: User redirigé vers `return_url?status=...&paymentId=...&paymentStatus=...`
2. **Webhook**: POST vers votre webhook URL configuré
3. **Email client**: Confirmation automatique (si activé)
4. **Email admin**: Notification (si activé)

**⚠️ CRITIQUE**: Toujours re-vérifier le statut via API (ne pas se fier uniquement au webhook)

---

### 🪝 **WEBHOOKS MONEROO**

#### **Configuration**

- **Location**: Dashboard → Developers → Webhooks
- **Max**: 15 webhooks par app
- **Fields**:
  - URL: Votre endpoint
  - Secret: Pour signature HMAC-SHA256

#### **Structure Webhook**

```json
{
  "event": "payment.success", // ou payment.failed, payment.pending
  "data": {
    "id": "123456", // Payment ID
    "amount": 100,
    "currency": "USD",
    "status": "success", // success, failed, pending
    "customer": {
      "id": "123456",
      "email": "hello@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1 555 555 5555"
    }
  }
}
```

#### **Vérification Signature**

**Header**: `X-Moneroo-Signature`

**Calcul**:

```javascript
const crypto = require("crypto");
const signature = crypto
  .createHmac("sha256", webhookSecret)
  .update(JSON.stringify(payload))
  .digest("hex");

if (signature === req.headers["x-moneroo-signature"]) {
  // Signature valide
}
```

#### **Retry Policy**

- **Timeout**: 3 secondes
- **Retries**: 3 tentatives
- **Delay**: 10 minutes entre chaque
- **Response**: DOIT être `200 OK` (autre = échec)

#### **Events Disponibles**

**Payments**:

- `payment.success` - Paiement réussi
- `payment.failed` - Paiement échoué
- `payment.pending` - Paiement en attente

**Payouts**:

- `payout.success`
- `payout.failed`
- `payout.pending`

---

### ✅ **BEST PRACTICES MONEROO**

1. **❌ Ne pas se fier uniquement aux webhooks**

   - Implémenter background job qui check statuts
   - Vérifier via API même après webhook

2. **🔐 Utiliser signature webhook**

   - Vérifier HMAC-SHA256
   - Rejeter requêtes non signées

3. **🔄 Toujours re-query API**

   - Après webhook: GET /v1/payments/{id}
   - Vérifier statut officiel

4. **⚡ Répondre rapidement**

   - Return 200 immédiatement
   - Tasks lourdes en async

5. **🔁 Gérer duplicates**

   - Webhooks peuvent être redelivrés
   - Implémenter idempotence

6. **❌ Gérer échecs**
   - Dashboard affiche webhooks failed
   - Retry manuel possible

---

## 🎯 PLAN D'INTÉGRATION ONESMS

### **📁 FICHIERS À MODIFIER**

#### **1. Edge Function: init-moneroo-payment** ✅ EXISTE DÉJÀ

**Path**: `/supabase/functions/init-moneroo-payment/index.ts`

**Modifications nécessaires**:

```typescript
// ✅ BON: Structure request payload
const monerooPayload = {
  amount: Math.round(amount), // Integer pour XOF
  currency: "XOF",
  description: `Rechargement ONE SMS - ${amount} XOF`,
  customer: {
    email: customer.email,
    first_name: customer.first_name || "Client",
    last_name: customer.last_name || "ONESMS",
  },
  return_url: return_url || "https://onesms-sn.com/top-up",
  metadata: {
    transaction_id: transaction.id,
    user_id: user.id,
    activations: metadata.activations || "0",
  },
};

// API Call
const response = await fetch("https://api.moneroo.io/v1/payments/initialize", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${MONEROO_SECRET_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  body: JSON.stringify(monerooPayload),
});
```

#### **2. Edge Function: moneroo-webhook** ✅ EXISTE DÉJÀ

**Path**: `/supabase/functions/moneroo-webhook/index.ts`

**Modifications critiques à appliquer**:

```typescript
// 1. ✅ Vérifier signature HMAC
const signature = req.headers.get("x-moneroo-signature");
const webhookSecret = config.webhook_secret;

const crypto = createHmac("sha256", webhookSecret);
const body = await req.text();
const calculatedSignature = crypto.update(body).digest("hex");

if (signature !== calculatedSignature) {
  console.error("❌ Invalid webhook signature");
  return new Response("Invalid signature", { status: 403 });
}

// 2. ✅ Parser webhook data
const webhookData = JSON.parse(body);
const { event, data } = webhookData;
const paymentId = data.id;
const status = data.status;

// 3. ✅ VÉRIFICATION API (CRITIQUE!)
async function verifyPaymentStatus(paymentId: string) {
  const response = await fetch(
    `https://api.moneroo.io/v1/payments/${paymentId}`,
    {
      headers: {
        Authorization: `Bearer ${MONEROO_SECRET_KEY}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`API verification failed: ${response.status}`);
  }

  return await response.json();
}

// 4. ✅ Check idempotence
async function alreadyCredited(txId: string) {
  const { data } = await supabase
    .from("balance_operations")
    .select("id")
    .eq("related_transaction_id", txId)
    .eq("operation_type", "credit_admin")
    .limit(1);
  return !!(data && data.length > 0);
}

// 5. ✅ Traiter selon event
switch (event) {
  case "payment.success":
    // Vérifier via API AVANT de créditer
    const verifiedData = await verifyPaymentStatus(paymentId);

    if (verifiedData.status !== "success") {
      console.warn("⚠️ Status mismatch - API says NOT success");
      return new Response("Status mismatch", { status: 400 });
    }

    // Check déjà crédité
    const credited = await alreadyCredited(transaction.id);
    if (credited) {
      return new Response("Already credited", { status: 200 });
    }

    // CRÉDITER via RPC
    const { data: creditResult, error } = await supabase.rpc(
      "secure_moneyfusion_credit_v2",
      {
        p_transaction_id: transaction.id,
        p_token: paymentId,
        p_reference: transaction.reference,
      }
    );

    if (error) {
      // Update transaction avec erreur
      await supabase
        .from("transactions")
        .update({
          status: "pending_credit_error",
          metadata: {
            ...transaction.metadata,
            error: error.message,
            moneroo_payment_id: paymentId,
          },
        })
        .eq("id", transaction.id);

      throw error;
    }

    console.log("✅ Payment verified and credited");
    break;

  case "payment.failed":
    await supabase
      .from("transactions")
      .update({
        status: "failed",
        metadata: {
          ...transaction.metadata,
          moneroo_status: "failed",
          moneroo_payment_id: paymentId,
        },
      })
      .eq("id", transaction.id);
    break;
}

// 6. ✅ Toujours return 200
return new Response(JSON.stringify({ success: true }), {
  status: 200,
  headers: { "Content-Type": "application/json" },
});
```

---

### **🗄️ DATABASE CONFIGURATION**

#### **SQL Setup**

```sql
-- 1. Ajouter Moneroo dans payment_providers
INSERT INTO payment_providers (
  provider_code,
  provider_name,
  is_active,
  config,
  supported_currencies,
  supported_countries,
  min_amount,
  max_amount,
  processing_time,
  fees_type,
  fees_percentage,
  display_order
) VALUES (
  'moneroo',
  'Moneroo',
  true,
  '{
    "api_key": "YOUR_MONEROO_SECRET_KEY",
    "webhook_secret": "YOUR_WEBHOOK_SECRET",
    "test_mode": false,
    "auto_confirm": true
  }'::jsonb,
  ARRAY['XOF', 'USD', 'EUR']::text[],
  ARRAY['SN', 'BJ', 'TG', 'CI', 'BF', 'ML', 'NE']::text[],
  100,
  5000000,
  '1-5 minutes',
  'percentage',
  0.0,
  3
)
ON CONFLICT (provider_code) DO UPDATE SET
  is_active = true,
  config = EXCLUDED.config,
  updated_at = NOW();
```

---

### **⚙️ SUPABASE SECRETS**

Dashboard → Settings → Edge Functions → Secrets

```
MONEROO_SECRET_KEY=your_secret_key_here
```

---

### **🔗 WEBHOOK URL**

À configurer dans Moneroo Dashboard:

```
https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/moneroo-webhook
```

**Secret**: Générer un secret fort (32+ chars) et le stocker dans:

1. Moneroo Dashboard → Webhooks → Secret
2. Supabase payment_providers.config.webhook_secret

---

### **🚀 DÉPLOIEMENT**

```bash
# 1. Deploy Edge Functions
npx supabase functions deploy init-moneroo-payment --no-verify-jwt
npx supabase functions deploy moneroo-webhook --no-verify-jwt

# 2. Set secrets
npx supabase secrets set MONEROO_SECRET_KEY=your_key_here

# 3. Execute SQL setup
# Via Supabase Dashboard SQL Editor
```

---

### **🧪 TESTING**

1. **Mode Test**:

   - Utiliser test API keys
   - Webhook URL reste la même
   - Tester avec métho des de paiement test

2. **Vérifications**:
   - ✅ Payment initialize retourne checkout_url
   - ✅ Redirection vers Moneroo checkout
   - ✅ Webhook reçu après paiement
   - ✅ Signature webhook valide
   - ✅ Verification API successful
   - ✅ Balance créditée correctement
   - ✅ Transaction status = completed
   - ✅ balance_operations entry créée

---

### **📊 MONITORING**

**Logs à surveiller**:

```
✅ [MONEROO] Payment initialized: {paymentId}
✅ [WEBHOOK] Signature verified
✅ [WEBHOOK] Payment verified via API: {status}
✅ [WEBHOOK] Already credited check: {result}
✅ [CREDIT] Balance credited: {amount}
❌ [ERROR] Signature mismatch
❌ [ERROR] API verification failed
❌ [ERROR] Credit failed
```

---

## 🎯 DIFFÉRENCES VS MONEYFUSION

| Feature                    | MoneyFusion                  | Moneroo                  |
| -------------------------- | ---------------------------- | ------------------------ |
| **API Verification**       | ✅ fetchPaymentStatus()      | ✅ GET /v1/payments/{id} |
| **Idempotence Check**      | ✅ alreadyCredited()         | ✅ Même fonction         |
| **Signature Verification** | ❌ Pas de signature          | ✅ HMAC-SHA256 requis    |
| **Webhook Events**         | Simple status                | Events typés             |
| **RPC Function**           | secure_moneyfusion_credit_v2 | ✅ Même (compatible)     |
| **Retry Policy**           | Manual                       | 3x avec 10min delay      |

---

## ✅ CHECKLIST FINALE

- [ ] Obtenir Moneroo API keys (test + prod)
- [ ] Générer webhook secret fort
- [ ] Configurer payment_providers en DB
- [ ] Set MONEROO_SECRET_KEY dans Supabase Secrets
- [ ] Modifier moneroo-webhook pour vérifier signature
- [ ] Ajouter API verification avant crédit
- [ ] Ajouter alreadyCredited() check
- [ ] Deploy Edge Functions
- [ ] Configurer webhook URL dans Moneroo
- [ ] Tester en mode test
- [ ] Vérifier logs Supabase
- [ ] Tester paiement réel
- [ ] Monitoring production

---

## 🚨 SÉCURITÉ CRITIQUE

1. ✅ **TOUJOURS vérifier signature webhook**
2. ✅ **TOUJOURS re-query API après webhook**
3. ✅ **TOUJOURS check idempotence (alreadyCredited)**
4. ❌ **JAMAIS se fier uniquement au webhook**
5. ❌ **JAMAIS exposer secret keys côté client**
6. ✅ **TOUJOURS utiliser HTTPS**
7. ✅ **TOUJOURS logger toutes les étapes**

---

**Contact Support Moneroo**: support@moneroo.io
**Documentation**: https://docs.moneroo.io/
**Dashboard**: https://app.moneroo.io/
