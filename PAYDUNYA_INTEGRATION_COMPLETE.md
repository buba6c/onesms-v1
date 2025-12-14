# 🚀 INTÉGRATION PAYDUNYA - DOCUMENTATION COMPLÈTE ONE SMS

> **Analyse intelligente de la documentation PayDunya pour l'intégration dans ONE SMS**  
> Date: 8 Décembre 2025  
> Analyse: Deep Documentation Review

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Configuration initiale](#configuration-initiale)
3. [Choix de l'API recommandée](#choix-de-lapi-recommandée)
4. [API PAR - Paiement Avec Redirection](#api-par---paiement-avec-redirection)
5. [API PUSH - Envoi d'argent](#api-push---envoi-dargent)
6. [Implémentation technique](#implémentation-technique)
7. [Webhooks et IPN](#webhooks-et-ipn)
8. [Gestion des erreurs](#gestion-des-erreurs)
9. [Migration de Paytech vers PayDunya](#migration-de-paytech-vers-paydunya)

---

## 🎯 VUE D'ENSEMBLE

### Pourquoi PayDunya pour ONE SMS ?

**Avantages clés :**
- ✅ **19 opérateurs Mobile Money** supportés (vs 6 pour Paytech)
- ✅ **Wave Sénégal** inclus (très demandé au Sénégal)
- ✅ **API PUSH** pour débourser directement aux utilisateurs
- ✅ **Mode test robuste** avec comptes fictifs
- ✅ **IPN avancé** pour notifications instantanées
- ✅ **API de redistribution** (PER) pour partager les revenus

**Cas d'usage ONE SMS :**
1. **Recharge wallet** : API PAR (redirection PayDunya)
2. **Paiement services SMS** : API PAR
3. **Remboursements automatiques** : API PUSH
4. **Redistribution partenaires** : API PER

---

## ⚙️ CONFIGURATION INITIALE

### 1. Création compte PayDunya Business

```bash
# Étapes
1. Créer compte : https://paydunya.com/signup
2. Se connecter : https://paydunya.com/login
3. Menu → "Intégrez notre API"
4. Créer nouvelle application : https://paydunya.com/integration-setups/create
```

### 2. Génération des clés API

**Clés nécessaires :**
```json
{
  "PAYDUNYA_MASTER_KEY": "wQzk9ZwR-Qq9m-0hD0-zpud-je5coGC3FHKW",
  "PAYDUNYA_PRIVATE_KEY": "test_private_rMIdJM3PLLhLjyArx9tF3VURAF5",
  "PAYDUNYA_TOKEN": "IivOiOxGJuWhc5znlIiK",
  "PAYDUNYA_MODE": "test" // ou "live"
}
```

**⚠️ IMPORTANT :**
- **Mode TEST** : Toujours tester en mode test d'abord
- **Comptes fictifs** : Créer des clients de test avec solde fictif
- **Passage en production** : Changer `MODE TEST` → `PRODUCTION` dans le dashboard

### 3. Configuration dans ONE SMS

**Variables d'environnement (.env) :**
```bash
# PayDunya Configuration
PAYDUNYA_MASTER_KEY=your_master_key_here
PAYDUNYA_PRIVATE_KEY=your_private_key_here
PAYDUNYA_TOKEN=your_token_here
PAYDUNYA_MODE=test
PAYDUNYA_CALLBACK_URL=https://onesms-sn.com/api/paydunya/callback
PAYDUNYA_RETURN_URL=https://onesms-sn.com/payment/success
PAYDUNYA_CANCEL_URL=https://onesms-sn.com/payment/cancel
```

---

## 🔍 CHOIX DE L'API RECOMMANDÉE

### Tableau comparatif des 3 APIs

| Critère | API PAR | API PSR | SoftPay |
|---------|---------|---------|---------|
| **Redirection** | ✅ Oui (vers PayDunya) | ❌ Non (iframe) | ❌ Non |
| **Complexité** | 🟢 Facile | 🟡 Moyenne | 🔴 Difficile |
| **Maintenance** | PayDunya | PayDunya | Marchand |
| **Moyens paiement** | Tous automatiques | Tous dans iframe | One-to-one endpoint |
| **Recommandé pour** | 99% des cas | UX avancée | Solution custom |
| **Plugins dispo** | ✅ Nombreux | ✅ Quelques-uns | ❌ Aucun |

### 🎯 RECOMMANDATION POUR ONE SMS : **API PAR**

**Raisons :**
1. **Simplicité** : Moins de code à maintenir
2. **Sécurité** : Page de paiement gérée par PayDunya
3. **Évolutivité** : Nouveaux moyens de paiement ajoutés automatiquement
4. **Conformité PCI-DSS** : PayDunya gère la conformité
5. **Support** : Meilleure documentation et support

---

## 💳 API PAR - PAIEMENT AVEC REDIRECTION

### Architecture du flux

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────→│  ONE SMS    │────→│  PayDunya   │
│ (utilisateur)│     │  (Backend)  │     │  (Checkout) │
└─────────────┘     └─────────────┘     └─────────────┘
       ↑                                        │
       │                                        │
       └────────────────────────────────────────┘
              Retour après paiement
```

### Étapes d'implémentation

#### 1. Création de l'invoice (Backend)

**Endpoint : `POST /api/recharge/paydunya/create`**

```typescript
// src/services/paydunya.service.ts
import axios from 'axios'

interface PayDunyaInvoice {
  invoice: {
    total_amount: number
    description: string
    customer?: {
      name: string
      email: string
      phone: string
    }
    channels?: string[]
  }
  store: {
    name: string
    logo_url?: string
    website_url?: string
  }
  custom_data?: Record<string, any>
  actions?: {
    cancel_url?: string
    return_url?: string
    callback_url?: string
  }
}

export class PayDunyaService {
  private baseUrl = process.env.PAYDUNYA_MODE === 'live'
    ? 'https://app.paydunya.com/api/v1'
    : 'https://app.paydunya.com/sandbox-api/v1'
  
  private headers = {
    'Content-Type': 'application/json',
    'PAYDUNYA-MASTER-KEY': process.env.PAYDUNYA_MASTER_KEY,
    'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY,
    'PAYDUNYA-TOKEN': process.env.PAYDUNYA_TOKEN,
  }

  async createInvoice(
    userId: string,
    amount: number,
    userEmail: string,
    userName: string,
    userPhone: string
  ) {
    const invoiceData: PayDunyaInvoice = {
      invoice: {
        total_amount: amount,
        description: `Recharge ONE SMS - ${amount} FCFA`,
        customer: {
          name: userName,
          email: userEmail,
          phone: userPhone, // Sans code pays: 771234567
        },
        // Restreindre aux opérateurs sénégalais
        channels: [
          'orange-money-senegal',
          'wave-senegal',
          'free-money-senegal',
          'expresso-sn',
          'wizall-senegal',
          'card', // Carte bancaire
        ],
      },
      store: {
        name: 'ONE SMS',
        logo_url: 'https://onesms-sn.com/logo.png',
        website_url: 'https://onesms-sn.com',
      },
      custom_data: {
        user_id: userId,
        transaction_type: 'recharge',
        platform: 'web',
        timestamp: new Date().toISOString(),
      },
      actions: {
        cancel_url: process.env.PAYDUNYA_CANCEL_URL,
        return_url: process.env.PAYDUNYA_RETURN_URL,
        callback_url: process.env.PAYDUNYA_CALLBACK_URL,
      },
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/checkout-invoice/create`,
        invoiceData,
        { headers: this.headers }
      )

      // Réponse attendue
      if (response.data.response_code === '00') {
        return {
          success: true,
          checkoutUrl: response.data.response_text, // URL de redirection
          token: response.data.token, // Token unique de la facture
        }
      } else {
        throw new Error(response.data.response_text)
      }
    } catch (error) {
      console.error('PayDunya create invoice error:', error)
      throw error
    }
  }

  async checkInvoiceStatus(token: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/checkout-invoice/confirm/${token}`,
        { headers: this.headers }
      )

      if (response.data.response_code === '00') {
        return {
          success: true,
          status: response.data.invoice.status, // pending, completed, cancelled, failed
          invoice: response.data.invoice,
          customer: response.data.customer,
          customData: response.data.custom_data,
          receiptUrl: response.data.receipt_url,
        }
      }
    } catch (error) {
      console.error('PayDunya check status error:', error)
      throw error
    }
  }
}
```

#### 2. Route API Express/Supabase Edge Function

**Option A : Supabase Edge Function**
```typescript
// supabase/functions/paydunya-create-invoice/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, userId } = await req.json()
    
    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    )
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Récupérer infos utilisateur
    const { data: profile } = await supabase
      .from('users')
      .select('email, phone')
      .eq('id', user.id)
      .single()

    // Créer invoice PayDunya
    const invoiceData = {
      invoice: {
        total_amount: amount,
        description: `Recharge ONE SMS - ${amount} FCFA`,
        customer: {
          name: user.email?.split('@')[0] || 'Client',
          email: profile?.email || user.email,
          phone: profile?.phone || '',
        },
        channels: [
          'orange-money-senegal',
          'wave-senegal',
          'free-money-senegal',
          'card',
        ],
      },
      store: {
        name: 'ONE SMS',
        website_url: 'https://onesms-sn.com',
      },
      custom_data: {
        user_id: user.id,
        transaction_type: 'recharge',
      },
      actions: {
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/paydunya-callback`,
        return_url: 'https://onesms-sn.com/payment/success',
        cancel_url: 'https://onesms-sn.com/payment/cancel',
      },
    }

    const response = await fetch(
      'https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'PAYDUNYA-MASTER-KEY': Deno.env.get('PAYDUNYA_MASTER_KEY') ?? '',
          'PAYDUNYA-PRIVATE-KEY': Deno.env.get('PAYDUNYA_PRIVATE_KEY') ?? '',
          'PAYDUNYA-TOKEN': Deno.env.get('PAYDUNYA_TOKEN') ?? '',
        },
        body: JSON.stringify(invoiceData),
      }
    )

    const result = await response.json()

    if (result.response_code === '00') {
      // Logger la transaction
      await supabase.from('payment_transactions').insert({
        user_id: user.id,
        provider: 'paydunya',
        amount: amount,
        status: 'pending',
        provider_token: result.token,
        checkout_url: result.response_text,
      })

      return new Response(
        JSON.stringify({
          success: true,
          checkoutUrl: result.response_text,
          token: result.token,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      throw new Error(result.response_text)
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

#### 3. Frontend React - Initier le paiement

```typescript
// src/pages/TopUpPage.tsx
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TopUpPage() {
  const [amount, setAmount] = useState(5000)
  const [loading, setLoading] = useState(false)

  const handlePayDunyaPayment = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paydunya-create-invoice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ amount }),
        }
      )

      const result = await response.json()

      if (result.success) {
        // Rediriger vers la page de paiement PayDunya
        window.location.href = result.checkoutUrl
      } else {
        alert('Erreur lors de la création du paiement')
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Recharger mon compte</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Montant (FCFA)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min={500}
            step={500}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <button
          onClick={handlePayDunyaPayment}
          disabled={loading || amount < 500}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Chargement...' : `Payer ${amount} FCFA`}
        </button>

        <div className="text-sm text-gray-600">
          <p className="font-medium mb-2">Moyens de paiement acceptés :</p>
          <ul className="space-y-1">
            <li>✓ Orange Money</li>
            <li>✓ Wave</li>
            <li>✓ Free Money</li>
            <li>✓ E-Money (Expresso)</li>
            <li>✓ Wizall</li>
            <li>✓ Carte bancaire</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
```

---

## 📡 WEBHOOKS ET IPN (INSTANT PAYMENT NOTIFICATION)

### Pourquoi l'IPN est crucial ?

**Problème sans IPN :**
- Le client paye sur son téléphone → délai réseau → timeout côté site
- Le site pense que le paiement a échoué alors qu'il est validé
- Double paiement ou crédit non appliqué

**Solution avec IPN :**
- PayDunya envoie une notification POST à votre serveur
- Traitement asynchrone en background
- Garantit que tous les paiements sont comptabilisés

### Implémentation du webhook

```typescript
// supabase/functions/paydunya-callback/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from 'https://deno.land/std@0.177.0/node/crypto.ts'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // PayDunya envoie les données en application/x-www-form-urlencoded
    const formData = await req.formData()
    const dataString = formData.get('data')
    
    if (!dataString) {
      throw new Error('No data received')
    }

    // Parser les données
    const paymentData = JSON.parse(dataString as string)
    
    // ⚠️ SÉCURITÉ : Vérifier le hash
    const receivedHash = paymentData.hash
    const masterKey = Deno.env.get('PAYDUNYA_MASTER_KEY') ?? ''
    const expectedHash = createHash('sha512').update(masterKey).digest('hex')
    
    if (receivedHash !== expectedHash) {
      console.error('Invalid hash - possible fraud attempt')
      return new Response('Invalid signature', { status: 403 })
    }

    // Extraire les données importantes
    const {
      invoice,
      custom_data,
      customer,
    } = paymentData

    const status = invoice.status // 'completed', 'cancelled', 'failed'
    const token = invoice.token
    const totalAmount = invoice.total_amount
    const userId = custom_data.user_id

    console.log('PayDunya callback received:', {
      status,
      token,
      amount: totalAmount,
      userId,
    })

    // Connexion Supabase avec service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Mettre à jour la transaction
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        status: status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        payment_data: paymentData,
      })
      .eq('provider_token', token)

    if (updateError) {
      console.error('Update transaction error:', updateError)
      throw updateError
    }

    // Si paiement réussi, créditer le wallet
    if (status === 'completed') {
      // 1. Récupérer l'utilisateur
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('balance')
        .eq('id', userId)
        .single()

      if (userError) throw userError

      // 2. Ajouter au solde
      const newBalance = (user.balance || 0) + totalAmount

      const { error: balanceError } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', userId)

      if (balanceError) throw balanceError

      // 3. Logger la transaction
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'recharge',
        amount: totalAmount,
        status: 'completed',
        provider: 'paydunya',
        provider_ref: token,
        metadata: {
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
        },
      })

      console.log(`✅ Wallet credited: ${userId} + ${totalAmount} FCFA`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Callback processed' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Callback error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### Structure des données IPN reçues

```typescript
interface PayDunyaIPNData {
  response_code: '00'
  response_text: 'Transaction Found'
  hash: string // SHA-512 du MASTER_KEY
  invoice: {
    token: string
    total_amount: number
    description: string
    status: 'completed' | 'cancelled' | 'failed' | 'pending'
    mode: 'test' | 'live'
    fail_reason?: string // Si failed ou cancelled
    items?: Record<string, any>
    taxes?: Record<string, any>
  }
  custom_data: {
    user_id: string
    transaction_type: string
    [key: string]: any
  }
  customer: {
    name: string
    phone: string
    email: string
  }
  actions: {
    cancel_url: string
    callback_url: string
    return_url: string
  }
  receipt_url: string // URL du reçu PDF
}
```

---

## 💸 API PUSH - ENVOI D'ARGENT (REMBOURSEMENTS)

### Cas d'usage dans ONE SMS

1. **Remboursements automatiques** : Service SMS annulé → remboursement client
2. **Payouts partenaires** : Partager revenus avec revendeurs
3. **Retrait wallet** : Permettre aux users de retirer leur solde

### Flux API PUSH

```
1. Initiation       2. Soumission      3. Vérification
   (Get Invoice)       (Submit)           (Check Status)
        ↓                  ↓                    ↓
    Token créé      Token soumis         Status final
    status: created  status: pending      status: success/failed
```

### Implémentation complète

```typescript
// src/services/paydunya-push.service.ts
export class PayDunyaPushService {
  private baseUrl = 'https://app.paydunya.com/api/v2/disburse'
  
  private headers = {
    'Content-Type': 'application/json',
    'PAYDUNYA-MASTER-KEY': process.env.PAYDUNYA_MASTER_KEY,
    'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY,
    'PAYDUNYA-TOKEN': process.env.PAYDUNYA_TOKEN,
  }

  // Étape 1 : Créer l'invoice de déboursement
  async createDisburseInvoice(
    phoneNumber: string, // Sans code pays: 771234567
    amount: number,
    operator: 'orange-money-senegal' | 'wave-senegal' | 'free-money-senegal',
    callbackUrl: string
  ) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/get-invoice`,
        {
          account_alias: phoneNumber,
          amount: amount,
          withdraw_mode: operator,
          callback_url: callbackUrl,
        },
        { headers: this.headers }
      )

      if (response.data.response_code === '00') {
        return {
          success: true,
          token: response.data.disburse_token,
          status: 'created',
        }
      } else {
        throw new Error(response.data.response_text)
      }
    } catch (error) {
      console.error('Create disburse error:', error)
      throw error
    }
  }

  // Étape 2 : Soumettre le déboursement
  async submitDisburse(
    token: string,
    disbureId?: string // Optionnel : votre ref unique
  ) {
    try {
      const payload: any = { disburse_invoice: token }
      if (disbureId) payload.disburse_id = disbureId

      const response = await axios.post(
        `${this.baseUrl}/submit-invoice`,
        payload,
        { headers: this.headers }
      )

      if (response.data.response_code === '00') {
        return {
          success: true,
          status: response.data.status, // 'success', 'pending', 'failed'
          transactionId: response.data.transaction_id,
          providerRef: response.data.provider_ref,
          message: response.data.description,
        }
      } else {
        throw new Error(response.data.response_text)
      }
    } catch (error) {
      console.error('Submit disburse error:', error)
      throw error
    }
  }

  // Étape 3 : Vérifier le statut
  async checkDisburseStatus(token: string) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/check-status`,
        { disburse_invoice: token },
        { headers: this.headers }
      )

      if (response.data.response_code === '00') {
        return {
          success: true,
          status: response.data.status,
          transactionId: response.data.transaction_id,
          amount: response.data.amount,
          withdrawMode: response.data.withdraw_mode,
          updatedAt: response.data.updated_at,
        }
      }
    } catch (error) {
      console.error('Check status error:', error)
      throw error
    }
  }

  // Méthode complète : Tout en un
  async refundUser(
    userId: string,
    phoneNumber: string,
    amount: number,
    operator: string,
    reason: string
  ) {
    try {
      // 1. Créer l'invoice
      const invoice = await this.createDisburseInvoice(
        phoneNumber,
        amount,
        operator as any,
        `${process.env.VITE_SUPABASE_URL}/functions/v1/paydunya-disburse-callback`
      )

      if (!invoice.success) throw new Error('Failed to create invoice')

      // 2. Logger dans la DB
      const { data: refund } = await supabase
        .from('refunds')
        .insert({
          user_id: userId,
          amount: amount,
          provider: 'paydunya',
          provider_token: invoice.token,
          phone_number: phoneNumber,
          operator: operator,
          status: 'created',
          reason: reason,
        })
        .select()
        .single()

      // 3. Soumettre le déboursement
      const submit = await this.submitDisburse(invoice.token, refund.id)

      // 4. Mettre à jour le statut
      await supabase
        .from('refunds')
        .update({
          status: submit.status,
          transaction_id: submit.transactionId,
          provider_ref: submit.providerRef,
        })
        .eq('id', refund.id)

      return {
        success: true,
        refundId: refund.id,
        status: submit.status,
        message: submit.message,
      }
    } catch (error) {
      console.error('Refund error:', error)
      throw error
    }
  }
}
```

### Gestion des statuts asynchrones

```typescript
// supabase/functions/paydunya-disburse-callback/index.ts
serve(async (req) => {
  try {
    const formData = await req.formData()
    const data = JSON.parse(formData.get('data') as string)

    const {
      status,
      token,
      transaction_id,
      amount,
      disburse_id,
    } = data

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Mettre à jour le remboursement
    await supabase
      .from('refunds')
      .update({
        status: status,
        transaction_id: transaction_id,
        completed_at: status === 'success' ? new Date().toISOString() : null,
      })
      .eq('provider_token', token)

    // Si succès, notifier l'utilisateur
    if (status === 'success') {
      // TODO: Envoyer notification email/SMS
      console.log(`✅ Refund successful: ${amount} FCFA to token ${token}`)
    }

    return new Response(JSON.stringify({ success: true }))
  } catch (error) {
    console.error('Disburse callback error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
```

---

## 🚨 GESTION DES ERREURS

### Codes d'erreur PayDunya

| Code | Signification | Action |
|------|---------------|--------|
| `00` | ✅ Succès | Continuer |
| `401` | Initiation non autorisée | Vérifier clés API |
| `1001` | withdraw_mode non supporté | Corriger l'opérateur |
| `4002` | Solde insuffisant | Recharger compte PayDunya |
| `5000` | Service en maintenance | Réessayer plus tard |

### Statuts de transaction

**Paiement (API PAR) :**
- `pending` → En attente (client n'a pas encore payé)
- `completed` → ✅ Paiement réussi
- `cancelled` → ❌ Annulé par le client
- `failed` → ❌ Échec technique

**Déboursement (API PUSH) :**
- `created` → Invoice créée, pas encore soumise
- `pending` → Soumis à l'opérateur, en traitement
- `success` → ✅ Déboursement réussi
- `failed` → ❌ Échec

### Stratégie de retry

```typescript
async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 2000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall()
    } catch (error) {
      if (attempt === maxRetries) throw error
      
      console.log(`Retry ${attempt}/${maxRetries} after ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 2 // Exponential backoff
    }
  }
  throw new Error('All retries failed')
}

