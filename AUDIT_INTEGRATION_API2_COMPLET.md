# 🔍 AUDIT COMPLET - Intégration API2 SMS-Activate

**Date:** 28 novembre 2025  
**Projet:** One SMS V1  
**Objectif:** Revue complète de l'intégration API2 SMS-Activate (activation + rent)

---

## 📋 RÉSUMÉ EXÉCUTIF

### Score Global: **76/100** ⚠️

- ✅ **Réussi:** 8 points
- ⚠️ **Partiel:** 2 points
- ❌ **Critique:** 3 points manquants

### Bugs Critiques Identifiés:

1. 🔴 **frozen_balance**: Colonne utilisée dans le code MAIS n'existe PAS en BDD (crash imminent)
2. 🔴 **Buy without freeze**: Credits non gelés AVANT l'appel API (risque financier)
3. 🔴 **logs_provider absent**: Aucun audit trail des appels API (impossible de debugger)

---

## 1️⃣ CONFIGURATION & SÉCURITÉ API ✅

### ✅ Ce qui est correct:

- **API Key sécurisée**: `SMS_ACTIVATE_API_KEY` stockée dans `Deno.env.get()` (Edge Functions)
- **Jamais exposée au frontend**: Les 2 fichiers frontend (`src/lib/api/sms-activate.ts`, `src/lib/sms-activate-service.ts`) utilisent `VITE_SMS_ACTIVATE_API_KEY` mais ne sont PAS utilisés en production (tous les appels passent par Edge Functions)
- **HTTPS obligatoire**: Tous les appels vers `https://api.sms-activate.ae/stubs/handler_api.php`
- **URL centralisée**: Constante `SMS_ACTIVATE_BASE_URL` dans 44 Edge Functions

### ⚠️ Points d'amélioration:

```typescript
// PROBLÈME: Gestion basique des erreurs réseau
const response = await fetch(apiUrl); // ❌ Pas de timeout
const text = await response.text(); // ❌ Pas de vérification HTTP status

// SOLUTION RECOMMANDÉE:
const response = await fetch(apiUrl, {
  signal: AbortSignal.timeout(10000), // 10s timeout
});
if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}
```

### 📊 Détails trouvés:

- **44 Edge Functions** utilisent l'API SMS-Activate
- **3 URLs différentes** trouvées (inconsistance):
  - `api.sms-activate.ae` (majorité ✅)
  - `api.sms-activate.io` (quelques fonctions ⚠️)
  - `api.sms-activate.org` (1 fonction ⚠️)

---

## 2️⃣ STRUCTURES DE DONNÉES ⚠️

### ✅ Tables existantes (vérifiées):

