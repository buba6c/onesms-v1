# 🔍 ANALYSE APPROFONDIE: RECHARGE, ACTIVATION & RENT

**Date:** 5 décembre 2024  
**Analyse complète des 3 systèmes critiques de ONE SMS V1**

---

## 📊 VUE D'ENSEMBLE

### Systèmes Analysés
1. **🔋 RECHARGE** - Système de paiement et crédit wallet
2. **📱 ACTIVATION** - Achat de numéros temporaires pour SMS
3. **🏠 RENT** - Location de numéros longue durée

### Architecture Générale
```
┌─────────────────────────────────────────────────────────────────┐
│                        USER WALLET                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   Balance    │    │Frozen Balance│    │  Available   │     │
│  │   (Total)    │    │   (Gelé)     │    │Balance - Frzn│     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
└─────────────────────────────────────────────────────────────────┘
         ↓                    ↓                      ↓
    ┌────────┐          ┌────────┐            ┌────────┐
    │RECHARGE│          │FREEZE  │            │COMMIT  │
    │ +Ⓐ     │ →freeze→ │(Pending│  →SMS OK→  │-Frozen │
    │        │          │Payment)│            │-Balance│
    └────────┘          └────────┘            └────────┘
```

---

## 💰 1. SYSTÈME DE RECHARGE

### 1.1 Flux de Paiement

#### Providers Supportés
- **MoneyFusion** (principal) - Mobile Money
- **PayTech** (legacy)
- **Moneroo** (backup)

#### Flow MoneyFusion (Actuel)
```javascript
// 📍 src/pages/TopUpPage.tsx
const rechargeMutation = useMutation({
  mutationFn: async () => {
    const packageData = packages.find(pkg => pkg.id === selectedPackageId);
    const amount = packageData.price_xof; // Ex: 1000 FCFA
    
    // 1. Initialiser paiement
    const { data } = await supabase.functions.invoke('init-moneyfusion-payment', {
      body: {
        amount: amount,
        currency: 'XOF',
        description: `Rechargement ${packageData.activations} activations`,
        metadata: {
          user_id: user.id,
          type: 'recharge',
          provider: 'moneyfusion',
          activations: packageData.activations, // 🔑 CRUCIAL
          package_id: packageData.id
        },
        return_url: returnUrl
      }
    });
    
    // 2. Redirection vers MoneyFusion
    window.location.href = data.payment_url;
  }
});
```

#### Traitement Webhook
```typescript
// 📍 supabase/functions/moneyfusion-webhook/index.ts

// 1. Vérification signature HMAC
const isValid = verifySignature(rawBody, signature, WEBHOOK_SECRET);

// 2. Identifier transaction
const { data: transactions } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', userId);

const tx = transactions.find(t => 
  t.metadata?.moneyfusion_token === tokenPay
);

// 3. Créditer utilisateur
if (tx.status !== 'completed') {
  const creditsToAdd = tx.metadata?.activations || 0; // ⚠️ Depuis metadata!
  const currentBalance = userProfile?.balance || 0;
  const newBalance = currentBalance + creditsToAdd;
  
  // Ledger FIRST (atomic)
  await supabase.from('balance_operations').insert({
    user_id: userId,
    operation_type: 'credit',
    amount: creditsToAdd,
    balance_before: currentBalance,
    balance_after: newBalance,
    reason: `MoneyFusion payment confirmed ${tokenPay}`
  });
  
  // Then update user
  await supabase.from('users')
    .update({ balance: newBalance })
    .eq('id', userId);
    
  // Mark transaction completed
  await supabase.from('transactions')
    .update({ status: 'completed' })
    .eq('id', tx.id);
}
```

### 1.2 Points Critiques Recharge

#### ✅ Forces
1. **Signature HMAC** - Sécurité webhook robuste
2. **Ledger-first** - balance_operations avant users
3. **Idempotence** - Vérifie `tx.status !== 'completed'`
4. **Metadata riche** - Traçabilité complète

#### ⚠️ Faiblesses Identifiées

**❌ PROBLÈME 1: Metadata activations peut être manquant**
```typescript
const creditsToAdd = tx.metadata?.activations || 0;
if (creditsToAdd === 0) {
  console.error('⚠️ No activations in metadata!');
  // Transaction complétée mais 0 crédit ajouté! 💥
}
```