// Usage
const result = await retryApiCall(() => 
  paydunyaService.createInvoice(userId, amount, email, name, phone)
)
```

---

## 🔄 MIGRATION DE PAYTECH VERS PAYDUNYA

### Comparaison des systèmes

| Aspect | Paytech | PayDunya |
|--------|---------|----------|
| Opérateurs | 6 | 19 |
| Wave | ❌ | ✅ |
| API Remboursement | ❌ | ✅ (PUSH) |
| Mode Test | Limité | Complet avec comptes fictifs |
| IPN | Oui | Oui (plus robuste) |
| Redistribution | ❌ | ✅ (PER) |

### Plan de migration progressif

**Phase 1 : Tests en parallèle (1 semaine)**
- ✅ Garder Paytech en production
- ✅ Activer PayDunya en mode test
- ✅ Tester tous les flux

**Phase 2 : Soft Launch (2 semaines)**
- ✅ PayDunya disponible comme option
- ✅ Paytech reste par défaut
- ✅ Monitoring des deux systèmes

**Phase 3 : Migration complète (1 semaine)**
- ✅ PayDunya devient le défaut
- ✅ Paytech en fallback
- ✅ Communication aux utilisateurs

**Phase 4 : Décommission Paytech (1 mois)**
- ✅ Désactiver Paytech
- ✅ Garder les logs historiques

### Code de migration

```typescript
// src/services/payment-gateway.service.ts
export class PaymentGatewayService {
  private paytechService = new PaytechService()
  private paydunyaService = new PayDunyaService()
  