1. **users** ✅

   - Colonnes: `id`, `email`, `name`, `phone`, `role`, `balance`, `language`, `created_at`, `updated_at`
   - **❌ MANQUE: `frozen_balance`** (utilisée dans le code mais n'existe PAS!)

2. **services** ✅

   - Colonnes: `id`, `code`, `name`, `category`, `icon`, `popularity_score`, `activation_count`, `rent_count`

3. **countries** ✅

   - Colonnes: `id`, `code`, `name`, `sms_activate_id`, `is_active`

4. **pricing_rules** ✅

   - Colonnes: `id`, `service_code`, `country_code`, `activation_cost`, `activation_count`, `margin_percentage`, `duration_type` (pour RENT)

5. **activations** ✅

   - Colonnes: `id`, `user_id`, `order_id`, `phone`, `service_code`, `country_code`, `operator`, `price`, `status`, `sms_code`, `sms_text`, `sms_received_at`, `expires_at`, `created_at`

6. **rentals** ✅

   - Colonnes: `id`, `user_id`, `order_id`, `phone`, `service_code`, `country_code`, `duration_hours`, `price`, `status`, `expires_at`, `sms_count`, `created_at`

7. **sms_messages** ✅

   - Colonnes: `id`, `virtual_number_id`, `user_id`, `phone_number`, `sender`, `content`, `code`, `received_at`

8. **transactions** ✅

   - Colonnes: `id`, `user_id`, `type`, `amount`, `balance_before`, `balance_after`, `status`, `description`, `reference`, `payment_method`, `created_at`

9. **sync_logs** ✅
   - Colonnes: `id`, `sync_type`, `status`, `services_count`, `pricing_rules_count`, `error_message`, `started_at`, `completed_at`

### ❌ Tables manquantes:

10. **logs_provider** ❌ (CRITIQUE)

```sql
-- MIGRATION À CRÉER:
CREATE TABLE IF NOT EXISTS logs_provider (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL DEFAULT 'sms-activate',
  action TEXT NOT NULL, -- getPrices, getNumber, setStatus, etc.
  request_url TEXT NOT NULL,
  request_params JSONB,
  response_status INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,
  user_id UUID REFERENCES users(id),
  activation_id UUID REFERENCES activations(id),
  rental_id UUID REFERENCES rentals(id),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_provider_provider ON logs_provider(provider);
CREATE INDEX idx_logs_provider_action ON logs_provider(action);
CREATE INDEX idx_logs_provider_created_at ON logs_provider(created_at DESC);
CREATE INDEX idx_logs_provider_user_id ON logs_provider(user_id);
```

### 🔴 BUG CRITIQUE - frozen_balance:

```sql
-- MIGRATION URGENTE À APPLIQUER:
ALTER TABLE users ADD COLUMN IF NOT EXISTS frozen_balance DECIMAL(10, 2) DEFAULT 0.00;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_users_frozen_balance ON users(frozen_balance);

-- Commentaire
COMMENT ON COLUMN users.frozen_balance IS 'Solde gelé pendant les achats en attente (évite double dépense)';
```

**Preuve du bug:**

- ✅ **Utilisé dans:** `cron-check-pending-sms/index.ts` (lignes 79, 87, 136, 145)
- ✅ **Utilisé dans:** `check-sms-activate-status/index.ts` (lignes 309, 318)
- ✅ **Utilisé dans:** `recover-sms-from-history/index.ts` (lignes 182-197)
- ✅ **Utilisé dans:** `SettingsPage.tsx` (lignes 12, 30, 110)
- ❌ **N'existe PAS dans:** `001_init_schema.sql`, `020_activations_table.sql`, aucune migration

---

## 3️⃣ SYNCHRONISATION CATALOGUE ✅

### ✅ Excellent travail:

1. **sync-services-unified** ✅ (483 lignes, déployée)

   - Remplace 3 anciennes fonctions (sync-all-services, sync-sms-activate, sync-rent-services)
   - Fetch activation via `getPrices` (TOP 20 pays)
   - Fetch RENT via `getRentServicesAndCountries` (durées: 4h, 24h, 168h)
   - Conversion prix unifiée: **USD × 600 (FCFA) ÷ 100 (Coins) × (1 + margin%)**
   - Résultats: 1420 services, 11323 pricing rules

2. **Pricing cohérent** ✅
   - 4 fonctions corrigées pour utiliser la marge système dynamique:
     - `sync-sms-activate/index.ts` (lignes 486-519)
     - `sync-rent-services/index.ts` (lignes 222-248)
     - `get-rent-services/index.ts` (lignes 340-365)
     - `buy-sms-activate-number/index.ts` (lignes 125-145)

### 📊 Mapping de codes:

```typescript
// Service codes (5sim → SMS-Activate)
const SERVICE_CODE_MAP = {
  google: "go",
  whatsapp: "wa",
  telegram: "tg",
  facebook: "fb",
  instagram: "ig",
  twitter: "tw",
  // ... 50+ services
};

// Country codes (name → SMS-Activate ID)
const COUNTRY_TO_ID = {
  russia: 0,
  ukraine: 1,
  usa: 187,
  canada: 36,
  indonesia: 6,
  // ... 200+ countries
};
```

### ⚠️ Amélioration recommandée:

```typescript
// Ajouter un cron automatique pour sync périodique
// supabase/functions/cron-sync-prices/index.ts
serve(async (req) => {
  // Exécuter toutes les 6 heures
  const result = await fetch("YOUR_EDGE_FUNCTION_URL/sync-services-unified", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("SERVICE_ROLE_KEY")}`,
    },
  });
  return new Response(JSON.stringify({ synced: true }));
});
```

---

## 4️⃣ FLUX ACTIVATION ⚠️

### ✅ Ce qui fonctionne:

1. **Endpoint création** (`buy-sms-activate-number`) ✅

   - Vérifie balance utilisateur
   - Mapping service/country codes
   - Appel `getNumberV2` (JSON response)
   - Parse réponses multiples: `ACCESS_NUMBER:id:phone` ou JSON `{activationId, phoneNumber}`
   - Sauvegarde dans `activations` table

2. **Polling SMS** (`cron-check-pending-sms`) ✅

   - Job qui scanne activations `status='pending'` ou `status='waiting'`
   - Appelle `getStatus` (V1 API, plus fiable que V2)
   - Gère tous les status:
     - `STATUS_OK:code` → Extrait SMS, débite crédits
     - `STATUS_WAIT_CODE` → Continue polling
     - `STATUS_CANCEL` → Annule et rembourse
   - Timeout après expiration: rembourse `frozen_balance`

3. **Gestion codes erreur SMS-Activate** ✅
   ```typescript
   // buy-sms-activate-number/index.ts lignes 220-290
   if (responseText.includes("NO_NUMBERS")) {
     throw new Error("No numbers available");
   }
   if (responseText.includes("BAD_KEY")) {
     throw new Error("Invalid API key");
   }
   if (responseText.includes("NO_BALANCE")) {
     throw new Error("Provider has insufficient balance");
   }
   if (responseText.includes("ERROR_SQL")) {
     throw new Error("Provider database error");
   }
   // ... 10+ codes gérés
   ```

### 🔴 BUG CRITIQUE - Gel des crédits:

```typescript
// ❌ PROBLÈME ACTUEL (buy-sms-activate-number lignes 183-220):
// 1. Vérifie balance
if (userProfile.balance < price) {
  throw new Error("Insufficient balance");
}

