# 🎯 Configuration Finale Moneroo

## ✅ Ce qui est fait

### 1. **Base de Données** ✅

- Moneroo ajouté dans `payment_providers`
- Status: `is_active = true`
- Priority: 4

### 2. **Frontend** ✅

- TopUpPage.tsx mis à jour avec le cas Moneroo
- Clé publique mise à jour: `pvk_pescqt|01KCHW6TZY1HVTQ8929E6Y9HM6`

### 3. **Supabase Secrets** ✅

- `MONEROO_SECRET_KEY`: 912a557b1ea... ✅
- `MONEROO_WEBHOOK_SECRET`: 0b4eb9b8... ✅

---

## 🔧 Action Requise: Configurer le Webhook Moneroo

### URL à configurer dans votre Dashboard Moneroo:

```
https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/moneroo-webhook
```

### Étapes:

1. **Se connecter à Moneroo Dashboard**

   - Aller sur: https://app.moneroo.io/
   - Se connecter avec vos identifiants

2. **Naviguer vers Webhooks**

   - Menu: **Developer** → **Webhooks**
   - Cliquer sur **"Add Webhook"** ou **"New Webhook"**

3. **Configuration du Webhook**

   ```
   Webhook URL: https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/moneroo-webhook

   Webhook Secret: 0b4eb9b8552f5d4b44924d32479863191c4d919e50fc8f1a3bc5ff07f0b9ff20

   Events à activer:
   ☑️ payment.success
   ☑️ payment.failed
   ☑️ payment.pending
   ```

4. **Vérifier la clé API**

   - Menu: **Developer** → **API Keys**
   - Vérifier que la clé commence par: `912a557b1ea...`
   - Si différente, mettre à jour le secret Supabase:
     ```bash
     npx supabase secrets set MONEROO_SECRET_KEY=sk_votre_nouvelle_cle
     ```

5. **Sauvegarder**

---

## 🧪 Test du Flow Complet

### 1. **Vérifier que Moneroo est visible**

- Aller sur: https://onesms-sn.com/topup
- Hard refresh: **Cmd+Shift+R** (Mac) ou **Ctrl+Shift+R**
- Moneroo devrait apparaître dans les moyens de paiement

### 2. **Test de paiement**

1. Sélectionner un package (ex: 5 activations)
2. Choisir **Moneroo** comme moyen de paiement
3. Cliquer sur **"Payer maintenant"**
4. Vérifier la redirection vers la page de paiement Moneroo
5. Compléter le paiement (en mode test)
6. Vérifier le retour sur le dashboard
7. Vérifier que le crédit est ajouté automatiquement

### 3. **Vérifier les logs webhook**

```bash
# Surveiller les logs en temps réel
npx supabase functions logs moneroo-webhook --follow
```

**Indicateurs de succès:**

- ✅ `[MONEROO-WEBHOOK] Signature verified`
- ✅ `[MONEROO-WEBHOOK] Payment verified`
- ✅ `[MONEROO-WEBHOOK] Credited X activations to user`
- ✅ Transaction status = `completed`

---

## 📊 Vérification Post-Test

```bash
# Vérifier qu'une transaction Moneroo a été créée
node check_moneroo_cloud.mjs
```

Devrait afficher:

- ✅ Moneroo in payment_providers
- ✅ 1+ Moneroo transactions

---

## 🚀 Déploiement en Production

Une fois les tests validés:

```bash
# 1. Build
npm run build

# 2. Deploy
netlify deploy --prod
```

---

## 📞 Support

Si problème avec le webhook:

1. Vérifier les logs: `npx supabase functions logs moneroo-webhook`
2. Tester le webhook manuellement depuis Moneroo dashboard
3. Vérifier que le secret webhook est identique des deux côtés

---

## ✅ Checklist Finale

- [x] Moneroo dans payment_providers
- [x] Frontend mis à jour (TopUpPage.tsx)
- [x] Clé publique configurée
- [x] Secrets Supabase configurés
- [ ] **Webhook configuré dans Moneroo dashboard** ⬅️ ACTION REQUISE
- [ ] Test de paiement validé
- [ ] Logs webhook validés
- [ ] Déployé en production
