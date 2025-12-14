# 🔧 Guide d'implémentation - Templates Email Anti-Spam

## 📧 Problèmes identifiés
Les emails Supabase vont dans les spams à cause de :
- Templates Supabase génériques
- Emojis dans les sujets (🔐 🎉)
- Contenu trop court et impersonnel
- Manque d'informations professionnelles

## ✅ Solution : Templates personnalisés Supabase

### Étapes d'implémentation :

1. **Aller dans Supabase Dashboard**
   - Projet : htfqmamvmhdoixqcbbbw
   - Authentication → Email Templates

2. **Configurer les templates améliorés :**
   
   **A) Template "Confirm signup" :**
   - Copier le template de la section "### 1. Confirm signup"
   - Sujet : "Confirmation de creation de compte - One SMS"
   
   **B) Template "Reset Password" :**
   - Copier le template de la section "### 2. Reset Password"
   - Sujet : "Demande de reinitialisation de mot de passe - One SMS"
   
3. **Améliorations apportées :**

   **Email de confirmation :**
   - ✅ Sujet professionnel : "Confirmation de creation de compte - One SMS"
   - ✅ Présentation des services disponibles
   - ✅ Instructions claires d'activation
   - ✅ Informations sur les crédits de bienvenue
   
   **Email de reset password :**
   - ✅ Sujet sans emoji : "Demande de reinitialisation de mot de passe - One SMS"
   - ✅ Horodatage de la demande
   - ✅ Instructions de sécurité détaillées
   
   **Commun aux deux :**
   - ✅ Plus de contenu contextuel
   - ✅ Informations de contact complètes
   - ✅ Adresse professionnelle (Dakar, Sénégal)
   - ✅ Mentions légales conformes
   - ✅ Design responsive et professionnel

### Test après implémentation :

```bash
# Tester le reset password
curl -X POST 'https://htfqmamvmhdoixqcbbbw.supabase.co/auth/v1/recover' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"email": "ton-email@test.com"}'
```

## 🎯 Résultats attendus :
- Meilleure délivrabilité (sortir des spams)
- Score mail-tester.com > 8/10
- Apparence plus professionnelle
- Conformité anti-spam

## 📋 Checklist :
- [ ] Template "Confirm signup" configuré dans Supabase
- [ ] Template "Reset Password" configuré dans Supabase
- [ ] Test inscription effectué
- [ ] Test reset password effectué
- [ ] Emails reçus dans boîte principale (pas spam)
- [ ] Liens fonctionnels
- [ ] Affichage correct sur mobile/desktop
- [ ] Score mail-tester.com > 8/10