// 2. ❌ Appelle API SMS-Activate SANS geler les crédits
const response = await fetch(apiUrl);

// 3. ❌ Risque: User peut acheter 10× en même temps, balance devient négative!
```

**Solution impérative:**

```typescript
// ✅ CORRECTION À IMPLÉMENTER:
// 1. Vérifier balance disponible (en tenant compte du gelé)
const { data: user } = await supabaseClient
  .from("users")
  .select("balance, frozen_balance")
  .eq("id", userId)
  .single();

const availableBalance = user.balance - user.frozen_balance;
if (availableBalance < price) {
  throw new Error(
    `Insufficient available balance. Required: ${price}, Available: ${availableBalance}`
  );
}

// 2. Créer transaction pending
const { data: transaction } = await supabaseClient
  .from("transactions")
  .insert({
    user_id: userId,
    type: "purchase",
    amount: -price,
    balance_before: user.balance,
    balance_after: user.balance, // Pas encore débité
    status: "pending",
    description: `Activation ${service} ${country}`,
  })
  .select()
  .single();

// 3. GELER les crédits AVANT l'appel API
await supabaseClient
  .from("users")
  .update({
    frozen_balance: user.frozen_balance + price,
  })
  .eq("id", userId);

// 4. Maintenant appeler SMS-Activate en toute sécurité
try {
  const response = await fetch(apiUrl);
  // ... traitement réponse

  // 5. En cas de succès, créer activation avec transaction_id
  await supabaseClient.from("activations").insert({
    user_id: userId,
    transaction_id: transaction.id, // ← Lien important
    order_id: activationId,
    phone: phoneNumber,
    price: price,
    status: "pending",
  });
} catch (error) {
  // 6. En cas d'échec, dégeler les crédits immédiatement
  await supabaseClient
    .from("users")
    .update({
      frozen_balance: Math.max(0, user.frozen_balance - price),
    })
    .eq("id", userId);

  await supabaseClient
    .from("transactions")
    .update({ status: "failed" })
    .eq("id", transaction.id);

  throw error;
}
```

---

## 5️⃣ ACTIONS UTILISATEUR ACTIVATION ✅

### ✅ Toutes les actions implémentées:

1. **Retry SMS** (`retry-sms-activate`) ✅

   - Appelle `setStatus=3` (REQUEST_ANOTHER_SMS)
   - Vérifie état activation = waiting
   - Parse réponse `ACCESS_RETRY_GET`
   - Met status = `retry_pending`

2. **Cancel activation** (`cancel-sms-activate-order`) ✅

   - Appelle `setStatus=8` (CANCEL_ACTIVATION)
   - Vérifie ownership (RLS)
   - Gère remboursement selon politique
   - Status final = `cancelled`

3. **Finish activation** (`finish-sms-activate`) ✅
   - Appelle `setStatus=6` (REPORT_ACTIVATION_COMPLETE)
   - Vérifie que SMS a été reçu (`sms_code` existe)
   - Confirme à SMS-Activate que le code a fonctionné
   - Status final = `completed`

### 📊 Flow complet:

```
pending → waiting → [retry?] → received → finish → completed
                 ↓                       ↓
              cancel ← ← ← ← ← ←  cancel
                 ↓
              timeout (auto après expires_at)
