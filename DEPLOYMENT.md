# 🚀 Guide de Déploiement Vercel

## Configuration Complète

### 1. Push ton code sur GitHub (si pas déjà fait)
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Déploie sur Vercel

**Option A : Via le site web (Plus simple)**

1. Va sur https://vercel.com
2. Clique sur "Add New" → "Project"
3. Importe ton repo GitHub `onesms-v1`
4. Configure les variables d'environnement :

```
VITE_SUPABASE_URL=https://htfqmamvmhdoixqcbbbw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SMS_ACTIVATE_API_KEY=ta_cle_api_sms_activate
```

5. Clique sur "Deploy"
6. Attends 2-3 minutes
7. **C'est en ligne ! 🎉**

**Option B : Via CLI**

```bash
# Installe Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Ajoute les variables d'environnement
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_SMS_ACTIVATE_API_KEY

# Deploy en production
vercel --prod
```

### 3. Configure ton domaine (Optionnel)

Dans Vercel Dashboard :
- Settings → Domains
- Ajoute ton domaine Hostinger
- Configure le DNS A record vers l'IP Vercel

---

## ✅ Checklist Post-Déploiement

- [ ] Site accessible via URL Vercel
- [ ] Login fonctionne
- [ ] Dashboard charge les données
- [ ] Achat de numéro fonctionne
- [ ] Admin panel accessible
- [ ] Synchronisation SMS-Activate fonctionne
- [ ] Webhooks Supabase pointent vers la bonne URL

---

## 🔧 Mise à Jour Future

Chaque fois que tu modifies le code :

```bash
git add .
git commit -m "Update feature"
git push origin main
```

**Vercel redéploie automatiquement** en 2 minutes ! 🚀

---

## 📱 URLs Importantes

- **Dashboard Vercel** : https://vercel.com/dashboard
- **Dashboard Supabase** : https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw
- **Ton site** : https://onesms-v1.vercel.app (généré automatiquement)

---

## 🆘 En Cas de Problème

1. Vérifie les logs Vercel : Dashboard → Deployments → View Function Logs
2. Vérifie Supabase : Dashboard → Logs
3. Vérifie les variables d'environnement : Settings → Environment Variables

---

## 💰 Coût

- **Vercel Free Tier** :
  - 100 GB bandwidth/mois
  - Builds illimités
  - SSL automatique
  - **0€**

- **Supabase Free Tier** :
  - 500 MB database
  - 2 GB bandwidth/mois
  - Edge Functions illimitées
  - **0€**

**Total : 0€** jusqu'à avoir beaucoup d'utilisateurs ! 🎉