  private readonly USE_PAYDUNYA = process.env.USE_PAYDUNYA === 'true'

  async createPayment(userId: string, amount: number) {
    // Migration progressive
    if (this.USE_PAYDUNYA) {
      return await this.paydunyaService.createInvoice(userId, amount, ...)
    } else {
      return await this.paytechService.createPayment(userId, amount)
    }
  }

  // Double logging pendant la migration
  async logTransaction(data: any) {
    await Promise.all([
      supabase.from('payment_transactions').insert(data),
      supabase.from('migration_logs').insert({
        provider: this.USE_PAYDUNYA ? 'paydunya' : 'paytech',
        transaction_data: data,
        timestamp: new Date().toISOString(),
      }),
    ])
  }
}
```

---

## 📊 TABLES BASE DE DONNÉES

### Schema Supabase recommandé

```sql
-- Table des transactions de paiement
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  provider TEXT NOT NULL, -- 'paytech' ou 'paydunya'
  provider_token TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'completed', 'cancelled', 'failed'
  checkout_url TEXT,
  payment_data JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_payment_user_id (user_id),
  INDEX idx_payment_status (status),
  INDEX idx_payment_provider_token (provider_token)
);

-- Table des remboursements
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  provider TEXT NOT NULL DEFAULT 'paydunya',
  provider_token TEXT UNIQUE NOT NULL,
  transaction_id TEXT,
  provider_ref TEXT,
  amount DECIMAL(10,2) NOT NULL,
  phone_number TEXT NOT NULL,
  operator TEXT NOT NULL,
  status TEXT NOT NULL, -- 'created', 'pending', 'success', 'failed'
  reason TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_refunds_user_id (user_id),
  INDEX idx_refunds_status (status)
);

