#!/usr/bin/env node

/**
 * GÉNÉRATEUR DE CONTENU MARKETING - ONE SMS
 * 
 * Ce script génère automatiquement :
 * - Articles de blog SEO-optimisés
 * - Posts réseaux sociaux
 * - Descriptions YouTube
 * - Captions Instagram/TikTok
 * 
 * Usage: node generate_content.mjs <type> <service>
 * 
 * Exemples:
 *   node generate_content.mjs blog whatsapp
 *   node generate_content.mjs youtube telegram
 *   node generate_content.mjs social instagram
 */

import fs from 'fs';
import path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SERVICES = {
  whatsapp: {
    name: 'WhatsApp',
    icon: '💬',
    description: 'Messagerie instantanée',
    keywords: ['whatsapp', 'messagerie', 'chat', 'appel vidéo'],
    popularCountries: ['USA 🇺🇸', 'UK 🇬🇧', 'France 🇫🇷', 'Canada 🇨🇦'],
    useCases: ['WhatsApp Business', 'compte secondaire', 'privacy', 'numéro US'],
    price: '5-10 Ⓐ'
  },
  telegram: {
    name: 'Telegram',
    icon: '✈️',
    description: 'Messagerie sécurisée',
    keywords: ['telegram', 'privacy', 'anonymous', 'secure chat'],
    popularCountries: ['Inde 🇮🇳', 'USA 🇺🇸', 'UK 🇬🇧', 'Russie 🇷🇺'],
    useCases: ['Telegram Premium', 'channels', 'bots', 'crypto groups'],
    price: '5 Ⓐ'
  },
  instagram: {
    name: 'Instagram',
    icon: '📸',
    description: 'Réseau social photos',
    keywords: ['instagram', 'influencer', 'photos', 'reels'],
    popularCountries: ['USA 🇺🇸', 'UK 🇬🇧', 'Brésil 🇧🇷', 'France 🇫🇷'],
    useCases: ['comptes multiples', 'business', 'influenceur', 'test algos'],
    price: '5-8 Ⓐ'
  },
  discord: {
    name: 'Discord',
    icon: '🎮',
    description: 'Plateforme gaming & communautés',
    keywords: ['discord', 'gaming', 'community', 'server'],
    popularCountries: ['USA 🇺🇸', 'UK 🇬🇧', 'Canada 🇨🇦', 'Allemagne 🇩🇪'],
    useCases: ['serveurs multiples', 'bots', 'gaming', 'communautés'],
    price: '5 Ⓐ'
  },
  google: {
    name: 'Google Voice',
    icon: '📞',
    description: 'Numéro téléphone Google',
    keywords: ['google voice', 'voip', 'us number', 'free calls'],
    popularCountries: ['USA 🇺🇸'],
    useCases: ['numéro US permanent', 'appels gratuits', 'SMS', 'voicemail'],
    price: '10-15 Ⓐ'
  }
};

const COUNTRIES = {
  usa: { name: 'USA', flag: '🇺🇸', code: '+1' },
  uk: { name: 'Royaume-Uni', flag: '🇬🇧', code: '+44' },
  france: { name: 'France', flag: '🇫🇷', code: '+33' },
  canada: { name: 'Canada', flag: '🇨🇦', code: '+1' },
  india: { name: 'Inde', flag: '🇮🇳', code: '+91' }
};

// ============================================================================
// GÉNÉRATEURS DE CONTENU
// ============================================================================

/**
 * Génère un article de blog SEO-optimisé
 */
