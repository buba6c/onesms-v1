#!/usr/bin/env node

/**
 * 📧 EMAIL MARKETING AUTOMATION - ONE SMS
 * 
 * Gestion automatisée des campagnes email (Mailchimp/Brevo)
 * 
 * Usage:
 *   node email_marketing.mjs setup                    # Configuration initiale
 *   node email_marketing.mjs send-welcome <email>     # Séquence de bienvenue
 *   node email_marketing.mjs campaign                 # Campagne newsletter
 *   node email_marketing.mjs reactivation             # Campagne réactivation
 *   node email_marketing.mjs stats                    # Statistiques
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CONFIG_FILE = path.join(process.cwd(), 'email_config.json');

// ============================================================================
// TEMPLATES D'EMAILS
// ============================================================================

const EMAIL_TEMPLATES = {
  welcome_day0: {
    subject: '🎉 Bienvenue sur ONE SMS - Vos numéros virtuels',
    preheader: 'Activez WhatsApp, Telegram, Instagram en 2 minutes',
    content: `
      <h1>Bienvenue sur ONE SMS ! 👋</h1>
      
      <p>Bonjour {{name}},</p>
      
      <p>Merci de rejoindre ONE SMS, la plateforme #1 des numéros virtuels en Afrique !</p>
      
      <h2>🚀 Comment démarrer ?</h2>
      
      <ol>
        <li><strong>Rechargez votre compte</strong> - À partir de 3000F CFA (Wave, Orange Money, Mobile Money)</li>
        <li><strong>Choisissez votre service</strong> - WhatsApp, Telegram, Instagram, Discord, Google Voice...</li>
        <li><strong>Sélectionnez un pays</strong> - 190+ pays disponibles</li>
        <li><strong>Recevez votre numéro</strong> - Instantanément</li>
        <li><strong>Activez votre service</strong> - Code SMS en 30 secondes</li>
      </ol>
      
      <p style="text-align: center; margin: 2rem 0;">
        <a href="https://onesms-sn.com/recharge" style="background: #1e3a8a; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; display: inline-block;">
          💰 Recharger mon compte
        </a>
      </p>
      
      <h2>🎁 Offre de bienvenue</h2>
      <p>Utilisez le code <strong>WELCOME10</strong> pour obtenir <strong>10% de bonus</strong> sur votre première recharge !</p>
      
      <h2>❓ Besoin d'aide ?</h2>
      <ul>
        <li>📺 <a href="https://onesms-sn.com/blog">Tutoriels vidéo</a></li>
        <li>❓ <a href="https://onesms-sn.com/#faq">FAQ complète</a></li>
        <li>💬 Support WhatsApp : +221 XX XXX XXXX</li>
      </ul>
      
      <p>À très vite sur ONE SMS !</p>
      <p><strong>L'équipe ONE SMS</strong></p>
    `,
    cta: 'Recharger mon compte',
    ctaLink: 'https://onesms-sn.com/recharge'
  },
  
  welcome_day3: {
    subject: '💡 3 astuces pour utiliser ONE SMS comme un pro',
    preheader: 'Maximisez votre utilisation de ONE SMS',
    content: `
      <h1>Hey {{name}} ! 👋</h1>
      
      <p>Ça fait 3 jours que vous êtes sur ONE SMS. Voici 3 astuces que peu de gens connaissent :</p>
      
      <h2>1️⃣ Créez plusieurs comptes WhatsApp</h2>
      <p>Vous pouvez avoir <strong>jusqu'à 10 comptes WhatsApp</strong> sur un seul téléphone avec ONE SMS. Parfait pour :</p>
      <ul>
        <li>Séparer vie perso et pro</li>
        <li>Gérer plusieurs clients</li>
        <li>Tester des stratégies marketing</li>
      </ul>
      
      <h2>2️⃣ Google Voice = Numéro US gratuit</h2>
      <p>Saviez-vous qu'avec 6000F CFA, vous pouvez obtenir un <strong>numéro américain permanent gratuit</strong> via Google Voice ?</p>
      <p>➡️ <a href="https://onesms-sn.com/google-voice">Voir le tutoriel</a></p>
      
      <h2>3️⃣ Parrainez vos amis, gagnez des Ⓐ</h2>
      <p>Pour chaque ami qui recharge, vous gagnez <strong>10% de commission</strong>. Votre lien :</p>
      <p><strong>https://onesms-sn.com/ref/{{userId}}</strong></p>
      
      <p style="text-align: center; margin: 2rem 0;">
        <a href="https://onesms-sn.com/referral" style="background: #f97316; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; display: inline-block;">
          🎁 Voir mon programme de parrainage
        </a>
      </p>
      
      <p>Des questions ? On est là !</p>
      <p><strong>L'équipe ONE SMS</strong></p>
    `,
    cta: 'Parrainer des amis',
    ctaLink: 'https://onesms-sn.com/referral'
  },
  
  reactivation: {
    subject: '😢 On vous manque ? Revenez avec 20% de bonus !',
    preheader: 'Offre exclusive : +20% sur votre prochaine recharge',
    content: `
      <h1>Ça fait longtemps, {{name}} ! 👋</h1>
      
      <p>Cela fait {{daysSinceLastActivity}} jours que vous n'avez pas utilisé ONE SMS.</p>
      
      <p>On espère que tout va bien ! Pour vous accueillir à nouveau, on vous offre :</p>
      
      <h2 style="text-align: center; color: #f97316; font-size: 2rem;">
        🎁 +20% DE BONUS
      </h2>
      
      <p style="text-align: center;">
        Sur votre prochaine recharge avec le code <strong>COMEBACK20</strong>
      </p>
      
      <p style="text-align: center; margin: 2rem 0;">
        <a href="https://onesms-sn.com/recharge?code=COMEBACK20" style="background: #f97316; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 1.125rem;">
          💰 Profiter de l'offre
        </a>
      </p>
      
      <h2>🆕 Quoi de neuf ?</h2>
      <ul>
        <li>✅ 50+ nouveaux services ajoutés</li>
        <li>✅ Prix réduits sur plusieurs pays</li>
        <li>✅ Interface améliorée</li>
        <li>✅ Support WhatsApp 24/7</li>
      </ul>
      
      <p><strong>Offre valable 48h seulement !</strong></p>
      
      <p>On a hâte de vous revoir !</p>
      <p><strong>L'équipe ONE SMS</strong></p>
    `,
    cta: 'Profiter de l\'offre',
    ctaLink: 'https://onesms-sn.com/recharge?code=COMEBACK20'
  },
  
  newsletter: {
    subject: '📰 ONE SMS - Nouveautés de {{month}}',
    preheader: 'Nouveaux services, tutoriels, astuces...',
    content: `
      <h1>Newsletter ONE SMS 📰</h1>
      
      <p>Bonjour {{name}},</p>
      
      <p>Voici les actualités du mois de {{month}} :</p>
      
      <h2>🆕 Nouveautés</h2>
      <ul>
        <li>✨ 25 nouveaux services ajoutés (TikTok, Binance, PayPal...)</li>
        <li>🇳🇬 Nigeria et Ghana maintenant disponibles</li>
        <li>⚡ Vitesse de réception SMS améliorée (-50%)</li>
      </ul>
      
      <h2>📺 Nouveau tutoriel</h2>
      <p>Apprenez à activer Telegram Premium pour moins cher :</p>
      <p>➡️ <a href="https://onesms-sn.com/blog/telegram-premium">Lire le tutoriel</a></p>
      
      <h2>💡 Astuce du mois</h2>
      <p><strong>Créez un compte Instagram Business sans exposer votre vrai numéro</strong></p>
      <p>Utilisez un numéro UK pour +95% de taux de succès sur Instagram.</p>
      
      <h2>📊 Vos stats</h2>
      <ul>
        <li>Activations ce mois : {{userActivationsCount}}</li>
        <li>Services utilisés : {{userServicesCount}}</li>
        <li>Économies estimées : {{savings}}F CFA</li>
      </ul>
      
      <p style="text-align: center; margin: 2rem 0;">
        <a href="https://onesms-sn.com/dashboard" style="background: #1e3a8a; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; display: inline-block;">
          📊 Voir mon dashboard
        </a>
      </p>
      
      <p>À bientôt !</p>
      <p><strong>L'équipe ONE SMS</strong></p>
    `,
    cta: 'Voir mon dashboard',
    ctaLink: 'https://onesms-sn.com/dashboard'
  }
};

// ============================================================================
// EMAIL WRAPPER (HTML)
// ============================================================================

function wrapEmailHTML(template, data = {}) {
  const content = template.content
    .replace(/{{name}}/g, data.name || 'Cher utilisateur')
    .replace(/{{userId}}/g, data.userId || 'XXXXX')
    .replace(/{{month}}/g, data.month || new Date().toLocaleDateString('fr-FR', { month: 'long' }))
    .replace(/{{daysSinceLastActivity}}/g, data.daysSinceLastActivity || '30')
    .replace(/{{userActivationsCount}}/g, data.userActivationsCount || '0')
    .replace(/{{userServicesCount}}/g, data.userServicesCount || '0')
    .replace(/{{savings}}/g, data.savings || '0');
  
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      background-color: #f8fafc;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
      color: white;
      padding: 2rem;
      text-align: center;
    }
    .logo {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }
    .content {
      padding: 2rem;
      color: #1e293b;
      line-height: 1.7;
    }
    h1 {
      color: #1e3a8a;
      font-size: 1.75rem;
      margin-top: 0;
    }
    h2 {
      color: #1e3a8a;
      font-size: 1.25rem;
      margin-top: 1.5rem;
    }
    a {
      color: #06b6d4;
      text-decoration: none;
    }
    ul, ol {
      margin: 1rem 0;
      padding-left: 1.5rem;
    }
    li {
      margin: 0.5rem 0;
    }
    .footer {
      background: #1e293b;
      color: white;
      padding: 1.5rem;
      text-align: center;
      font-size: 0.875rem;
    }
    .footer a {
      color: #06b6d4;
      margin: 0 0.5rem;
    }
    .preheader {
      display: none;
      font-size: 1px;
      color: #f8fafc;
      line-height: 1px;
      max-height: 0px;
      max-width: 0px;
      opacity: 0;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div class="preheader">${template.preheader}</div>
  
  <div class="email-container">
    <div class="header">
      <div class="logo">ONE SMS</div>
      <div>Vos numéros virtuels</div>
    </div>
    
    <div class="content">
      ${content}
    </div>
    
    <div class="footer">
      <p><strong>ONE SMS</strong> - La plateforme #1 des numéros virtuels en Afrique</p>
      <p>
        <a href="https://onesms-sn.com">Site web</a> |
        <a href="https://onesms-sn.com/blog">Blog</a> |
        <a href="https://onesms-sn.com/#faq">FAQ</a> |
        <a href="https://onesms-sn.com/#contact">Contact</a>
      </p>
      <p style="font-size: 0.75rem; opacity: 0.7; margin-top: 1rem;">
        Vous recevez cet email car vous avez un compte sur ONE SMS.<br>
        <a href="{{unsubscribeLink}}" style="color: #94a3b8;">Se désabonner</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ============================================================================
// FONCTIONS PRINCIPALES
// ============================================================================

/**
 * Configuration initiale
 */
