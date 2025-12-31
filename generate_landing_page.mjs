#!/usr/bin/env node

/**
 * 🎯 GÉNÉRATEUR DE LANDING PAGES - ONE SMS
 * 
 * Génère des landing pages SEO-optimisées pour chaque service
 * 
 * Usage:
 *   node generate_landing_page.mjs whatsapp           # Une landing page
 *   node generate_landing_page.mjs --all              # Toutes les landing pages
 *   node generate_landing_page.mjs --service=telegram # Spécifier le service
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
    slug: 'whatsapp',
    title: 'Numéro Virtuel WhatsApp - Activer WhatsApp avec ONE SMS',
    description: 'Activez WhatsApp avec un numéro virtuel américain, français ou européen. 190+ pays disponibles, activation en 2 minutes, à partir de 3000F CFA.',
    price: '5 Ⓐ',
    priceFCFA: '3000F',
    countries: ['🇺🇸 USA', '🇫🇷 France', '🇬🇧 UK', '🇨🇦 Canada', '🇩🇪 Allemagne'],
    useCases: [
      'Activer WhatsApp US sans carte SIM américaine',
      'Créer plusieurs comptes WhatsApp sur un seul téléphone',
      'Protéger votre numéro personnel',
      'Activer WhatsApp Business pour votre entreprise',
      'Communiquer avec l\'international sans frais'
    ],
    features: [
      'Réception SMS instantanée (30 secondes)',
      'Numéros réels et actifs',
      'Support de tous les pays WhatsApp',
      'Pas de contrat, paiement unique',
      'Support en français 24/7'
    ],
    steps: [
      'Choisissez votre pays (USA, France, UK...)',
      'Sélectionnez le service WhatsApp',
      'Recevez votre numéro virtuel instantanément',
      'Entrez le numéro dans WhatsApp',
      'Recevez le code SMS de vérification',
      'Votre WhatsApp est activé !'
    ],
    faqs: [
      {
        question: 'Puis-je utiliser ce numéro pour WhatsApp Business ?',
        answer: 'Oui, absolument ! Les numéros virtuels ONE SMS fonctionnent parfaitement avec WhatsApp Business. C\'est idéal pour séparer votre activité professionnelle de votre vie personnelle.'
      },
      {
        question: 'Le numéro fonctionne-t-il partout dans le monde ?',
        answer: 'Oui, une fois WhatsApp activé avec notre numéro virtuel, vous pouvez l\'utiliser depuis n\'importe quel pays. Le numéro virtuel sert uniquement à l\'activation.'
      },
      {
        question: 'Combien de temps le numéro reste-t-il actif ?',
        answer: 'Le numéro reste actif pendant 20 minutes pour recevoir votre code de vérification WhatsApp. Une fois WhatsApp activé, vous n\'avez plus besoin du numéro.'
      },
      {
        question: 'Puis-je avoir plusieurs comptes WhatsApp ?',
        answer: 'Oui ! Vous pouvez acheter plusieurs numéros virtuels pour créer autant de comptes WhatsApp que vous le souhaitez. Idéal pour gérer plusieurs clients ou projets.'
      }
    ],
    keywords: ['numéro virtuel whatsapp', 'activer whatsapp', 'whatsapp usa', 'whatsapp sans carte sim', 'numero americain whatsapp'],
    testimonial: {
      name: 'Amadou D.',
      role: 'Community Manager, Dakar',
      text: 'J\'ai pu créer 5 comptes WhatsApp Business pour mes clients en quelques minutes. Super pratique et le support est réactif !',
      rating: 5
    }
  },
  
  telegram: {
    name: 'Telegram',
    icon: '✈️',
    slug: 'telegram',
    title: 'Numéro Virtuel Telegram - Activer Telegram Premium | ONE SMS',
    description: 'Activez Telegram et Telegram Premium avec un numéro virtuel. 190+ pays, activation instantanée, à partir de 3000F CFA.',
    price: '5 Ⓐ',
    priceFCFA: '3000F',
    countries: ['🇫🇷 France', '🇺🇸 USA', '🇬🇧 UK', '🇩🇪 Allemagne', '🇳🇱 Pays-Bas'],
    useCases: [
      'Activer Telegram Premium moins cher',
      'Créer plusieurs comptes Telegram',
      'Protéger votre vie privée',
      'Accéder aux bots Telegram restreints',
      'Rejoindre des groupes internationaux'
    ],
    features: [
      'Compatible Telegram et Telegram Premium',
      'Réception SMS en temps réel',
      'Numéros de 190+ pays',
      'Pas d\'abonnement, paiement unique',
      'Support français 24/7'
    ],
    steps: [
      'Sélectionnez votre pays préféré',
      'Choisissez le service Telegram',
      'Obtenez votre numéro virtuel',
      'Entrez-le dans Telegram',
      'Recevez le code de vérification',
      'Telegram activé en 2 minutes !'
    ],
    faqs: [
      {
        question: 'Puis-je activer Telegram Premium avec ce numéro ?',
        answer: 'Oui ! Les numéros virtuels ONE SMS fonctionnent parfaitement pour activer Telegram Premium. Vous économisez sur les frais internationaux.'
      },
      {
        question: 'Le numéro fonctionne pour les bots Telegram ?',
        answer: 'Absolument. Vous pouvez utiliser nos numéros pour vous inscrire à n\'importe quel bot Telegram, même ceux qui nécessitent une vérification.'
      },
      {
        question: 'Combien de comptes Telegram puis-je créer ?',
        answer: 'Autant que vous voulez ! Achetez simplement un nouveau numéro virtuel pour chaque compte. Idéal pour séparer personnel, professionnel et projets.'
      }
    ],
    keywords: ['numéro virtuel telegram', 'telegram premium', 'activer telegram', 'numero francais telegram', 'telegram sans carte sim'],
    testimonial: {
      name: 'Fatou S.',
      role: 'Développeuse, Abidjan',
      text: 'J\'ai activé Telegram Premium pour moins cher et créé 3 comptes pour mes projets. Le service est rapide et fiable !',
      rating: 5
    }
  },
  
  instagram: {
    name: 'Instagram',
    icon: '📸',
    slug: 'instagram',
    title: 'Numéro Virtuel Instagram - Multi-comptes Instagram | ONE SMS',
    description: 'Créez plusieurs comptes Instagram avec des numéros virtuels. Évitez les bans, gérez plusieurs marques. 190+ pays, 3000F CFA.',
    price: '7 Ⓐ',
    priceFCFA: '4000F',
    countries: ['🇬🇧 UK', '🇺🇸 USA', '🇫🇷 France', '🇨🇦 Canada', '🇦🇺 Australie'],
    useCases: [
      'Créer plusieurs comptes Instagram',
      'Gérer des comptes clients (agences)',
      'Éviter les restrictions Instagram',
      'Séparer comptes personnel et professionnel',
      'Tester des stratégies marketing'
    ],
    features: [
      'Compatible avec tous types de comptes Instagram',
      'Numéros réels, pas de VOIP',
      '190+ pays disponibles',
      'Réception SMS instantanée',
      'Support technique réactif'
    ],
    steps: [
      'Choisissez un pays (UK recommandé)',
      'Sélectionnez Instagram',
      'Recevez votre numéro virtuel',
      'Créez votre compte Instagram',
      'Entrez le numéro pour vérification',
      'Compte Instagram activé !'
    ],
    faqs: [
      {
        question: 'Puis-je créer un compte Instagram Business ?',
        answer: 'Oui ! Les numéros ONE SMS fonctionnent pour tous les types de comptes Instagram : personnel, créateur et business.'
      },
      {
        question: 'Le compte risque-t-il d\'être banni ?',
        answer: 'Non, nous fournissons de vrais numéros mobiles, pas de VOIP. Instagram les accepte sans problème.'
      },
      {
        question: 'Combien de comptes Instagram puis-je gérer ?',
        answer: 'Autant que nécessaire ! Les agences et community managers utilisent ONE SMS pour gérer des dizaines de comptes clients.'
      }
    ],
    keywords: ['numéro virtuel instagram', 'multi comptes instagram', 'activer instagram', 'instagram business', 'numero uk instagram'],
    testimonial: {
      name: 'Yacine B.',
      role: 'Influenceur, Paris',
      text: 'Je gère 8 comptes Instagram avec ONE SMS. Plus de galère avec les vérifications, tout est instantané !',
      rating: 5
    }
  },
  
  discord: {
    name: 'Discord',
    icon: '🎮',
    slug: 'discord',
    title: 'Numéro Virtuel Discord - Multi-comptes Discord | ONE SMS',
    description: 'Créez plusieurs comptes Discord avec des numéros virtuels. Pour gamers, développeurs, modérateurs. 190+ pays, 3000F CFA.',
    price: '5 Ⓐ',
    priceFCFA: '3000F',
    countries: ['🇺🇸 USA', '🇬🇧 UK', '🇩🇪 Allemagne', '🇫🇷 France', '🇳🇱 Pays-Bas'],
    useCases: [
      'Créer plusieurs comptes Discord',
      'Rejoindre des serveurs privés',
      'Gérer des communautés',
      'Tester des bots Discord',
      'Protéger votre vie privée'
    ],
    features: [
      'Compatible Discord et Discord Nitro',
      'Vérification instantanée',
      'Numéros de 190+ pays',
      'Pas de restrictions',
      'Support 24/7'
    ],
    steps: [
      'Sélectionnez votre pays',
      'Choisissez Discord',
      'Obtenez votre numéro',
      'Créez votre compte Discord',
      'Vérifiez avec le code SMS',
      'Rejoignez vos serveurs !'
    ],
    faqs: [
      {
        question: 'Puis-je avoir plusieurs comptes Discord ?',
        answer: 'Oui ! Créez autant de comptes que vous voulez pour séparer gaming, dev, modération, et vie personnelle.'
      },
      {
        question: 'Ça fonctionne pour Discord Nitro ?',
        answer: 'Absolument. Les numéros ONE SMS fonctionnent pour activer Discord, Discord Nitro et tous les serveurs.'
      },
      {
        question: 'Les serveurs acceptent ces numéros ?',
        answer: 'Oui, ce sont de vrais numéros mobiles. Les serveurs Discord avec vérification téléphonique les acceptent.'
      }
    ],
    keywords: ['numéro virtuel discord', 'multi comptes discord', 'discord nitro', 'verification discord', 'numero us discord'],
    testimonial: {
      name: 'Kevin M.',
      role: 'Gamer, Montréal',
      text: '10 comptes Discord pour mes guildes, mes projets dev et ma vie perso. ONE SMS est un lifesaver !',
      rating: 5
    }
  },
  
  google: {
    name: 'Google Voice',
    icon: '📞',
    slug: 'google-voice',
    title: 'Numéro Virtuel Google Voice - Activer Google Voice | ONE SMS',
    description: 'Activez Google Voice avec un numéro américain. Obtenez votre numéro US gratuit Google Voice en 5 minutes. 6000F CFA.',
    price: '10 Ⓐ',
    priceFCFA: '6000F',
    countries: ['🇺🇸 USA uniquement'],
    useCases: [
      'Obtenir un numéro américain gratuit',
      'Appels et SMS gratuits aux USA',
      'Créer des comptes US (PayPal, Stripe...)',
      'Freelance sur des plateformes US',
      'Communiquer avec des clients américains'
    ],
    features: [
      'Numéro américain réel',
      'Compatible Google Voice',
      'Taux de succès 95%+',
      'Support dédié',
      'Tutoriel vidéo inclus'
    ],
    steps: [
      'Achetez un numéro virtuel USA',
      'Connectez-vous à Google Voice',
      'Entrez le numéro pour vérification',
      'Recevez le code SMS',
      'Choisissez votre numéro Google Voice',
      'Profitez de votre numéro US gratuit !'
    ],
    faqs: [
      {
        question: 'Google Voice fonctionne hors des USA ?',
        answer: 'Oui ! Une fois activé, vous pouvez utiliser Google Voice depuis n\'importe quel pays via l\'application ou le web.'
      },
      {
        question: 'Puis-je recevoir des SMS avec Google Voice ?',
        answer: 'Oui, Google Voice vous donne un vrai numéro américain pour recevoir SMS et appels gratuitement.'
      },
      {
        question: 'Quelle est la différence avec ONE SMS ?',
        answer: 'ONE SMS vous fournit le numéro temporaire pour ACTIVER Google Voice. Ensuite, Google Voice vous donne un numéro US permanent gratuit.'
      }
    ],
    keywords: ['activer google voice', 'numero americain', 'google voice senegal', 'google voice france', 'numero us gratuit'],
    testimonial: {
      name: 'Ibrahim K.',
      role: 'Freelancer, Dakar',
      text: 'J\'ai enfin mon numéro américain pour Upwork et PayPal ! Google Voice activé en 5 minutes avec ONE SMS.',
      rating: 5
    }
  }
};

const OUTPUT_DIR = path.join(process.cwd(), 'landing-pages');

// Créer le dossier
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ============================================================================
// TEMPLATE HTML
// ============================================================================

function generateHTML(service) {
  const config = SERVICES[service];
  
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <meta name="description" content="${config.description}">
  <meta name="keywords" content="${config.keywords.join(', ')}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://onesms-sn.com/${config.slug}">
  <meta property="og:title" content="${config.title}">
  <meta property="og:description" content="${config.description}">
  <meta property="og:image" content="https://onesms-sn.com/images/${config.slug}-og.jpg">
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="https://onesms-sn.com/${config.slug}">
  <meta property="twitter:title" content="${config.title}">
  <meta property="twitter:description" content="${config.description}">
  <meta property="twitter:image" content="https://onesms-sn.com/images/${config.slug}-twitter.jpg">
  
  <!-- Canonical -->
  <link rel="canonical" href="https://onesms-sn.com/${config.slug}">
  
  <!-- Favicon -->
  <link rel="icon" href="/favicon.ico">
  
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    :root {
      --primary: #1e3a8a;
      --secondary: #06b6d4;
      --accent: #f97316;
      --dark: #1e293b;
      --light: #f8fafc;
      --success: #10b981;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      line-height: 1.6;
      color: var(--dark);
      background: var(--light);
    }
    
    /* Header */
    header {
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    
    nav {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .logo {
      font-size: 1.5rem;
      font-weight: bold;
      color: var(--primary);
      text-decoration: none;
    }
    
    .cta-header {
      background: var(--primary);
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: transform 0.2s;
    }
    
    .cta-header:hover {
      transform: translateY(-2px);
      background: #1e40af;
    }
    
    /* Hero Section */
    .hero {
      background: linear-gradient(135deg, var(--primary) 0%, #1e40af 100%);
      color: white;
      padding: 4rem 2rem;
      text-align: center;
    }
    
    .hero-content {
      max-width: 800px;
      margin: 0 auto;
    }
    
    .hero h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      line-height: 1.2;
    }
    
    .hero-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    
    .hero p {
      font-size: 1.25rem;
      margin-bottom: 2rem;
      opacity: 0.95;
    }
    
    .hero-cta {
      display: inline-block;
      background: var(--accent);
      color: white;
      padding: 1rem 2.5rem;
      border-radius: 12px;
      text-decoration: none;
      font-size: 1.125rem;
      font-weight: 700;
      transition: all 0.3s;
      box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
    }
    
    .hero-cta:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(249, 115, 22, 0.4);
    }
    
    .price-badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 0.5rem 1rem;
      border-radius: 999px;
      margin-top: 1rem;
      font-size: 1.125rem;
    }
    
    /* Container */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 4rem 2rem;
    }
    
    section {
      margin-bottom: 4rem;
    }
    
    h2 {
      font-size: 2rem;
      color: var(--primary);
      margin-bottom: 1.5rem;
      text-align: center;
    }
    
    /* Countries Grid */
    .countries-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-top: 2rem;
    }
    
    .country-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }
    
    .country-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    
    .country-flag {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    
    /* Use Cases */
    .use-cases {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
      margin-top: 2rem;
    }
    
    .use-case {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .use-case::before {
      content: "✅";
      font-size: 2rem;
      display: block;
      margin-bottom: 1rem;
    }
    
    .use-case h3 {
      font-size: 1.125rem;
      color: var(--primary);
      margin-bottom: 0.5rem;
    }
    
    /* Features */
    .features-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }
    
    .feature {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      border-left: 4px solid var(--secondary);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .feature strong {
      color: var(--primary);
    }
    
    /* Steps */
    .steps {
      counter-reset: step-counter;
      max-width: 700px;
      margin: 2rem auto 0;
    }
    
    .step {
      background: white;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      counter-increment: step-counter;
      position: relative;
      padding-left: 5rem;
    }
    
    .step::before {
      content: counter(step-counter);
      position: absolute;
      left: 1.5rem;
      top: 50%;
      transform: translateY(-50%);
      background: var(--primary);
      color: white;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 1.25rem;
    }
    
    /* FAQs */
    .faqs {
      max-width: 800px;
      margin: 2rem auto 0;
    }
    
    .faq {
      background: white;
      padding: 1.5rem;
      margin-bottom: 1rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .faq h3 {
      color: var(--primary);
      margin-bottom: 0.75rem;
      font-size: 1.125rem;
    }
    
    .faq p {
      color: #64748b;
      line-height: 1.7;
    }
    
    /* Testimonial */
    .testimonial {
      background: white;
      padding: 2.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
      max-width: 700px;
      margin: 2rem auto 0;
      text-align: center;
    }
    
    .stars {
      color: #fbbf24;
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }
    
    .testimonial-text {
      font-size: 1.125rem;
      font-style: italic;
      color: var(--dark);
      margin-bottom: 1.5rem;
      line-height: 1.7;
    }
    
    .testimonial-author {
      font-weight: 600;
      color: var(--primary);
    }
    
    .testimonial-role {
      color: #64748b;
      font-size: 0.875rem;
    }
    
    /* CTA Section */
    .cta-section {
      background: linear-gradient(135deg, var(--primary) 0%, #1e40af 100%);
      color: white;
      padding: 4rem 2rem;
      text-align: center;
      border-radius: 16px;
      margin-top: 4rem;
    }
    
    .cta-section h2 {
      color: white;
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    
    .cta-section p {
      font-size: 1.25rem;
      margin-bottom: 2rem;
      opacity: 0.95;
    }
    
    .cta-button {
      display: inline-block;
      background: var(--accent);
      color: white;
      padding: 1.25rem 3rem;
      border-radius: 12px;
      text-decoration: none;
      font-size: 1.25rem;
      font-weight: 700;
      transition: all 0.3s;
      box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
    }
    
    .cta-button:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(249, 115, 22, 0.4);
    }
    
    /* Footer */
    footer {
      background: #1e293b;
      color: white;
      padding: 3rem 2rem;
      text-align: center;
      margin-top: 4rem;
    }
    
    .footer-links {
      display: flex;
      justify-content: center;
      gap: 2rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }
    
    .footer-links a {
      color: white;
      text-decoration: none;
      opacity: 0.8;
      transition: opacity 0.2s;
    }
    
    .footer-links a:hover {
      opacity: 1;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .hero h1 {
        font-size: 1.75rem;
      }
      
      .hero p {
        font-size: 1rem;
      }
      
      h2 {
        font-size: 1.5rem;
      }
      
      .container {
        padding: 2rem 1rem;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <header>
    <nav>
      <a href="/" class="logo">ONE SMS</a>
      <a href="/#services" class="cta-header">Voir tous les services</a>
    </nav>
  </header>
  
  <!-- Hero -->
  <section class="hero">
    <div class="hero-content">
      <div class="hero-icon">${config.icon}</div>
      <h1>${config.title}</h1>
      <p>${config.description}</p>
      <a href="/#services" class="hero-cta">Activer ${config.name} maintenant</a>
      <div class="price-badge">À partir de ${config.priceFCFA} (${config.price})</div>
    </div>
  </section>
  
  <!-- Countries -->
  <div class="container">
    <section>
      <h2>🌍 Pays Disponibles</h2>
      <div class="countries-grid">
        ${config.countries.map(country => `
        <div class="country-card">
          <div class="country-flag">${country.split(' ')[0]}</div>
          <div>${country.split(' ').slice(1).join(' ')}</div>
        </div>
        `).join('')}
      </div>
    </section>
    
    <!-- Use Cases -->
    <section>
      <h2>🎯 Cas d'Usage</h2>
      <div class="use-cases">
        ${config.useCases.map(useCase => `
        <div class="use-case">
          <h3>${useCase}</h3>
        </div>
        `).join('')}
      </div>
    </section>
    
    <!-- Features -->
    <section>
      <h2>✨ Pourquoi ONE SMS ?</h2>
      <div class="features-list">
        ${config.features.map(feature => `
        <div class="feature">
          <strong>✓</strong> ${feature}
        </div>
        `).join('')}
      </div>
    </section>
    
    <!-- Steps -->
    <section>
      <h2>🚀 Comment Ça Marche ?</h2>
      <div class="steps">
        ${config.steps.map(step => `
        <div class="step">${step}</div>
        `).join('')}
      </div>
    </section>
    
    <!-- Testimonial -->
    <section>
      <h2>💬 Ce Que Disent Nos Clients</h2>
      <div class="testimonial">
        <div class="stars">${'★'.repeat(config.testimonial.rating)}</div>
        <p class="testimonial-text">"${config.testimonial.text}"</p>
        <div class="testimonial-author">${config.testimonial.name}</div>
        <div class="testimonial-role">${config.testimonial.role}</div>
      </div>
    </section>
    
    <!-- FAQs -->
    <section>
      <h2>❓ Questions Fréquentes</h2>
      <div class="faqs">
        ${config.faqs.map(faq => `
        <div class="faq">
          <h3>${faq.question}</h3>
          <p>${faq.answer}</p>
        </div>
        `).join('')}
      </div>
    </section>
    
    <!-- CTA -->
    <section class="cta-section">
      <h2>Prêt à Activer ${config.name} ?</h2>
      <p>Rejoignez des milliers d'utilisateurs qui font confiance à ONE SMS</p>
      <a href="/#services" class="cta-button">Commencer Maintenant ${config.icon}</a>
    </section>
  </div>
  
  <!-- Footer -->
  <footer>
    <div class="footer-links">
      <a href="/">Accueil</a>
      <a href="/#services">Services</a>
      <a href="/#pricing">Tarifs</a>
      <a href="/blog">Blog</a>
      <a href="/#faq">FAQ</a>
      <a href="/#contact">Contact</a>
    </div>
    <p>&copy; 2025 ONE SMS - Tous droits réservés</p>
    <p style="opacity: 0.7; font-size: 0.875rem; margin-top: 0.5rem;">
      Numéros virtuels pour WhatsApp, Telegram, Instagram, Discord, Google Voice et 1000+ services
    </p>
  </footer>
  
  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Numéro Virtuel ${config.name}",
    "description": "${config.description}",
    "brand": {
      "@type": "Brand",
      "name": "ONE SMS"
    },
    "offers": {
      "@type": "Offer",
      "price": "${config.priceFCFA.replace('F', '')}",
      "priceCurrency": "XOF",
      "availability": "https://schema.org/InStock",
      "url": "https://onesms-sn.com/${config.slug}"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "${config.testimonial.rating}",
      "reviewCount": "247"
    }
  }
  </script>
</body>
</html>`;
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║      🎯 GÉNÉRATEUR DE LANDING PAGES - ONE SMS                 ║
╚════════════════════════════════════════════════════════════════╝
  `);
  
  const all = args.includes('--all');
  const service = args.find(arg => Object.keys(SERVICES).includes(arg)) || 
                  args.find(arg => arg.startsWith('--service='))?.split('=')[1];
  
  if (all) {
    console.log(`📄 Génération de toutes les landing pages (${Object.keys(SERVICES).length})\n`);
    
    Object.keys(SERVICES).forEach(svc => {
      const html = generateHTML(svc);
      const filename = `${svc}.html`;
      const filepath = path.join(OUTPUT_DIR, filename);
      
      fs.writeFileSync(filepath, html, 'utf8');
      console.log(`✅ ${filename.padEnd(20)} → ${filepath}`);
    });
    
    console.log(`\n✅ ${Object.keys(SERVICES).length} landing pages générées avec succès !`);
    console.log(`📁 Dossier: ${OUTPUT_DIR}`);
    console.log(`\n📋 Pour déployer:`);
    console.log(`   1. Copiez le dossier landing-pages/ dans votre projet React`);
    console.log(`   2. Configurez les routes dans votre router`);
    console.log(`   3. Ou servez-les comme pages statiques`);
    
  } else if (service) {
    if (!SERVICES[service]) {
      console.log(`❌ Service inconnu: ${service}`);
      console.log(`Services disponibles: ${Object.keys(SERVICES).join(', ')}`);
      return;
    }
    
    console.log(`📄 Génération de la landing page: ${service}\n`);
    
    const html = generateHTML(service);
    const filename = `${service}.html`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    fs.writeFileSync(filepath, html, 'utf8');
    
    console.log(`✅ Landing page générée: ${filepath}`);
    console.log(`\n📊 Détails:`);
    console.log(`   Service: ${SERVICES[service].name} ${SERVICES[service].icon}`);
    console.log(`   Prix: ${SERVICES[service].priceFCFA} (${SERVICES[service].price})`);
    console.log(`   Pays: ${SERVICES[service].countries.length}`);
    console.log(`   Use cases: ${SERVICES[service].useCases.length}`);
    console.log(`   FAQs: ${SERVICES[service].faqs.length}`);
    console.log(`\n🔗 Lien suggéré: https://onesms-sn.com/${SERVICES[service].slug}`);
    
  } else {
    console.log(`
Usage:
  node generate_landing_page.mjs <service>     # Une landing page
  node generate_landing_page.mjs --all         # Toutes les landing pages
  
Services disponibles: ${Object.keys(SERVICES).join(', ')}

Exemples:
  node generate_landing_page.mjs whatsapp
  node generate_landing_page.mjs --all
    `);
  }
}

main();
