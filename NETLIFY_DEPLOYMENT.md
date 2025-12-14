# Configuration Netlify - Variables d'Environnement

## 🚀 Étapes à Suivre

### 1. Va sur Netlify Dashboard

https://app.netlify.com/projects/onesms-v1

### 2. Clique sur "Site configuration" → "Environment variables"

### 3. Ajoute ces variables :

```
VITE_SUPABASE_URL=https://htfqmamvmhdoixqcbbbw.supabase.co

VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg

VITE_SMS_ACTIVATE_API_KEY=d29edd5e1d04c3127d5253d5eAe70de8

VITE_SMS_ACTIVATE_API_URL=https://api.sms-activate.io/stubs/handler_api.php

VITE_PAYTECH_API_KEY=4dea587b182901ca89105554b9bc763c15fd768dd445f537f786d5ef80a2d481

VITE_PAYTECH_API_SECRET=ac846eb315057c6ae8b4453a25ac6a890832e277feb3fdce4e3081848f58a672

VITE_PAYTECH_API_URL=https://paytech.sn/api

VITE_PAYTECH_ENV=test

VITE_PAYTECH_IPN_URL=https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/paytech-ipn

VITE_PAYTECH_SUCCESS_URL=https://onesms-v1.netlify.app/transactions?status=success

VITE_PAYTECH_CANCEL_URL=https://onesms-v1.netlify.app/transactions?status=cancelled

VITE_APP_NAME=One SMS

VITE_APP_URL=https://onesms-v1.netlify.app

VITE_APP_VERSION=1.0.0

NODE_VERSION=20
```

### 4. Clique sur "Save"

### 5. Redéploie le site

- "Deploys" → "Trigger deploy" → "Deploy site"

---

## ✅ Vérification Post-Déploiement

Une fois redéployé, teste :

1. **Login/Register** : https://onesms-v1.netlify.app
2. **Dashboard** : Vérifie que les stats chargent
3. **Achat numéro** : Teste un achat
4. **Admin Panel** : https://onesms-v1.netlify.app/admin
5. **Synchronisation** : Teste la sync SMS-Activate

---

## 🔄 Déploiements Futurs

Chaque fois que tu fais des modifications :

```bash
git add .
git commit -m "Update feature"
git push origin main
```

**Netlify redéploie automatiquement en 2-3 minutes !**

---

## 📱 URLs Importantes

- **Site Live** : https://onesms-v1.netlify.app
- **Dashboard Netlify** : https://app.netlify.com/projects/onesms-v1
- **Supabase Dashboard** : https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw
- **Logs Netlify** : https://app.netlify.com/sites/onesms-v1/logs

---

## 💰 Coût

- **Netlify Starter** : Gratuit
  - 100 GB bandwidth/mois
  - Builds illimités
  - SSL automatique
- **Supabase Free** : Gratuit
  - 500 MB database
  - 2 GB bandwidth/mois

**Total : 0€** jusqu'à beaucoup d'utilisateurs !

---

## 🆘 En Cas de Problème

1. **Logs de build** : Dashboard Netlify → Deploys → View build log
2. **Logs runtime** : Dashboard Netlify → Functions (si tu utilises Netlify Functions)
3. **Logs Supabase** : Dashboard Supabase → Logs → Edge Functions

---

## 🎯 Prochaines Étapes

1. ✅ Ajouter les variables d'environnement
2. ✅ Redéployer le site
3. ✅ Tester toutes les fonctionnalités
4. 🔜 Configurer un domaine personnalisé (optionnel)