function generateBlogArticle(service) {
  const svc = SERVICES[service] || SERVICES.whatsapp;
  
  return `# Comment Activer ${svc.name} avec un Numéro Virtuel (Guide 2025)

## Introduction

Vous cherchez un moyen d'activer ${svc.name} sans utiliser votre numéro personnel ? Vous êtes au bon endroit. Dans ce guide complet, nous allons vous montrer **comment obtenir un numéro virtuel** pour ${svc.name} en quelques minutes seulement.

${svc.icon} **Pourquoi utiliser un numéro virtuel pour ${svc.name} ?**

- ✅ **Privacy** : Protégez votre numéro personnel
- ✅ **Multi-comptes** : Gérez plusieurs comptes ${svc.name}
- ✅ **International** : Obtenez des numéros de 190+ pays
- ✅ **Sécurité** : Évitez le spam et les appels indésirables
- ✅ **Professionnel** : Séparez vie pro et perso

---

## Qu'est-ce qu'un Numéro Virtuel ?

Un **numéro virtuel** (ou numéro temporaire) est un numéro de téléphone qui fonctionne via internet sans nécessiter de carte SIM physique. Il permet de **recevoir des SMS** et parfois des appels, parfait pour les vérifications de compte comme ${svc.name}.

### Différence avec numéro classique :

| Critère | Numéro Classique | Numéro Virtuel |
|---------|------------------|----------------|
| **Carte SIM** | Obligatoire | Non nécessaire |
| **Prix** | 10-30€/mois | À partir de 3000F |
| **Durée** | Engagement | Flexible |
| **Pays** | 1 seul | 190+ disponibles |
| **Activation** | Boutique | Instantanée |

---

## Pourquoi ONE SMS pour ${svc.name} ?

**ONE SMS** est la plateforme n°1 en Afrique pour obtenir des numéros virtuels. Voici pourquoi :

### 🌍 190+ Pays Disponibles

Obtenez un numéro de n'importe quel pays :
${svc.popularCountries.map(c => `- ${c}`).join('\n')}
- Et 180+ autres pays !

### ⚡ Activation Instantanée

- Inscription en 30 secondes
- Numéro reçu en 5 secondes
- SMS reçu en 10 secondes maximum

### 💳 Paiement Local

- Wave
- Orange Money
- Mobile Money
- Carte bancaire
- Paytech

**Pas besoin de carte internationale ou crypto !**

### 💰 Prix Transparent

${svc.name} : À partir de **${svc.price}** (≈ 3000-6000 FCFA)

Pas de frais cachés. Pas d'abonnement.

### 🇫🇷 Support Français

- Interface en français
- Support par chat 24/7
- Guides et tutoriels

---

## Tutoriel : Activer ${svc.name} avec ONE SMS (5 minutes)

### Étape 1 : Créer un compte ONE SMS

1. Allez sur [onesms-sn.com](https://onesms-sn.com)
2. Cliquez sur **"S'inscrire"**
3. Entrez votre email et mot de passe
4. Confirmez votre email

⏱️ **Temps : 1 minute**

### Étape 2 : Recharger votre compte

1. Allez dans **"Recharger"**
2. Choisissez le montant (minimum 5 Ⓐ = 3000F)
3. Sélectionnez votre méthode de paiement :
   - Wave (instantané)
   - Orange Money
   - Carte bancaire
   - Mobile Money

4. Validez le paiement

💡 **Astuce** : Commencez avec 10 Ⓐ (6000F) pour tester plusieurs pays.

⏱️ **Temps : 1-2 minutes**

### Étape 3 : Choisir un service

1. Dans la barre de recherche, tapez **"${svc.name}"**
2. Sélectionnez le service ${svc.icon} **${svc.name}**
3. Choisissez votre pays (exemple : USA 🇺🇸)
4. Le prix s'affiche (ex: 8 Ⓐ)
5. Cliquez sur **"Activer"**

💡 **Recommandation pays** :
${svc.popularCountries.map((c, i) => `${i + 1}. ${c} (meilleur taux de succès)`).join('\n')}

⏱️ **Temps : 30 secondes**

### Étape 4 : Copier le numéro

1. Le numéro virtuel s'affiche :
   **Exemple : +1 (234) 567-8900**

2. Cliquez sur **📋 Copier**

3. Le numéro est copié dans votre presse-papier

⏱️ **Temps : 5 secondes**

### Étape 5 : Activer ${svc.name}

1. Ouvrez l'application ${svc.name}
2. Commencez l'inscription
3. Collez le numéro copié :
   \`\`\`
   +1 234 567 8900
   \`\`\`
4. Cliquez sur **"Suivant"**
5. ${svc.name} demande un code de vérification

⏱️ **Temps : 30 secondes**

### Étape 6 : Recevoir le SMS

1. Retournez sur ONE SMS
2. Le SMS arrive automatiquement (5-10 secondes)
3. Le code à 6 chiffres s'affiche :
   **Code : 123456**
4. Cliquez sur **📋 Copier le code**

⏱️ **Temps : 10 secondes**

### Étape 7 : Finaliser l'activation

1. Retournez dans ${svc.name}
2. Collez le code de vérification
3. ${svc.name} valide le code
4. **✅ Votre ${svc.name} est activé !**

⏱️ **Temps : 20 secondes**

---

## Cas d'Usage : Pourquoi Utiliser un Numéro Virtuel ?

### 1. ${svc.useCases[0]}

${generateUseCaseDescription(svc, 0)}

### 2. ${svc.useCases[1]}

${generateUseCaseDescription(svc, 1)}

### 3. ${svc.useCases[2]}

${generateUseCaseDescription(svc, 2)}

### 4. ${svc.useCases[3] || 'Développeurs & Testeurs'}

${generateUseCaseDescription(svc, 3)}

---

## Problèmes Courants et Solutions

### ❌ "Le code SMS n'arrive pas"

**Solutions** :
1. Attendez 30-60 secondes (parfois réseau lent)
2. Vérifiez que vous avez bien copié le numéro entier
3. Essayez un autre pays (UK, Canada)
4. Contactez le support ONE SMS (chat 24/7)

### ❌ "${svc.name} refuse le numéro"

**Solutions** :
1. Utilisez un numéro USA ou UK (meilleur taux)
2. ${svc.name} bloque parfois certains pays
3. Essayez en mode location (24h+) au lieu d'activation
4. Attendez 1h et réessayez

### ❌ "Le numéro a déjà été utilisé"

**Solutions** :
1. Cliquez sur "Nouvelle activation"
2. ONE SMS génère un nouveau numéro
3. Coût supplémentaire mais numéro garanti neuf

### ❌ "Crédit insuffisant"

**Solutions** :
1. Rechargez votre compte (minimum 5 Ⓐ)
2. Les prix varient selon pays (USA = 8Ⓐ, Inde = 5Ⓐ)
3. Vérifiez le prix avant d'activer

---

## Comparatif : ONE SMS vs Autres Solutions

### ONE SMS vs TextNow / TextFree

| Critère | ONE SMS | TextNow/TextFree |
|---------|---------|------------------|
| **${svc.name} accepté** | ✅ Oui | ❌ Non (bloqué) |
| **Fiabilité** | 95%+ | 20% |
| **Pays** | 190+ | USA seulement |
| **Prix** | 3000F | Gratuit (mais ne marche pas) |
| **Support** | Chat 24/7 | Aucun |

**Verdict** : TextNow/TextFree sont **obsolètes** pour ${svc.name}. Utilisez ONE SMS.

### ONE SMS vs 5sim.net

| Critère | ONE SMS | 5sim.net |
|---------|---------|----------|
| **Langue** | Français | Anglais/Russe |
| **Paiement** | Wave, OM, CB | Crypto, CB internationale |
| **Support** | FR 24/7 | EN (ticket) |
| **Prix** | 3000-6000F | 0.50-3$ (≈300-1800F) |
| **Afrique** | ✅ Optimisé | ❌ Compliqué |

**Verdict** : 5sim moins cher mais **ONE SMS plus adapté aux Africains**.

### ONE SMS vs Carte SIM Physique

| Critère | ONE SMS | Carte SIM |
|---------|---------|-----------|
| **Prix** | 3000F one-time | 10-30€/mois |
| **Activation** | Instantanée | Boutique + délais |
| **Flexibilité** | 190 pays | 1 seul |
| **Engagement** | Aucun | Contrat |

**Verdict** : ONE SMS = **10x moins cher et plus flexible**.

---

## FAQ : Questions Fréquentes

### 1. Est-ce légal d'utiliser un numéro virtuel ?

**Oui, 100% légal.** Les numéros virtuels sont fournis par de vrais opérateurs téléphoniques. ONE SMS est une plateforme officielle et régulée.

### 2. ${svc.name} peut-il bannir mon compte ?

**Très rare.** ${svc.name} accepte les numéros virtuels. Cependant :
- Évitez d'utiliser le même numéro pour 10+ comptes
- Ne violez pas les CGU de ${svc.name} (spam, bot, etc.)
- En cas de ban, ce n'est PAS dû au numéro virtuel

### 3. Le numéro est-il permanent ?

**Non, en mode Activation.** Le numéro est temporaire (20 minutes).

**Oui, en mode Location.** Vous pouvez louer un numéro pour :
- 24h
- 7 jours
- 30 jours

Prix : à partir de 20 Ⓐ/24h.

### 4. Je peux recevoir des appels ?

**En mode Location uniquement.** En mode Activation, c'est SMS seulement.

### 5. Combien coûte ${svc.name} sur ONE SMS ?

**${svc.price}** selon le pays :
- USA : 8-10 Ⓐ
- UK : 7-9 Ⓐ
- Inde : 5-6 Ⓐ
- France : 8-10 Ⓐ

Prix en temps réel sur onesms-sn.com.

### 6. Puis-je utiliser le même numéro pour plusieurs services ?

**Oui ET non.**
- Même numéro pour ${svc.name} + Telegram : ✅ Possible
- Même numéro pour 2 comptes ${svc.name} : ❌ Impossible

Un numéro = un compte par service.

### 7. Le paiement Wave est-il instantané ?

**Oui, immédiat.** Wave, Orange Money, Mobile Money = crédits en 1-30 secondes.

### 8. Support client disponible ?

**Chat 24/7 en français** sur onesms-sn.com.

---

## Conclusion : Pourquoi Choisir ONE SMS ?

Si vous cherchez la **solution la plus simple, rapide et adaptée aux Africains** pour activer ${svc.name} avec un numéro virtuel, ONE SMS est le choix évident :

✅ **190+ pays** disponibles  
✅ **Activation en 2 minutes**  
✅ **Paiement local** (Wave, OM)  
✅ **Support français** 24/7  
✅ **Prix transparent** (à partir de 3000F)  
✅ **Interface claire** et moderne  
✅ **95%+ taux de succès**  

**🎁 BONUS : Code promo BLOG10 pour -10% sur votre première recharge !**

---

## Commencer Maintenant

1. **[Créer un compte ONE SMS](https://onesms-sn.com)** (30 secondes)
2. Recharger 10 Ⓐ (6000F) avec Wave
3. Activer ${svc.name} avec un numéro USA 🇺🇸
4. Profiter de votre nouveau compte ${svc.icon}

**Des questions ?** Commentez ci-dessous ou contactez notre support !

---

## Articles Connexes

- [Top 10 Services à Activer avec un Numéro Virtuel](/)
- [ONE SMS vs 5sim : Comparatif Complet 2025](/)
- [Guide Complet : Numéros Virtuels pour Débutants](/)
- [WhatsApp Business : Setup avec Numéro Virtuel](/)

---

**Mots-clés** : ${svc.keywords.join(', ')}, numéro virtuel ${service}, recevoir sms ${service}, activation ${service}, one sms

**Dernière mise à jour** : ${new Date().toLocaleDateString('fr-FR')}
`;
}

