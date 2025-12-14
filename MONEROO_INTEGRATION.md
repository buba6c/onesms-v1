# 🌍 Intégration Moneroo - ONE SMS

Ce document explique comment configurer et utiliser Moneroo comme tunnel de paiement sur la plateforme ONE SMS.

## 📋 Table des matières

1. [Présentation de Moneroo](#présentation-de-moneroo)
2. [Configuration](#configuration)
3. [Architecture](#architecture)
4. [Déploiement des Edge Functions](#déploiement-des-edge-functions)
5. [Configuration du Webhook](#configuration-du-webhook)
6. [Test du flux de paiement](#test-du-flux-de-paiement)

---

## 📖 Présentation de Moneroo

Moneroo est une passerelle de paiement africaine qui supporte:

- **Mobile Money**: MTN, Orange Money, Wave, Moov, Airtel
- **Devises**: XOF, XAF, GHS, NGN, KES, EUR, USD, etc.
- **Pays**: Sénégal, Côte d'Ivoire, Burkina Faso, Mali, Togo, Bénin, Ghana, Nigeria, Kenya, etc.

### Avantages

- ✅ Multi-opérateur (MTN + Orange + Wave + Moov en un seul intégration)
- ✅ Large couverture africaine
- ✅ API simple et bien documentée
- ✅ Dashboard de gestion complet
- ✅ Webhooks fiables avec signature HMAC

---

## ⚙️ Configuration

### 1. Créer un compte Moneroo

1. Aller sur [https://app.moneroo.io](https://app.moneroo.io)
2. Créer un compte développeur
3. Compléter la vérification KYC
4. Accéder au Dashboard

### 2. Obtenir les clés API

Dans le Dashboard Moneroo:

1. Aller dans **Settings** > **API Keys**
2. Copier:
   - `Public Key` (pk_test_xxx ou pk_live_xxx)
   - `Secret Key` (sk_test_xxx ou sk_live_xxx)

### 3. Variables d'environnement

#### Frontend (.env)

```env
VITE_MONEROO_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx
VITE_MONEROO_RETURN_URL=https://votre-domaine.com/dashboard?payment=success
```

#### Backend (Supabase Edge Functions)

```bash
# Définir les secrets dans Supabase
supabase secrets set MONEROO_SECRET_KEY=sk_live_xxxxxxxxxxxxx
supabase secrets set MONEROO_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

---

## 🏗️ Architecture

### Fichiers créés

```
src/
└── lib/
    └── api/
        └── moneroo.ts          # Client API Moneroo (frontend)

supabase/
└── functions/
    ├── init-moneroo-payment/   # Initialisation du paiement
    │   └── index.ts
    ├── verify-moneroo-payment/ # Vérification du paiement
    │   └── index.ts
    └── moneroo-webhook/        # Webhook handler
        └── index.ts
```

### Flux de paiement

```
┌─────────┐      ┌──────────┐      ┌─────────┐      ┌─────────┐
│  User   │──1──▶│ Frontend │──2──▶│ Edge Fn │──3──▶│ Moneroo │
│         │      │ TopUp    │      │ init    │      │ API     │
└─────────┘      └──────────┘      └─────────┘      └─────────┘
                       │                                  │
                       │◀────────4. checkout_url─────────┘
                       │
                       │──5. Redirect user──▶
                       │
                       ▼
                 ┌──────────┐
                 │ Moneroo  │
                 │ Checkout │
                 └────┬─────┘
                      │
                      │ 6. User completes payment
                      ▼
                 ┌──────────┐      ┌─────────┐      ┌─────────┐
                 │ Moneroo  │──7──▶│ Webhook │──8──▶│ Supabase│
                 │ Server   │      │ Handler │      │ DB      │
                 └──────────┘      └─────────┘      └─────────┘
                      │
                      │ 9. Redirect to return_url
                      ▼
                 ┌──────────┐
                 │ Frontend │
                 │ Success  │
                 └──────────┘
```

---

## 🚀 Déploiement des Edge Functions

### Prérequis

```bash
# Installer Supabase CLI
npm install -g supabase
supabase login
```

### Déployer les fonctions

```bash
# Se positionner dans le projet
cd "/Users/mac/Desktop/ONE SMS V1"

# Lier au projet Supabase
supabase link --project-ref votre-project-ref

# Définir les secrets
supabase secrets set MONEROO_SECRET_KEY=sk_live_xxxxxxxxxxxxx
supabase secrets set MONEROO_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Déployer les fonctions
supabase functions deploy init-moneroo-payment
supabase functions deploy verify-moneroo-payment
supabase functions deploy moneroo-webhook
```

### Vérifier le déploiement

```bash
supabase functions list
```

---

## 🔗 Configuration du Webhook

### 1. URL du Webhook

Votre URL de webhook sera:

```
https://votre-project-ref.supabase.co/functions/v1/moneroo-webhook
```

### 2. Configurer dans Moneroo Dashboard

1. Aller dans **Settings** > **Webhooks**
2. Cliquer sur **Add Webhook**
3. Configurer:
   - **URL**: `https://xxxx.supabase.co/functions/v1/moneroo-webhook`
   - **Events**:
     - `payment.success`
     - `payment.failed`
   - **Secret**: Copier le secret généré
4. Sauvegarder

### 3. Mettre à jour le secret

```bash
supabase secrets set MONEROO_WEBHOOK_SECRET=le-secret-copié
```

---

## 🧪 Test du flux de paiement

### Mode Sandbox

1. Dans Moneroo Dashboard, basculer en mode **Sandbox**
2. Utiliser les clés de test (pk_test_xxx, sk_test_xxx)
3. Les paiements ne seront pas réels

### Test manuel

```bash
# Tester init-moneroo-payment
curl -X POST https://xxxx.supabase.co/functions/v1/init-moneroo-payment \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "XOF",
    "description": "Test payment",
    "metadata": {"user_id": "xxx", "activations": 10},
    "return_url": "https://your-domain.com/success",
    "customer": {
      "email": "test@example.com",
      "first_name": "Test",
      "last_name": "User"
    }
  }'
```

### Cartes de test Moneroo

| Type   | Numéro             | Résultat        |
| ------ | ------------------ | --------------- |
| Succès | `4242424242424242` | Paiement réussi |
| Échec  | `4000000000000002` | Paiement refusé |

---

## 📊 Events Webhook

| Event             | Description                           |
| ----------------- | ------------------------------------- |
| `payment.success` | Paiement réussi - créditer le solde   |
| `payment.failed`  | Paiement échoué - marquer comme échec |
| `payout.success`  | Retrait réussi (pour admin)           |
| `payout.failed`   | Retrait échoué (pour admin)           |

### Exemple de payload webhook

```json
{
  "event": "payment.success",
  "data": {
    "id": "pay_xxxxx",
    "amount": 1000,
    "currency": "XOF",
    "status": "success",
    "metadata": {
      "user_id": "uuid",
      "activations": 10
    },
    "customer": {
      "email": "user@example.com"
    },
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

---

## 🔒 Sécurité

### Vérification de signature

Le webhook vérifie automatiquement la signature HMAC-SHA256:

```typescript
const signature = req.headers.get("X-Moneroo-Signature");
const expectedSignature = crypto
  .createHmac("sha256", webhookSecret)
  .update(JSON.stringify(body))
  .digest("hex");

if (signature !== expectedSignature) {
  return new Response("Invalid signature", { status: 403 });
}
```

### Double vérification

Après réception du webhook, on vérifie toujours le paiement via l'API:

```typescript
const response = await fetch(`${MONEROO_API_URL}/payments/${paymentId}/verify`);
```

---

## 🆘 Dépannage

### Erreur "MONEROO_SECRET_KEY not configured"

```bash
supabase secrets set MONEROO_SECRET_KEY=votre_clé_secrète
supabase functions deploy init-moneroo-payment
```

### Webhook ne reçoit pas les events

1. Vérifier l'URL du webhook dans Moneroo Dashboard
2. Vérifier que la fonction est déployée: `supabase functions list`
3. Vérifier les logs: `supabase functions logs moneroo-webhook`

### Paiement non crédité

1. Vérifier les logs du webhook
2. Vérifier la table `transactions` dans Supabase
3. Vérifier que le `external_id` correspond

---

## 📚 Documentation

- [Moneroo API Documentation](https://docs.moneroo.io)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [HMAC Signature Verification](https://docs.moneroo.io/webhooks/signature)

---

## ✅ Checklist de déploiement

- [ ] Compte Moneroo créé et vérifié
- [ ] Clés API obtenues (public + secret)
- [ ] Variables d'environnement frontend configurées
- [ ] Secrets Supabase configurés
- [ ] Edge Functions déployées
- [ ] Webhook configuré dans Moneroo Dashboard
- [ ] Test en mode Sandbox réussi
- [ ] Basculement en mode Live
