# 🌊 FLUX PAIEMENT WAVE - Guide Complet

## 📋 FLUX UTILISATEUR

### Étape 1 : Sélection du montant

```
http://localhost:3001/topup
```

1. L'utilisateur sélectionne un montant (ex: 5000 FCFA)
2. Il choisit **Wave** comme moyen de paiement
3. Il clique sur **"Payer"**

### Étape 2 : Page de paiement

```
http://localhost:3001/wave-proof
```

L'utilisateur arrive sur une page avec **2 étapes** :

#### 🔵 Étape 1 : Effectuer le paiement

- **Montant affiché** : 5000 FCFA (exemple)
- **Bouton "Payer avec Wave"** : Ouvre le lien Wave dans un nouvel onglet
- L'utilisateur paie via l'app Wave
- Il revient sur la page

#### 🟢 Étape 2 : Soumettre la preuve

- **Instructions claires** :
  - Prenez une capture de votre reçu Wave
  - Montant visible
  - Date et heure lisibles
  - Statut "Réussi"
- **Upload de l'image** :
  - Formats : JPG, PNG
  - Max : 5MB
  - Preview avant envoi
- **Bouton "Envoyer la preuve"**

### Étape 3 : Confirmation

- Message de succès
- "Votre preuve a été envoyée"
- "Notre équipe va vérifier et créditer votre compte"
- Redirection vers le dashboard

---

## 👨‍💼 FLUX ADMINISTRATEUR

### Page Admin Wave

```
http://localhost:3001/admin/wave-payments
```

### Vue d'ensemble

- **Stats en temps réel** :
  - Total des transactions
  - En attente (🟡)
  - Validés (🟢)
  - Rejetés (🔴)
  - Montant total validé

### Pour chaque transaction

Affichage de :

- **Preuve de paiement** (image cliquable)
- **Informations utilisateur** :
  - Nom
  - Email
- **Détails du paiement** :
  - Montant en FCFA
  - Nombre d'activations
  - Date/heure
  - Statut
- **Actions** :
  - ✅ **Marquer validé** (manuel)
  - ❌ **Rejeter** (avec raison)
  - 👁️ **Voir preuve** (plein écran)

### Actions Admin

#### 1️⃣ Marquer comme validé

```
Clic sur "Marquer validé"
↓
Confirmation : "Vous devez créditer manuellement !"
↓
Transaction marquée "completed"
↓
⚠️ ADMIN DOIT CRÉDITER MANUELLEMENT
```

#### 2️⃣ Créditer manuellement

**Via Admin > Users** :

1. Trouver l'utilisateur
2. Voir son email
3. Créditer le nombre d'activations
4. (Ou via SQL directement)

#### 3️⃣ Rejeter

```
Clic sur "Rejeter"
↓
Popup : "Raison du rejet :"
↓
Transaction marquée "failed"
↓
Utilisateur peut voir la raison
```

---

## 🔄 FLUX TECHNIQUE

### 1. Création de la transaction

```typescript
// TopUpPage.tsx
const transaction = await supabase.from("transactions").insert({
  user_id: user.id,
  amount: 5000,
  type: "recharge",
  status: "pending",
  payment_method: "wave",
  metadata: {
    activations: 10,
    provider: "wave",
    payment_link: "https://pay.wave.com/...",
  },
});
```

### 2. Upload de la preuve

```typescript
// WavePaymentProof.tsx
const upload = await supabase.storage
  .from("public")
  .upload("payment-proofs/...", file);

const update = await supabase.from("transactions").update({
  metadata: {
    payment_proof_url: publicUrl,
    proof_uploaded_at: new Date(),
  },
});
```

### 3. Validation admin

```typescript
// AdminWavePayments.tsx
const validate = await supabase.from("transactions").update({
  status: "completed",
  metadata: {
    validated_by: admin_id,
    validated_at: new Date(),
    manual_validation: true,
  },
});

// Admin crédite manuellement via interface
```

---

## 📊 BASE DE DONNÉES

### Table `transactions`

```sql
{
  id: uuid,
  user_id: uuid,
  amount: integer,  -- 5000
  type: 'recharge',
  status: 'pending' | 'completed' | 'failed',
  payment_method: 'wave',
  metadata: {
    activations: 10,
    provider: 'wave',
    payment_link: 'https://...',
    payment_proof_url: 'https://...',
    proof_uploaded_at: timestamp,
    validated_by: uuid,
    validated_at: timestamp,
    manual_validation: true,
    rejection_reason?: string
  }
}
```

### Storage `public/payment-proofs/`

```
payment-proofs/
  wave-proof-{user_id}-{timestamp}.jpg
  wave-proof-{user_id}-{timestamp}.png
  ...
```

---

## ✅ AVANTAGES DE CE SYSTÈME

### Pour l'utilisateur

1. **Simple** : 2 étapes claires
2. **Guidé** : Instructions précises
3. **Transparent** : Sait que c'est en validation
4. **Rapide** : Upload direct de la preuve

### Pour l'admin

1. **Centralisé** : Toutes les preuves au même endroit
2. **Visuel** : Images cliquables
3. **Contrôle total** : Validation manuelle
4. **Traçable** : Qui a validé, quand
5. **Flexible** : Peut rejeter avec raison

### Technique

1. **Pas d'API complexe** : Pas de webhook Wave nécessaire
2. **Sécurisé** : Validation humaine
3. **Auditable** : Tout est loggé
4. **Scalable** : Fonctionne avec beaucoup de transactions

---

## 🎯 CHECKLIST ADMIN

Quand une nouvelle transaction arrive :

- [ ] Voir la preuve de paiement
- [ ] Vérifier le montant (5000 FCFA par exemple)
- [ ] Vérifier la date/heure
- [ ] Vérifier le statut "Réussi" sur la capture
- [ ] Cliquer "Marquer validé"
- [ ] **CRÉDITER MANUELLEMENT** l'utilisateur
- [ ] Vérifier que l'utilisateur a reçu ses activations

---

## 🚨 GESTION DES ERREURS

### Utilisateur n'a pas de capture

→ Il peut contacter le support
→ Admin peut demander le numéro de transaction Wave
→ Vérifier directement dans Wave

### Capture illisible

→ Admin rejette avec raison : "Capture illisible"
→ Utilisateur peut renvoyer

### Montant incorrect

→ Admin rejette avec raison : "Montant incorrect"
→ Utilisateur doit payer le bon montant

### Double paiement

→ Admin vérifie les transactions
→ Crédite une seule fois
→ Rejette les doublons

---

## 📱 ACCÈS RAPIDES

| Page        | URL                                       | Pour        |
| ----------- | ----------------------------------------- | ----------- |
| TopUp       | http://localhost:3001/topup               | Utilisateur |
| Preuve Wave | http://localhost:3001/wave-proof          | Utilisateur |
| Admin Wave  | http://localhost:3001/admin/wave-payments | Admin       |
| Dashboard   | http://localhost:3001/dashboard           | Utilisateur |

---

## 🔧 MAINTENANCE

### Filtrer les transactions

- Tous
- En attente (à traiter en priorité)
- Validés
- Rejetés

### Rechercher

- Par email utilisateur
- Par nom
- Par ID transaction

### Statistiques

- Voir le total validé
- Voir le nombre en attente
- Voir le taux de rejet

---

**Status** : ✅ Opérationnel  
**Date** : 12 Décembre 2024  
**Version** : 1.0.0

**Note** : Le crédit est MANUEL par l'admin. Pas de crédit automatique pour garder le contrôle.
