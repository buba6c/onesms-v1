# 📧 Configuration Resend Email Receiving

## ✅ Fonction Webhook créée et déployée

La fonction `receive-email` est maintenant active sur :
```
https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/receive-email
```

## 🔧 Configuration à faire sur Resend

### Étape 1 : Configurer le domaine personnalisé

1. Va sur https://resend.com/domains
2. Clique sur ton domaine **onesms-sn.com**
3. Active l'onglet **"Receiving"**
4. Copie les records DNS affichés

### Étape 2 : Ajouter les records DNS chez Hostinger

Va sur Hostinger → DNS Zone Editor et ajoute :

**Record MX :**
```
Type: MX
Name: @
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10
TTL: 14400
```

**Record TXT (SPF) :**
```
Type: TXT
Name: @
Value: v=spf1 include:amazonses.com ~all
TTL: 14400
```

**Note :** Les valeurs exactes seront affichées sur Resend. Utilise celles-là !

### Étape 3 : Configurer le webhook sur Resend

1. Va sur https://resend.com/webhooks
2. Clique sur **"Add Webhook"**
3. Remplis :
   - **Endpoint URL :** `https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/receive-email`
   - **Event types :** Sélectionne `email.received`
   - **Status :** Active
4. Clique sur **"Add"**

### Étape 4 : Tester

Après 10-30 minutes (propagation DNS) :

1. Envoie un email à **support@onesms-sn.com** depuis n'importe quel email
2. Vérifie dans :
   - Admin panel : https://onesms-sn.com/admin/contact-messages
   - Tu devrais recevoir une notification sur support@onesms-sn.com

## 🔍 Comment ça marche

```
Email → support@onesms-sn.com
  ↓
Resend reçoit l'email
  ↓
Webhook POST → receive-email function
  ↓
Sauvegarde dans contact_messages table
  ↓
Notification envoyée à l'admin
  ↓
Visible dans admin panel
```

## 🎯 Ce qui se passe automatiquement

Quand quelqu'un envoie un email à **support@onesms-sn.com** :

1. ✅ Email reçu par Resend
2. ✅ Transformé en webhook
3. ✅ Fonction `receive-email` traite l'email
4. ✅ Sauvegardé dans la base de données
5. ✅ Notification envoyée à l'admin
6. ✅ Visible dans `/admin/contact-messages`

## 📝 Notes importantes

- **Gratuit** : Inclus dans ton plan Resend
- **Limite** : Aucune limite sur les emails reçus
- **Délai** : Quasi instantané (< 1 seconde)
- **Pièces jointes** : Supportées (accessibles via API)

## 🐛 Troubleshooting

Si ça ne marche pas :
1. Vérifie que les DNS sont bien propagés : https://dnschecker.org
2. Teste le webhook manuellement sur Resend Dashboard
3. Regarde les logs Supabase : https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/functions/receive-email/logs
4. Vérifie que RESEND_API_KEY est bien configuré dans Supabase

## ✅ Checklist

- [ ] Records DNS MX ajoutés chez Hostinger
- [ ] Records DNS TXT ajoutés chez Hostinger  
- [ ] Webhook configuré sur Resend
- [ ] Attendre 30 min (propagation DNS)
- [ ] Tester en envoyant un email
- [ ] Vérifier dans admin panel
