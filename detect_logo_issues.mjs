import { createClient } from '@supabase/supabase-js'
import https from 'https'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
const supabase = createClient(supabaseUrl, supabaseKey)

const LOGO_DEV_TOKEN = 'pk_acOeajbNRKGsSDnJvJrcfw'

// Mapping actuel (copié de logo-service.ts)
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
  'bn': 'binance.com',
  'revolut': 'revolut.com',
  'oi': 'tinder.com',
  'qv': 'badoo.com',
  'tinder': 'tinder.com',
  'badoo': 'badoo.com',
}

// Noms de marques populaires à vérifier
const KNOWN_BRANDS = [
  'whatsapp', 'telegram', 'instagram', 'facebook', 'google', 'microsoft', 
  'apple', 'twitter', 'tiktok', 'discord', 'netflix', 'spotify', 'uber',
  'airbnb', 'amazon', 'paypal', 'linkedin', 'snapchat', 'reddit', 
  'tinder', 'badoo', 'binance', 'coinbase', 'ebay', 'nike', 'adidas',
  'samsung', 'sony', 'walmart', 'target', 'starbucks', 'mcdonalds',
  'oracle', 'cisco', 'adobe', 'salesforce', 'booking', 'expedia',
  'airtel', 'vodafone', 'verizon', 'att', 'tmobile', 'orange',
  'visa', 'mastercard', 'amex', 'discover', 'stripe', 'revolut',
  'wise', 'n26', 'monzo', 'chime', 'venmo', 'cashapp', 'zelle'
]

const testLogoUrl = (url) => {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({
        status: res.statusCode,
        hasLogo: res.statusCode === 200 && res.headers['content-type']?.includes('image')
      })
    }).on('error', () => {
      resolve({ status: 0, hasLogo: false })
    })
  })
}

console.log('🔍 ANALYSE: Services avec logos incorrects\n')
console.log('='.repeat(80))

// Récupérer top 150 services populaires
const { data: services } = await supabase
  .from('services')
  .select('code, name, popularity_score')
  .eq('active', true)
  .order('popularity_score', { ascending: false })
  .limit(150)

console.log(`\n✅ ${services.length} services récupérés\n`)

const issues = []
const needsMapping = []

console.log('🔍 Détection des problèmes...\n')

for (const service of services) {
  const code = service.code.toLowerCase().trim()
  const name = service.name.toLowerCase().replace(/\s+/g, '')
  
  // Cas 1: Le code n'est PAS le nom de marque
  const isShortCode = code.length <= 2 || code !== name
  
  if (isShortCode) {
    // Vérifier si c'est une marque connue
    const isKnownBrand = KNOWN_BRANDS.some(brand => 
      name.includes(brand) || brand.includes(name)
    )
    
    if (isKnownBrand) {
      // Vérifier si mapping existe
      const hasMapping = SERVICE_DOMAINS[code] !== undefined
      
      if (!hasMapping) {
        // Tester si code.com fonctionne
        const codeUrl = `https://img.logo.dev/${code}.com?token=${LOGO_DEV_TOKEN}&size=200`
        const nameUrl = `https://img.logo.dev/${name}.com?token=${LOGO_DEV_TOKEN}&size=200`
        
        const codeTest = await testLogoUrl(codeUrl)
        const nameTest = await testLogoUrl(nameUrl)
        
        if (!codeTest.hasLogo && nameTest.hasLogo) {
          issues.push({
            service: service.name,
            code: service.code,
            problem: `Code "${code}" génère logo incorrect`,
            solution: `'${code}': '${name}.com'`,
            priority: service.popularity_score > 500 ? 'HAUTE' : 'MOYENNE'
          })
        }
        
        // Throttle
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }
}

console.log('='.repeat(80))
console.log('\n📋 RÉSULTATS:\n')

if (issues.length === 0) {
  console.log('✅ Aucun problème détecté! Tous les services populaires ont les bons logos.\n')
} else {
  console.log(`⚠️  ${issues.length} service(s) avec logos incorrects:\n`)
  
  // Grouper par priorité
  const highPriority = issues.filter(i => i.priority === 'HAUTE')
  const mediumPriority = issues.filter(i => i.priority === 'MOYENNE')
  
  if (highPriority.length > 0) {
    console.log('🔴 PRIORITÉ HAUTE (popularité > 500):\n')
    highPriority.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue.service} (code: ${issue.code})`)
      console.log(`   Problème: ${issue.problem}`)
      console.log(`   Solution: ${issue.solution}`)
      console.log()
    })
  }
  
  if (mediumPriority.length > 0) {
    console.log('⚠️  PRIORITÉ MOYENNE:\n')
    mediumPriority.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue.service} (code: ${issue.code})`)
      console.log(`   Solution: ${issue.solution}`)
      console.log()
    })
  }
  
  // Générer code TypeScript à ajouter
  console.log('='.repeat(80))
  console.log('\n💡 CODE À AJOUTER dans SERVICE_DOMAINS:\n')
  console.log('```typescript')
  issues.forEach(issue => {
    console.log(`  ${issue.solution},`)
  })
  console.log('```\n')
}

console.log('='.repeat(80))