function generateUseCaseDescription(svc, index) {
  const descriptions = {
    'whatsapp': [
      'Utilisez un numéro US/UK pour votre WhatsApp Business et donnez une image professionnelle internationale à vos clients.',
      'Créez un second compte WhatsApp pour séparer vie professionnelle et personnelle sans acheter un second téléphone.',
      'Protégez votre numéro personnel en utilisant un numéro virtuel pour vos interactions publiques ou avec des inconnus.',
      'Testez les fonctionnalités WhatsApp Business, WhatsApp Web, et les nouvelles features sans risquer votre compte principal.'
    ],
    'telegram': [
      'Accédez à Telegram Premium depuis n\'importe quel pays en utilisant un numéro de pays avec prix réduit (Inde, Turquie).',
      'Gérez plusieurs channels Telegram avec des comptes séparés pour mieux organiser vos communautés.',
      'Rejoignez des groupes crypto, trading ou autres communities sensibles sans exposer votre numéro réel.',
      'Développez et testez des bots Telegram sur plusieurs comptes avant de les déployer en production.'
    ]
  };
  
  return descriptions[svc] || 'Description du cas d\'usage à développer selon vos besoins spécifiques.';
}

/**
 * Génère une description YouTube
 */
function generateYouTubeDescription(service) {
  const svc = SERVICES[service] || SERVICES.whatsapp;
  
  return `🔥 Comment Activer ${svc.name} avec un Numéro Virtuel | Tutoriel Complet 2025

${svc.icon} Dans cette vidéo, je vous montre comment obtenir un numéro virtuel pour ${svc.name} en MOINS de 2 minutes pour seulement 3000 FCFA !

✅ Lien ONE SMS : https://onesms-sn.com?ref=youtube
💰 Code promo : YOUTUBE10 (-10%)

⏱️ TIMESTAMPS:
0:00 - Introduction
0:15 - Pourquoi un numéro virtuel ?
0:45 - Présentation ONE SMS
1:15 - Tutoriel étape par étape
3:00 - Démo en direct
4:30 - Résultat final
5:00 - FAQ et conseils
5:45 - Conclusion

📱 SERVICES COMPATIBLES:
✅ ${svc.name} ${svc.icon}
✅ WhatsApp ✅ Telegram ✅ Instagram ✅ Discord
✅ Google Voice ✅ Tinder ✅ Uber ✅ PayPal
✅ 1000+ autres services

💵 PRIX:
À partir de 3000 FCFA (5 Ⓐ)
190+ pays disponibles

🌍 PAIEMENT:
Wave, Orange Money, Mobile Money, Carte bancaire

🎯 AVANTAGES ONE SMS:
• Interface en français
• Support 24/7
• Activation instantanée
• Paiement local
• 95%+ taux de succès

---

💬 QUESTIONS FRÉQUENTES:

Q: C'est légal ?
R: Oui, 100% légal et officiel.

Q: Le numéro expire ?
R: En mode activation : 20 min. En mode location : jusqu'à 30 jours.

Q: Ça marche pour WhatsApp Business ?
R: Oui, parfaitement !

Q: Autres pays disponibles ?
R: 190+ pays (USA, UK, France, Canada, Inde, etc.)

Q: Support si problème ?
R: Chat 24/7 en français sur le site.

---

📧 Contact: contact@onesms-sn.com
🌐 Site web: https://onesms-sn.com
📱 Support: Chat en direct 24/7

---

🔔 ABONNEZ-VOUS pour plus de tutoriels tech !
👍 LIKEZ si cette vidéo vous a aidé
💬 COMMENTEZ vos questions
📤 PARTAGEZ à vos amis

---

#${service} #numerovirtuel #onesms #tutoriel #senegal #tech #${svc.keywords[0]}

Merci d'avoir regardé ! 🙏`;
}

