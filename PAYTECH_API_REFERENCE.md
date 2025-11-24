# PayTech API - Référence Officielle pour ONE SMS V1

> **Documentation officielle:** https://docs.intech.sn/doc_paytech.php  
> **Dernière mise à jour:** Janvier 2025  
> **Version API:** Stable

---

## 📋 TABLE DES MATIÈRES

1. [Configuration Essentielle](#configuration-essentielle)
2. [Endpoints API](#endpoints-api)
3. [Demande de Paiement](#demande-de-paiement)
4. [Notifications IPN](#notifications-ipn)
5. [Vérification de Sécurité](#vérification-de-sécurité)
6. [Codes d'Erreur](#codes-derreur)
7. [Environnements](#environnements)
8. [Checklist d'Intégration](#checklist-dintégration)

---

## 🔧 CONFIGURATION ESSENTIELLE

### URL de Base
```
https://paytech.sn/api
```

### Headers Requis
```javascript
{
  "API_KEY": "votre_cle_api",           // Obtenu depuis Dashboard PayTech
  "API_SECRET": "votre_cle_secrete",    // Obtenu depuis Dashboard PayTech
  "Content-Type": "application/json"
}
```

### Obtenir les Clés API

1. S'inscrire sur https://paytech.sn
2. Accéder au Dashboard
3. Cliquer sur **Paramètres** → **API**
4. Récupérer `API_KEY` et `API_SECRET`

### Activation Production

**Mode Test:** Disponible immédiatement  
**Mode Production:** Requiert validation manuelle

**Documents requis:**
- Numéro NINEA
- Pièce d'identité ou passeport
- Registre de commerce
- Document de statut d'entreprise
- Justificatif de domicile (facture SEN'EAU/SENELEC)
- Numéro de téléphone de contact

**Contact:** contact@paytech.sn (Objet: "Activation Compte PayTech")  
**Support:** +221 77 125 57 99  
**Délai:** 48 heures maximum

---

## 🌐 ENDPOINTS API

### 1. Demande de Paiement

**Endpoint:**
```
POST /payment/request-payment
```

**Utilisation:**
```javascript
fetch('https://paytech.sn/api/payment/request-payment', {
  method: 'POST',
  headers: {
    'API_KEY': 'votre_cle_api',
    'API_SECRET': 'votre_cle_secrete',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    item_name: "Rechargement ONE SMS",
    item_price: 5000,
    currency: "XOF",
    ref_command: "CMD_1735234567890",
    command_name: "Rechargement crédits",
    env: "test", // ou "prod"
    ipn_url: "https://votre-domaine.com/functions/v1/paytech-ipn",
    success_url: "https://votre-domaine.com/transactions?status=success",
    cancel_url: "https://votre-domaine.com/transactions?status=cancelled"
  })
})
```

### 2. Vérification Statut Paiement

**Endpoint:**
```
GET /payment/get-status?token_payment={token}
```

### 3. API Transfer (Optionnel)

**Endpoint:**
```
POST /transfer/transferFund
```

### 4. API Remboursement

**Endpoint:**
```
POST /payment/refund-payment
```

---

## 💳 DEMANDE DE PAIEMENT

### Paramètres Requis

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `item_name` | string | ✅ | Nom du produit/service |
| `item_price` | number | ✅ | Prix en FCFA (XOF) |
| `ref_command` | string | ✅ | Référence unique de la commande |
| `command_name` | string | ✅ | Description de la commande |
| `currency` | string | ❌ | Devise (XOF, EUR, USD). **Défaut:** XOF |
| `env` | string | ❌ | Environnement (test, prod). **Défaut:** prod |
| `ipn_url` | string | ⚠️ | URL de notification (HTTPS uniquement) |
| `success_url` | string | ❌ | URL après paiement réussi |
| `cancel_url` | string | ❌ | URL après annulation |
| `custom_field` | string (JSON) | ❌ | Données additionnelles (JSON encodé) |
| `target_payment` | string | ❌ | Méthode ciblée (ex: "Orange Money") |

⚠️ **IMPORTANT:** `ipn_url` est CRITIQUE pour recevoir les notifications de paiement

### Méthodes de Paiement Disponibles

```
- Orange Money
- Orange Money CI
- Orange Money ML
- Mtn Money CI
- Moov Money CI
- Moov Money ML
- Wave
- Wave CI
- Wizall
- Carte Bancaire
- Emoney
- Tigo Cash
- Free Money
- Moov Money BJ
- Mtn Money BJ
```

**Utilisation:**
```javascript
// Méthode unique (permet pré-remplissage)
target_payment: "Orange Money"

// Plusieurs méthodes (pas de pré-remplissage)
target_payment: "Orange Money, Wave, Free Money"
```

### Réponse API (Succès)

```json
{
  "success": 1,
  "token": "40j515fgrkynl56hi",
  "redirect_url": "https://paytech.sn/payment/checkout/40j515fgrkynl56hi",
  "redirectUrl": "https://paytech.sn/payment/checkout/40j515fgrkynl56hi"
}
```

**Action:** Rediriger le client vers `redirect_url`

### Réponse API (Erreur)

```json
{
  "success": 0,
  "message": "Description de l'erreur"
}
```

ou

```json
{
  "success": -1,
  "message": "Le vendeur n'existe pas ou clé api invalide"
}
```

### Exemple Complet (Node.js/Vite)

```javascript
import axios from 'axios';

const API_KEY = import.meta.env.VITE_PAYTECH_API_KEY;
const API_SECRET = import.meta.env.VITE_PAYTECH_API_SECRET;
const ENV = import.meta.env.VITE_PAYTECH_ENV || 'test';

const requestPayment = async (amount, userId) => {
  const ref = `RECHARGE_${userId}_${Date.now()}`;
  
  try {
    const { data } = await axios.post(
      'https://paytech.sn/api/payment/request-payment',
      {
        item_name: 'Rechargement crédits ONE SMS',
        item_price: amount,
        currency: 'XOF',
        ref_command: ref,
        command_name: `Rechargement de ${amount} XOF`,
        env: ENV,
        ipn_url: import.meta.env.VITE_PAYTECH_IPN_URL,
        success_url: import.meta.env.VITE_PAYTECH_SUCCESS_URL,
        cancel_url: import.meta.env.VITE_PAYTECH_CANCEL_URL,
        custom_field: JSON.stringify({ user_id: userId, type: 'recharge' })
      },
      {
        headers: {
          'API_KEY': API_KEY,
          'API_SECRET': API_SECRET,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (data.success === 1) {
      // Redirection vers PayTech
      window.location.href = data.redirect_url;
    } else {
      throw new Error(data.message || 'Erreur lors de la demande de paiement');
    }
  } catch (error) {
    console.error('PayTech request failed:', error);
    throw error;
  }
};
```

---

## 🔔 NOTIFICATIONS IPN

### Qu'est-ce qu'une IPN ?

**IPN = Instant Payment Notification**

Une requête POST envoyée par PayTech à votre serveur pour notifier:
- ✅ Paiement réussi (`sale_complete`)
- ❌ Paiement annulé (`sale_canceled`)
- 💰 Remboursement effectué (`refund_complete`)

### Configuration IPN URL

⚠️ **HTTPS UNIQUEMENT** - PayTech n'envoie pas sur HTTP

```javascript
ipn_url: "https://votredomaine.com/functions/v1/paytech-ipn"
```

### Paramètres Reçus (IPN)

| Paramètre | Type | Description |
|-----------|------|-------------|
| `type_event` | string | Type: `sale_complete`, `sale_canceled`, `refund_complete` |
| `ref_command` | string | Référence de la commande (même que dans demande) |
| `item_name` | string | Nom du produit |
| `item_price` | number | Prix final payé |
| `currency` | string | Devise (XOF, EUR, USD) |
| `token` | string | Token unique du paiement |
| `payment_method` | string | Méthode utilisée (Orange Money, Wave, etc.) |
| `client_phone` | string | Numéro du client (ex: "221772457199") |
| `custom_field` | string | Données JSON (encodé Base64) |
| `api_key_sha256` | string | Hash SHA256 de votre API_KEY |
| `api_secret_sha256` | string | Hash SHA256 de votre API_SECRET |
| `hmac_compute` | string | Signature HMAC-SHA256 pour vérification |

### Exemple Notification (sale_complete)

```json
{
  "type_event": "sale_complete",
  "ref_command": "RECHARGE_123_1735234567890",
  "item_name": "Rechargement crédits ONE SMS",
  "item_price": 5000,
  "currency": "XOF",
  "token": "4fe7bb6bedbd94689e89",
  "payment_method": "Orange Money",
  "client_phone": "221772457199",
  "custom_field": "eyJ1c2VyX2lkIjogMTIzLCAidHlwZSI6ICJyZWNoYXJnZSJ9",
  "api_key_sha256": "dacbde6382f4bf6ecf4dcec0624712abec1c02b7e5514dad23fdf1242c70d9b5",
  "api_secret_sha256": "91b1ae073d5edd8f3d71ac2fb88c90018c70c9b30993513de15b1757958ab0d3",
  "hmac_compute": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
}
```

### Traitement IPN (Edge Function)

```typescript
// Deno Edge Function (Supabase)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const ipnData = await req.json();
    
    // 1. Vérifier signature
    const apiKey = Deno.env.get('PAYTECH_API_KEY');
    const apiSecret = Deno.env.get('PAYTECH_API_SECRET');
    
    const expectedKeyHash = createHmac('sha256', '').update(apiKey).digest('hex');
    const expectedSecretHash = createHmac('sha256', '').update(apiSecret).digest('hex');
    
    if (ipnData.api_key_sha256 !== expectedKeyHash || 
        ipnData.api_secret_sha256 !== expectedSecretHash) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
    }
    
    // 2. Trouver transaction
    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('payment_ref', ipnData.ref_command)
      .single();
    
    if (!transaction) {
      return new Response(JSON.stringify({ error: 'Transaction not found' }), { status: 404 });
    }
    
    // 3. Mettre à jour statut
    const newStatus = ipnData.type_event === 'sale_complete' ? 'completed' : 'failed';
    
    await supabase
      .from('transactions')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', transaction.id);
    
    // 4. Ajouter crédits si succès
    if (newStatus === 'completed') {
      await supabase.rpc('add_credits', {
        p_user_id: transaction.user_id,
        p_amount: transaction.amount,
        p_type: 'recharge',
        p_transaction_id: transaction.id,
        p_description: `Rechargement via PayTech - ${ipnData.ref_command}`
      });
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('IPN error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

---

## 🔐 VÉRIFICATION DE SÉCURITÉ

PayTech propose **2 méthodes** de vérification:

### Méthode 1: HMAC-SHA256 (Recommandée)

**Formule pour paiements:**
```
Message = item_price|ref_command|api_key
HMAC = HMAC-SHA256(Message, api_secret)
```

**Vérification:**
```javascript
import CryptoJS from 'crypto-js';

const verifyHMAC = (ipnData, apiKey, apiSecret) => {
  const message = `${ipnData.item_price}|${ipnData.ref_command}|${apiKey}`;
  const expectedHmac = CryptoJS.HmacSHA256(message, apiSecret).toString();
  
  return expectedHmac === ipnData.hmac_compute;
};
```

**Exemple Deno (Edge Function):**
```typescript
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';

const message = `${ipnData.item_price}|${ipnData.ref_command}|${apiKey}`;
const expectedHmac = createHmac('sha256', apiSecret).update(message).digest('hex');

if (expectedHmac !== ipnData.hmac_compute) {
  return new Response('Invalid HMAC', { status: 401 });
}
```

### Méthode 2: SHA256 (Classique)

**Vérification:**
```javascript
import CryptoJS from 'crypto-js';

const verifySHA256 = (ipnData, apiKey, apiSecret) => {
  const expectedKeyHash = CryptoJS.SHA256(apiKey).toString();
  const expectedSecretHash = CryptoJS.SHA256(apiSecret).toString();
  
  return (
    expectedKeyHash === ipnData.api_key_sha256 &&
    expectedSecretHash === ipnData.api_secret_sha256
  );
};
```

**Exemple Deno:**
```typescript
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';

const expectedKeyHash = createHmac('sha256', '').update(apiKey).digest('hex');
const expectedSecretHash = createHmac('sha256', '').update(apiSecret).digest('hex');

if (ipnData.api_key_sha256 !== expectedKeyHash || 
    ipnData.api_secret_sha256 !== expectedSecretHash) {
  return new Response('Invalid signature', { status: 401 });
}
```

⚠️ **CRITIQUE:** Toujours vérifier la signature avant de traiter l'IPN

---

## 🌍 ENVIRONNEMENTS

### Mode Test (Sandbox)

**Configuration:**
```javascript
env: "test"
```

**Caractéristiques:**
- ✅ Disponible immédiatement (sans validation)
- 💰 Montant débité: **100-150 FCFA aléatoire** (peu importe montant transaction)
- 🚫 NE PAS utiliser en production publique
- ⚙️ Pour développement et tests internes uniquement

**Exemple:**
```javascript
const paymentData = {
  item_name: "Test Rechargement",
  item_price: 5000,          // Facturé 5000 XOF
  // Mais client paiera 100-150 XOF aléatoire en test
  env: "test"
};
```

### Mode Production

**Configuration:**
```javascript
env: "prod"
```

**Caractéristiques:**
- 💰 Montant débité: **Montant exact de la transaction**
- ✅ Requiert validation manuelle du compte
- 📄 Documents requis (voir section Activation Production)
- ⏱️ Délai: 48h maximum

**Activation:**
1. Envoyer email à contact@paytech.sn
2. Objet: "Activation Compte PayTech"
3. Joindre documents
4. Attendre confirmation (48h max)

⚠️ **ERREUR si compte non activé:**
```json
{
  "success": 0,
  "message": "Votre compte n'est pas activé pour la production. Veuillez contacter le support."
}
```

---

## ⚠️ CODES D'ERREUR

| Code | Message | Solution |
|------|---------|----------|
| `success: 1` | ✅ Succès | Continuer avec `redirect_url` |
| `success: 0` | ❌ Erreur générale | Vérifier `message` pour détails |
| `success: -1` | 🔑 Clés API invalides | Vérifier `API_KEY` et `API_SECRET` |
| 401 | ❌ Unauthorized | Clés API manquantes ou incorrectes |
| 403 | 🚫 Forbidden | Compte non activé pour production |
| 404 | 🔍 Not Found | Endpoint incorrect |
| 500 | 🔥 Server Error | Erreur côté PayTech (réessayer) |

---

## ✅ CHECKLIST D'INTÉGRATION

### Frontend (Vite/React)

- [ ] **1. Configuration .env**
  ```bash
  VITE_PAYTECH_API_KEY=votre_cle_api
  VITE_PAYTECH_API_SECRET=votre_cle_secrete
  VITE_PAYTECH_ENV=test  # ou prod
  VITE_PAYTECH_IPN_URL=https://votredomaine.com/functions/v1/paytech-ipn
  VITE_PAYTECH_SUCCESS_URL=https://votredomaine.com/transactions?status=success
  VITE_PAYTECH_CANCEL_URL=https://votredomaine.com/transactions?status=cancelled
  ```

- [ ] **2. API Client (src/lib/api/paytech.ts)**
  ```typescript
  import axios from 'axios';
  
  const apiPaytech = axios.create({
    baseURL: 'https://paytech.sn/api',
    headers: {
      'API_KEY': import.meta.env.VITE_PAYTECH_API_KEY,
      'API_SECRET': import.meta.env.VITE_PAYTECH_API_SECRET,
      'Content-Type': 'application/json'
    }
  });
  
  export const requestPayment = async (payment, ipnUrl, successUrl, cancelUrl) => {
    const { data } = await apiPaytech.post('/payment/request-payment', {
      ...payment,
      env: import.meta.env.VITE_PAYTECH_ENV,
      ipn_url: ipnUrl,
      success_url: successUrl,
      cancel_url: cancelUrl
    });
    return data;
  };
  ```

- [ ] **3. Mutation Rechargement**
  ```typescript
  const rechargeMutation = useMutation({
    mutationFn: async (amount) => {
      const ref = `RECHARGE_${user.id}_${Date.now()}`;
      
      const payment = await paytech.requestPayment(
        {
          item_name: 'Rechargement crédits ONE SMS',
          item_price: amount,
          currency: 'XOF',
          ref_command: ref,
          command_name: `Rechargement de ${amount} XOF`
        },
        import.meta.env.VITE_PAYTECH_IPN_URL,
        import.meta.env.VITE_PAYTECH_SUCCESS_URL,
        import.meta.env.VITE_PAYTECH_CANCEL_URL
      );
      
      // Créer transaction dans Supabase
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'recharge',
        amount: amount,
        status: 'pending',
        payment_method: 'paytech',
        payment_ref: ref
      });
      
      return payment;
    },
    onSuccess: (payment) => {
      if (!payment.redirect_url) {
        throw new Error('No redirect URL from PayTech');
      }
      window.location.href = payment.redirect_url;
    }
  });
  ```

### Backend (Supabase Edge Function)

- [ ] **4. Edge Function IPN (supabase/functions/paytech-ipn/index.ts)**
  ```typescript
  import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
  import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';
  
  serve(async (req) => {
    // 1. CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }
    
    // 2. Vérifier signature
    const ipnData = await req.json();
    const apiKey = Deno.env.get('PAYTECH_API_KEY');
    const apiSecret = Deno.env.get('PAYTECH_API_SECRET');
    
    const expectedKeyHash = createHmac('sha256', '').update(apiKey).digest('hex');
    const expectedSecretHash = createHmac('sha256', '').update(apiSecret).digest('hex');
    
    if (ipnData.api_key_sha256 !== expectedKeyHash || 
        ipnData.api_secret_sha256 !== expectedSecretHash) {
      return new Response('Invalid signature', { status: 401 });
    }
    
    // 3. Traiter paiement
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );
    
    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('payment_ref', ipnData.ref_command)
      .single();
    
    if (!transaction) {
      return new Response('Transaction not found', { status: 404 });
    }
    
    const newStatus = ipnData.type_event === 'sale_complete' ? 'completed' : 'failed';
    
    await supabase
      .from('transactions')
      .update({ status: newStatus })
      .eq('id', transaction.id);
    
    if (newStatus === 'completed') {
      await supabase.rpc('add_credits', {
        p_user_id: transaction.user_id,
        p_amount: transaction.amount,
        p_type: 'recharge',
        p_transaction_id: transaction.id
      });
    }
    
    return new Response('IPN OK', { status: 200 });
  });
  ```

- [ ] **5. Variables Environnement Supabase**
  ```bash
  # Dans Supabase Dashboard → Edge Functions → Environment Variables
  PAYTECH_API_KEY=same_as_frontend
  PAYTECH_API_SECRET=same_as_frontend
  ```

- [ ] **6. Déployer Edge Function**
  ```bash
  supabase functions deploy paytech-ipn
  ```

### Configuration Production

- [ ] **7. Domaine Production**
  - Remplacer `yourdomain.com` par domaine réel
  - Vérifier HTTPS actif
  - Tester IPN URL accessible publiquement

- [ ] **8. Webhook PayTech Dashboard**
  - Se connecter à https://paytech.sn/dashboard
  - Aller dans Paramètres → Webhook
  - Ajouter: `https://votredomaine.com/functions/v1/paytech-ipn`

- [ ] **9. Activation Compte Production**
  - Envoyer email à contact@paytech.sn
  - Joindre documents requis
  - Attendre validation (48h)

- [ ] **10. Test Complet**
  - Mode test: Transaction 100-150 FCFA
  - Vérifier IPN reçu
  - Vérifier crédits ajoutés
  - Mode prod: Transaction montant exact

---

## 📞 SUPPORT

**Email:** contact@paytech.sn  
**Téléphone:** +221 77 125 57 99  
**Documentation:** https://docs.intech.sn/doc_paytech.php  
**Dashboard:** https://paytech.sn/dashboard

---

## 🔗 RESSOURCES ADDITIONNELLES

- **Postman Collection:** https://doc.intech.sn/PayTech%20x%20DOC.postman_collection.json
- **PDF Résumé Java:** https://doc.intech.sn/PayTech.pdf
- **SDK PHP:** https://doc.intech.sn/downloads/sdk/paytech_php.zip
- **Laravel Package:** https://github.com/touskar/laravel-paytech
- **Flutter Package:** https://pub.dev/packages/paytech

---

## 📝 NOTES IMPORTANTES

1. ⚠️ **CORS désactivé** - Ne jamais appeler API PayTech depuis frontend (sauf si proxy)
2. 🔐 **Clés secrètes** - Toujours utiliser variables environnement
3. 🔔 **IPN obligatoire** - Sans IPN, pas de notification de paiement
4. 🌐 **HTTPS requis** - PayTech n'envoie IPN que sur HTTPS
5. ✅ **Vérifier signature** - Toujours valider `api_key_sha256` et `api_secret_sha256`
6. 💰 **Mode Test** - Client paie 100-150 FCFA peu importe montant transaction
7. 📱 **Mobile URLs** - Flutter: `success_url: https://paytech.sn/mobile/success`

---

**Dernière révision:** Janvier 2025  
**Maintenu par:** ONE SMS V1 Team  
**Basé sur:** Documentation officielle PayTech