**Solution:**
```typescript
// Validation stricte
if (!tx.metadata?.activations || tx.metadata.activations <= 0) {
  throw new Error(`Invalid activations in metadata: ${tx.metadata?.activations}`);
}
```

**❌ PROBLÈME 2: Transaction trouvée par token mais peut échouer**
```typescript
const tx = transactions.find(t => 
  t.metadata?.moneyfusion_token === tokenPay
);

if (!tx) {
  // Webhook reçu mais pas de transaction = crédit perdu!
  return new Response(JSON.stringify({ 
    received: true, 
    warning: 'Transaction not found' 
  }));
}
```

**Solution:**
- Créer transaction immédiatement lors de `init-moneyfusion-payment`
- Ne pas attendre le webhook pour créer la transaction

**❌ PROBLÈME 3: Pas de rollback si update users échoue**
```typescript
await supabase.from('balance_operations').insert({...}); // ✅ Succès
await supabase.from('users').update({...}); // ❌ Échoue
// → Ledger dit +10Ⓐ mais balance pas mise à jour!
```

**Solution:**
- Utiliser RPC atomique ou transaction PostgreSQL
- Ou vérifier erreur et rollback ledger

---

## 📱 2. SYSTÈME D'ACTIVATION

### 2.1 Cycle de Vie Activation

```
┌──────────────┐
│ USER BALANCE │ Balance: 10Ⓐ, Frozen: 0Ⓐ
└──────────────┘
       │
       │ 1. Buy Activation (price: 0.18Ⓐ)
       ↓
┌────────────────────────────────────┐
│ buy-sms-activate-number            │
│ • Freeze 0.18Ⓐ                     │
│ • Balance: 10Ⓐ, Frozen: 0.18Ⓐ     │
│ • Create activation (frozen_amt: 0.18) │
└────────────────────────────────────┘
       │
       │ 2. API SMS-Activate
       ↓
┌────────────────────────────────────┐
│ SMS-Activate API                   │
│ • getNumber(service, country)      │
│ • Response: ACCESS_NUMBER:id:phone │
└────────────────────────────────────┘
       │
       │ 3. DB Insert
       ↓
┌────────────────────────────────────┐
│ activations table                  │
│ • status: 'pending'                │
│ • frozen_amount: 0.18              │
│ • charged: false                   │
│ • expires_at: now + 20min          │
└────────────────────────────────────┘
       │
       ├─────────────┬──────────────┐
       │ WAIT SMS    │ TIMEOUT      │ CANCEL
       ↓             ↓              ↓
┌───────────┐ ┌───────────┐ ┌───────────┐
│SMS REÇU   │ │EXPIRATION │ │USER CANCEL│
│✅         │ │⏰         │ │❌         │
└───────────┘ └───────────┘ └───────────┘
       │             │              │
       ↓             ↓              ↓
┌───────────────────────────────────────┐
│ check-sms-activate-status             │
│ • Si SMS: atomic_commit → charge user │
│ • Si timeout: atomic_refund → rembourse│
│ • Si cancel: atomic_refund → rembourse│
└───────────────────────────────────────┘
       │             │              │
       ↓             ↓              ↓
┌────────────────────────────────────────┐
│ FINAL STATE                            │
│ SMS: Balance: 9.82Ⓐ, Frozen: 0Ⓐ       │
│ Timeout: Balance: 10Ⓐ, Frozen: 0Ⓐ     │
│ Cancel: Balance: 10Ⓐ, Frozen: 0Ⓐ      │
└────────────────────────────────────────┘
```

### 2.2 Fonction Atomique: atomic_commit

