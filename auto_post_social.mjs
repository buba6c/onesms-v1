#!/usr/bin/env node

/**
 * 📱 AUTO-POSTING RÉSEAUX SOCIAUX - ONE SMS
 * 
 * Publie automatiquement du contenu sur Twitter, Facebook, LinkedIn, Instagram, TikTok
 * 
 * Usage:
 *   node auto_post_social.mjs twitter "Votre message"        # Post immédiat Twitter
 *   node auto_post_social.mjs --generate whatsapp            # Génère posts pour WhatsApp
 *   node auto_post_social.mjs --schedule daily --count 30    # Planifie 30 jours de posts
 *   node auto_post_social.mjs --execute-schedule             # Exécute les posts du jour
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SERVICES = ['whatsapp', 'telegram', 'instagram', 'discord', 'google'];
const PLATFORMS = ['twitter', 'facebook', 'linkedin', 'instagram', 'tiktok'];

const SCHEDULE_FILE = path.join(process.cwd(), 'social_schedule.json');
const POSTS_DIR = path.join(process.cwd(), 'social_posts');

// Créer le dossier des posts
if (!fs.existsSync(POSTS_DIR)) {
  fs.mkdirSync(POSTS_DIR, { recursive: true });
}

// ============================================================================
// TEMPLATES DE POSTS PAR PLATEFORME
// ============================================================================

const POST_TEMPLATES = {
  twitter: {
    maxLength: 280,
    templates: [
      `🔥 Besoin d'un numéro {country} pour activer {service} ?

✅ ONE SMS te facilite la vie :
• 190+ pays disponibles
• Activation en 2 min
• À partir de 3000F CFA

{cta} 👉 {link}

{hashtags}`,
      
      `💬 {service} bloqué dans ton pays ?

🌍 Avec ONE SMS, active {service} depuis n'importe où :
• Numéros {country}
• SMS reçus en temps réel
• Support 24/7 en français

{cta} 🚀 {link}

{hashtags}`,
      
      `🎯 Tutoriel : Comment activer {service} avec ONE SMS

1️⃣ Choisis ton pays ({country})
2️⃣ Sélectionne {service}
3️⃣ Reçois ton numéro instantanément
4️⃣ SMS visible en 30s

Simple, rapide, efficace. {link}

{hashtags}`
    ]
  },
  
  facebook: {
    maxLength: 2000,
    templates: [
      `🚀 NOUVEAU : Activez {service} avec un numéro virtuel !

Vous êtes au Sénégal, en Côte d'Ivoire ou ailleurs en Afrique et vous avez besoin d'un numéro américain, français ou européen pour activer {service} ?

✅ ONE SMS est la solution :

📱 190+ pays disponibles
⚡ Activation en 2 minutes
💰 À partir de 3000F CFA
🔒 100% sécurisé et privé
🇫🇷 Interface en français
💳 Paiement Wave, Orange Money, Mobile Money

{emoji} Cas d'usage :
• Activer {service} sans carte SIM étrangère
• Créer plusieurs comptes {service}
• Protéger votre numéro personnel
• Accéder aux services non disponibles en Afrique

👉 Essayez maintenant : {link}

💬 Questions ? Notre équipe vous répond en 5 min !

{hashtags}`,

      `💡 ASTUCE : Vous saviez que vous pouviez avoir {count} comptes {service} avec UN SEUL téléphone ?

Grâce à ONE SMS, c'est possible ! 🎉

Voici comment faire :
1️⃣ Rendez-vous sur {link}
2️⃣ Rechargez votre compte (Wave, OM, MM acceptés)
3️⃣ Choisissez un numéro {country}
4️⃣ Activez {service} avec ce numéro
5️⃣ Répétez pour chaque nouveau compte

✨ Parfait pour :
• Freelancers qui gèrent plusieurs clients
• Community managers
• Entrepreneurs digitaux
• Influenceurs

Prix : {price} seulement !

📍 ONE SMS - La plateforme #1 des numéros virtuels en Afrique

{hashtags}`
    ]
  },
  
  linkedin: {
    maxLength: 3000,
    templates: [
      `🌍 Comment les freelancers africains utilisent les numéros virtuels pour se développer

Dans le monde du travail digital, avoir accès aux bons outils fait toute la différence.

Aujourd'hui, je veux partager avec vous une ressource qui a aidé des centaines de professionnels africains : les numéros virtuels.

❓ Le problème :
Beaucoup de plateformes internationales (PayPal, Stripe, {service}, etc.) nécessitent un numéro de téléphone américain ou européen. Sans cela, impossible de s'inscrire ou de vérifier son compte.

✅ La solution : ONE SMS
Une plateforme qui vous donne accès à des numéros virtuels de 190+ pays pour activer n'importe quel service.

💼 Cas d'usage professionnels :
• Vérifier votre compte {service} professionnel
• Créer plusieurs comptes clients séparés
• Accéder aux plateformes de freelance internationales
• Protéger votre numéro personnel

💰 Accessible : À partir de 3000F CFA
🇫🇷 En français : Interface et support
💳 Paiement local : Wave, Orange Money, Mobile Money

Pour les entrepreneurs, freelancers et professionnels qui veulent se développer à l'international sans les barrières administratives.

👉 En savoir plus : {link}

#FreelanceAfrique #Entrepreneuriat #Senegal #Digital #Productivity

Vous utilisez déjà des numéros virtuels ? Partagez vos use cases en commentaire ! 👇`,

      `📊 Étude de cas : Comment un community manager gère 10 comptes {service} depuis Dakar

La semaine dernière, j'ai échangé avec Amadou, community manager freelance basé à Dakar.

Son défi : Gérer 10 comptes {service} pour ses clients, mais {service} limite à 2 comptes par numéro de téléphone.

Sa solution : ONE SMS

Résultats :
✅ 10 comptes {service} professionnels créés
✅ Chaque client a son compte dédié
✅ Pas de mélange entre vie perso et pro
✅ Coût total : {totalCost} ({price} × 10)

💡 L'insight :
Les numéros virtuels ne sont pas juste pour "contourner" des restrictions.
Ce sont des outils professionnels qui permettent :
• Une meilleure organisation
• Plus de flexibilité
• Protection de la vie privée

🌍 Pour les professionnels en Afrique, c'est un game-changer.

Plateforme utilisée : ONE SMS ({link})
• 190+ pays disponibles
• Interface 100% français
• Paiement Wave/OM/MM
• Support réactif

Vous gérez plusieurs comptes pro ? Comment vous organisez-vous ?

#CommunityManager #SocialMedia #Afrique #Productivité #Outils`
    ]
  },
  
  instagram: {
    maxLength: 2200,
    caption: true,
    templates: [
      `🔥 NOUVEAU TUTO : Activer {service} avec ONE SMS

Swipe pour voir comment faire en 4 étapes ➡️

📱 Pourquoi utiliser un numéro virtuel ?
• Activer {service} sans carte SIM étrangère
• Créer plusieurs comptes
• Protéger ton vrai numéro

✨ Avec ONE SMS c'est simple :
1️⃣ Choisis ton pays (USA 🇺🇸, France 🇫🇷, UK 🇬🇧...)
2️⃣ Sélectionne {service}
3️⃣ Reçois ton numéro
4️⃣ SMS visible en 30 secondes

💰 Prix : À partir de {price}
🇫🇷 Interface en français
💳 Paye avec Wave, Orange Money, Mobile Money

👉 Lien dans la bio @onesms_official

—

{hashtags}

#onesms #numerovirtuel #{service} #{country} #astuce #tech #senegal #cotedivoire #afrique #digital #tuto #howto`,

      `💡 LIFE HACK : {count} comptes {service} sur un seul téléphone ?

C'est possible avec ONE SMS ! 🎉

Perfect pour :
✅ Freelancers
✅ Community managers
✅ Entrepreneurs
✅ Influenceurs

Comment faire ? Tuto complet dans mon dernier post 📲

Prix : {price} par compte
Paiement : Wave, OM, MM acceptés

Sauvegarde ce post pour plus tard ! 💾

—

Tu utilises déjà des numéros virtuels ? Dis-moi en commentaire ! 👇

{hashtags}`
    ]
  },
  
  tiktok: {
    maxLength: 2200,
    videoScript: true,
    templates: [
      `🎬 Script TikTok : {service} - Version 30 secondes

[0-3s] Hook visuel
POV: Tu veux activer {service} mais tu n'as pas de numéro {country}

[3-8s] Problème
*Montre l'écran de vérification {service}*
"Entrer un numéro de téléphone"
❌ Ton +221 ne marche pas

[8-15s] Solution
✅ ONE SMS à la rescousse !
*Montre l'app ONE SMS*
1. Choisis {country}
2. Sélectionne {service}
3. Reçois ton numéro

[15-25s] Résultat
*Montre le SMS qui arrive*
⚡ Code reçu en 30 secondes
✅ {service} activé !

[25-30s] CTA
💰 À partir de {price}
🔗 Lien dans ma bio
#onesms #{service} #astuce

—

Caption:
{service} activé sans numéro {country} 🔥 L'astuce que personne ne te dit ! 

{hashtags}

Musique suggérée : Trending hip-hop beat`,

      `🎬 Script TikTok : {service} - Version Before/After

[0-2s] BEFORE
*Écran noir, texte*
"Moi avant de connaître ONE SMS"

[2-5s]
*Toi frustré devant ton téléphone*
"Je peux pas activer {service} 😭"

[5-8s]
*Zoom sur l'erreur {service}*
"Numéro non valide"

[8-10s] TRANSITION
*Doigt qui scroll, trouve ONE SMS*

[10-15s] AFTER
*Toi souriant*
"Moi maintenant avec ONE SMS"

[15-20s]
✅ Numéro {country} acheté
✅ {service} activé
✅ SMS reçu instantanément

[20-25s]
*Montre plusieurs comptes {service}*
"Et j'en ai même créé {count} autres 😎"

[25-30s] CTA
💰 {price} seulement
🔗 ONE SMS (lien en bio)

{hashtags}

Musique : Before After Transition Trend`
    ]
  }
};

// ============================================================================
// GÉNÉRATEUR DE CONTENU PAR SERVICE
// ============================================================================

const SERVICE_CONFIGS = {
  whatsapp: {
    name: 'WhatsApp',
    emoji: '💬',
    country: 'USA 🇺🇸',
    price: '3000F',
    priceCoins: '5 Ⓐ',
    count: 5,
    totalCost: '15,000F',
    cta: 'Active WhatsApp maintenant',
    link: 'onesms-sn.com',
    hashtags: '#WhatsApp #NumeroVirtuel #Senegal #OneSMS #Tech #Astuce'
  },
  telegram: {
    name: 'Telegram',
    emoji: '✈️',
    country: 'France 🇫🇷',
    price: '3000F',
    priceCoins: '5 Ⓐ',
    count: 5,
    totalCost: '15,000F',
    cta: 'Active Telegram maintenant',
    link: 'onesms-sn.com',
    hashtags: '#Telegram #NumeroVirtuel #Senegal #OneSMS #Tech #Privacy'
  },
  instagram: {
    name: 'Instagram',
    emoji: '📸',
    country: 'UK 🇬🇧',
    price: '4000F',
    priceCoins: '7 Ⓐ',
    count: 3,
    totalCost: '12,000F',
    cta: 'Active Instagram maintenant',
    link: 'onesms-sn.com',
    hashtags: '#Instagram #NumeroVirtuel #Senegal #OneSMS #SocialMedia #Influenceur'
  },
  discord: {
    name: 'Discord',
    emoji: '🎮',
    country: 'USA 🇺🇸',
    price: '3000F',
    priceCoins: '5 Ⓐ',
    count: 10,
    totalCost: '30,000F',
    cta: 'Active Discord maintenant',
    link: 'onesms-sn.com',
    hashtags: '#Discord #Gaming #NumeroVirtuel #Senegal #OneSMS #Gamer'
  },
  google: {
    name: 'Google Voice',
    emoji: '📞',
    country: 'USA 🇺🇸',
    price: '6000F',
    priceCoins: '10 Ⓐ',
    count: 2,
    totalCost: '12,000F',
    cta: 'Obtiens Google Voice',
    link: 'onesms-sn.com',
    hashtags: '#GoogleVoice #NumeroVirtuel #Senegal #OneSMS #Tech #USA'
  }
};

// ============================================================================
// FONCTIONS PRINCIPALES
// ============================================================================

/**
 * Génère un post pour une plateforme et un service
 */
