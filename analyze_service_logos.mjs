/**
 * Analyse approfondie des logos de services
 * Vérifie les services demandés et leur mapping vers Logo.dev
 */
import { createClient } from '@supabase/supabase-js'
import https from 'https'
import http from 'http'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

const LOGO_DEV_TOKEN = 'pk_acOeajbNRKGsSDnJvJrcfw'

// Services demandés par l'utilisateur
const TARGET_SERVICES = [
  'glovo', 'geeky', 'geekay', 'mail.com', 'transfergo', 'moonpay', 
  'wirex', 'manus', 'gmx', 'bitrue', 'mail.ru', 'mailru', 'exness', 
  'indriver', 'belwest', 'welcalize', 'wesstein', 'revolut', 'bybit', 
  'okx', 'skrill', 'caixa', 'paysera'
]

// Mapping actuel de logo-service.ts (extrait)
const CURRENT_MAPPINGS = {
  'revolut': 'revolut.com',
  'ma': 'mail.ru',
  'mr': 'mail.ru',
  'mailru': 'mail.ru',
  // Manquants potentiels
}

// Tester si un logo existe sur Logo.dev
async function testLogoDevUrl(domain) {
  return new Promise((resolve) => {
    const url = `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=200`
    
    https.get(url, (res) => {
      const hasLogo = res.statusCode === 200 && 
        res.headers['content-type']?.includes('image')
      resolve({
        domain,
        url,
        status: res.statusCode,
        hasLogo,
        contentType: res.headers['content-type']
      })
    }).on('error', (err) => {
      resolve({
        domain,
        url,
        status: 0,
        hasLogo: false,
        error: err.message
      })
    })
  })
}

console.log('🔍 ANALYSE APPROFONDIE DES LOGOS DE SERVICES')
console.log('=' .repeat(80))
console.log('')

// 1. Chercher les services dans la base de données
console.log('📊 ÉTAPE 1: Recherche dans la base de données\n')

const results = {}

for (const term of TARGET_SERVICES) {
  const { data, error } = await supabase
    .from('services')
    .select('code, name, icon_url, active')
    .or(`name.ilike.%${term}%,code.ilike.%${term}%`)
    .limit(10)
  
  if (data && data.length > 0) {
    results[term] = data
    console.log(`✅ ${term.toUpperCase()} - ${data.length} service(s) trouvé(s):`)
    data.forEach(s => {
      console.log(`   📌 Code: ${s.code.padEnd(10)} | Nom: ${s.name.substring(0, 40).padEnd(40)} | Icon: ${s.icon_url ? '✓' : '❌'}`)
    })
  } else {
    results[term] = []
    console.log(`❌ ${term.toUpperCase()} - Non trouvé dans la DB`)
  }
  console.log('')
}

// 2. Tester les logos sur Logo.dev
console.log('\n' + '=' .repeat(80))
console.log('📊 ÉTAPE 2: Vérification des logos sur Logo.dev API\n')

const domainsToTest = [
  'glovo.com',
  'geekay.com',
  'geeky.com',
  'mail.com',
  'transfergo.com',
  'moonpay.com', 
  'moonpay.io',
  'wirex.com',
  'wirex.app',
  'gmx.com',
  'gmx.net',
  'gmx.de',
  'bitrue.com',
  'mail.ru',
  'exness.com',
  'indriver.com',
  'belwest.by',
  'belwest.ru',
  'revolut.com',
  'bybit.com',
  'okx.com',
  'skrill.com',
  'caixa.gov.br',
  'caixabank.es',
  'paysera.com',
  'paysera.lt',
  'manus.app',
  'manus.im'
]

const logoResults = []

for (const domain of domainsToTest) {
  const result = await testLogoDevUrl(domain)
  logoResults.push(result)
  
  const status = result.hasLogo ? '✅' : '❌'
  console.log(`${status} ${domain.padEnd(25)} | HTTP ${result.status} | ${result.hasLogo ? 'LOGO OK' : 'NO LOGO'}`)
}

// 3. Récapitulatif des mappings à ajouter
console.log('\n' + '=' .repeat(80))
console.log('📊 ÉTAPE 3: Services trouvés dans la DB sans mapping\n')

const servicesToMap = []

for (const [term, services] of Object.entries(results)) {
  for (const service of services) {
    // Vérifier si le code a un mapping
    const code = service.code.toLowerCase()
    if (!CURRENT_MAPPINGS[code]) {
      servicesToMap.push({
        code: service.code,
        name: service.name,
        hasIcon: !!service.icon_url,
        searchTerm: term
      })
    }
  }
}

console.log('Services nécessitant un mapping Logo.dev:')
servicesToMap.forEach(s => {
  console.log(`  '${s.code}': '???', // ${s.name}`)
})

// 4. Statistiques globales
console.log('\n' + '=' .repeat(80))
console.log('📊 STATISTIQUES GLOBALES\n')

const { data: allServices } = await supabase
  .from('services')
  .select('code, name, icon_url')
  .eq('active', true)
  .order('popularity_score', { ascending: false })
  .limit(500)

const withIconUrl = allServices?.filter(s => s.icon_url) || []
const withoutIconUrl = allServices?.filter(s => !s.icon_url) || []

console.log(`📱 Total services actifs analysés: ${allServices?.length || 0}`)
console.log(`✅ Services avec icon_url: ${withIconUrl.length}`)
console.log(`❌ Services sans icon_url: ${withoutIconUrl.length}`)

// 5. Top 50 services populaires sans icon_url
console.log('\n📊 TOP 50 services populaires SANS icon_url:\n')
withoutIconUrl.slice(0, 50).forEach((s, i) => {
  console.log(`${(i+1).toString().padStart(2)}. ${s.code.padEnd(10)} | ${s.name.substring(0, 50)}`)
})

// 6. Propositions de mappings
console.log('\n' + '=' .repeat(80))
console.log('💡 PROPOSITIONS DE MAPPINGS À AJOUTER DANS logo-service.ts\n')

const proposedMappings = {
  // Services demandés
  'glovo': 'glovoapp.com',
  'geeky': 'geekay.com', 
  'mail.com': 'mail.com',
  'transfergo': 'transfergo.com',
  'moonpay': 'moonpay.com',
  'wirex': 'wirex.com',
  'gmx': 'gmx.net',
  'bitrue': 'bitrue.com',
  'exness': 'exness.com',
  'indriver': 'indriver.com',
  'revolut': 'revolut.com',
  'bybit': 'bybit.com',
  'okx': 'okx.com',
  'skrill': 'skrill.com',
  'caixa': 'caixabank.es',
  'paysera': 'paysera.com',
  'mailru': 'mail.ru',
  'manus': 'manus.app',
}

console.log('// Ajouter dans SERVICE_DOMAINS de logo-service.ts:')
for (const [code, domain] of Object.entries(proposedMappings)) {
  const logoTest = await testLogoDevUrl(domain)
  const status = logoTest.hasLogo ? '✅' : '⚠️'
  console.log(`${status} '${code}': '${domain}',`)
}

console.log('\n✅ Analyse terminée!')