```sql
-- 📍 sql/atomic_commit_with_drop.sql
CREATE OR REPLACE FUNCTION atomic_commit(
  p_user_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_transaction_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'Commit funds'
)
RETURNS JSONB AS $$
DECLARE
  v_balance_before DECIMAL;
  v_frozen_before DECIMAL;
  v_frozen_amount DECIMAL; -- Montant gelé sur activation/rental
  v_commit DECIMAL;
  v_balance_after DECIMAL;
  v_frozen_after DECIMAL;
BEGIN
  -- 1. Lock user
  SELECT balance, frozen_balance INTO v_balance_before, v_frozen_before
  FROM users WHERE id = p_user_id FOR UPDATE;

  -- 2. Get frozen_amount from activation or rental
  IF p_activation_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount
    FROM activations WHERE id = p_activation_id FOR UPDATE;
  ELSIF p_rental_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount
    FROM rentals WHERE id = p_rental_id FOR UPDATE;
  END IF;

  v_frozen_amount := COALESCE(v_frozen_amount, 0);

  -- 3. Idempotence: si frozen_amount = 0, déjà commité
  IF v_frozen_amount <= 0 THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true);
  END IF;

  -- 4. Calculate commit (Model A: balance - commit, frozen - commit)
  v_commit := LEAST(v_frozen_amount, v_frozen_before);
  v_balance_after := v_balance_before - v_commit;
  v_frozen_after := v_frozen_before - v_commit;

  -- 5. Insert ledger FIRST (users_balance_guard check)
  INSERT INTO balance_operations (...) VALUES (...);

  -- 6. Update user (via RPC secure_update_balance pour bypass guard)
  UPDATE users SET 
    balance = v_balance_after,
    frozen_balance = v_frozen_after
  WHERE id = p_user_id;

  -- 7. Reset frozen_amount on activation/rental
  IF p_activation_id IS NOT NULL THEN
    UPDATE activations SET 
      frozen_amount = 0,
      charged = true,
      status = 'received'
    WHERE id = p_activation_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'committed', v_commit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.3 Vérification SMS

#### Polling Automatique (Cron)
```typescript
// 📍 supabase/functions/cron-check-pending-sms/index.ts

// 1. Fetch pending activations
const { data: activations } = await supabase
  .from('activations')
  .select('*')
  .in('status', ['pending', 'waiting'])
  .lt('expires_at', new Date().toISOString());

// 2. Check each via API V1
for (const act of activations) {
  const url = `https://api.sms-activate.ae/stubs/handler_api.php?action=getStatus&id=${act.order_id}`;
  const response = await fetch(url);
  const text = await response.text();
  
  if (text.startsWith('STATUS_OK:')) {
    const code = text.split(':')[1];
    
    // 3. Process via RPC
    await supabase.rpc('process_sms_received', {
      p_order_id: act.order_id,
      p_sms_code: code,
      p_sms_text: text
    });
  } else if (text === 'STATUS_CANCEL' || now > expiresAt) {
    // 4. Refund via atomic_refund
    await supabase.rpc('atomic_refund', {
      p_user_id: act.user_id,
      p_activation_id: act.id,
      p_reason: 'Timeout or cancel'
    });
  }
}
```

#### Vérification Manuelle
```typescript
// 📍 supabase/functions/check-sms-activate-status/index.ts

// 1. Get activation
const { data: activation } = await supabase
  .from('activations')
  .select('*')
  .eq('id', activationId)
  .single();

// 2. Centralized charge with atomic_commit
const chargeWithAtomicCommit = async (smsCode, smsText) => {
  // Persist SMS first
  await supabase.from('activations').update({
    status: 'received',
    sms_code: smsCode,
    sms_text: smsText
  }).eq('id', activationId);

  // Late freeze if needed (SMS reçu après refund par erreur)
  if (!activation.charged && activation.frozen_amount <= 0) {
    await supabase.rpc('atomic_freeze', {
      p_user_id: activation.user_id,
      p_amount: activation.price,
      p_activation_id: activationId,
      p_reason: 'Late SMS - freeze before commit'
    });
    activation.frozen_amount = activation.price; // Local update
  }

  // Commit
  await supabase.rpc('atomic_commit', {
    p_user_id: activation.user_id,
    p_activation_id: activationId,
    p_reason: 'SMS received - auto charge'
  });
};

// 3. Call API and charge
const response = await fetch(`https://api.sms-activate.ae/...`);
const data = await response.json();