function generatePost(platform, service) {
  if (!PLATFORMS.includes(platform)) {
    console.error(`❌ Plateforme inconnue: ${platform}`);
    return null;
  }
  
  if (!SERVICES.includes(service)) {
    console.error(`❌ Service inconnu: ${service}`);
    return null;
  }
  
  const config = SERVICE_CONFIGS[service];
  const templates = POST_TEMPLATES[platform].templates;
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  // Remplacer les variables
  let post = template
    .replace(/{service}/g, config.name)
    .replace(/{emoji}/g, config.emoji)
    .replace(/{country}/g, config.country)
    .replace(/{price}/g, config.price)
    .replace(/{priceCoins}/g, config.priceCoins)
    .replace(/{count}/g, config.count)
    .replace(/{totalCost}/g, config.totalCost)
    .replace(/{cta}/g, config.cta)
    .replace(/{link}/g, config.link)
    .replace(/{hashtags}/g, config.hashtags);
  
  // Respecter la limite de caractères
  const maxLength = POST_TEMPLATES[platform].maxLength;
  if (post.length > maxLength) {
    post = post.substring(0, maxLength - 3) + '...';
  }
  
  return {
    platform,
    service,
    content: post,
    length: post.length,
    maxLength,
    timestamp: new Date().toISOString()
  };
}