-- Table des logs de migration
CREATE TABLE migration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  transaction_data JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own payments" ON payment_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users see own refunds" ON refunds
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manage payments" ON payment_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role manage refunds" ON refunds
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

---

## 🧪 TESTS ET DEBUGGING

### Comptes de test

**Créer dans le dashboard PayDunya :**
- Menu → Intégrez notre API → Clients fictifs
- Créer 3-4 comptes avec soldes différents:
  - Client A : 50 000 FCFA (tests normaux)
  - Client B : 5 000 FCFA (tests limite)
  - Client C : 100 FCFA (tests échec solde)

### Script de test complet

```typescript
// tests/paydunya.integration.test.ts
import { PayDunyaService } from '@/services/paydunya.service'

describe('PayDunya Integration', () => {
  const service = new PayDunyaService()
  
  test('Should create invoice and redirect', async () => {
    const result = await service.createInvoice(
      'test-user-id',
      5000,
      'test@example.com',
      'Test User',
      '771234567'
    )
    
    expect(result.success).toBe(true)
    expect(result.checkoutUrl).toContain('paydunya.com')
    expect(result.token).toBeTruthy()
  })
  
  test('Should check invoice status', async () => {
    const token = 'test_XXXXXXXX'
    const status = await service.checkInvoiceStatus(token)
    
    expect(status.success).toBe(true)
    expect(['pending', 'completed', 'cancelled']).toContain(status.status)
  })
  
  test('Should handle failed payment', async () => {
    // Simuler un paiement annulé
    const token = 'test_cancelled_invoice'
    const status = await service.checkInvoiceStatus(token)
    
    expect(status.status).toBe('cancelled')
    expect(status.invoice.fail_reason).toBeTruthy()
  })
})
```