if (data.status === 'SUCCESS' && data.sms) {
  await chargeWithAtomicCommit(data.sms.code, data.sms.text);
}
```

### 2.4 Points Critiques Activation

#### ✅ Forces
1. **Freeze avant achat** - Pas de service gratuit
2. **Atomic commit/refund** - Cohérence garantie
3. **Idempotence** - Vérifie `frozen_amount > 0` et `!charged`
4. **Double vérification** - Cron + manuel
5. **Ledger-first** - Traçabilité complète

#### ⚠️ Faiblesses Identifiées

**❌ PROBLÈME 1: Race condition sur late SMS**
```typescript
// Scenario:
// T0: Cron timeout → atomic_refund (frozen_amount = 0, balance +0.18)
// T1: SMS arrive → chargeWithAtomicCommit
//     → frozen_amount = 0 → atomic_freeze (re-geler)
//     → atomic_commit (charger)
// Résultat: User paie 2 fois! (refund puis re-charge)
```

**Solution Actuelle:**
```typescript
if (!activation.charged && activation.frozen_amount <= 0) {
  // Re-freeze only if not already charged
  await supabase.rpc('atomic_freeze', {...});
}
```

**Amélioration Suggérée:**
```typescript
// Vérifier aussi si un refund récent existe
const { data: recentRefund } = await supabase
  .from('balance_operations')
  .select('id')
  .eq('activation_id', activationId)
  .eq('operation_type', 'refund')
  .gte('created_at', new Date(Date.now() - 60000).toISOString()); // 1 min

if (recentRefund) {
  throw new Error('SMS arrived too late - already refunded');
}
```

**❌ PROBLÈME 2: API SMS-Activate inconsistante**
```
API V1 (getStatus): STATUS_OK:358042 ✅
API V2 (getStatusV2): WRONG_ACTIVATION_ID ❌

→ V2 ne fonctionne pas pour certains ordres
→ Fallback V1 nécessaire
```

**Solution Actuelle:**
```typescript
// Toujours utiliser V1
const v1Url = `${BASE_URL}?action=getStatus&id=${orderId}`;
const text = await fetch(v1Url).then(r => r.text());
```

**❌ PROBLÈME 3: Expiration trigger manquant**
```sql
-- Pas de trigger automatique pour passer status='expired'
-- Dépend du cron qui peut être en retard

-- SOLUTION: Trigger temps réel
CREATE OR REPLACE FUNCTION mark_expired_activations()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('pending', 'waiting') AND NEW.expires_at < NOW() THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activation_expiry_check
  BEFORE UPDATE ON activations
  FOR EACH ROW
  EXECUTE FUNCTION mark_expired_activations();
```

---

## 🏠 3. SYSTÈME RENTAL (LOCATION)

### 3.1 Cycle de Vie Rental

```
┌──────────────┐
│ USER BALANCE │ Balance: 10Ⓐ, Frozen: 0Ⓐ
└──────────────┘
       │
       │ 1. Buy Rent (4h=0.08Ⓐ, 24h=0.50Ⓐ, 7j=1.75Ⓐ, 30j=7.50Ⓐ)
       ↓
┌────────────────────────────────────┐
│ buy-sms-activate-rent              │
│ • Freeze price (ex: 0.50Ⓐ)        │
│ • Create rental (frozen_amount: 0.50) │
└────────────────────────────────────┘
       │
       │ 2. API getRentNumber
       ↓
┌────────────────────────────────────┐
│ rentals table                      │
│ • status: 'active'                 │
│ • frozen_amount: 0.50              │
│ • charged: false                   │
│ • expires_at: now + duration       │
│ • message_count: 0                 │
└────────────────────────────────────┘
       │
       ├──────────┬────────────┬───────────┐
       │ USE      │ EXTEND     │ FINISH    │ CANCEL/EXPIRE
       ↓          ↓            ↓           ↓
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│GET STATUS│ │CONTINUE  │ │FINISH    │ │CANCEL    │
│📨 SMS    │ │+duration │ │✅        │ │❌        │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
       │          │            │           │
       ↓          ↓            ↓           ↓
┌─────────────────────────────────────────────────┐
│ get-rent-status / set-rent-status               │
│ • Get: fetch messages, check expiry             │
│ • Extend: +duration, charge extension           │
│ • Finish: commit frozen (charge)                │
│ • Cancel: refund if <20min, else commit         │
└─────────────────────────────────────────────────┘
```

### 3.2 Politique de Remboursement Rental

#### 🔒 Règle des 20 Minutes

```typescript
// 📍 supabase/functions/set-rent-status/index.ts

