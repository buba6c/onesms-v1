# 🔒 Audit de Sécurité - Système de Parrainage

**Date:** 7 décembre 2025  
**Statut:** ⚠️ **VULNÉRABILITÉS CRITIQUES DÉTECTÉES**

---

## 📊 Vue d'ensemble

Le système de parrainage permet aux utilisateurs d'inviter des filleuls et de recevoir des bonus en crédits (Ⓐ). L'analyse révèle **plusieurs failles de sécurité critiques** qui peuvent être exploitées.

---

## 🚨 VULNÉRABILITÉS CRITIQUES

### 1. ❌ **ABSENCE TOTALE DE RLS (Row Level Security)**

**Fichier:** `supabase/migrations/20251206_add_referrals.sql`

```sql
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  referee_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  ...
);
-- ⚠️ AUCUNE POLITIQUE RLS DÉFINIE
```

**Impact:**
- ✅ Service role peut tout faire (normal)
- ❌ **AUCUNE protection côté client** : n'importe quel utilisateur authentifié peut :
  - Lire TOUS les parrainages de tous les utilisateurs
  - Modifier/supprimer des parrainages qui ne lui appartiennent pas
  - Voir les emails des parrains/filleuls via les JOINs

**Exploitation possible:**
```javascript
// N'importe quel utilisateur peut exécuter :
const { data } = await supabase
  .from('referrals')
  .select('*, referrer:users!referrer_id(email), referee:users!referee_id(email)')
  
// Résultat : base complète exposée avec tous les emails
```

**Risque:** 🔴 **CRITIQUE** - Fuite massive de données personnelles

---

### 2. ❌ **Code de parrainage NON VALIDÉ lors de l'inscription**

**Fichier:** `supabase/migrations/010_auto_confirm_emails.sql`

La fonction `handle_new_user()` ne crée **AUCUNE entrée** dans la table `referrals` :

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirme email
  UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = NEW.id;
  
  -- Insère dans public.users
  INSERT INTO public.users (id, email, name, ...)
  VALUES (NEW.id, NEW.email, ...);
  
  -- ⚠️ AUCUNE VÉRIFICATION DU CODE PARRAINAGE
  -- ⚠️ AUCUNE CRÉATION D'ENTRÉE DANS referrals
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Impact:**
- Le code `referral_code` passé lors de l'inscription est **complètement ignoré**
- Aucun lien parrain ↔ filleul n'est créé automatiquement
- Le système attend que l'utilisateur recharge **avant** de vérifier le code

**Problème:** Si un attaquant s'inscrit avec un faux code, il peut recharger et **le système ne détectera jamais** que le code est invalide (aucune validation n'existe).

**Risque:** 🟠 **MOYEN** - Bypass du système de parrainage

---

### 3. ⚠️ **Double dépense possible (race condition)**

**Fichier:** `supabase/functions/moneyfusion-webhook/index.ts`

```typescript
async function processReferralReward(supabase, tx, amountXof) {
  const { data: referral } = await supabase
    .from('referrals')
    .select('*')
    .eq('referee_id', tx.user_id)
    .maybeSingle()

  if (!referral || referral.status === 'rewarded') return
  
  // ⚠️ PAS DE LOCK ENTRE LA LECTURE ET LA MISE À JOUR
  
  // Vérifications...
  await supabase.from('referrals').update({ status: 'qualified', ... })
  
  // Payout
  await supabase.rpc('secure_referral_payout', { ... })
}
```

**Problème:**
- Si 2 webhooks arrivent **simultanément** pour le même utilisateur
- Les 2 threads lisent `status = 'pending'` en même temps
- Les 2 passent la validation
- Les 2 appellent `secure_referral_payout`

**Protection existante:**
```sql
-- Dans secure_referral_payout
SELECT * INTO v_ref FROM referrals WHERE id = p_referral_id FOR UPDATE;
IF v_ref.status = 'rewarded' THEN
  RETURN jsonb_build_object('status', 'noop', 'reason', 'already_rewarded');
END IF;
```

✅ La fonction RPC est **idempotente** grâce au `FOR UPDATE`  
❌ Mais le webhook peut **quand même appeler 2 fois** la fonction (gaspillage ressources)

**Risque:** 🟡 **FAIBLE** - Partiellement mitigé par l'idempotence RPC

---

### 4. ❌ **Auto-référence mal protégée**

**Fichier:** `supabase/functions/moneyfusion-webhook/index.ts`