### Monitoring en production

```typescript
// src/utils/payment-monitor.ts
export class PaymentMonitor {
  static async checkPendingPayments() {
    const supabase = createClient(...)
    
    // Récupérer tous les paiements en attente > 30 min
    const { data: pending } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
    
    for (const payment of pending || []) {
      try {
        const status = await paydunyaService.checkInvoiceStatus(
          payment.provider_token
        )
        
        if (status.status !== 'pending') {
          await supabase
            .from('payment_transactions')
            .update({ status: status.status })
            .eq('id', payment.id)
          
          console.log(`Updated payment ${payment.id} to ${status.status}`)
        }
      } catch (error) {
        console.error(`Error checking payment ${payment.id}:`, error)
      }
    }
  }
}

// Cron job (à configurer dans Supabase ou serveur)
setInterval(
  () => PaymentMonitor.checkPendingPayments(),
  5 * 60 * 1000 // Toutes les 5 minutes
)
```

---

## 📚 RESSOURCES ET SUPPORT

### Documentation officielle
- **Introduction** : https://developers.paydunya.com/doc/FR/introduction
- **API PAR** : https://developers.paydunya.com/doc/FR/http_json
- **API PUSH** : https://developers.paydunya.com/doc/FR/api_deboursement
- **Dashboard** : https://paydunya.com/integration-setups

