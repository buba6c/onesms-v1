# 🚀 GUIDE DE DÉMARRAGE RAPIDE - AUTOMATISATION MARKETING

**Date:** 16 décembre 2025  
**Durée totale:** 30 minutes pour tout configurer

---

## ✅ CE QUI EST DÉJÀ FAIT

- ✅ 3 articles de blog publiés (WhatsApp, Telegram, Instagram)
- ✅ 5 landing pages créées
- ✅ 5 posts sociaux générés pour WhatsApp
- ✅ 30 jours de contenu planifié
- ✅ Système d'automatisation prêt

---

## 📋 ÉTAPE 1 : PARTAGER LE CONTENU (5 MIN)

### 1.1 Partager les articles de blog

**Sur Twitter:**

```
Cliquez sur ce lien pour tweet automatique:
https://twitter.com/intent/tweet?text=%F0%9F%94%A5%20Nouveau%20tutoriel%20%3A%20Comment%20activer%20WHATSAPP%20avec%20un%20num%C3%A9ro%20virtuel%0A%0A%E2%9C%85%20190%2B%20pays%0A%E2%9A%A1%20Activation%20en%202%20min%0A%F0%9F%92%B0%20%C3%80%20partir%20de%203000F%0A%0ALire%20le%20guide%20complet%20%F0%9F%91%87&url=https://onesms-sn.com/blog/activer-whatsapp-numero-virtuel
```

**Sur Facebook:**

```
https://www.facebook.com/sharer/sharer.php?u=https://onesms-sn.com/blog/activer-whatsapp-numero-virtuel
```

**Sur LinkedIn:**

```
https://www.linkedin.com/sharing/share-offsite/?url=https://onesms-sn.com/blog/activer-whatsapp-numero-virtuel
```

### 1.2 Poster le contenu social (dans le fichier généré)

Ouvrez: `social_posts/posts_whatsapp_1765883130363.json`

**Twitter:** Copiez le texte et postez sur Twitter  
**Facebook:** Copiez le post Facebook et partagez  
**LinkedIn:** Copiez le post professionnel  
**Instagram:** Utilisez le caption pour votre post  
**TikTok:** Filmez une vidéo en suivant le script

---

## ⚙️ ÉTAPE 2 : CONFIGURER L'AUTOMATISATION (10 MIN)

### 2.1 Installer les cron jobs

**Ouvrez le terminal et tapez:**

```bash
crontab -e
```

**Ajoutez ces 4 lignes:**

```bash
# Blog quotidien à 10h
0 10 * * * cd "/Users/mac/Desktop/ONE SMS V1" && node auto_publish_blog.mjs --execute-schedule

# Réseaux sociaux (vérifie toutes les 30 min)
*/30 * * * * cd "/Users/mac/Desktop/ONE SMS V1" && node auto_post_social.mjs --execute-schedule

# KPI dashboard quotidien à 8h
0 8 * * * cd "/Users/mac/Desktop/ONE SMS V1" && node track_kpis.mjs daily

# Surveillance concurrents (tous les lundis à 9h)
0 9 * * 1 cd "/Users/mac/Desktop/ONE SMS V1" && node monitor_competitors.mjs report
```

**Sauvegardez:** Appuyez sur `Esc`, puis tapez `:wq` et `Enter`

### 2.2 Vérifier que ça marche

```bash
# Voir la liste de vos cron jobs
crontab -l

# Tester manuellement
node auto_publish_blog.mjs --execute-schedule
```

---

## 📊 ÉTAPE 3 : SUIVRE LES KPI (2 MIN)

### Voir le dashboard

```bash
node track_kpis.mjs
```

**Vous verrez:**

