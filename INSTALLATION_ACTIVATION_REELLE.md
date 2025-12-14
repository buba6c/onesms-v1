# 🚀 GUIDE D'INSTALLATION - Système d'Activation Réel 5sim

## ✅ Ce qui a été créé

### 1. **Edge Functions Supabase**

- `buy-5sim-number` - Acheter un numéro (facturation différée)
- `check-5sim-sms` - Vérifier SMS (facture à la réception)
- `cancel-5sim-order` - Annuler (remboursement automatique)

### 2. **Migration SQL**

- Table `activations` - Tracer tous les achats
- RLS Policies - Sécurité
- Vue `activation_stats` - Statistiques

### 3. **Frontend Modifié**

- `DashboardPage.tsx` - Intégration API réelle
- Vérification automatique SMS (5 secondes)
- Gestion timeout + annulation

---

## 📋 Logique Métier Implémentée

### Flux d'Activation (Mode: activation uniquement)

```
1. ACHAT
   ↓
   - Vérifier solde utilisateur
   - Acheter numéro sur 5sim
   - Créer activation (status: pending)
   - Créer transaction (status: pending)
   - ❌ PAS DE DÉDUCTION DU SOLDE

2. VÉRIFICATION SMS (boucle 5s)
   ↓
   a) SMS REÇU?
      ✅ OUI → FACTURER
         - Déduire solde utilisateur
         - Activation: status = received
         - Transaction: status = completed
         - Afficher code SMS

      ❌ NON → Continuer vérification

   b) TIMEOUT (>20 min)?
      ✅ OUI → REMBOURSER
         - Annuler sur 5sim
         - Activation: status = timeout
         - Transaction: status = deleted
         - ❌ AUCUNE FACTURATION

3. ANNULATION MANUELLE (bouton X)
   ↓
   - Vérifier si SMS reçu (bloquer si oui)
   - Annuler sur 5sim
   - Activation: status = cancelled
   - Transaction: status = deleted
   - ❌ AUCUNE FACTURATION
```

---

## 🛠️ Étapes d'Installation

### Étape 1: Créer la table activations

1. Ouvrir **Supabase Dashboard**
2. Aller dans **SQL Editor**
3. Copier le contenu de `supabase/migrations/020_activations_table.sql`
4. Exécuter

**Vérification:**

```sql
SELECT * FROM activations LIMIT 5;
```

### Étape 2: Déployer les Edge Functions

```bash
cd "/Users/mac/Desktop/ONE SMS V1"

# Déployer buy-5sim-number
supabase functions deploy buy-5sim-number

# Déployer check-5sim-sms
supabase functions deploy check-5sim-sms

# Déployer cancel-5sim-order
supabase functions deploy cancel-5sim-order
```

**Vérification:**

```bash
supabase functions list
```

Devrait afficher:

- ✅ buy-5sim-number
- ✅ check-5sim-sms
- ✅ cancel-5sim-order
- ✅ sync-5sim (déjà déployée)

### Étape 3: Configurer l'API Key 5sim (si pas déjà fait)

```bash
# Via CLI
supabase secrets set FIVE_SIM_API_KEY=eyJhbGc...votre_token

# Ou via Dashboard
# Project Settings → Edge Functions → Secrets
# Ajouter: FIVE_SIM_API_KEY
```

### Étape 4: Tester l'application

1. Ouvrir http://localhost:3000
2. Se connecter
3. Dashboard → Choisir service + pays
4. Cliquer "Activate"
5. Ouvrir Console (F12) pour voir les logs

---

## 🧪 Tests à Effectuer

### Test 1: Achat avec SMS reçu (cas nominal)

**Scénario:**

1. Acheter un numéro WhatsApp France
2. Attendre réception SMS (peut prendre 30s-2min)
3. Vérifier code affiché
4. Vérifier solde déduit

**Logs à surveiller:**

```
🚀 [ACTIVATE] Début achat...
✅ [ACTIVATE] Numéro acheté: +33...
🔍 [CHECK] Vérification SMS...
📊 [CHECK] Résultat: received, charged: true
💰 [CHECK] Facturé: 1.5 Nouveau solde: 98.5
✅ SMS Reçu ! Code: 123456
```

**Vérification DB:**

```sql
-- Activation
SELECT * FROM activations ORDER BY created_at DESC LIMIT 1;
-- status devrait être 'received'

-- Transaction
SELECT * FROM transactions
WHERE type = 'number_purchase'
ORDER BY created_at DESC LIMIT 1;
-- status devrait être 'completed'
```

### Test 2: Timeout sans SMS

**Scénario:**

1. Acheter un service peu populaire
2. Attendre 20+ minutes sans SMS
3. Vérifier remboursement automatique

**Logs à surveiller:**

```
⏰ [CHECK] Timeout ! Remboursement automatique...
✅ [CHECK] Remboursé automatiquement
⏰ Timeout - Aucun SMS reçu. Remboursé automatiquement.
```

**Vérification DB:**

```sql
-- Activation
SELECT * FROM activations WHERE status = 'timeout' ORDER BY created_at DESC LIMIT 1;

-- Transaction pending supprimée
SELECT * FROM transactions WHERE status = 'pending';
-- Ne devrait PAS contenir cette activation
```

### Test 3: Annulation manuelle

**Scénario:**

1. Acheter un numéro
2. Attendre 10 secondes
3. Cliquer sur le bouton X (annuler)
4. Vérifier remboursement

