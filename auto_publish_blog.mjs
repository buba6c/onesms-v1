#!/usr/bin/env node

/**
 * 📝 PUBLICATION AUTOMATIQUE DE BLOG - ONE SMS
 * 
 * Génère et publie automatiquement des articles de blog SEO-optimisés
 * 
 * Usage:
 *   node auto_publish_blog.mjs whatsapp                    # Publier 1 article WhatsApp
 *   node auto_publish_blog.mjs --all                       # Publier pour tous les services
 *   node auto_publish_blog.mjs --schedule daily --count 7  # 1 article/jour pendant 7 jours
 *   node auto_publish_blog.mjs --dry-run                   # Test sans publication
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SERVICES = ['whatsapp', 'telegram', 'instagram', 'discord', 'google'];
const BLOG_DIR = path.join(process.cwd(), 'blog');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'blog');

// Créer les dossiers si nécessaire
if (!fs.existsSync(BLOG_DIR)) {
  fs.mkdirSync(BLOG_DIR, { recursive: true });
}
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ============================================================================
// FONCTIONS PRINCIPALES
// ============================================================================

/**
 * Génère un article de blog pour un service
 */
function generateArticle(service) {
  console.log(`\n📝 Génération de l'article pour: ${service}`);
  
  try {
    // Appeler le générateur de contenu existant
    const result = execSync(
      `node generate_content.mjs blog ${service}`,
      { encoding: 'utf8', cwd: process.cwd() }
    );
    
    console.log(`✅ Article généré avec succès`);
    
    // Trouver le fichier généré le plus récent
    const contentDir = path.join(process.cwd(), 'marketing_content');
    const files = fs.readdirSync(contentDir)
      .filter(f => f.startsWith(`blog_${service}`))
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(contentDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    if (files.length === 0) {
      throw new Error('Aucun article généré trouvé');
    }
    
    const latestFile = files[0].name;
    const articlePath = path.join(contentDir, latestFile);
    const content = fs.readFileSync(articlePath, 'utf8');
    
    return { service, content, path: articlePath };
    
  } catch (error) {
    console.error(`❌ Erreur lors de la génération: ${error.message}`);
    return null;
  }
}

/**
 * Publie un article sur le blog (copie dans public/blog)
 */
function publishArticle(article, dryRun = false) {
  if (!article) return false;
  
  const { service, content } = article;
  const slug = `activer-${service}-numero-virtuel-${Date.now()}`;
  const filename = `${slug}.md`;
  const outputPath = path.join(OUTPUT_DIR, filename);
  
  console.log(`\n📤 Publication de l'article: ${filename}`);
  
  if (dryRun) {
    console.log('🔍 Mode dry-run : Simulation uniquement');
    console.log(`   Fichier qui serait créé: ${outputPath}`);
    console.log(`   Taille: ${(content.length / 1024).toFixed(2)} KB`);
    return true;
  }
  
  try {
    // Ajouter metadata frontmatter pour Jekyll/Hugo/Next.js
    const metadata = `---
title: "Comment Activer ${service.charAt(0).toUpperCase() + service.slice(1)} avec un Numéro Virtuel"
description: "Guide complet pour activer ${service} avec ONE SMS. 190+ pays disponibles, activation en 2 minutes."
date: ${new Date().toISOString()}
author: "ONE SMS Team"
category: "Tutoriels"
tags: ["${service}", "numéro virtuel", "sms", "activation"]
image: "/images/blog/${service}-hero.jpg"
slug: "${slug}"
canonical: "https://onesms-sn.com/blog/${slug}"
---

`;
    
    const finalContent = metadata + content;
    
    // Écrire le fichier
    fs.writeFileSync(outputPath, finalContent, 'utf8');
    
    console.log(`✅ Article publié: ${outputPath}`);
    
    // Copier aussi dans le dossier blog/ pour référence
    const blogCopy = path.join(BLOG_DIR, filename);
    fs.writeFileSync(blogCopy, finalContent, 'utf8');
    
    // Générer l'index des articles
    updateBlogIndex();
    
    return true;
    
  } catch (error) {
    console.error(`❌ Erreur lors de la publication: ${error.message}`);
    return false;
  }
}

/**
 * Met à jour l'index des articles (liste pour le site)
 */
function updateBlogIndex() {
  const articles = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.endsWith('.md'))
    .map(filename => {
      const content = fs.readFileSync(path.join(OUTPUT_DIR, filename), 'utf8');
      
      // Parser le frontmatter
      const match = content.match(/^---\n([\s\S]+?)\n---/);
      if (!match) return null;
      
      const frontmatter = {};
      match[1].split('\n').forEach(line => {
        const [key, ...values] = line.split(':');
        if (key && values.length) {
          frontmatter[key.trim()] = values.join(':').trim().replace(/^["']|["']$/g, '');
        }
      });
      
      return {
        slug: frontmatter.slug || filename.replace('.md', ''),
        title: frontmatter.title,
        description: frontmatter.description,
        date: frontmatter.date,
        category: frontmatter.category,
        tags: frontmatter.tags
      };
    })
    .filter(a => a !== null)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Générer index JSON
  const indexPath = path.join(OUTPUT_DIR, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(articles, null, 2), 'utf8');
  
  // Générer page index HTML
  const indexHTML = generateIndexHTML(articles);
  const indexHTMLPath = path.join(OUTPUT_DIR, 'index.html');
  fs.writeFileSync(indexHTMLPath, indexHTML, 'utf8');
  
  console.log(`✅ Index mis à jour: ${articles.length} articles`);
}

/**
 * Génère une page HTML d'index des articles
 */
function generateIndexHTML(articles) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog ONE SMS - Tutoriels et Guides</title>
  <meta name="description" content="Guides et tutoriels pour utiliser ONE SMS. Apprenez à activer WhatsApp, Telegram, Instagram et plus avec des numéros virtuels.">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background: #f8fafc;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    header { 
      background: #1e3a8a;
      color: white;
      padding: 3rem 0;
      text-align: center;
    }
    h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .subtitle { font-size: 1.2rem; opacity: 0.9; }
    .articles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 2rem;
      margin-top: 3rem;
    }
    .article-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.07);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .article-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0,0,0,0.12);
    }
    .article-content { padding: 1.5rem; }
    .article-title {
      font-size: 1.3rem;
      margin-bottom: 0.5rem;
      color: #1e3a8a;
    }
    .article-description {
      color: #64748b;
      margin-bottom: 1rem;
    }
    .article-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
      color: #94a3b8;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e2e8f0;
    }
    .article-tags {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.75rem;
    }
    .tag {
      background: #e0f2fe;
      color: #0369a1;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.75rem;
    }
    .read-more {
      display: inline-block;
      color: #1e3a8a;
      text-decoration: none;
      font-weight: 600;
      margin-top: 1rem;
    }
    .read-more:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>📚 Blog ONE SMS</h1>
      <p class="subtitle">Guides et tutoriels pour vos numéros virtuels</p>
    </div>
  </header>
  
  <div class="container">
    <div class="articles-grid">
      ${articles.map(article => `
        <article class="article-card">
          <div class="article-content">
            <h2 class="article-title">${article.title}</h2>
            <p class="article-description">${article.description}</p>
            <div class="article-tags">
              ${article.tags ? article.tags.split(',').map(tag => 
                `<span class="tag">${tag.trim().replace(/[\[\]"]/g, '')}</span>`
              ).join('') : ''}
            </div>
            <a href="${article.slug}.html" class="read-more">Lire l'article →</a>
            <div class="article-meta">
              <span>${new Date(article.date).toLocaleDateString('fr-FR')}</span>
              <span>${article.category}</span>
            </div>
          </div>
        </article>
      `).join('')}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Partage automatiquement sur les réseaux sociaux (placeholder)
 */
function shareOnSocial(article) {
  const { service } = article;
  const url = `https://onesms-sn.com/blog/activer-${service}-numero-virtuel`;
  
  console.log(`\n📱 Partage sur les réseaux sociaux:`);
  console.log(`   URL: ${url}`);
  
  // Twitter
  const twitterText = encodeURIComponent(
    `🔥 Nouveau tutoriel : Comment activer ${service.toUpperCase()} avec un numéro virtuel\n\n` +
    `✅ 190+ pays\n` +
    `⚡ Activation en 2 min\n` +
    `💰 À partir de 3000F\n\n` +
    `Lire le guide complet 👇`
  );
  console.log(`   Twitter: https://twitter.com/intent/tweet?text=${twitterText}&url=${url}`);
  
  // Facebook
  console.log(`   Facebook: https://www.facebook.com/sharer/sharer.php?u=${url}`);
  
  // LinkedIn
  console.log(`   LinkedIn: https://www.linkedin.com/sharing/share-offsite/?url=${url}`);
  
  console.log(`\n💡 Copiez ces liens pour partager manuellement`);
  console.log(`   (ou configurez les APIs Twitter/Facebook pour automatisation complète)`);
}

/**
 * Notifie Google de la nouvelle page (pour indexation)
 */
function notifyGoogle(articleSlug) {
  const url = `https://onesms-sn.com/blog/${articleSlug}`;
  
  console.log(`\n🔔 Notification Google:`);
  console.log(`   URL à soumettre: ${url}`);
  console.log(`   👉 Google Search Console > Inspection d'URL > Demander l'indexation`);
  console.log(`   Ou utilisez l'API Indexing (https://developers.google.com/search/apis/indexing-api)`);
}

// ============================================================================
// MODE SCHEDULING (publication programmée)
// ============================================================================

/**
 * Planifie des publications régulières
 */
function schedulePublications(frequency = 'daily', count = 7) {
  console.log(`\n📅 Planification de ${count} publications (1/${frequency})`);
  
  const schedule = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const service = SERVICES[i % SERVICES.length];
    const date = new Date(now);
    
    if (frequency === 'daily') {
      date.setDate(date.getDate() + i);
      date.setHours(10, 0, 0, 0); // 10h chaque jour
    } else if (frequency === 'weekly') {
      date.setDate(date.getDate() + (i * 7));
      date.setHours(10, 0, 0, 0);
    }
    
    schedule.push({
      date: date.toISOString(),
      service,
      day: date.toLocaleDateString('fr-FR')
    });
  }
  
  // Sauvegarder le planning
  const scheduleFile = path.join(process.cwd(), 'blog_schedule.json');
  fs.writeFileSync(scheduleFile, JSON.stringify(schedule, null, 2), 'utf8');
  
  console.log(`✅ Planning créé: blog_schedule.json`);
  console.log(`\n📋 Prochaines publications:`);
  schedule.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.day} - ${item.service}`);
  });
  
  console.log(`\n💡 Pour exécuter automatiquement, ajoutez à votre crontab:`);
  console.log(`   0 10 * * * cd "${process.cwd()}" && node auto_publish_blog.mjs --execute-schedule`);
}

/**
 * Exécute les publications planifiées
 */
function executeSchedule() {
  const scheduleFile = path.join(process.cwd(), 'blog_schedule.json');
  
  if (!fs.existsSync(scheduleFile)) {
    console.log('❌ Aucun planning trouvé. Créez-en un avec --schedule');
    return;
  }
  
  const schedule = JSON.parse(fs.readFileSync(scheduleFile, 'utf8'));
  const now = new Date();
  
  // Trouver les publications à faire aujourd'hui
  const todayPublications = schedule.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate.toDateString() === now.toDateString();
  });
  
  if (todayPublications.length === 0) {
    console.log('✅ Aucune publication prévue aujourd\'hui');
    return;
  }
  
  console.log(`📝 ${todayPublications.length} publication(s) prévue(s) aujourd'hui\n`);
  
  todayPublications.forEach(item => {
    const article = generateArticle(item.service);
    if (article) {
      publishArticle(article);
      shareOnSocial(article);
    }
  });
  
  // Retirer les publications effectuées du planning
  const remainingSchedule = schedule.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate > now;
  });
  
  fs.writeFileSync(scheduleFile, JSON.stringify(remainingSchedule, null, 2), 'utf8');
  console.log(`\n✅ Planning mis à jour: ${remainingSchedule.length} publications restantes`);
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║         📝 PUBLICATION AUTOMATIQUE DE BLOG - ONE SMS          ║
╚════════════════════════════════════════════════════════════════╝
  `);
  
  // Flags
  const dryRun = args.includes('--dry-run');
  const all = args.includes('--all');
  const schedule = args.find(arg => arg.includes('--schedule'));
  const executeScheduleFlag = args.includes('--execute-schedule');
  const count = parseInt(args.find(arg => arg.includes('--count'))?.split('=')[1] || '7');
  
  // Exécution du planning
  if (executeScheduleFlag) {
    executeSchedule();
    return;
  }
  
  // Création d'un planning
  if (schedule) {
    const frequency = schedule.split('=')[1] || 'daily';
    schedulePublications(frequency, count);
    return;
  }
  
  // Publication pour tous les services
  if (all) {
    console.log(`📚 Publication pour tous les services (${SERVICES.length})\n`);
    
    let successCount = 0;
    SERVICES.forEach(service => {
      const article = generateArticle(service);
      if (article && publishArticle(article, dryRun)) {
        if (!dryRun) {
          shareOnSocial(article);
        }
        successCount++;
      }
    });
    
    console.log(`\n✅ ${successCount}/${SERVICES.length} articles publiés avec succès`);
    return;
  }
  
  // Publication pour un service spécifique
  const service = args.find(arg => SERVICES.includes(arg));
  
  if (!service) {
    console.log(`
Usage:
  node auto_publish_blog.mjs <service>           # Publier pour un service
  node auto_publish_blog.mjs --all               # Publier pour tous
  node auto_publish_blog.mjs --schedule=daily --count=7  # Planifier
  node auto_publish_blog.mjs --execute-schedule  # Exécuter le planning
  node auto_publish_blog.mjs --dry-run           # Test sans publication

Services disponibles: ${SERVICES.join(', ')}

Exemples:
  node auto_publish_blog.mjs whatsapp
  node auto_publish_blog.mjs --all --dry-run
  node auto_publish_blog.mjs --schedule=daily --count=30
    `);
    return;
  }
  
  // Publier un seul article
  const article = generateArticle(service);
  if (article) {
    const success = publishArticle(article, dryRun);
    if (success && !dryRun) {
      shareOnSocial(article);
      notifyGoogle(article.service);
    }
  }
}

// Exécuter
main();