const startDate = new Date(rental.start_date || rental.created_at);
const now = new Date();
const minutesElapsed = (now.getTime() - startDate.getTime()) / 60000;
const frozenAmount = rental.frozen_amount || 0;

if (action === 'cancel') {
  if (minutesElapsed <= 20 && frozenAmount > 0) {
    // 💰 REFUND: < 20 min → remboursement total
    await supabase.rpc('secure_unfreeze_balance', {
      p_user_id: userId,
      p_rental_id: rental.id,
      p_refund_to_balance: true, // ← Rembourser
      p_refund_reason: 'Rental cancelled by user (< 20min)'
    });
    refundAmount = frozenAmount;
    newStatus = 'cancelled';
  } else {
    // ⚠️ COMMIT: > 20 min → pas de remboursement
    await supabase.rpc('secure_unfreeze_balance', {
      p_user_id: userId,
      p_rental_id: rental.id,
      p_refund_to_balance: false, // ← Pas de remboursement
      p_refund_reason: 'Rental cancelled after 20min - no refund'
    });
    refundAmount = 0;
    newStatus = 'cancelled';
  }
}
```

#### Flowchart Décision
```
User clicks "Cancel Rental"
         ↓
   Time elapsed?
    /         \
  < 20min   > 20min
    ↓          ↓
  REFUND    COMMIT
  +0.50Ⓐ     -0.50Ⓐ
  Status:    Status:
cancelled  cancelled
```

### 3.3 Récupération Messages

```typescript
// 📍 supabase/functions/get-rent-status/index.ts

// 1. Get rental from DB
const { data: rental } = await supabase
  .from('rentals')
  .select('*')
  .eq('id', rentId)
  .single();

// 2. Check expiry
const endDate = new Date(rental.end_date || rental.expires_at);
const isExpired = Date.now() > endDate.getTime();

// 3. Call SMS-Activate API
const statusUrl = `${BASE_URL}?action=getRentStatus&id=${rental.rental_id}&page=${page}&size=${size}`;
const response = await fetch(statusUrl);
const data = await response.json();

// 4. Parse messages
const messages = [];
if (data.status === 'success' && data.values) {
  for (const msg of data.values) {
    messages.push({
      text: msg.text,
      sender: msg.phoneFrom,
      date: msg.date,
      service: msg.activationOperator
    });
  }
}

// 5. Update rental
await supabase.from('rentals').update({
  last_message_date: messages[0]?.date,
  message_count: parseInt(data.quantity || '0'),
  updated_at: new Date().toISOString()
}).eq('id', rental.id);

// 6. Commit if expired and > 20min
if (isExpired) {
  const startDate = new Date(rental.start_date || rental.created_at);
  const minutesElapsed = (Date.now() - startDate.getTime()) / 60000;
  
  if (minutesElapsed > 20 && rental.frozen_amount > 0) {
    await supabase.rpc('secure_unfreeze_balance', {
      p_user_id: rental.user_id,
      p_rental_id: rental.id,
      p_refund_to_balance: false,
      p_refund_reason: 'Rental expired after 20min - commit frozen'
    });
  }
}

return { messages, expired: isExpired, quantity: data.quantity };
```

### 3.4 Extension (Continue Rent)

```typescript
// 📍 supabase/functions/continue-sms-activate-rent/index.ts

// 1. Get rental
const { data: rental } = await supabase
  .from('rentals')
  .select('*')
  .eq('id', rentalId)
  .single();

// 2. Check status
if (rental.status !== 'active') {
  throw new Error(`Cannot extend rental with status: ${rental.status}`);
}

// 3. Calculate extension price (same as original duration)
const basePrice = 0.50; // 24h
const dailyMultiplier = rental.rent_hours / 24;
const extensionPrice = basePrice * dailyMultiplier;

// 4. Check user balance
const { data: userProfile } = await supabase
  .from('users')
  .select('balance')
  .eq('id', userId)
  .single();

if (userProfile.balance < extensionPrice) {
  throw new Error('Insufficient balance');
}

// 5. Call SMS-Activate API
const apiUrl = `${BASE_URL}?action=continueRentNumber&id=${rental.rental_id}&rent_time=${rental.rent_hours}`;
const response = await fetch(apiUrl);
const data = await response.json();