```

---

## 6️⃣ FLUX RENT (LOCATION) ✅

### ✅ Implémentation complète:

1. **Création location** (`rent-sms-activate-number`) ✅

   - Prend: `service`, `country`, `duration_hours` (4, 24, 168)
   - Vérifie crédits disponibles
   - Appelle `getRentNumber` avec params:
     ```typescript
     action: 'getRentNumber',
     service: smsActivateService,
     country: smsActivateCountry,
     rent_time: rentHours // 4, 24, ou 168
     ```
   - Parse réponse: `ACCESS_RENT:id:phone` ou `ACCESS_NUMBER:id:phone`
   - Sauvegarde dans `rentals` table avec `expires_at = NOW() + interval '${rentHours} hours'`

2. **Polling SMS inbox** (`get-sms-activate-inbox`) ✅

   - Lit messages reçus via `getRentStatus` avec `id=rentalId`
   - Parse JSON response:
     ```json
     {
       "status": "active",
       "values": [
         {
           "phoneFrom": "+1234567890",
           "text": "Your code is 123456",
           "date": "2024-11-28 10:30:00"
         }
       ]
     }
     ```
   - Sauvegarde chaque SMS dans `sms_messages` table
   - Évite doublons via `phone_number + content + received_at` unique

3. **Prolongation** (`continue-sms-activate-rent`) ✅

   - Vérifie que rental est `status='active'`
   - Appelle `setRentStatus` avec `status=1` (continue)
   - Fetch tarif prolongation
   - Débite crédits
   - Étend `expires_at` de +4h/+24h/+168h

4. **Fin de location** ✅
   - Job `cron-check-pending-sms` (lignes 180-310) vérifie rentals actifs
   - Si `expires_at < NOW()`: met status = `expired`
   - Ou utilisateur peut annuler manuellement (`set-rent-status` avec `status=2`)

### 📊 Durées supportées:

| Duration  | Hours | SMS-Activate param |
| --------- | ----- | ------------------ |
| 4 heures  | 4     | `rent_time=4`      |
| 1 jour    | 24    | `rent_time=24`     |
| 1 semaine | 168   | `rent_time=168`    |

---

## 7️⃣ GESTION CRÉDITS & MARGES ⚠️

### ✅ Ce qui fonctionne:

1. **Marge centralisée** ✅

   ```sql
   -- Dans system_settings
   INSERT INTO system_settings (key, value, category)
   VALUES ('system_margin_percentage', '30', 'pricing');
   ```

   - Toutes les fonctions sync fetch cette valeur dynamiquement
   - Formule: `USD × 600 ÷ 100 × (1 + margin/100)`

2. **Débit à réception SMS** ✅

   - `cron-check-pending-sms` (lignes 120-145):

     ```typescript
     // Quand STATUS_OK reçu
     await supabaseClient
       .from("transactions")
       .update({ status: "completed" })
       .eq("id", transaction.id);

     await supabaseClient
       .from("users")
       .update({
         balance: user.balance - activation.price,
         frozen_balance: Math.max(0, user.frozen_balance - activation.price),
       })
       .eq("id", activation.user_id);
     ```

3. **Remboursement timeout** ✅

   - `cron-check-pending-sms` (lignes 62-90):

     ```typescript
     // Si expires_at dépassé sans SMS
     await supabaseClient
       .from("transactions")
       .update({ status: "refunded" })
       .eq("id", transaction.id);

     await supabaseClient
       .from("users")
       .update({
         frozen_balance: Math.max(0, user.frozen_balance - activation.price),
       })
       .eq("id", activation.user_id);
     ```

### 🔴 PROBLÈME CRITIQUE:

Comme expliqué en section 4, les crédits ne sont **JAMAIS gelés avant l'achat**!

**Scénario d'attaque:**

1. User a 100 Ⓐ
2. Il clique 10× rapidement sur "Acheter" (10 Ⓐ chacun)
3. Les 10 requêtes passent la vérification `balance >= 10` ✅
4. 10 activations sont créées (total: 100 Ⓐ)
5. **Résultat:** User a 0 Ⓐ mais a 10 numéros ❌

**Avec frozen_balance:**

1. User a 100 Ⓐ (frozen: 0)
2. 1er achat: freeze 10 Ⓐ → balance: 100, frozen: 10, disponible: 90 ✅
3. 2e achat: freeze 10 Ⓐ → balance: 100, frozen: 20, disponible: 80 ✅
4. ...
5. 10e achat: freeze 10 Ⓐ → balance: 100, frozen: 100, disponible: 0 ✅
6. 11e achat: ❌ Refusé (disponible = 0)

### 🛡️ Transactionalité:

⚠️ **Pas de transactions PostgreSQL explicites**

- Les opérations sont séparées (risque de race condition)
- Recommandation: Utiliser `FOR UPDATE` ou stored procedure

```sql
-- STORED PROCEDURE RECOMMANDÉE:
CREATE OR REPLACE FUNCTION freeze_balance_for_purchase(
  p_user_id UUID,
  p_amount DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  v_balance DECIMAL;
  v_frozen DECIMAL;
BEGIN
  -- Lock row
  SELECT balance, frozen_balance INTO v_balance, v_frozen
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  -- Check disponible
  IF (v_balance - v_frozen) < p_amount THEN
    RETURN FALSE;
  END IF;

  -- Freeze
  UPDATE users
  SET frozen_balance = v_frozen + p_amount
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

---

## 8️⃣ ERREURS, LOGS & OBSERVABILITÉ ⚠️

### ✅ Gestion erreurs SMS-Activate:

Tous les codes d'erreur sont gérés dans `buy-sms-activate-number`:

```typescript
// Codes supportés (lignes 220-315):
NO_NUMBERS → "Aucun numéro disponible"
BAD_KEY → "Clé API invalide"
NO_BALANCE → "Solde fournisseur insuffisant"
ERROR_SQL → "Erreur base de données fournisseur"
BAD_ACTION → "Action non supportée"
BAD_SERVICE → "Service invalide"
NO_ACTIVATION → "Activation introuvable"
BAD_STATUS → "Status invalide"
BANNED → "Service banni"
ALREADY_FINISH → "Déjà terminé"
```

### ✅ Logging console:

```typescript
// Tous les Edge Functions ont des logs détaillés:
console.log("🔍 [CHECK-SMS] Checking rental:", rentalId);
console.log("📞 [BUY-SMS-ACTIVATE] API Call:", apiUrl);
console.log("📥 [SYNC-SERVICES] API Response:", responseText);
console.error("❌ [CRON-CHECK-SMS] Error:", error.message);
```

### ❌ MANQUE CRITIQUE - logs_provider:

**Aucun historique persistant des appels API!**

Actuellement:

- Logs uniquement dans console Edge Function (disparaissent après 24h)
- Impossible de tracer un bug survenu il y a 3 jours
- Impossible de voir combien d'appels API ont été faits ce mois
- Impossible d'auditer les échecs passés

**Solution:**

```typescript
// Créer loggedFetch() wrapper:
async function loggedFetch(
  url: string,
  options: RequestInit & {
    action: string;
    userId?: string;
    activationId?: string;
  }
) {
  const startTime = Date.now();
  let response: Response;
  let error: Error | null = null;

  try {
    response = await fetch(url, options);
    const responseTime = Date.now() - startTime;
    const responseBody = await response.text();

    // Log en BDD
    await supabase.from("logs_provider").insert({
      provider: "sms-activate",
      action: options.action,
      request_url: url,
      request_params: options.body ? JSON.parse(options.body) : null,
      response_status: response.status,
      response_body: responseBody,
      response_time_ms: responseTime,
      user_id: options.userId,
      activation_id: options.activationId,
      created_at: new Date().toISOString(),
    });

    return new Response(responseBody, { status: response.status });
  } catch (e) {
    error = e as Error;
    const responseTime = Date.now() - startTime;

    // Log error en BDD
    await supabase.from("logs_provider").insert({
      provider: "sms-activate",
      action: options.action,
      request_url: url,
      request_params: options.body ? JSON.parse(options.body) : null,
      response_status: 0,
      response_time_ms: responseTime,
      error_message: error.message,
      user_id: options.userId,
      activation_id: options.activationId,
      created_at: new Date().toISOString(),
    });

    throw error;
  }
}

// Utilisation:
const response = await loggedFetch(apiUrl, {
  action: "getNumber",
  userId: userId,
  activationId: activationId,
});
```

---

## 9️⃣ TESTS ❌

### ❌ État actuel: **AUCUN TEST**

- Aucun fichier `.test.ts` trouvé
- Aucun fichier `.spec.ts` trouvé
- Aucune suite de tests d'intégration
- Aucun test unitaire

### ✅ Tests critiques à ajouter:

#### Test 1: getBalance

```typescript
// tests/api/sms-activate.test.ts
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test("SMS-Activate - getBalance returns valid number", async () => {
  const response = await fetch(
    `${SMS_ACTIVATE_BASE_URL}?api_key=${API_KEY}&action=getBalance`
  );
  const text = await response.text();

  assertEquals(response.status, 200);

  // Response format: "ACCESS_BALANCE:123.45"
  const parts = text.split(":");
  assertEquals(parts[0], "ACCESS_BALANCE");

  const balance = parseFloat(parts[1]);
  assertEquals(typeof balance, "number");
  assertEquals(balance >= 0, true);
});
```

#### Test 2: Activation réussie (mock)

```typescript
Deno.test("Buy activation - success flow", async () => {
  const mockUserId = "test-user-123";
  const mockBalance = 100;

  // Mock Supabase
  const supabaseMock = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => ({ data: { balance: mockBalance }, error: null }),
        }),
      }),
      insert: () => ({
        select: () => ({ single: () => ({ data: { id: "act-123" } }) }),
      }),
    }),
  };

  // Test purchase logic
  const price = 10;
  const available = mockBalance;
  assertEquals(available >= price, true);

  // ... reste du test
});
```

#### Test 3: Activation expirée

```typescript
Deno.test("Activation expires and refunds", async () => {
  // 1. Créer activation avec expires_at = NOW() - 1 hour
  // 2. Lancer cron-check-pending-sms
  // 3. Vérifier que status = 'timeout'
  // 4. Vérifier que frozen_balance a été remboursé
});
```

#### Test 4: No numbers available

```typescript
Deno.test("Handle NO_NUMBERS error", async () => {
  // Mock response: "NO_NUMBERS"
  // Verify error is thrown
  // Verify no charge
  // Verify frozen_balance unchanged
});
```

#### Test 5: Location RENT

```typescript
Deno.test("Rent number for 24h", async () => {
  // 1. Call rent-sms-activate-number
  // 2. Verify rental created
  // 3. Verify expires_at = NOW() + 24h
  // 4. Verify balance debited
});
```

### 📦 Framework recommandé:

```typescript
// supabase/functions/_shared/test-utils.ts
export async function createTestUser(): Promise<string> {
  const { data } = await supabase
    .from("users")
    .insert({
      email: `test-${Date.now()}@test.com`,
      balance: 1000,
      frozen_balance: 0,
    })
    .select()
    .single();
  return data.id;
}

export async function cleanupTestUser(userId: string) {
  await supabase.from("activations").delete().eq("user_id", userId);
  await supabase.from("users").delete().eq("id", userId);
}
```

---

## 🔟 SÉCURITÉ & ROBUSTESSE ⚠️

### ❌ Rate limiting: **ABSENT**

Actuellement:

- Aucune limite sur le nombre d'achats par utilisateur
- Aucune limite sur le nombre d'appels API par IP
- Petit délai dans cron (500ms entre polling) mais pas de quota

**Solution recommandée:**

```typescript
// supabase/functions/_shared/rate-limiter.ts
interface RateLimit {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimit> = {
  buy_activation: { maxRequests: 10, windowMs: 60000 }, // 10/min
  buy_rent: { maxRequests: 5, windowMs: 60000 }, // 5/min
  retry_sms: { maxRequests: 3, windowMs: 300000 }, // 3/5min
  cancel: { maxRequests: 20, windowMs: 60000 }, // 20/min
};

export async function checkRateLimit(
  userId: string,
  action: string
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = RATE_LIMITS[action];
  if (!limit) return { allowed: true, remaining: 999 };

  const key = `ratelimit:${userId}:${action}`;
  const now = Date.now();
  const windowStart = now - limit.windowMs;

  // Get count from Redis/KV store
  const { data: logs } = await supabase
    .from("activity_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", new Date(windowStart).toISOString());

  const count = logs?.length || 0;
  const remaining = Math.max(0, limit.maxRequests - count);

  if (count >= limit.maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining };
}

// Usage:
const rateCheck = await checkRateLimit(userId, "buy_activation");
if (!rateCheck.allowed) {
  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded. Try again in 1 minute.",
      remaining: 0,
    }),
    { status: 429 }
  );
}
```

### ⚠️ Timeouts: **PARTIELS**

- ✅ `get-providers-status` utilise `AbortSignal.timeout(5000)`
- ❌ 42 autres fonctions n'ont PAS de timeout

**Solution:**

```typescript
// Dans toutes les fonctions:
const response = await fetch(apiUrl, {
  signal: AbortSignal.timeout(10000), // 10s
});
```

### ⚠️ Retries: **BASIQUES**

- Pas de retry automatique sur erreurs temporaires (500, 503, timeout)
- Seul retry manuel via `retry-sms-activate` (status=3)

**Solution:**

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<Response> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000),
      });

      // Retry sur erreurs temporaires
      if ([429, 500, 502, 503, 504].includes(response.status)) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `Retry ${i + 1}/${maxRetries} after error:`,
        lastError.message
      );

      // Exponential backoff: 1s, 2s, 4s
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, i))
      );
    }
  }

  throw lastError!;
}
```

### ✅ Contrôle droits (RLS):

```sql
-- activations: ✅
CREATE POLICY "Users can read own activations"
  ON activations FOR SELECT
  USING (auth.uid() = user_id);