**Logs à surveiller:**

```
🚫 [CANCEL] Annulation commande...
✅ [CANCEL] Remboursé (transaction pending supprimée)
✅ Annulé - Commande annulée et remboursée
```

**Vérification DB:**

```sql
SELECT * FROM activations WHERE status = 'cancelled' ORDER BY created_at DESC LIMIT 1;
```

### Test 4: Annulation impossible (SMS déjà reçu)

**Scénario:**

1. Acheter un numéro
2. Attendre SMS (reçu)
3. Essayer d'annuler → devrait échouer

**Résultat attendu:**

- Bouton X disparaît après réception SMS
- Si on tente via API: erreur "Cannot cancel: SMS already received"

---

## 🔍 Monitoring & Debugging

### Voir les logs Edge Functions

```bash
# Logs en temps réel
supabase functions logs buy-5sim-number --follow
supabase functions logs check-5sim-sms --follow
supabase functions logs cancel-5sim-order --follow
```

### Voir les activations en cours

```sql
-- Toutes les activations en attente
SELECT
  a.id,
  a.phone,
  a.service_code,
  a.country_code,
  a.status,
  a.price,
  a.expires_at,
  a.created_at,
  EXTRACT(EPOCH FROM (a.expires_at - NOW())) as seconds_remaining
FROM activations a
WHERE a.status = 'pending'
ORDER BY a.created_at DESC;

-- Statistiques globales
SELECT
  status,
  COUNT(*) as count,
  SUM(price) as total_amount
FROM activations
GROUP BY status;
```

### Voir les transactions en attente

```sql
SELECT
  t.id,
  t.user_id,
  t.type,
  t.amount,
  t.status,
  t.description,
  t.metadata->>'phone' as phone,
  t.created_at
FROM transactions t
WHERE t.type = 'number_purchase' AND t.status = 'pending'
ORDER BY t.created_at DESC;
```

---

## ⚠️ Problèmes Courants

### 1. "5sim API key not configured"

**Cause:** Secret FIVE_SIM_API_KEY pas défini

**Solution:**

```bash
supabase secrets set FIVE_SIM_API_KEY=eyJhbGc...
supabase functions deploy buy-5sim-number
```

### 2. "Insufficient balance"

**Cause:** Solde utilisateur insuffisant

**Solution:**

```sql
-- Ajouter du crédit manuellement (admin)
UPDATE users
SET balance = balance + 100
WHERE email = 'test@example.com';
```

### 3. "No available numbers"

**Cause:** Service/Pays pas synchronisé ou stock vide

**Solution:**

1. Admin → Services → Sync avec 5sim
2. Attendre fin sync (15-18s)
3. Vérifier stock:

```sql
SELECT service_code, country_code, available_count
FROM pricing_rules
WHERE service_code = 'whatsapp' AND country_code = 'france';
```

### 4. SMS jamais reçu

**Cause:** Service 5sim peut avoir problème temporaire

**Solution:**

- Attendre timeout automatique (20 min)
- Ou annuler manuellement
- Remboursement automatique dans les 2 cas

### 5. "Cannot cancel: SMS already received"

**Cause:** SMS reçu entre l'affichage et le clic annulation

**Solution:**

- C'est normal ! Le système protège contre double dépense
- L'utilisateur a déjà été facturé
- Il possède le code SMS

---

## 📊 Statistiques à Surveiller

### Taux de succès des activations

```sql
SELECT
  ROUND(COUNT(*) FILTER (WHERE status = 'received')::DECIMAL / COUNT(*) * 100, 2) as success_rate,
  COUNT(*) FILTER (WHERE status = 'received') as successful,
  COUNT(*) FILTER (WHERE status = 'timeout') as timeout,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
  COUNT(*) as total
FROM activations;
```

### Revenus générés

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE status = 'received') as sales,
  SUM(price) FILTER (WHERE status = 'received') as revenue
FROM activations
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Services les plus vendus

```sql
SELECT
  service_code,
  COUNT(*) as total_sales,
  COUNT(*) FILTER (WHERE status = 'received') as successful,
  SUM(price) FILTER (WHERE status = 'received') as revenue
FROM activations
GROUP BY service_code
ORDER BY total_sales DESC
LIMIT 10;
```

---

## 🎯 Prochaines Améliorations Possibles

1. **Webhooks 5sim** - Réception SMS push au lieu de polling
2. **Mode Rent** - Location de numéros (plusieurs jours)
3. **Historique utilisateur** - Page dédiée aux activations passées
4. **Notifications** - Email/Push quand SMS reçu
5. **Retry automatique** - Si timeout, proposer re-essayer avec autre opérateur
6. **Blacklist services** - Désactiver services avec taux échec >50%

---

## ✅ Checklist Finale

- [ ] Table `activations` créée dans Supabase
- [ ] RLS policies activées et testées
- [ ] 3 Edge Functions déployées
- [ ] Secret `FIVE_SIM_API_KEY` configuré
- [ ] Frontend compilé (`npm run build`)
- [ ] PM2 redémarré (`pm2 restart all`)
- [ ] Test achat réussi avec SMS
- [ ] Test timeout vérifié
- [ ] Test annulation vérifié
- [ ] Monitoring activé (logs + SQL)

---

**Date de création:** 21 novembre 2025
**Version:** 1.0 - Système d'activation réel avec facturation différée