```typescript
if (settings.referral_self_referral_block === 'true' && 
    referral.referrer_id === referral.referee_id) {
  await supabase.from('referrals').update({ 
    status: 'rejected', 
    reason: 'self_referral' 
  }).eq('id', referral.id)
  return
}
```

**Problème:**
- Cette vérification se fait **APRÈS inscription** et **APRÈS première recharge**
- Un utilisateur peut créer 2 comptes A et B, utiliser le code de A pour B
- Si A et B ont des IPs/devices différents, la détection échoue

**Protection manquante:**
- Pas de vérification IP/fingerprint/device
- Pas de limite sur le nombre de filleuls par IP
- Pas de détection de patterns suspects (même nom, adresse, etc.)

**Risque:** 🟠 **MOYEN** - Fraude au parrainage possible

---

### 5. ⚠️ **Cap mensuel contournable**

**Fichier:** `supabase/functions/moneyfusion-webhook/index.ts`

```typescript
const monthlyCap = parseInt(settings.referral_monthly_cap || '0', 10)
if (monthlyCap > 0 && referral.referrer_id) {
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count: rewardedCount } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', referral.referrer_id)
    .eq('status', 'rewarded')
    .gte('rewarded_at', startMonth)
  
  if ((rewardedCount || 0) >= monthlyCap) {
    await supabase.from('referrals').update({ 
      status: 'rejected', 
      reason: 'monthly_cap' 
    }).eq('id', referral.id)
    return
  }
}
```

**Problème:**
- Le cap est vérifié **APRÈS** que le filleul ait rechargé
- Si le parrain a 19/20 filleuls et 5 filleuls rechargent **simultanément**, seul 1 sera rejeté
- Les 4 autres passeront (race condition)

**Risque:** 🟡 **FAIBLE** - Impact limité (quelques bonus en trop max)

---

### 6. ❌ **Transactions visibles sans authentification**

**Fichier:** `supabase/migrations/20251206_add_referral_bonus_function.sql`

```sql
INSERT INTO transactions(
  user_id, type, amount, status, description, reference, metadata, created_at
) VALUES (
  v_ref.referee_id,
  'referral_bonus',
  p_bonus_referee,
  'completed',
  'Bonus parrainage (filleul)',
  concat('REF-', p_referral_id, '-REFEREE'),
  jsonb_build_object('referral_id', p_referral_id, 'role', 'referee'),
  v_now
)
ON CONFLICT (reference) DO NOTHING;
```

**Problème:**
- Table `transactions` n'a **probablement pas de RLS** non plus
- Le `reference` contient le `referral_id` (UUID prévisible)
- Un attaquant peut scanner les UUIDs et lire toutes les transactions

**Risque:** 🔴 **CRITIQUE** - Fuite de données financières

---

### 7. ⚠️ **Expiration mal gérée**

**Fichier:** `supabase/functions/moneyfusion-webhook/index.ts`

```typescript
if (referral.expiry_date && new Date(referral.expiry_date) < now) {
  await supabase
    .from('referrals')
    .update({ status: 'expired', reason: 'expired' })
    .eq('id', referral.id)
  return
}
```

**Problème:**
- L'expiration est vérifiée **uniquement lors de la recharge**
- Si un filleul ne recharge jamais, le referral reste en `pending` indéfiniment
- Pas de CRON job pour nettoyer les parrainages expirés

**Risque:** 🟢 **MINIMAL** - Pollution DB mais pas de fuite

---

## 📈 SCORE DE SÉCURITÉ

| Composant | Score | Note |
|-----------|-------|------|
| **RLS (Row Level Security)** | 0/10 | ❌ Absent |
| **Validation code parrainage** | 2/10 | ❌ Non implémentée |
| **Protection race conditions** | 6/10 | ⚠️ Partielle |
| **Anti-fraude** | 3/10 | ❌ Insuffisante |
| **Audit trail** | 7/10 | ✅ Transactions loggées |
| **Idempotence** | 9/10 | ✅ Excellente (RPC) |

**Score global:** 🔴 **4.5/10** - SÉCURITÉ INSUFFISANTE

---

## 🛡️ RECOMMANDATIONS CRITIQUES

### 1. **ACTIVER RLS SUR `referrals` IMMÉDIATEMENT**

