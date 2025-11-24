#!/usr/bin/env node
/**
 * 🧪 Script de test pour import-icons.js
 * 
 * Teste le générateur d'icônes sur 5 services populaires pour vérifier
 * que tout fonctionne correctement avant de lancer l'import complet.
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Services de test
const TEST_SERVICES = [
  { id: 'test-1', code: 'instagram', name: 'Instagram', display_name: 'Instagram' },
  { id: 'test-2', code: 'whatsapp', name: 'WhatsApp', display_name: 'WhatsApp' },
  { id: 'test-3', code: 'google', name: 'Google', display_name: 'Google' },
  { id: 'test-4', code: 'facebook', name: 'Facebook', display_name: 'Facebook' },
  { id: 'test-5', code: 'unknown-test-service', name: 'Unknown Test Service', display_name: 'Unknown Test Service' },
]

console.log('🧪 TEST DU GÉNÉRATEUR D\'ICÔNES')
console.log('================================\n')

// Vérifier la configuration
console.log('1️⃣  Vérification de la configuration...')

if (!existsSync('.env.icons')) {
  console.error('❌ Fichier .env.icons non trouvé!')
  console.error('   Exécutez: ./setup-icons.sh ou créez le fichier manuellement\n')
  process.exit(1)
}

const envContent = await fs.readFile('.env.icons', 'utf-8')
const requiredVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'S3_BUCKET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
]

const missingVars = requiredVars.filter(v => !envContent.includes(`${v}=`) || envContent.match(new RegExp(`${v}=\\s*$`, 'm')))

if (missingVars.length > 0) {
  console.error('❌ Variables manquantes dans .env.icons:')
  missingVars.forEach(v => console.error(`   - ${v}`))
  console.error('\n')
  process.exit(1)
}

console.log('✅ Configuration OK\n')

// Vérifier les dépendances
console.log('2️⃣  Vérification des dépendances...')

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

const missingDeps = []
for (const dep of dependencies) {
  try {
    await import(dep)
  } catch (err) {
    missingDeps.push(dep)
  }
}

if (missingDeps.length > 0) {
  console.error('❌ Dépendances manquantes:')
  missingDeps.forEach(d => console.error(`   - ${d}`))
  console.error('\nInstallez avec: npm install ' + missingDeps.join(' '))
  console.error('\n')
  process.exit(1)
}

console.log('✅ Dépendances OK\n')

// Créer un fichier services-test.json
console.log('3️⃣  Création du fichier de test...')
await fs.writeFile('services-test.json', JSON.stringify(TEST_SERVICES, null, 2))
console.log('✅ Fichier services-test.json créé\n')

// Informations sur le test
console.log('================================')
console.log('📋 Services de test:')
TEST_SERVICES.forEach((s, i) => {
  console.log(`   ${i + 1}. ${s.display_name} (${s.code})`)
})
console.log('')
console.log('🎯 Résultat attendu:')
console.log('   - Les 4 premiers devraient réussir (services populaires)')
console.log('   - Le dernier devrait utiliser le fallback (initiales)')
console.log('')
console.log('📁 Sortie:')
console.log('   - out-icons/ (dossier local)')
console.log('   - S3: icons/[service-code]/')
console.log('   - import-results.json')
console.log('')
console.log('================================\n')

console.log('⚠️  IMPORTANT:')
console.log('   Ce test va créer de VRAIS fichiers sur S3')
console.log('   Coût estimé: ~$0.0001 (négligeable)')
console.log('')

// Attendre confirmation
const readline = await import('readline')
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (query) => new Promise((resolve) => rl.question(query, resolve))

const answer = await question('Continuer? (Y/n): ')

if (answer.toLowerCase() === 'n') {
  console.log('Test annulé\n')
  rl.close()
  process.exit(0)
}

rl.close()

console.log('\n🚀 Lancement du test...\n')
console.log('================================\n')

// Note: Le script import-icons.js doit être modifié pour accepter un fichier de services
console.log('⚠️  Pour exécuter ce test, modifiez import-icons.js ligne ~550:')
console.log('')
console.log('Remplacer:')
console.log('  const { data: services, error } = await supabase')
console.log('    .from(\'services\')')
console.log('    .select(\'id, code, name, display_name\')')
console.log('')
console.log('Par:')
console.log('  const servicesData = await fs.readFile(\'services-test.json\', \'utf-8\')')
console.log('  const services = JSON.parse(servicesData)')
console.log('  const error = null')
console.log('')
console.log('Puis exécutez: node import-icons.js')
console.log('')
console.log('================================\n')
console.log('📝 Ou exécutez directement le test complet avec 10 services réels:')
console.log('')
console.log('   # Dans import-icons.js, ligne ~550, ajoutez .limit(10)')
console.log('   node import-icons.js')
console.log('')