/**
 * Génère tous les posts pour un service
 */
function generateAllPosts(service) {
  console.log(`\n📝 Génération des posts pour: ${service}\n`);
  
  const posts = {};
  PLATFORMS.forEach(platform => {
    const post = generatePost(platform, service);
    if (post) {
      posts[platform] = post;
      console.log(`✅ ${platform}: ${post.length}/${post.maxLength} caractères`);
    }
  });
  
  // Sauvegarder dans un fichier
  const filename = `posts_${service}_${Date.now()}.json`;
  const filepath = path.join(POSTS_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(posts, null, 2), 'utf8');
  
  console.log(`\n💾 Posts sauvegardés: ${filepath}`);
  
  return posts;
}

/**
 * Affiche un post
 */
function displayPost(post) {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  ${post.platform.toUpperCase().padEnd(60)} ║
╚════════════════════════════════════════════════════════════════╝

${post.content}

────────────────────────────────────────────────────────────────
Longueur: ${post.length}/${post.maxLength} caractères
Service: ${post.service}
Date: ${new Date(post.timestamp).toLocaleString('fr-FR')}
  `);
}

/**
 * Publie sur Twitter (via API ou CLI)
 */
function postToTwitter(content, dryRun = false) {
  console.log(`\n🐦 Publication sur Twitter...`);
  
  if (dryRun) {
    console.log('🔍 Mode dry-run : Simulation uniquement');
    console.log(`\nContenu à publier:\n${content}\n`);
    return true;
  }
  
  // TODO: Intégrer l'API Twitter
  // Nécessite: Twitter API v2, Bearer Token, OAuth 1.0a
  console.log(`
💡 Pour publier automatiquement sur Twitter:

1. Créez une app Twitter sur https://developer.twitter.com
2. Obtenez vos credentials (API Key, Secret, Access Token)
3. Installez: npm install twitter-api-v2
4. Utilisez ce code:

const { TwitterApi } = require('twitter-api-v2');
const client = new TwitterApi({
  appKey: 'YOUR_APP_KEY',
  appSecret: 'YOUR_APP_SECRET',
  accessToken: 'YOUR_ACCESS_TOKEN',
  accessSecret: 'YOUR_ACCESS_SECRET',
});

await client.v2.tweet('${content.replace(/\n/g, '\\n')}');

──────────────────────────────────────────────────────
Pour l'instant, copiez ce contenu et postez manuellement :
${content}
──────────────────────────────────────────────────────
  `);
  
  return false;
}

/**
 * Planifie des posts réguliers
 */
function schedulePosts(frequency = 'daily', count = 30) {
  console.log(`\n📅 Planification de ${count} posts (1/${frequency})\n`);
  
  const schedule = [];
  const now = new Date();
  
  // Moments optimaux de publication
  const postingTimes = {
    twitter: { hour: 12, minute: 0 },      // 12h
    facebook: { hour: 14, minute: 0 },     // 14h
    linkedin: { hour: 9, minute: 0 },      // 9h (business hours)
    instagram: { hour: 19, minute: 0 },    // 19h (peak engagement)
    tiktok: { hour: 20, minute: 0 }        // 20h (prime time)
  };
  
  for (let i = 0; i < count; i++) {
    const date = new Date(now);
    
    if (frequency === 'daily') {
      date.setDate(date.getDate() + i);
    } else if (frequency === 'weekly') {
      date.setDate(date.getDate() + (i * 7));
    }
    
    // Alterner les plateformes
    const platformIndex = i % PLATFORMS.length;
    const platform = PLATFORMS[platformIndex];
    const service = SERVICES[i % SERVICES.length];
    
    // Définir l'heure optimale
    const timing = postingTimes[platform];
    date.setHours(timing.hour, timing.minute, 0, 0);
    
    schedule.push({
      date: date.toISOString(),
      day: date.toLocaleDateString('fr-FR'),
      time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      platform,
      service,
      posted: false
    });
  }
  
  // Sauvegarder le planning
  fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2), 'utf8');
  
  console.log(`✅ Planning créé: ${SCHEDULE_FILE}`);
  console.log(`\n📋 Prochains posts:\n`);
  
  schedule.slice(0, 10).forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.day} ${item.time} - ${item.platform} (${item.service})`);
  });
  
  if (schedule.length > 10) {
    console.log(`   ... et ${schedule.length - 10} autres`);
  }
  
  console.log(`\n💡 Pour exécuter automatiquement, ajoutez à votre crontab:`);
  console.log(`   */30 * * * * cd "${process.cwd()}" && node auto_post_social.mjs --execute-schedule`);
  console.log(`   (vérifie toutes les 30 minutes si un post est prévu)`);
}