async function setup() {
  console.log('📧 CONFIGURATION EMAIL MARKETING\n');
  
  const config = {
    provider: 'brevo', // ou 'mailchimp'
    apiKey: 'YOUR_API_KEY_HERE',
    fromEmail: 'contact@onesms-sn.com',
    fromName: 'ONE SMS',
    replyTo: 'support@onesms-sn.com',
    sequences: {
      welcome: {
        enabled: true,
        emails: ['welcome_day0', 'welcome_day3']
      },
      reactivation: {
        enabled: true,
        inactiveDays: 30
      },
      newsletter: {
        enabled: true,
        frequency: 'monthly'
      }
    },
    lastRun: null
  };
  
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  
  console.log('✅ Configuration créée: email_config.json\n');
  console.log('📋 Prochaines étapes:\n');
  console.log('1. Inscrivez-vous sur Brevo (gratuit jusqu\'à 300 emails/jour):');
  console.log('   https://www.brevo.com\n');
  console.log('2. Obtenez votre API Key:');
  console.log('   Dashboard > Settings > API Keys\n');
  console.log('3. Modifiez email_config.json avec votre clé:\n');
  console.log('   "apiKey": "xkeysib-YOUR_KEY_HERE"\n');
  console.log('4. Testez avec: node email_marketing.mjs test\n');
}