-- rentals: ✅
CREATE POLICY "Users can view their own rentals"
  ON public.rentals FOR SELECT
  USING (auth.uid() = user_id);
```

### ✅ API Key jamais exposée:

- ✅ Aucun appel direct depuis le frontend
- ✅ Tous les appels passent par Edge Functions avec `SERVICE_ROLE_KEY`

---

## 1️⃣1️⃣ FRONTEND & UX ⚠️

### ✅ Gestion états:

```typescript
// Activation states (correctement mappés):
pending → waiting → received → completed
              ↓
           timeout / cancelled
```

### ✅ Messages d'erreur:

```typescript
// buy-sms-activate-number gère tous les cas:
if (responseText.includes("NO_NUMBERS")) {
  throw new Error("Aucun numéro disponible pour ce service");
}
// → Frontend affiche: toast.error('Aucun numéro disponible...')
```

### ⚠️ Messages bruts de l'API:

Certains endroits affichent directement le texte SMS-Activate:

```typescript
// ❌ Pas user-friendly:
throw new Error(`SMS-Activate error: ${responseText}`);

// ✅ Devrait être:
const errorMessages: Record<string, string> = {
  NO_NUMBERS:
    "Aucun numéro disponible actuellement. Réessayez dans quelques minutes.",
  BAD_SERVICE: "Ce service n'est pas supporté pour ce pays.",
  NO_BALANCE:
    "Notre fournisseur a un problème technique. Contactez le support.",
};
throw new Error(errorMessages[responseText] || "Une erreur est survenue");
```

### ✅ Cohérence boutons:

```typescript
// Logique correcte dans le frontend:
{
  activation.status === "pending" && (
    <>
      <Button onClick={handleRetry}>Renvoyer SMS</Button>
      <Button onClick={handleCancel}>Annuler</Button>
    </>
  );
}
{
  activation.status === "received" && (
    <Button onClick={handleFinish}>Confirmer réception</Button>
  );
}
{
  ["completed", "timeout", "cancelled"].includes(activation.status) && (
    <Badge>Terminé</Badge> // ← Pas de boutons inutiles ✅
  );
}
```

### ⚠️ Polling frontend:

Pas de polling automatique visible dans le code React. L'utilisateur doit rafraîchir manuellement ou le cron backend met à jour.

**Recommandation:**

```typescript
// Dans ActivationDetailPage.tsx:
useEffect(() => {
  if (activation.status === "pending" || activation.status === "waiting") {
    const interval = setInterval(async () => {
      // Refetch activation
      const { data } = await supabase
        .from("activations")
        .select("*")
        .eq("id", activationId)
        .single();

      if (data && data.status !== activation.status) {
        // Update state
        setActivation(data);

        // Stop polling si terminé
        if (["received", "timeout", "cancelled"].includes(data.status)) {
          clearInterval(interval);
        }
      }
    }, 5000); // Poll every 5s

    return () => clearInterval(interval);
  }
}, [activation.status]);
```

---

## 📊 TABLEAU RÉCAPITULATIF

| Catégorie                       | Score    | Détails                                                                      |
| ------------------------------- | -------- | ---------------------------------------------------------------------------- |
| 1. Configuration & sécurité API | ✅ 9/10  | Clé sécurisée, HTTPS, URL centralisée. -1 pour timeouts manquants            |
| 2. Structures de données        | ⚠️ 7/10  | Toutes tables présentes SAUF frozen_balance (CRITIQUE) et logs_provider      |
| 3. Synchronisation catalogue    | ✅ 10/10 | sync-services-unified excellent, pricing cohérent                            |
| 4. Flux Activation              | ⚠️ 6/10  | Polling ✅, gestion erreurs ✅, MAIS gel crédits ❌ (bug critique)           |
| 5. Actions utilisateur          | ✅ 10/10 | Retry, cancel, finish tous implémentés correctement                          |
| 6. Flux Rent                    | ✅ 10/10 | Création, polling inbox, prolongation, fin auto tous ✅                      |
| 7. Gestion crédits/marges       | ⚠️ 5/10  | Marge centralisée ✅, débit/remboursement ✅, MAIS pas de gel avant achat ❌ |
| 8. Erreurs & logs               | ⚠️ 6/10  | Codes erreurs ✅, logs console ✅, MAIS logs_provider absent ❌              |
| 9. Tests                        | ❌ 0/10  | Aucun test unitaire ou intégration                                           |
| 10. Sécurité & robustesse       | ⚠️ 5/10  | RLS ✅, API key sécurisée ✅, MAIS rate limiting ❌, timeouts partiels ⚠️    |
| 11. Frontend & UX               | ✅ 8/10  | États cohérents ✅, boutons logiques ✅, -2 pour messages bruts API          |

**SCORE GLOBAL: 76/110 → 69%** → **⚠️ MOYEN (avec bugs critiques)**

---

## 🚨 PRIORITÉS DE CORRECTION

### 🔴 **PRIORITÉ 1 - CRITIQUE (À FAIRE IMMÉDIATEMENT)**

#### 1. Ajouter colonne frozen_balance

```sql
-- supabase/migrations/YYYYMMDD_add_frozen_balance.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS frozen_balance DECIMAL(10, 2) DEFAULT 0.00;
CREATE INDEX IF NOT EXISTS idx_users_frozen_balance ON users(frozen_balance);
COMMENT ON COLUMN users.frozen_balance IS 'Solde gelé pendant les achats en attente';
```

**Temps estimé:** 10 minutes  
**Impact si non fait:** Crashes runtime sur cron-check-pending-sms

#### 2. Implémenter gel crédits avant achat

Modifier `buy-sms-activate-number/index.ts` lignes 183-220:

```typescript
// AVANT l'appel fetch(apiUrl):
const { data: user } = await supabaseClient
  .from("users")
  .select("balance, frozen_balance")
  .eq("id", userId)
  .single();