### Support technique
- **Email** : tech@paydunya.com
- **Dashboard** : Support ticket dans l'interface
- **GitHub** : https://github.com/paydunyadev

### Checklist avant production

- [ ] Clés API de production générées
- [ ] Mode PRODUCTION activé dans le dashboard
- [ ] Webhook IPN testé avec ngrok/tunnel
- [ ] Tous les flux testés en mode test
- [ ] Monitoring des paiements pending mis en place
- [ ] Logs centralisés configurés
- [ ] Gestion d'erreurs robuste implémentée
- [ ] Double vérification des montants (éviter erreurs de calcul)
- [ ] Notifications email/SMS configurées
- [ ] Documentation interne à jour

---

## 🎯 RÉSUMÉ EXÉCUTIF

### Pour ONE SMS, voici le plan d'action recommandé :

**✅ Priorité 1 : API PAR pour les recharges**
- Implémentation : 2-3 jours
- Remplace Paytech progressivement
- Ajoute Wave comme moyen de paiement

**✅ Priorité 2 : Webhook IPN robuste**
- Implémentation : 1 jour
- Garantit que tous les paiements sont comptabilisés
- Évite les problèmes de timeout

**✅ Priorité 3 : API PUSH pour remboursements**
- Implémentation : 2 jours
- Automatise les remboursements
- Améliore satisfaction client

**⏭️ Future : API PER pour redistribution**
- Si partenariat revendeurs
- Partage automatique des revenus

**Temps total estimé : 1 semaine de développement**

---

**Document créé par : GitHub Copilot**  
**Pour : ONE SMS - Intégration PayDunya**  
**Version : 1.0**  
**Date : 8 Décembre 2025**

