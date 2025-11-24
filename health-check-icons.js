#!/usr/bin/env node
/**
 * 🏥 Script de vérification de santé
 * 
 * Vérifie que tout est correctement configuré avant de lancer l'import
 */

import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🏥 VÉRIFICATION DE SANTÉ\n')

let hasErrors = false
let hasWarnings = false

// ============================================================================
// 1. Vérifier les fichiers
// ============================================================================

console.log('1️⃣  Vérification des fichiers...')

const requiredFiles = [
  'import-icons.js',
  'setup-icons.sh',
  'test-icons.js',
  'README-ICONS.md',
  'QUICKSTART-ICONS.md',
  '.env.icons'
]

for (const file of requiredFiles) {
  if (existsSync(join(__dirname, file))) {
    console.log(`   ✅ ${file}`)
  } else {
    console.log(`   ❌ ${file} MANQUANT`)
    hasErrors = true
  }
}

console.log('')

// ============================================================================
// 2. Vérifier la configuration
// ============================================================================

console.log('2️⃣  Vérification de la configuration...')

if (!existsSync('.env.icons')) {
  console.log('   ❌ .env.icons n\'existe pas')
  console.log('   💡 Exécutez: ./setup-icons.sh\n')
  hasErrors = true
} else {
  const envContent = await readFile('.env.icons', 'utf-8')
  
  const requiredVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'S3_BUCKET',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  for (const varName of requiredVars) {
    const regex = new RegExp(`${varName}=(.+)`, 'm')
    const match = envContent.match(regex)
    
    if (!match || !match[1] || match[1].trim() === '' || match[1].includes('your_')) {
      console.log(`   ❌ ${varName} non configuré`)
      hasErrors = true
    } else {
      const value = match[1].trim()
      const masked = value.substring(0, 8) + '...' + value.substring(value.length - 4)
      console.log(`   ✅ ${varName} = ${masked}`)
    }
  }
  
  // Brandfetch (optionnel)
  const brandfetchMatch = envContent.match(/BRANDFETCH_API_KEY=(.+)/m)
  if (!brandfetchMatch || !brandfetchMatch[1] || brandfetchMatch[1].includes('your_')) {
    console.log('   ⚠️  BRANDFETCH_API_KEY non configuré (optionnel)')
    hasWarnings = true
  } else {
    console.log('   ✅ BRANDFETCH_API_KEY configuré')
  }
}

console.log('')

// ============================================================================
// 3. Vérifier les dépendances
// ============================================================================

console.log('3️⃣  Vérification des dépendances...')

const dependencies = [
  'simple-icons',
  'string-similarity',
  'node-fetch',
  'sharp',
  'svgo',
  'potrace',
  'p-limit',
  '@aws-sdk/client-s3',
  '@supabase/supabase-js'
]

for (const dep of dependencies) {
  try {
    await import(dep)
    console.log(`   ✅ ${dep}`)
  } catch (err) {
    console.log(`   ❌ ${dep} NON INSTALLÉ`)
    hasErrors = true
  }
}

console.log('')

// ============================================================================
// 4. Vérifier Node.js
// ============================================================================

console.log('4️⃣  Vérification de l\'environnement...')

const nodeVersion = process.version
const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0])

if (majorVersion >= 18) {
  console.log(`   ✅ Node.js ${nodeVersion} (>= 18)`)
} else {
  console.log(`   ❌ Node.js ${nodeVersion} (requis: >= 18)`)
  hasErrors = true
}

console.log('')

// ============================================================================
// 5. Résumé
// ============================================================================

console.log('═'.repeat(70))

if (hasErrors) {
  console.log('❌ DES ERREURS ONT ÉTÉ DÉTECTÉES\n')
  console.log('🔧 Actions requises:')
  console.log('   1. Exécuter ./setup-icons.sh pour configurer')
  console.log('   2. Installer les dépendances manquantes:')
  console.log('      npm install simple-icons string-similarity node-fetch sharp svgo potrace p-limit @aws-sdk/client-s3 @supabase/supabase-js')
  console.log('   3. Mettre à jour Node.js si nécessaire (>= 18)\n')
  process.exit(1)
} else if (hasWarnings) {
  console.log('⚠️  PRÊT AVEC AVERTISSEMENTS\n')
  console.log('💡 Recommandations:')
  console.log('   - Ajouter une clé Brandfetch API pour améliorer la qualité')
  console.log('   - https://brandfetch.com (gratuit: 100/mois, Pro: $29/mois)\n')
  console.log('▶️  Vous pouvez continuer:')
  console.log('   node test-icons.js      # Test')
  console.log('   node import-icons.js    # Import complet\n')
  process.exit(0)
} else {
  console.log('✅ TOUT EST PRÊT !\n')
  console.log('▶️  Prochaines étapes:')
  console.log('   1. node test-icons.js       # Test rapide (30s)')
  console.log('   2. node import-icons.js     # Import complet (10-15 min)\n')
  console.log('📖 Documentation: cat README-ICONS.md\n')
  process.exit(0)
}