/**
 * Exécute les posts planifiés
 */
function executeSchedule(dryRun = false) {
  if (!fs.existsSync(SCHEDULE_FILE)) {
    console.log('❌ Aucun planning trouvé. Créez-en un avec --schedule');
    return;
  }
  
  const schedule = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
  const now = new Date();
  
  // Trouver les posts à faire maintenant (dans les 30 prochaines minutes)
  const upcomingPosts = schedule.filter(item => {
    if (item.posted) return false;
    
    const itemDate = new Date(item.date);
    const diffMinutes = (itemDate - now) / 1000 / 60;
    
    // Post si entre maintenant et +30 minutes
    return diffMinutes >= 0 && diffMinutes <= 30;
  });
  
  if (upcomingPosts.length === 0) {
    console.log('✅ Aucun post prévu dans les 30 prochaines minutes');
    return;
  }
  
  console.log(`\n📱 ${upcomingPosts.length} post(s) à publier\n`);
  
  upcomingPosts.forEach((item, index) => {
    console.log(`\n[${index + 1}/${upcomingPosts.length}] ${item.platform} - ${item.service}`);
    
    // Générer le post
    const post = generatePost(item.platform, item.service);
    if (!post) return;
    
    displayPost(post);
    
    // Publier (ou simuler)
    if (item.platform === 'twitter') {
      postToTwitter(post.content, dryRun);
    } else {
      console.log(`\n💡 Publication ${item.platform} : Copiez le contenu ci-dessus`);
    }
    
    // Marquer comme publié
    if (!dryRun) {
      item.posted = true;
      item.postedAt = new Date().toISOString();
    }
  });
  
  // Sauvegarder le planning mis à jour
  if (!dryRun) {
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2), 'utf8');
    console.log(`\n✅ Planning mis à jour`);
  }
  
  // Stats
  const remaining = schedule.filter(i => !i.posted).length;
  console.log(`\n📊 Posts restants: ${remaining}/${schedule.length}`);
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║      📱 AUTO-POSTING RÉSEAUX SOCIAUX - ONE SMS                ║
╚════════════════════════════════════════════════════════════════╝
  `);
  
  // Flags
  const dryRun = args.includes('--dry-run');
  const generate = args.find(arg => arg.includes('--generate'));
  const schedule = args.find(arg => arg.includes('--schedule'));
  const executeScheduleFlag = args.includes('--execute-schedule');
  const count = parseInt(args.find(arg => arg.includes('--count'))?.split('=')[1] || '30');
  
  // Exécuter le planning
  if (executeScheduleFlag) {
    executeSchedule(dryRun);
    return;
  }
  
  // Créer un planning
  if (schedule) {
    const frequency = schedule.split('=')[1] || 'daily';
    schedulePosts(frequency, count);
    return;
  }
  
  // Générer tous les posts pour un service
  if (generate) {
    const service = generate.split('=')[1];
    if (!SERVICES.includes(service)) {
      console.log(`❌ Service inconnu: ${service}`);
      console.log(`Services disponibles: ${SERVICES.join(', ')}`);
      return;
    }
    
    const posts = generateAllPosts(service);
    
    console.log(`\n📋 Posts générés pour ${service}:\n`);
    Object.keys(posts).forEach(platform => {
      displayPost(posts[platform]);
    });
    
    return;
  }
  
  // Post immédiat sur une plateforme
  const platform = args.find(arg => PLATFORMS.includes(arg));
  const service = args.find(arg => SERVICES.includes(arg));
  const customMessage = args.find(arg => !arg.startsWith('--') && !PLATFORMS.includes(arg) && !SERVICES.includes(arg));
  
  if (platform && customMessage) {
    // Post personnalisé
    console.log(`\n📝 Post personnalisé sur ${platform}\n`);
    if (platform === 'twitter') {
      postToTwitter(customMessage, dryRun);
    } else {
      console.log(`Plateforme: ${platform}`);
      console.log(`Message:\n${customMessage}`);
      console.log(`\n💡 Copiez ce message et postez-le manuellement`);
    }
    return;
  }
  
  if (platform && service) {
    // Générer et poster
    const post = generatePost(platform, service);
    if (post) {
      displayPost(post);
      
      if (platform === 'twitter') {
        postToTwitter(post.content, dryRun);
      } else {
        console.log(`\n💡 Copiez le contenu ci-dessus pour ${platform}`);
      }
    }
    return;
  }
  
  // Usage
  console.log(`
Usage:
  node auto_post_social.mjs <platform> <service>     # Générer et afficher un post
  node auto_post_social.mjs --generate=<service>     # Générer pour toutes les plateformes
  node auto_post_social.mjs --schedule=daily --count=30  # Planifier 30 jours
  node auto_post_social.mjs --execute-schedule       # Exécuter les posts du jour
  node auto_post_social.mjs --dry-run                # Mode test

Plateformes: ${PLATFORMS.join(', ')}
Services: ${SERVICES.join(', ')}

Exemples:
  node auto_post_social.mjs twitter whatsapp
  node auto_post_social.mjs --generate=telegram
  node auto_post_social.mjs --schedule=daily --count=30
  node auto_post_social.mjs --execute-schedule --dry-run
  `);
}

// Exécuter
main();