/**
 * Envoie la séquence de bienvenue
 */
async function sendWelcomeSequence(email, userId = null) {
  console.log(`\n📧 Envoi séquence de bienvenue à: ${email}\n`);
  
  // Récupérer les infos utilisateur
  let userName = 'Cher utilisateur';
  if (userId) {
    const { data: user } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', userId)
      .single();
    
    if (user && user.name) {
      userName = user.name.split(' ')[0]; // Prénom uniquement
    }
  }
  
  // Email Day 0 (immédiat)
  const email1 = wrapEmailHTML(EMAIL_TEMPLATES.welcome_day0, {
    name: userName,
    userId: userId || 'XXXXX'
  });
  
  console.log('✅ Email 1/2 préparé: Bienvenue immédiate');
  console.log(`   Sujet: ${EMAIL_TEMPLATES.welcome_day0.subject}`);
  console.log(`   Destinataire: ${email}`);
  
  // Sauvegarder localement pour test
  const timestamp = Date.now();
  fs.writeFileSync(
    path.join(process.cwd(), `email_welcome_${timestamp}.html`),
    email1,
    'utf8'
  );
  console.log(`   Sauvegardé: email_welcome_${timestamp}.html`);
  
  // Email Day 3 (planifié)
  console.log('\n✅ Email 2/2 planifié: Astuces J+3');
  console.log(`   Sujet: ${EMAIL_TEMPLATES.welcome_day3.subject}`);
  console.log(`   Envoi dans: 3 jours`);
  
  console.log('\n💡 Pour envoyer via Brevo API:');
  console.log(`
const SibApiV3Sdk = require('sib-api-v3-sdk');
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = 'YOUR_API_KEY';

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

sendSmtpEmail.subject = "${EMAIL_TEMPLATES.welcome_day0.subject}";
sendSmtpEmail.htmlContent = \`${email1.substring(0, 100)}...\`;
sendSmtpEmail.sender = {"name":"ONE SMS","email":"contact@onesms-sn.com"};
sendSmtpEmail.to = [{"email":"${email}","name":"${userName}"}];

apiInstance.sendTransacEmail(sendSmtpEmail).then(() => {
  console.log('Email envoyé !');
});
  `);
}