/**
 * Génère des posts pour réseaux sociaux
 */
function generateSocialPosts(service) {
  const svc = SERVICES[service] || SERVICES.whatsapp;
  
  return {
    twitter: `🔥 Comment activer ${svc.name} avec un numéro virtuel ?

${svc.icon} 190+ pays disponibles
⚡ Activation en 2 minutes  
💰 À partir de 3000F
🇫🇷 Paiement Wave/OM

Guide complet 👇
onesms-sn.com

#${service} #numerovirtuel #tech`,

    facebook: `🎯 NOUVEAU TUTORIEL : Activer ${svc.name} avec un Numéro Virtuel

Vous cherchez un moyen d'activer ${svc.name} sans utiliser votre numéro personnel ?

${svc.icon} ONE SMS vous permet d'obtenir un numéro virtuel de 190+ pays en quelques secondes !

✅ Avantages :
• Privacy protégée
• Multi-comptes possibles
• Numéros de 190+ pays
• Activation instantanée
• Paiement Wave/Orange Money
• Support français 24/7

💰 Prix : À partir de 3000 FCFA

📚 Lisez notre guide complet : [lien]

🎁 Code promo : FACEBOOK10 pour -10%

Des questions ? Commentez ! 👇

#${svc.name} #NuémroVirtuel #ONEsms #Tech #Senegal #CotedIvoire`,

    linkedin: `Comment les professionnels utilisent les numéros virtuels pour ${svc.name}

${svc.icon} Dans le monde du digital business moderne, la séparation entre vie professionnelle et personnelle est cruciale.

ONE SMS permet aux entrepreneurs, freelances et business owners d'obtenir des numéros virtuels internationaux pour leurs activations ${svc.name} professionnelles.

✅ Cas d'usage B2B :
• ${svc.useCases[0]}
• ${svc.useCases[1]}
• Call centers & support client
• Agences digitales multi-clients

💼 Solutions :
• API access pour intégrations
• Dashboard admin complet
• Volume discounts disponibles
• White-label options

🌍 190+ pays | ⚡ Activation instantanée | 💳 Facturation simplifiée

En savoir plus : onesms-sn.com/business

#DigitalBusiness #${svc.name} #Tech #Entrepreneurship`,

    instagram: `${svc.icon} ACTIVER ${svc.name.toUpperCase()} AVEC UN NUMÉRO VIRTUEL

Swipe pour voir le tutoriel complet 👉

✅ 190+ pays
✅ 2 minutes
✅ 3000F seulement
✅ Paiement Wave

Lien en bio 👆

#${service} #numerovirtuel #onesms #tech #senegal #tutorial #astuce #${svc.keywords[0]}`,

    tiktok: `POV: Tu as besoin d'un numéro US pour ${svc.name} ${svc.icon}

[Hook dans les 3 premières secondes]

❌ TextNow ne marche pas
❌ TextFree bloqué
❌ Tous les sites gratuits = fake

✅ La solution ? ONE SMS

2 minutes ⏱️
3000F 💰
190 pays 🌍

Lien en bio 👆

#${service} #numerovirtuel #onesms #astuce #tech #senegal #${svc.keywords[0]} #tutorial`
  };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║         GÉNÉRATEUR DE CONTENU MARKETING - ONE SMS             ║
╚════════════════════════════════════════════════════════════════╝

Usage: node generate_content.mjs <type> <service>

TYPES DISPONIBLES:
  blog      - Article de blog SEO (2000+ mots)
  youtube   - Description YouTube optimisée
  social    - Posts réseaux sociaux (Twitter, FB, LinkedIn, etc.)
  all       - Génère tous les types

SERVICES DISPONIBLES:
  ${Object.keys(SERVICES).join(', ')}

EXEMPLES:
  node generate_content.mjs blog whatsapp
  node generate_content.mjs youtube telegram
  node generate_content.mjs social instagram
  node generate_content.mjs all discord

OUTPUT:
  Les fichiers seront créés dans: ./marketing_content/
    `);
    process.exit(1);
  }

  const [type, service] = args;
  
  if (!SERVICES[service]) {
    console.error(`❌ Service "${service}" inconnu. Services disponibles: ${Object.keys(SERVICES).join(', ')}`);
    process.exit(1);
  }

  // Créer le dossier de sortie
  const outputDir = path.join(process.cwd(), 'marketing_content');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\n🚀 Génération de contenu pour: ${SERVICES[service].name} ${SERVICES[service].icon}\n`);

  // Générer selon le type
  if (type === 'blog' || type === 'all') {
    const blogContent = generateBlogArticle(service);
    const blogPath = path.join(outputDir, `blog_${service}_${Date.now()}.md`);
    fs.writeFileSync(blogPath, blogContent, 'utf8');
    console.log(`✅ Article de blog créé: ${blogPath}`);
  }

  if (type === 'youtube' || type === 'all') {
    const youtubeContent = generateYouTubeDescription(service);
    const youtubePath = path.join(outputDir, `youtube_${service}_${Date.now()}.txt`);
    fs.writeFileSync(youtubePath, youtubeContent, 'utf8');
    console.log(`✅ Description YouTube créée: ${youtubePath}`);
  }

  if (type === 'social' || type === 'all') {
    const socialPosts = generateSocialPosts(service);
    const socialPath = path.join(outputDir, `social_${service}_${Date.now()}.json`);
    fs.writeFileSync(socialPath, JSON.stringify(socialPosts, null, 2), 'utf8');
    console.log(`✅ Posts réseaux sociaux créés: ${socialPath}`);
    
    // Afficher les posts
    console.log(`\n📱 APERÇU DES POSTS:\n`);
    console.log(`🐦 TWITTER:\n${socialPosts.twitter}\n`);
    console.log(`📘 FACEBOOK:\n${socialPosts.facebook.substring(0, 200)}...\n`);
    console.log(`💼 LINKEDIN:\n${socialPosts.linkedin.substring(0, 200)}...\n`);
  }

  console.log(`\n✨ Génération terminée ! Tous les fichiers sont dans: ${outputDir}\n`);
}

// Exécuter
main();