```sql
-- Activer RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Policy: Utilisateurs peuvent voir leurs propres parrainages
CREATE POLICY "Users can view own referrals"
ON public.referrals FOR SELECT
TO authenticated
USING (
  auth.uid() = referrer_id OR auth.uid() = referee_id
);

-- Policy: Seul service_role peut modifier
CREATE POLICY "Service role full access"
ON public.referrals FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Bloquer INSERT/UPDATE/DELETE pour les utilisateurs normaux
CREATE POLICY "Block user mutations"
ON public.referrals FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);
```

### 2. **VALIDER le code parrainage lors de l'inscription**

Modifier `handle_new_user()` :

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code text;
  v_referrer_id uuid;
BEGIN
  -- Auto-confirme email
  UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = NEW.id;
  
  -- Récupérer le code de parrainage depuis metadata
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  
  -- Valider et trouver le parrain
  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    SELECT id INTO v_referrer_id
    FROM public.users
    WHERE referral_code = lower(trim(v_referral_code))
      AND id != NEW.id  -- Bloquer auto-référence
    LIMIT 1;
    
    -- Créer l'entrée referral si code valide
    IF v_referrer_id IS NOT NULL THEN
      INSERT INTO public.referrals (
        referrer_id,
        referee_id,
        status,
        expiry_date,
        created_at
      ) VALUES (
        v_referrer_id,
        NEW.id,
        'pending',
        NOW() + INTERVAL '14 days',  -- Depuis system_settings
        NOW()
      );
      
      RAISE NOTICE 'Referral created: % → %', v_referrer_id, NEW.id;
    ELSE
      RAISE WARNING 'Invalid referral code: %', v_referral_code;
    END IF;
  END IF;
  
  -- Insérer dans public.users
  INSERT INTO public.users (id, email, name, ...)
  VALUES (NEW.id, NEW.email, ...);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. **AJOUTER RLS sur `transactions`**

```sql
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
ON public.transactions FOR ALL
TO service_role
USING (true);
```

### 4. **AMÉLIORER anti-fraude**

Ajouter dans `moneyfusion-webhook/index.ts` :

```typescript
// Vérifier IP/device fingerprint (nécessite metadata dans users)
const { data: referrerMeta } = await supabase
  .from('users')
  .select('metadata')
  .eq('id', referral.referrer_id)
  .single()

const { data: refereeMeta } = await supabase
  .from('users')
  .select('metadata')
  .eq('id', referral.referee_id)
  .single()

// Rejeter si même IP
if (referrerMeta?.metadata?.signup_ip === refereeMeta?.metadata?.signup_ip) {
  await supabase.from('referrals').update({ 
    status: 'rejected', 
    reason: 'same_ip_detected' 
  }).eq('id', referral.id)
  return
}
```

### 5. **AJOUTER CRON job expiration**

Créer `supabase/functions/expire-referrals/index.ts` :

```typescript
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  const { data, error } = await supabase
    .from('referrals')
    .update({ status: 'expired', reason: 'auto_expired' })
    .eq('status', 'pending')
    .lt('expiry_date', new Date().toISOString())
  
  return new Response(JSON.stringify({ expired: data?.length || 0 }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Ajouter cron dans `supabase/functions/.well-known/deno-cron.json` :

```json
{
  "crons": [
    {
      "name": "expire-referrals",
      "schedule": "0 2 * * *",
      "function": "expire-referrals"
    }
  ]
}
```

---

## 📋 CHECKLIST DE MISE EN CONFORMITÉ

- [ ] Activer RLS sur `referrals`
- [ ] Activer RLS sur `transactions`
- [ ] Modifier `handle_new_user()` pour valider codes
- [ ] Ajouter détection IP/device dans webhook
- [ ] Créer fonction CRON expiration
- [ ] Auditer les logs de fraude existants
- [ ] Tester avec codes invalides
- [ ] Tester race conditions (load testing)
- [ ] Documenter le flow complet
- [ ] Former l'équipe admin sur la détection fraude

---

## 🎯 PRIORISATION

**Phase 1 (URGENT - 24h):**
1. Activer RLS sur `referrals` et `transactions`
2. Modifier `handle_new_user()` pour créer les referrals

**Phase 2 (Important - 1 semaine):**
3. Ajouter anti-fraude IP/device
4. Créer CRON expiration
5. Tests de sécurité

**Phase 3 (Amélioration - 2 semaines):**
6. Dashboard admin fraude
7. Alertes automatiques
8. ML pour détection patterns suspects

---

## 📞 CONTACT

Pour questions/clarifications sur cet audit:
- **Analyste:** GitHub Copilot
- **Date:** 7 décembre 2025
- **Repo:** onesms-v1