if (data.status !== 'success') {
  throw new Error(data.message);
}

// 6. Update rental end date
const newEndDate = data.phone?.endDate 
  ? new Date(data.phone.endDate)
  : new Date(new Date(rental.end_date).getTime() + rental.rent_hours * 3600 * 1000);

await supabase.from('rentals')
  .update({ end_date: newEndDate.toISOString() })
  .eq('id', rentalId);

// 7. Charge user (debit balance immediately, no freeze)
const newBalance = userProfile.balance - extensionPrice;

// Ledger first
await supabase.from('balance_operations').insert({
  user_id: userId,
  rental_id: rental.id,
  operation_type: 'debit',
  amount: extensionPrice,
  balance_before: userProfile.balance,
  balance_after: newBalance,
  reason: `Extend rental +${rental.rent_hours}h`
});

// Then update user
await supabase.from('users')
  .update({ balance: newBalance })
  .eq('id', userId);

// Transaction record
await supabase.from('transactions').insert({
  user_id: userId,
  type: 'rental_extension',
  amount: -extensionPrice,
  description: `Extended rental +${rental.rent_hours}h`,
  status: 'completed',
  related_rental_id: rental.id
});
```

### 3.5 Points Critiques Rental

#### ✅ Forces
1. **Frozen funds** - Protection contre usage sans paiement
2. **Politique 20min** - Équilibre user/coût
3. **Messages persistants** - Historique accessible
4. **Extension flexible** - Prolongation facile

#### ⚠️ Faiblesses Identifiées

**❌ PROBLÈME 1: Extension pas protégée par freeze**
```typescript
// Extension charge immédiatement sans freeze
const newBalance = userProfile.balance - extensionPrice;
await supabase.from('users').update({ balance: newBalance });

// ⚠️ Si l'API échoue après, argent débité mais pas de service!
```

**Solution:**
```typescript
// 1. Freeze avant appel API
await supabase.rpc('atomic_freeze', {
  p_user_id: userId,
  p_amount: extensionPrice,
  p_rental_id: rental.id,
  p_reason: 'Extension pending'
});

// 2. Call API
const data = await fetch(apiUrl).then(r => r.json());

// 3. Si succès: commit, si échec: refund
if (data.status === 'success') {
  await supabase.rpc('atomic_commit', {...});
} else {
  await supabase.rpc('atomic_refund', {...});
  throw new Error(data.message);
}
```

**❌ PROBLÈME 2: Pas de cleanup automatique des rentals expirés**
```sql
-- Rentals avec status='active' mais expires_at < NOW()
-- restent actifs jusqu'au prochain get-rent-status

-- SOLUTION: Cron job
CREATE OR REPLACE FUNCTION cleanup_expired_rentals()
RETURNS void AS $$
BEGIN
  UPDATE rentals
  SET status = 'expired'
  WHERE status = 'active'
    AND (end_date < NOW() OR expires_at < NOW());
END;
$$ LANGUAGE plpgsql;

-- Cron: */5 * * * * (every 5 minutes)
```

**❌ PROBLÈME 3: Race condition sur finish vs auto-expire**
```
User clicks "Finish" (T0)
  → set-rent-status invoked
    → Status check passed
      → API call pending...

Cron job runs (T0+1s)
  → get-rent-status detects expired
    → Commits frozen
      → Status → expired

User's finish completes (T0+2s)
  → Try to commit again
    → frozen_amount = 0 (already committed)
    → Idempotent, but status conflict
```

**Solution:**
```typescript
// set-rent-status: Lock rental row
SELECT * FROM rentals WHERE id = rental.id FOR UPDATE;

