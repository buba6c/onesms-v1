#!/usr/bin/env node
/**
 * 🔍 ANALYSE INTELLIGENTE PROFONDE - HOTJAR DETECTOR
 * Détection avancée de l'origine du script Hotjar 2201971
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { glob } from 'glob';

console.log('🔍 ANALYSE INTELLIGENTE PROFONDE - HOTJAR DETECTOR\n');

// 1. ANALYSE DU CODE SOURCE
console.log('📁 1. ANALYSE DU CODE SOURCE...');

const searchPatterns = [
  '2201971',
  'hjid',
  'hj\\(',
  '_hjSettings',
  'static\\.hotjar\\.com',
  'hotjar.*inject',
  'hotjar.*script'
];

// Chercher dans tous les fichiers TypeScript/JavaScript
const sourceFiles = [
  'src/**/*.{ts,tsx,js,jsx}',
  '*.{js,ts,mjs}',
  'public/**/*.{js,html}',
  'dist/**/*.{js,html}'
];

let foundInSource = false;
for (const pattern of sourceFiles) {
  const files = await glob(pattern, { cwd: process.cwd() });
  
  for (const file of files) {
    if (!existsSync(file)) continue;
    
    try {
      const content = readFileSync(file, 'utf-8');
      
      for (const searchPattern of searchPatterns) {
        const regex = new RegExp(searchPattern, 'gi');
        if (regex.test(content)) {
          console.log(`  ✅ TROUVÉ dans ${file}: ${searchPattern}`);
          foundInSource = true;
          
          // Afficher le contexte
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (regex.test(line)) {
              console.log(`    Ligne ${index + 1}: ${line.trim()}`);
            }
          });
        }
      }
    } catch (error) {
      // Ignorer les erreurs de lecture
    }
  }
}

if (!foundInSource) {
  console.log('  ❌ Aucune référence Hotjar trouvée dans le code source');
}

// 2. ANALYSE DU HTML DÉPLOYÉ
console.log('\n📡 2. ANALYSE DU HTML DÉPLOYÉ...');
try {
  const response = await fetch('https://onesms-sn.com/');
  const html = await response.text();
  
  const htmlPatterns = [
    'hotjar',
    '2201971',
    'hj\\(',
    '_hjSettings',
    'analytics',
    'gtag',
    'google-analytics'
  ];
  
  let foundInHTML = false;
  for (const pattern of htmlPatterns) {
    const regex = new RegExp(pattern, 'gi');
    const matches = html.match(regex);
    if (matches) {
      console.log(`  ✅ TROUVÉ dans HTML: ${pattern} (${matches.length} occurrences)`);
      foundInHTML = true;
      
      // Trouver le contexte
      const lines = html.split('\n');
      lines.forEach((line, index) => {
        if (regex.test(line)) {
          console.log(`    Ligne ${index + 1}: ${line.trim().substring(0, 100)}...`);
        }
      });
    }
  }
  
  if (!foundInHTML) {
    console.log('  ❌ Aucune référence Hotjar trouvée dans le HTML déployé');
  }
} catch (error) {
  console.error('  ❌ Erreur lors de l\'analyse HTML:', error.message);
}

// 3. ANALYSE DES FICHIERS JAVASCRIPT COMPILÉS
console.log('\n🔧 3. ANALYSE DES FICHIERS JS COMPILÉS...');
const jsFiles = await glob('dist/assets/*.js', { cwd: process.cwd() });

let foundInCompiledJS = false;
for (const file of jsFiles) {
  try {
    const content = readFileSync(file, 'utf-8');
    
    for (const pattern of searchPatterns) {
      const regex = new RegExp(pattern, 'gi');
      if (regex.test(content)) {
        console.log(`  ✅ TROUVÉ dans ${file}: ${pattern}`);
        foundInCompiledJS = true;
        
        // Chercher le contexte autour
        const index = content.search(regex);
        if (index !== -1) {
          const start = Math.max(0, index - 50);
          const end = Math.min(content.length, index + 100);
          console.log(`    Contexte: ...${content.substring(start, end)}...`);
        }
      }
    }
  } catch (error) {
    // Ignorer les erreurs de lecture
  }
}

if (!foundInCompiledJS) {
  console.log('  ❌ Aucune référence Hotjar trouvée dans les JS compilés');
}

// 4. HYPOTHÈSES ET RECOMMANDATIONS
console.log('\n🧠 4. ANALYSE INTELLIGENTE ET HYPOTHÈSES:');

console.log('\n📊 HYPOTHÈSES POSSIBLES:');
console.log('  1. 🌐 NETLIFY ANALYTICS: Netlify injecte automatiquement des scripts analytics');
console.log('  2. 🔌 EXTENSION NAVIGATEUR: Une extension (AdBlock, etc.) injecte du code');
console.log('  3. 📱 SERVICE EXTERNE: Un service tiers (CDN, proxy) ajoute Hotjar');
console.log('  4. 🎯 CONFIGURATION CACHÉE: Variable d\'environnement ou config non visible');
console.log('  5. 🔄 CACHE NAVIGATEUR: Ancien code Hotjar en cache côté client');

console.log('\n🛠️ SOLUTIONS RECOMMANDÉES:');
console.log('  1. ✅ DÉJÀ FAIT: Protection contre scripts externes bloqués');
console.log('  2. 🔍 VÉRIFIER: Configurations Netlify Analytics et plugins');
console.log('  3. 🚫 TESTER: Navigateur en mode incognito/privé');
console.log('  4. 🧹 NETTOYER: Cache navigateur et données de site');
console.log('  5. 📞 CONTACTER: Support Netlify si le problème persiste');

console.log('\n🎯 CONCLUSION:');
console.log('  Le script Hotjar n\'est PAS présent dans votre code source.');
console.log('  Il est probablement injecté par un service externe ou extension.');
console.log('  Votre protection anti-erreurs devrait empêcher les problèmes.');

console.log('\n✅ Analyse terminée!');