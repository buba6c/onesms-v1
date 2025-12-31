# 🔑 COMMENT RÉCUPÉRER RESEND_API_KEY

## Méthode 1️⃣ : Via Supabase Cloud Console (PLUS SIMPLE)

1. **Va sur**: https://app.supabase.com/project/htfqmamvmhdoixqcbbbw/settings/secrets

2. **Cherche** `RESEND_API_KEY` dans la liste

3. **Copie la valeur** (commence par `re_`)

---

## Méthode 2️⃣ : Via Supabase CLI

```bash
# Installer la CLI
npm install -g supabase

# Se connecter
supabase login

# Lister les secrets du projet
supabase secrets list --project-id htfqmamvmhdoixqcbbbw
```

Tu verras la liste avec `RESEND_API_KEY`.

---

## Méthode 3️⃣ : Via API Management Supabase

```bash
# Si tu as un access token Supabase
curl -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/api/v1/projects/htfqmamvmhdoixqcbbbw/secrets" | jq .
```

---

## ✅ Une fois la clé récupérée:

Dis-moi la clé (format: `re_...`) et je vais:
1. L'ajouter à ton `.env.local`
2. Lancer l'envoi de la campagne TOUFE à tous les users
3. Vérifier le statut sur Resend Dashboard

**La clé est-elle visible sur https://app.supabase.com/project/htfqmamvmhdoixqcbbbw/settings/secrets ?**