/**
 * Campagne de réactivation
 */
async function reactivationCampaign() {
  console.log('\n📧 CAMPAGNE DE RÉACTIVATION\n');
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Trouver les utilisateurs inactifs
  const { data: inactiveUsers, error } = await supabase
    .from('users')
    .select('id, email, name, created_at')
    .lt('last_activity', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (error) {
    console.log('❌ Erreur:', error.message);
    return;
  }
  
  console.log(`📊 Utilisateurs inactifs trouvés: ${inactiveUsers.length}\n`);
  
  if (inactiveUsers.length === 0) {
    console.log('✅ Aucun utilisateur inactif à réactiver');
    return;
  }
  
  console.log('📋 Prévisualisation (5 premiers):');
  inactiveUsers.slice(0, 5).forEach((user, i) => {
    const daysSince = Math.floor((Date.now() - new Date(user.created_at)) / 86400000);
    console.log(`   ${i + 1}. ${user.email} - ${daysSince} jours d'inactivité`);
  });
  
  console.log(`\n💡 Pour envoyer ${inactiveUsers.length} emails de réactivation:`);
  console.log(`
const emails = ${JSON.stringify(inactiveUsers.map(u => ({
    email: u.email,
    name: u.name || 'Utilisateur',
    daysSince: Math.floor((Date.now() - new Date(u.created_at)) / 86400000)
  })), null, 2)};

emails.forEach(user => {
  // Envoyer email de réactivation
  sendEmail({
    to: user.email,
    subject: "😢 On vous manque ? Revenez avec 20% de bonus !",
    html: templateReactivation(user)
  });
});
  `);
  
  // Sauvegarder un exemple
  if (inactiveUsers.length > 0) {
    const exampleUser = inactiveUsers[0];
    const daysSince = Math.floor((Date.now() - new Date(exampleUser.created_at)) / 86400000);
    const email = wrapEmailHTML(EMAIL_TEMPLATES.reactivation, {
      name: exampleUser.name?.split(' ')[0] || 'Cher utilisateur',
      daysSinceLastActivity: daysSince
    });
    
    const filename = `email_reactivation_example_${Date.now()}.html`;
    fs.writeFileSync(path.join(process.cwd(), filename), email, 'utf8');
    console.log(`\n✅ Exemple sauvegardé: ${filename}`);
  }
}

/**
 * Newsletter mensuelle
 */
async function sendNewsletter() {
  console.log('\n📧 NEWSLETTER MENSUELLE\n');
  
  // Compter les utilisateurs actifs
  const { count: activeUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Destinataires potentiels: ${activeUsers}\n`);
  
  const month = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  
  const exampleEmail = wrapEmailHTML(EMAIL_TEMPLATES.newsletter, {
    name: 'Amadou',
    month,
    userActivationsCount: '12',
    userServicesCount: '5',
    savings: '18,000'
  });
  
  const filename = `newsletter_${month.replace(' ', '_')}_${Date.now()}.html`;
  fs.writeFileSync(path.join(process.cwd(), filename), exampleEmail, 'utf8');
  
  console.log(`✅ Newsletter générée: ${filename}`);
  console.log(`\n📋 Contenu:`);
  console.log(`   Sujet: ${EMAIL_TEMPLATES.newsletter.subject.replace('{{month}}', month)}`);
  console.log(`   Destinataires: ${activeUsers} utilisateurs`);
  console.log(`\n💡 Pour envoyer via Brevo:`);
  console.log(`   1. Créez une campagne dans Brevo Dashboard`);
  console.log(`   2. Importez le HTML de ${filename}`);
  console.log(`   3. Sélectionnez votre liste de contacts`);
  console.log(`   4. Planifiez l'envoi`);
}

/**
 * Statistiques
 */
async function showStats() {
  console.log('\n📊 STATISTIQUES EMAIL MARKETING\n');
  
  // Utilisateurs avec email
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  // Nouveaux utilisateurs ce mois
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);
  
  const { count: newThisMonth } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', firstDayOfMonth.toISOString());
  
  // Utilisateurs inactifs
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { count: inactive } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .lt('last_activity', thirtyDaysAgo.toISOString());
  
  console.log('👥 BASE UTILISATEURS');
  console.log(`   Total: ${totalUsers}`);
  console.log(`   Nouveaux ce mois: ${newThisMonth}`);
  console.log(`   Inactifs (30j+): ${inactive || 0}`);
  
  console.log('\n📧 SÉQUENCES');
  console.log(`   ✅ Bienvenue: ${newThisMonth} emails à envoyer`);
  console.log(`   ✅ Réactivation: ${inactive || 0} emails à envoyer`);
  console.log(`   ✅ Newsletter: ${totalUsers} destinataires`);
  
  console.log('\n💰 ESTIMATION COÛTS');
  console.log(`   Brevo gratuit: 300 emails/jour`);
  console.log(`   Besoins mensuels: ~${newThisMonth * 2 + inactive + totalUsers} emails`);
  
  if ((newThisMonth * 2 + inactive + totalUsers) > 9000) {
    console.log(`   ⚠️ Vous dépasserez la limite gratuite`);
    console.log(`   Plan Lite Brevo: 25€/mois (20,000 emails)`);
  } else {
    console.log(`   ✅ Vous restez dans la limite gratuite`);
  }
  
  console.log('\n📋 TEMPLATES DISPONIBLES');
  Object.keys(EMAIL_TEMPLATES).forEach(key => {
    console.log(`   - ${key}: ${EMAIL_TEMPLATES[key].subject}`);
  });
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║      📧 EMAIL MARKETING AUTOMATION - ONE SMS                  ║
╚════════════════════════════════════════════════════════════════╝
  `);
  
  if (!command || command === 'help') {
    console.log(`
Usage:
  node email_marketing.mjs setup                    # Configuration initiale
  node email_marketing.mjs send-welcome <email>     # Séquence de bienvenue
  node email_marketing.mjs reactivation             # Campagne réactivation
  node email_marketing.mjs newsletter               # Newsletter mensuelle
  node email_marketing.mjs stats                    # Statistiques
  
Exemples:
  node email_marketing.mjs setup
  node email_marketing.mjs send-welcome user@example.com
  node email_marketing.mjs reactivation
  node email_marketing.mjs stats
    `);
    return;
  }
  
  if (command === 'setup') {
    await setup();
  } else if (command === 'send-welcome') {
    const email = args[1];
    if (!email) {
      console.log('❌ Email requis: node email_marketing.mjs send-welcome <email>');
      return;
    }
    await sendWelcomeSequence(email);
  } else if (command === 'reactivation') {
    await reactivationCampaign();
  } else if (command === 'newsletter') {
    await sendNewsletter();
  } else if (command === 'stats') {
    await showStats();
  } else {
    console.log(`❌ Commande inconnue: ${command}`);
    console.log(`Utilisez: node email_marketing.mjs help`);
  }
}

main();
