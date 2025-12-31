# 📧 CAMPAGNE PROMO TOUFE - INSTRUCTIONS D'ENVOI

## Option 1 : Via cURL Direct (sans Node.js)

```bash
# Définir ta clé API Resend
export RESEND_API_KEY="re_..."

# Récupérer tous les users et envoyer
node send_promo_toufe_all_users.mjs
```

## Option 2 : Ajouter la clé à ton .env

Crée un fichier `.env.local` à la racine du projet:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

Puis:
```bash
node send_promo_toufe_all_users.mjs
```

## Option 3 : Via Supabase Dashboard

1. Va sur https://app.supabase.com/project/htfqmamvmhdoixqcbbbw/settings/api
2. Récupère le `SERVICE_ROLE KEY`
3. Va sur https://supabase.com/dashboard → Secrets
4. Ajoute `RESEND_API_KEY=re_...`
5. Redéploie les fonctions

## Option 4 : Via Admin Panel (Simplifié)

Si tu as accès au dashboard ONE SMS:
- Aller à Settings → Email Campaigns
- Créer une nouvelle campagne
- Configurer le code promo TOUFE
- Sélectionner "Tous les users"
- Envoyer

---

## 🎯 Résumé de la Campagne TOUFE

| Propriété | Valeur |
|-----------|--------|
| **Code** | TOUFE |
| **Discount** | +10% |
| **Minimum** | 50 crédits |
| **Valide jusqu'au** | 31 décembre 2025 |
| **Cible** | Tous les users |

---

## ✅ Checklist

- [ ] RESEND_API_KEY configurée
- [ ] Script `send_promo_toufe_all_users.mjs` prêt
- [ ] Vérifier sur https://resend.com/emails après envoi
- [ ] Monitorer les bounces/spam

---

**Quelle clé API Resend tu as ?** Je peux directement envoyer la campagne.