// Vérifier status après lock
if (rental.status !== 'active') {
  throw new Error(`Rental already ${rental.status}`);
}
```

---

## 🔄 4. FLUX DE DONNÉES CRITIQUES

### 4.1 Model A: Wallet Atomique

```
┌─────────────────────────────────────────────────────┐
│              WALLET MODEL A (Actuel)                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  INITIAL:  Balance: 10.00Ⓐ  Frozen: 0.00Ⓐ         │
│                                                     │
│  FREEZE:   Balance: 10.00Ⓐ  Frozen: 0.18Ⓐ  ←─┐   │
│            (Reserve for activation)            │   │
│                                                │   │
│  COMMIT:   Balance: 9.82Ⓐ   Frozen: 0.00Ⓐ  ←─┘   │
│            (Charge completed)                      │
│            Model A: balance ↓, frozen ↓            │
│                                                     │
│  REFUND:   Balance: 10.00Ⓐ  Frozen: 0.00Ⓐ         │
│            (Cancel/timeout)                        │
│            Model A: balance ↑, frozen ↓            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 4.2 Fonctions Atomiques

#### atomic_freeze
```sql
-- Réserve des fonds pour un achat
-- balance: pas changé
-- frozen_balance: +amount

CREATE OR REPLACE FUNCTION atomic_freeze(
  p_user_id UUID,
  p_amount DECIMAL,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_reason TEXT
) RETURNS JSONB;
```

#### atomic_commit
```sql
-- Consomme les fonds gelés (paiement effectif)
-- balance: -amount
-- frozen_balance: -amount

CREATE OR REPLACE FUNCTION atomic_commit(
  p_user_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_reason TEXT
) RETURNS JSONB;
```

#### atomic_refund
```sql
-- Rembourse les fonds gelés (annulation)
-- balance: +amount
-- frozen_balance: -amount

CREATE OR REPLACE FUNCTION atomic_refund(
  p_user_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_reason TEXT
) RETURNS JSONB;
```

#### secure_unfreeze_balance
```sql
-- Wrapper unifié pour commit/refund
-- p_refund_to_balance: true = refund, false = commit

CREATE OR REPLACE FUNCTION secure_unfreeze_balance(
  p_user_id UUID,
  p_rental_id UUID,
  p_refund_to_balance BOOLEAN,
  p_refund_reason TEXT
) RETURNS JSONB;
```

### 4.3 Guards de Protection

#### users_balance_guard
```sql
-- Bloque updates directs de balance/frozen_balance
-- Force passage par balance_operations

CREATE OR REPLACE FUNCTION enforce_balance_ledger()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.balance IS DISTINCT FROM NEW.balance 
     OR OLD.frozen_balance IS DISTINCT FROM NEW.frozen_balance THEN
    
    -- Vérifier qu'un ledger matching existe
    IF NOT EXISTS (
      SELECT 1 FROM balance_operations
      WHERE user_id = NEW.id
        AND balance_after = NEW.balance
        AND frozen_after = NEW.frozen_balance
        AND created_at > NOW() - INTERVAL '10 seconds'
    ) THEN
      RAISE EXCEPTION 'Balance changes must go through balance_operations ledger';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### frozen_amount_guard (activations/rentals)
```sql
-- Bloque modifications directes de frozen_amount
-- Force passage par atomic_* functions

CREATE OR REPLACE FUNCTION prevent_frozen_amount_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.frozen_amount IS DISTINCT FROM NEW.frozen_amount THEN
    RAISE EXCEPTION 'Direct update of frozen_amount forbidden. Use atomic_* functions.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## ⚠️ 5. PROBLÈMES IDENTIFIÉS & SOLUTIONS

### 5.1 Recharge

| Problème | Sévérité | Solution |
|----------|----------|----------|
| Metadata activations peut être 0 | 🔴 HAUTE | Validation stricte dans webhook |
| Transaction not found (webhook orphelin) | 🟡 MOYENNE | Créer transaction dans init-payment |
| Pas de rollback si users.update échoue | 🟡 MOYENNE | RPC atomique ou transaction SQL |

### 5.2 Activation

| Problème | Sévérité | Solution |
|----------|----------|----------|
| Race condition late SMS après refund | 🟡 MOYENNE | Vérifier refund récent avant re-freeze |
| API V2 inconsistante | 🟢 FAIBLE | Toujours utiliser V1 (déjà fait) |
| Pas de trigger auto-expire | 🟢 FAIBLE | Trigger BEFORE UPDATE |
| Double charge possible | 🔴 HAUTE | Flag `charged` + verrou |

### 5.3 Rental

