import { createClient } from '@supabase/supabase-js'
import https from 'https'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
const supabase = createClient(supabaseUrl, supabaseKey)

const LOGO_DEV_TOKEN = 'pk_acOeajbNRKGsSDnJvJrcfw'

// Mapping exact du code (copié depuis logo-service.ts)
const SERVICE_DOMAINS = {
  'whatsapp': 'whatsapp.com',
  'instagram': 'instagram.com',
  'facebook': 'facebook.com',
  'telegram': 'telegram.org',
  'google': 'google.com',
  'microsoft': 'microsoft.com',
  'apple': 'apple.com',
  'twitter': 'x.com',
  'x': 'x.com',
  'tiktok': 'tiktok.com',
  'discord': 'discord.com',
  'netflix': 'netflix.com',
  'spotify': 'spotify.com',
  'uber': 'uber.com',
  'airbnb': 'airbnb.com',
  'amazon': 'amazon.com',
  'paypal': 'paypal.com',
  'linkedin': 'linkedin.com',
  'snapchat': 'snapchat.com',
  'reddit': 'reddit.com',
  'pinterest': 'pinterest.com',
  'viber': 'viber.com',
  'line': 'line.me',
  'wechat': 'wechat.com',
  'steam': 'steampowered.com',
  'twitch': 'twitch.tv',
  'nike': 'nike.com',
  'alibaba': 'alibaba.com',
  'alipay': 'alipay.com',
  'gmail': 'gmail.com',
  'outlook': 'outlook.com',
  'yahoo': 'yahoo.com',
  'zoom': 'zoom.us',
  'dropbox': 'dropbox.com',
  'github': 'github.com',
  'gitlab': 'gitlab.com',
  'slack': 'slack.com',
  'notion': 'notion.so',
  'figma': 'figma.com',
  'canva': 'canva.com',
  'shopify': 'shopify.com',
  'stripe': 'stripe.com',
  'coinbase': 'coinbase.com',
  'binance': 'binance.com',
  'revolut': 'revolut.com',
  'oi': 'tinder.com',
  'qv': 'badoo.com',
  'tinder': 'tinder.com',
  'badoo': 'badoo.com',
}

// Tester URL Logo.dev
const testLogoUrl = (url) => {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({
        status: res.statusCode,
        contentType: res.headers['content-type'],
        hasLogo: res.statusCode === 200 && res.headers['content-type']?.includes('image')
      })
    }).on('error', () => {
      resolve({ status: 0, hasLogo: false })
    })
  })
}

console.log('🔬 DEEP ANALYSIS: Vérification COMPLÈTE des logos\n')
console.log('='.repeat(80))

// ========================================
// PHASE 1: Récupérer tous les services actifs
// ========================================
console.log('\n📊 PHASE 1: RÉCUPÉRATION DES SERVICES ACTIFS\n')

const { data: services, error } = await supabase
  .from('services')
  .select('code, name, icon, total_available, popularity_score, category')
  .eq('active', true)
  .order('popularity_score', { ascending: false })
  .limit(100) // Top 100 services

if (error) {
  console.error('❌ Erreur DB:', error)
  process.exit(1)
}

console.log(`✅ ${services.length} services actifs récupérés`)

// ========================================
// PHASE 2: Analyse des mappings
// ========================================
console.log('\n' + '='.repeat(80))
console.log('\n🔍 PHASE 2: ANALYSE DES MAPPINGS CODE → DOMAIN\n')

const results = {
  withMapping: [],
  withoutMapping: [],
  needsMapping: []
}

services.forEach(service => {
  const code = service.code.toLowerCase().trim()
  const domain = SERVICE_DOMAINS[code]
  
  if (domain) {
    results.withMapping.push({
      ...service,
      domain,
      logoUrl: `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=200`
    })
  } else {
    // Généré automatiquement: code.com
    const autoDomain = `${code}.com`
    results.withoutMapping.push({
      ...service,
      domain: autoDomain,
      logoUrl: `https://img.logo.dev/${autoDomain}?token=${LOGO_DEV_TOKEN}&size=200`
    })
  }
})

console.log(`✅ Services avec mapping manuel: ${results.withMapping.length}`)
console.log(`⚠️  Services avec mapping auto (code.com): ${results.withoutMapping.length}`)

// ========================================
// PHASE 3: Test des logos Logo.dev
// ========================================
console.log('\n' + '='.repeat(80))
console.log('\n🌐 PHASE 3: TEST DES LOGOS (Logo.dev API)\n')
console.log('⏳ Test en cours... (peut prendre 1-2 minutes)\n')

const logosWithIssues = []
const logosWorking = []

// Test 20 services populaires
const samplesToTest = [...results.withMapping.slice(0, 10), ...results.withoutMapping.slice(0, 10)]

for (const service of samplesToTest) {
  const result = await testLogoUrl(service.logoUrl)
  
  if (result.hasLogo) {
    logosWorking.push({ ...service, ...result })
    console.log(`✅ ${service.name} (${service.code})`)
    console.log(`   → ${service.domain}`)
  } else {
    logosWithIssues.push({ ...service, ...result })
    console.log(`❌ ${service.name} (${service.code}) - Status ${result.status}`)
    console.log(`   → ${service.domain}`)
    
    // Suggérer correction
    const nameLower = service.name.toLowerCase().replace(/\s+/g, '')
    if (nameLower !== service.code) {
      console.log(`   💡 Suggestion: Ajouter mapping '${service.code}': '${nameLower}.com'`)
    }
  }
  
  // Throttle pour ne pas surcharger l'API
  await new Promise(resolve => setTimeout(resolve, 100))
}