- 👥 Nouveaux utilisateurs (aujourd'hui vs hier)
- 💰 Activations et revenus
- 🔥 Services les plus populaires
- 📈 Progression vers objectifs

### Recevoir un rapport quotidien par email

```bash
node track_kpis.mjs daily --email=votre@email.com
```

---

## 🎨 ÉTAPE 4 : CRÉER DES COMPTES SOCIAUX (10 MIN)

Si vous n'avez pas encore créé les comptes:

### 4.1 Créer les comptes

- **YouTube:** youtube.com → @onesms_official
- **TikTok:** tiktok.com → @onesms_official
- **Instagram:** instagram.com → @onesms_official
- **Twitter/X:** twitter.com → @onesms_sn

### 4.2 Configurer les profils

**Bio à utiliser:**

```
🌍 Numéros virtuels pour WhatsApp, Telegram, Instagram
📱 190+ pays disponibles
💰 À partir de 3000F
🇸🇳 Service basé au Sénégal
🔗 onesms-sn.com
```

---

## 🚀 ÉTAPE 5 : GÉNÉRER PLUS DE CONTENU (3 MIN)

### Pour Discord et Google Voice

```bash
# Générer articles Discord et Google
node generate_content.mjs blog discord
node generate_content.mjs blog google

# Publier automatiquement
node auto_publish_blog.mjs discord
node auto_publish_blog.mjs google

# Générer posts sociaux
node auto_post_social.mjs --generate=discord
node auto_post_social.mjs --generate=google
```

### Générer des landing pages supplémentaires

```bash
# Toutes les landing pages
node generate_landing_page.mjs --all
```

---

## 📧 ÉTAPE 6 : CONFIGURER EMAIL MARKETING (5 MIN)

### 6.1 Créer compte Brevo (gratuit)

1. Allez sur: https://brevo.com
2. Créez un compte gratuit (300 emails/jour)
3. Allez dans **Settings > API Keys**
4. Créez une nouvelle clé API
5. Copiez la clé

### 6.2 Configurer l'API

Créez le fichier `email_config.json`:

```json
{
  "brevo_api_key": "VOTRE_CLE_API_ICI",
  "from_email": "noreply@onesms-sn.com",
  "from_name": "ONE SMS"
}
```

### 6.3 Envoyer emails de bienvenue

```bash
# Voir les stats
node email_marketing.mjs stats

# Envoyer aux nouveaux utilisateurs
node email_marketing.mjs welcome

# Newsletter mensuelle
node email_marketing.mjs newsletter
```

---

## 📈 ÉTAPE 7 : SURVEILLER LA CONCURRENCE (2 MIN)

### Voir les prix concurrents

```bash
# Comparer les prix
node monitor_competitors.mjs compare

# Rapport détaillé
node monitor_competitors.mjs report
```

**Vous verrez:**

- Prix ONE SMS vs 5sim vs SMS-Activate
- Pourcentage d'économie
- Recommandations

**Résultat actuel:** ONE SMS est **75-80% moins cher** ! 🔥

---

## 🎯 CALENDRIER DES 7 PROCHAINS JOURS

### Jour 1 (Aujourd'hui)

- ✅ Partager les 3 articles de blog
- ✅ Poster le contenu WhatsApp sur réseaux sociaux
- ✅ Configurer les cron jobs

### Jour 2 (17 déc)

- 🤖 Auto: Blog Telegram publié à 10h
- 🤖 Auto: Post Facebook à 14h
- ✋ Manuel: Répondre à 5 commentaires

### Jour 3 (18 déc)

- 🤖 Auto: Blog Instagram publié à 10h
- 🤖 Auto: Post LinkedIn à 9h
- ✋ Manuel: Créer 1 vidéo TikTok

### Jour 4 (19 déc)

- 🤖 Auto: Blog Discord publié à 10h
- 🤖 Auto: Post Instagram à 19h
- ✋ Manuel: Répondre à 10 questions Reddit

### Jour 5 (20 déc)

- 🤖 Auto: Blog Google publié à 10h
- 🤖 Auto: Post TikTok à 20h
- ✋ Manuel: Faire un live Instagram

### Jour 6 (21 déc)

- 🤖 Auto: Contenu automatique
- ✋ Manuel: Analyser les KPI de la semaine
- ✋ Manuel: Ajuster la stratégie

### Jour 7 (22 déc)

- 🤖 Auto: Contenu automatique
- ✋ Manuel: Créer 3 nouvelles vidéos YouTube
- ✋ Manuel: Envoyer newsletter hebdomadaire

---

## 🆘 COMMANDES RAPIDES

### Générer du contenu

```bash
# Article de blog
node generate_content.mjs blog [service]

# Publier sur le blog
node auto_publish_blog.mjs [service]

# Posts réseaux sociaux
node auto_post_social.mjs --generate=[service]

# Landing page
node generate_landing_page.mjs [service]
```

### Suivre les performances

```bash
# Dashboard KPI
node track_kpis.mjs

# Rapport quotidien
node track_kpis.mjs daily

# Rapport hebdomadaire
node track_kpis.mjs weekly
```

### Email marketing

```bash
# Stats
node email_marketing.mjs stats

# Envoyer bienvenue
node email_marketing.mjs welcome

# Newsletter
node email_marketing.mjs newsletter
```

### Concurrence

```bash
# Comparer prix
node monitor_competitors.mjs compare

# Rapport complet
node monitor_competitors.mjs report
```

---

## 📊 OBJECTIFS SEMAINE 1

### Trafic

- 🎯 **500 visiteurs/jour** sur onesms-sn.com
- 🎯 **50 nouveaux utilisateurs/jour**
- 🎯 **10 activations/jour**

### Engagement réseaux sociaux

- 🎯 **100 followers** sur Twitter
- 🎯 **200 followers** sur Instagram
- 🎯 **50 followers** sur TikTok

### Contenu

- 🎯 **7 articles** publiés (1/jour)
- 🎯 **7 vidéos TikTok** créées
- 🎯 **21 posts** réseaux sociaux

### Vérifier chaque jour

```bash
node track_kpis.mjs
```

---

## 🔥 ARGUMENTS DE VENTE À UTILISER

### Prix

**"ONE SMS : Jusqu'à 80% moins cher que la concurrence"**

- WhatsApp: 3000F (vs 12,000F chez 5sim)
- Telegram: 3000F (vs 10,800F)
- Instagram: 4200F (vs 18,000F)
- Google: 6000F (vs 30,000F)

### Avantages uniques

- 🇫🇷 **Interface 100% en français**
- 💳 **Paiement local** (Wave, Orange Money, Mobile Money)
- 🇸🇳 **Support basé au Sénégal** (réponse en 5 min)
- 🌍 **190+ pays** disponibles
- ⚡ **Activation en 2 minutes**

---

## 📞 SUPPORT

### Problème avec les cron jobs?

```bash
# Voir les logs
tail -f /var/log/cron.log

# Tester manuellement
node auto_publish_blog.mjs --execute-schedule
```

### Problème avec les emails?

```bash
# Vérifier la config
cat email_config.json

# Tester l'envoi
node email_marketing.mjs stats
```

### Les posts sociaux ne se génèrent pas?

```bash
# Vérifier le planning
cat social_schedule.json

# Générer manuellement
node auto_post_social.mjs --generate=whatsapp
```

---

## ✅ CHECKLIST QUOTIDIENNE (5 MIN/JOUR)

**Matin (8h):**

- [ ] Lire le rapport KPI reçu par email
- [ ] Vérifier que l'article du jour est publié

**Midi (12h):**

- [ ] Partager l'article sur Twitter/Facebook
- [ ] Répondre aux commentaires (5 min)

**Soir (18h):**

- [ ] Vérifier les stats (nouveaux users)
- [ ] Poster sur Instagram si nécessaire

---

## 🎉 RÉCAPITULATIF

**Temps de setup:** 30 minutes  
**Temps quotidien:** 5-10 minutes  
**Contenu automatique:** 30 jours planifiés  
**Économie de temps:** 14h/semaine (93%)

**Vous êtes prêt ! 🚀**

Maintenant, partagez le contenu et laissez l'automatisation faire le reste.

**Question ?** Tapez la commande correspondante ou demandez de l'aide.