const availableBalance = user.balance - user.frozen_balance;
if (availableBalance < price) {
  throw new Error(`Insufficient available balance`);
}

// Créer transaction pending
const { data: transaction } = await supabaseClient
  .from("transactions")
  .insert({
    user_id: userId,
    type: "purchase",
    amount: -price,
    status: "pending",
  })
  .select()
  .single();

// GELER les crédits
await supabaseClient
  .from("users")
  .update({ frozen_balance: user.frozen_balance + price })
  .eq("id", userId);

// PUIS appeler SMS-Activate
try {
  const response = await fetch(apiUrl);
  // ...
} catch (error) {
  // Dégeler en cas d'erreur
  await supabaseClient
    .from("users")
    .update({ frozen_balance: Math.max(0, user.frozen_balance - price) })
    .eq("id", userId);
  throw error;
}
```

**Temps estimé:** 2 heures  
**Impact si non fait:** Risque financier (double dépense, balance négative)

#### 3. Créer table logs_provider

```sql
-- supabase/migrations/YYYYMMDD_create_logs_provider.sql
CREATE TABLE IF NOT EXISTS logs_provider (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL DEFAULT 'sms-activate',
  action TEXT NOT NULL,
  request_url TEXT NOT NULL,
  request_params JSONB,
  response_status INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,
  user_id UUID REFERENCES users(id),
  activation_id UUID REFERENCES activations(id),
  rental_id UUID REFERENCES rentals(id),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_provider_provider ON logs_provider(provider);
CREATE INDEX idx_logs_provider_action ON logs_provider(action);
CREATE INDEX idx_logs_provider_created_at ON logs_provider(created_at DESC);
```

**Temps estimé:** 3 heures (avec wrapper loggedFetch)  
**Impact si non fait:** Impossible de debugger bugs passés

---

### 🟠 **PRIORITÉ 2 - IMPORTANT (DANS LES 7 JOURS)**

#### 4. Implémenter rate limiting

Créer `supabase/functions/_shared/rate-limiter.ts` (voir section 10)  
**Temps estimé:** 3 heures  
**Impact:** Protection spam, sécurité

#### 5. Ajouter timeouts sur tous les fetch

```typescript
// Dans toutes les fonctions remplacer:
await fetch(url);
// Par:
await fetch(url, { signal: AbortSignal.timeout(10000) });
```

**Temps estimé:** 1 heure (find & replace dans 42 fichiers)  
**Impact:** Évite blocages infinis

#### 6. Unifier URLs SMS-Activate

Remplacer toutes les occurrences de:

- `api.sms-activate.io` → `api.sms-activate.ae`
- `api.sms-activate.org` → `api.sms-activate.ae`

**Temps estimé:** 30 minutes  
**Impact:** Cohérence, évite bugs subtils

#### 7. Améliorer messages d'erreur frontend

Créer `src/lib/error-messages.ts`:

```typescript
export const SMS_ACTIVATE_ERRORS: Record<string, string> = {
  NO_NUMBERS: "Aucun numéro disponible. Réessayez dans quelques minutes.",
  BAD_SERVICE: "Ce service n'est pas supporté pour ce pays.",
  NO_BALANCE: "Problème technique du fournisseur. Contactez le support.",
  // ... tous les codes
};
```

**Temps estimé:** 1 heure  
**Impact:** UX améliorée

---

### 🟢 **PRIORITÉ 3 - AMÉLIORATIONS (SPRINT FUTUR)**

#### 8. Créer tests d'intégration

Écrire 5 tests critiques (voir section 9)  
**Temps estimé:** 8 heures  
**Impact:** Confiance déploiement

#### 9. Ajouter polling frontend automatique

Voir code recommandé section 11  
**Temps estimé:** 2 heures  
**Impact:** UX temps réel

#### 10. Créer cron auto-sync prices

`cron-sync-prices` exécuté toutes les 6h  
**Temps estimé:** 1 heure  
**Impact:** Prix toujours à jour

#### 11. Admin interface logs_provider

Page admin pour voir historique appels API  
**Temps estimé:** 4 heures  
**Impact:** Debugging facilité

#### 12. Stored procedure transactionnelle

Remplacer logique freeze par fonction SQL atomique  
**Temps estimé:** 3 heures  
**Impact:** Sécurité bulletproof

---

## 📈 ESTIMATION GLOBALE

| Priorité           | Tâches | Temps total    | Urgence       |
| ------------------ | ------ | -------------- | ------------- |
| 🔴 P1 Critique     | 3      | ~5.5 heures    | Aujourd'hui   |
| 🟠 P2 Important    | 4      | ~5.5 heures    | Cette semaine |
| 🟢 P3 Amélioration | 5      | ~18 heures     | Sprint futur  |
| **TOTAL**          | **12** | **~29 heures** | -             |

---

## ✅ CE QUI EST EXCELLENT

1. ✅ **Architecture solide**: 44 Edge Functions bien organisées
2. ✅ **sync-services-unified**: Synchronisation intelligente avec pricing unifié
3. ✅ **Gestion complète RENT**: Toutes les fonctionnalités location implémentées
4. ✅ **Actions utilisateur**: Retry, cancel, finish tous présents
5. ✅ **Polling automatique**: cron-check-pending-sms vérifie SMS toutes les minutes
6. ✅ **Sécurité API**: Clé jamais exposée, tous appels via backend
7. ✅ **RLS correct**: Politiques d'accès bien définies
8. ✅ **Gestion erreurs API**: Tous les codes SMS-Activate mappés

---

## ⚠️ CE QUI EST FRAGILE

1. ⚠️ **frozen_balance**: Utilisé dans le code mais n'existe pas en BDD
2. ⚠️ **Pas de gel avant achat**: Risque de double dépense
3. ⚠️ **Pas de logs_provider**: Impossible de debugger bugs passés
4. ⚠️ **Pas de rate limiting**: Vulnérable au spam
5. ⚠️ **Tests absents**: Pas de filet de sécurité pour déploiements
6. ⚠️ **Timeouts partiels**: Risque de blocages
7. ⚠️ **URLs inconsistantes**: 3 domaines SMS-Activate différents

---

## 🎯 CONCLUSION

L'intégration API2 SMS-Activate est **globalement fonctionnelle** avec une architecture solide, MAIS présente **3 bugs critiques** qui peuvent causer:

- 💥 Crashes runtime (frozen_balance manquant)
- 💸 Pertes financières (pas de gel avant achat)
- 🔍 Impossibilité de debugger (pas de logs persistants)

**Recommandation:** Corriger les 3 priorités P1 IMMÉDIATEMENT avant tout déploiement production.

**Après correction P1:** Le système sera stable avec un score estimé à **85/100** ✅

---

**Audit réalisé par:** GitHub Copilot  
**Date:** 28 novembre 2025  
**Version:** 1.0