| Problème | Sévérité | Solution |
|----------|----------|----------|
| Extension sans freeze | 🔴 HAUTE | Freeze → API → Commit/Refund |
| Pas de cleanup auto expired | 🟡 MOYENNE | Cron job cleanup |
| Race finish vs auto-expire | 🟡 MOYENNE | SELECT FOR UPDATE lock |

---

## 📊 6. MÉTRIQUES & MONITORING

### 6.1 Queries de Santé

#### Balance Consistency
```sql
-- Vérifier cohérence balance vs ledger
SELECT 
  u.id,
  u.balance AS balance_user,
  u.frozen_balance AS frozen_user,
  COALESCE(SUM(bo.balance_after), 0) AS balance_ledger,
  COALESCE(SUM(bo.frozen_after), 0) AS frozen_ledger,
  (u.balance - COALESCE(SUM(bo.balance_after), 0)) AS balance_diff,
  (u.frozen_balance - COALESCE(SUM(bo.frozen_after), 0)) AS frozen_diff
FROM users u
LEFT JOIN balance_operations bo ON bo.user_id = u.id
GROUP BY u.id
HAVING 
  ABS(u.balance - COALESCE(SUM(bo.balance_after), 0)) > 0.01
  OR ABS(u.frozen_balance - COALESCE(SUM(bo.frozen_after), 0)) > 0.01;
```

#### Frozen Leaks
```sql
-- Trouver frozen_amount non réconciliés
SELECT 
  'activation' AS type,
  id,
  user_id,
  frozen_amount,
  status,
  created_at
FROM activations
WHERE frozen_amount > 0
  AND status IN ('timeout', 'failed', 'cancelled', 'expired')
  AND NOT EXISTS (
    SELECT 1 FROM balance_operations
    WHERE activation_id = activations.id
      AND operation_type IN ('refund', 'commit')
  )

UNION ALL

SELECT 
  'rental' AS type,
  id,
  user_id,
  frozen_amount,
  status,
  created_at
FROM rentals
WHERE frozen_amount > 0
  AND status IN ('cancelled', 'expired')
  AND NOT EXISTS (
    SELECT 1 FROM balance_operations
    WHERE rental_id = rentals.id
      AND operation_type IN ('refund', 'commit')
  );
```

#### Pending Activations > 20min
```sql
SELECT 
  COUNT(*) AS stuck_activations,
  SUM(frozen_amount) AS total_frozen
FROM activations
WHERE status IN ('pending', 'waiting')
  AND expires_at < NOW()
  AND frozen_amount > 0;
```

### 6.2 Alertes Recommandées

1. **Frozen leaks > 100Ⓐ** → Investigation immédiate
2. **Balance diff > 1Ⓐ pour un user** → Audit ledger
3. **Stuck activations > 50** → Cron pas running
4. **Webhook echec > 10/h** → Problème MoneyFusion

---

## 🎯 7. RECOMMANDATIONS PRIORITAIRES

### 🔴 Critique (Faire immédiatement)
1. **Validation metadata.activations** dans webhook MoneyFusion
2. **Freeze avant extension rental** pour éviter perte argent
3. **Lock FOR UPDATE** dans set-rent-status pour éviter race

### 🟡 Importante (Semaine prochaine)
4. **Cron cleanup expired rentals** toutes les 5 minutes
5. **Vérification refund récent** avant re-freeze SMS
6. **Trigger auto-expire activations** temps réel

### 🟢 Amélioration (Quand possible)
7. **Dashboard monitoring** avec métriques temps réel
8. **Alertes Slack/Email** sur anomalies
9. **Reconciliation automatique** frozen leaks

---

## 📝 8. CONCLUSION

### Forces du Système
- ✅ Architecture atomique robuste (freeze/commit/refund)
- ✅ Ledger-first garantit traçabilité
- ✅ Guards protègent contre modifications directes
- ✅ Idempotence bien implémentée

### Faiblesses Principales
- ⚠️ Quelques race conditions possibles
- ⚠️ Validation metadata insuffisante
- ⚠️ Extension rental pas protégée
- ⚠️ Cleanup automatique manquant

### Priorité Absolue
**1. Sécuriser extension rental avec freeze**  
**2. Valider metadata.activations dans webhook**  
**3. Implémenter locks FOR UPDATE**

---

**Fin de l'analyse approfondie**  
*Généré le: 5 décembre 2024*