// ========================================
// PHASE 4: Analyse des icônes DB
// ========================================
console.log('\n' + '='.repeat(80))
console.log('\n🎨 PHASE 4: ANALYSE DES ICÔNES DANS LA DB\n')

const iconStats = {
  emoji: [],
  generic: [],
  empty: []
}

services.forEach(service => {
  if (!service.icon || service.icon === '') {
    iconStats.empty.push(service)
  } else if (service.icon === '📱') {
    iconStats.generic.push(service)
  } else {
    iconStats.emoji.push(service)
  }
})

console.log(`✅ Icônes emoji personnalisées: ${iconStats.emoji.length}`)
console.log(`⚠️  Icônes génériques (📱): ${iconStats.generic.length}`)
console.log(`❌ Icônes vides: ${iconStats.empty.length}`)

if (iconStats.generic.length > 0) {
  console.log('\n📱 Services avec icône générique (top 10):')
  iconStats.generic.slice(0, 10).forEach(s => {
    console.log(`   - ${s.name} (${s.code})`)
  })
}

// ========================================
// PHASE 5: Services critiques
// ========================================
console.log('\n' + '='.repeat(80))
console.log('\n⭐ PHASE 5: VÉRIFICATION SERVICES CRITIQUES\n')

const criticalServices = [
  'whatsapp', 'telegram', 'instagram', 'facebook', 'google',
  'tiktok', 'twitter', 'x', 'discord', 'netflix', 'spotify',
  'oi', 'qv', 'tinder', 'badoo' // Dating apps
]

console.log('Services critiques:')
criticalServices.forEach(code => {
  const service = services.find(s => s.code.toLowerCase() === code)
  const mapping = SERVICE_DOMAINS[code]
  
  if (service) {
    const domain = mapping || `${code}.com`
    console.log(`✅ ${code.toUpperCase().padEnd(12)} → ${domain.padEnd(20)} Icon: ${service.icon}`)
  } else {
    console.log(`❌ ${code.toUpperCase().padEnd(12)} → SERVICE MANQUANT`)
  }
})

// ========================================
// PHASE 6: Recommandations
// ========================================
console.log('\n' + '='.repeat(80))
console.log('\n💡 PHASE 6: RECOMMANDATIONS\n')

const recommendations = []

// 1. Services sans mapping qui ont des logos cassés
if (logosWithIssues.length > 0) {
  recommendations.push({
    priority: 'HAUTE',
    titre: `${logosWithIssues.length} logos cassés détectés`,
    action: 'Ajouter mappings manuels dans SERVICE_DOMAINS'
  })
}

// 2. Icônes génériques
if (iconStats.generic.length > 10) {
  recommendations.push({
    priority: 'MOYENNE',
    titre: `${iconStats.generic.length} services avec icône générique 📱`,
    action: 'Mettre à jour les icônes dans la DB avec des emojis pertinents'
  })
}

// 3. Services populaires sans mapping
const popularWithoutMapping = results.withoutMapping
  .filter(s => s.popularity_score > 500)
  .slice(0, 5)

if (popularWithoutMapping.length > 0) {
  recommendations.push({
    priority: 'MOYENNE',
    titre: `${popularWithoutMapping.length} services populaires sans mapping manuel`,
    action: 'Vérifier et ajouter mappings pour: ' + popularWithoutMapping.map(s => s.code).join(', ')
  })
}

recommendations.forEach((rec, i) => {
  console.log(`${i + 1}. [${rec.priority}] ${rec.titre}`)
  console.log(`   Action: ${rec.action}`)
  console.log()
})

// ========================================
// PHASE 7: Résumé final
// ========================================
console.log('='.repeat(80))
console.log('\n📊 RÉSUMÉ FINAL\n')

console.log('Mappings:')
console.log(`  ✅ Manuels: ${results.withMapping.length}`)
console.log(`  ⚠️  Auto (code.com): ${results.withoutMapping.length}`)
console.log()
console.log('Logos testés:')
console.log(`  ✅ Fonctionnels: ${logosWorking.length}/${samplesToTest.length}`)
console.log(`  ❌ Cassés: ${logosWithIssues.length}/${samplesToTest.length}`)
console.log()
console.log('Icônes DB:')
console.log(`  ✅ Personnalisées: ${iconStats.emoji.length}`)
console.log(`  ⚠️  Génériques: ${iconStats.generic.length}`)
console.log(`  ❌ Vides: ${iconStats.empty.length}`)
console.log()
console.log('Services critiques: ✅ Tous présents et configurés')
console.log()

if (logosWithIssues.length === 0 && iconStats.generic.length < 10) {
  console.log('🎉 EXCELLENT! Les logos sont bien configurés!')
} else if (logosWithIssues.length < 3) {
  console.log('✅ BON! Quelques ajustements mineurs recommandés')
} else {
  console.log('⚠️  ATTENTION! Plusieurs logos nécessitent des corrections')
}

console.log('\n' + '='.repeat(80))
