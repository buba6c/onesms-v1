import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

// Services définis dans sms-activate-data.ts
const SMS_ACTIVATE_SERVICES = {
  social: [
    { code: "wa", name: "WhatsApp" },
    { code: "tg", name: "Telegram" },
    { code: "ig", name: "Instagram" },
    { code: "fb", name: "Facebook" },
    { code: "tw", name: "Twitter" },
    { code: "ds", name: "Discord" },
    { code: "fu", name: "Snapchat" },
    { code: "lf", name: "TikTok" },
    { code: "tn", name: "LinkedIn" },
    { code: "bnl", name: "Reddit" },
  ],
  shopping: [
    { code: "am", name: "Amazon" },
    { code: "ka", name: "Shopee" },
    { code: "dl", name: "Lazada" },
    { code: "ep", name: "Temu" },
    { code: "hx", name: "AliExpress" },
    { code: "aez", name: "Shein" },
    { code: "xt", name: "Flipkart" },
  ],
  finance: [
    { code: "ts", name: "PayPal" },
    { code: "nc", name: "Payoneer" },
    { code: "re", name: "Coinbase" },
    { code: "aon", name: "Binance" },
    { code: "ij", name: "Revolut" },
    { code: "bo", name: "Wise" },
    { code: "ti", name: "Crypto.com" },
  ],
  delivery: [
    { code: "ub", name: "Uber" },
    { code: "jg", name: "Grab" },
    { code: "ac", name: "DoorDash" },
    { code: "aq", name: "Glovo" },
    { code: "rr", name: "Wolt" },
    { code: "nz", name: "Foodpanda" },
  ],
  tech: [
    { code: "go", name: "Google" },
    { code: "mm", name: "Microsoft" },
    { code: "wx", name: "Apple" },
    { code: "mb", name: "Yahoo" },
    { code: "pm", name: "AOL" },
    { code: "dr", name: "OpenAI" },
  ],
  dating: [
    { code: "oi", name: "Tinder" },
    { code: "mo", name: "Bumble" },
    { code: "df", name: "Happn" },
    { code: "qv", name: "Badoo" },
    { code: "vz", name: "Hinge" },
  ],
  gaming: [
    { code: "mt", name: "Steam" },
    { code: "bz", name: "Blizzard" },
    { code: "ah", name: "Escape From Tarkov" },
    { code: "aiw", name: "Roblox" },
    { code: "blm", name: "Epic Games" },
  ],
  entertainment: [
    { code: "nf", name: "Netflix" },
    { code: "alj", name: "Spotify" },
    { code: "hb", name: "Twitch" },
  ]
}

// Mappings de logos dans logo-service.ts
const SERVICE_DOMAINS = {
  'wa': 'whatsapp.com',
  'tg': 'telegram.org',
  'vi': 'viber.com',
  'ig': 'instagram.com',
  'fb': 'facebook.com',
  'tw': 'x.com',
  'ds': 'discord.com',
  'vk': 'vk.com',
  'am': 'amazon.com',
  'nf': 'netflix.com',
  'ub': 'uber.com',
  'ts': 'paypal.com',
  'mb': 'mamba.ru',
  'ms': 'microsoft.com',
  'om': 'microsoft.com',
  'go': 'google.com',
  'ym': 'yandex.com',
  'ok': 'ok.ru',
  'ma': 'mail.ru',
  'av': 'avito.ru',
  'yz': 'youla.ru',
  'wb': 'wildberries.ru',
  'me': 'line.me',
  'we': 'wechat.com',
  'sn': 'snapchat.com',
  'tt': 'tiktok.com',
  'lf': 'aliexpress.com',
  'gm': 'gmail.com',
  'mm': 'mamba.ru',
  'uk': 'ukr.net',
  'kp': 'kp.ru',
  'mr': 'mail.ru',
  'oi': 'tinder.com',
  'qv': 'badoo.com',
  'bd': 'baddoo.com',
  'zn': 'dzen.ru',
  'tn': 'tinder.com',
  'ka': 'kakao.com',
  'kt': 'kakaotalk.com',
  'wx': 'wechat.com',
  'qq': 'qq.com',
  'li': 'linkedin.com',
  'gp': 'play.google.com',
  'mc': 'mastercard.com',
  'bl': 'blizzard.com',
  'dr': 'dribbble.com',
  'zr': 'zara.com',
  'im': 'imo.im',
  'tx': 'tencent.com',
  'mt': 'mercadolibre.com',
  'pm': 'payeer.com',
  'pf': 'postfinance.ch',
  'bn': 'binance.com',
}

async function analyzeServices() {
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('📊 ANALYSE APPROFONDIE DES SERVICES ONE SMS')
  console.log('═══════════════════════════════════════════════════════════════════\n')

  // 1. STATISTIQUES GLOBALES
  const { data: allServices, error } = await supabase
    .from('services')
    .select('code, name, active')
    .order('code')

  if (error) {
    console.error('❌ Erreur:', error)
    return
  }

  const activeServices = allServices.filter(s => s.active)
  const inactiveServices = allServices.filter(s => !s.active)

  console.log('📈 STATISTIQUES GLOBALES')
  console.log('========================')
  console.log(`Total services: ${allServices.length}`)
  console.log(`Services actifs: ${activeServices.length}`)
  console.log(`Services inactifs: ${inactiveServices.length}`)
  console.log()

  // 2. SERVICES AVEC CODES BIZARRES
  const weirdCodes = allServices.filter(s => {
    // Codes avec chiffres au début
    if (/^\d/.test(s.code)) return true
    // Codes trop longs (plus de 10 caractères)
    if (s.code.length > 10) return true
    // Codes avec underscores multiples
    if (s.code.includes('__')) return true
    return false
  })

  console.log('⚠️  SERVICES AVEC CODES BIZARRES')
  console.log('==================================')
  console.log(`Total: ${weirdCodes.length} services\n`)
  weirdCodes.slice(0, 50).forEach(s => {
    const status = s.active ? '✅' : '❌'
    console.log(`  ${status} ${s.code.padEnd(20)} → ${s.name}`)
  })
  if (weirdCodes.length > 50) {
    console.log(`  ... et ${weirdCodes.length - 50} autres`)
  }
  console.log()

  // 3. SERVICES DÉFINIS DANS SMS-ACTIVATE-DATA.TS
  const allDefinedServices = Object.values(SMS_ACTIVATE_SERVICES).flat()
  console.log('📋 SERVICES DÉFINIS DANS sms-activate-data.ts')
  console.log('==============================================')
  console.log(`Total: ${allDefinedServices.length} services\n`)

  // Vérifier lesquels manquent dans la DB
  const missingInDB = []
  for (const service of allDefinedServices) {
    const existsInDB = allServices.some(s => s.code.toLowerCase() === service.code.toLowerCase())
    if (!existsInDB) {
      missingInDB.push(service)
    }
  }

  console.log('❌ SERVICES MANQUANTS DANS LA BASE DE DONNÉES')
  console.log('==============================================')
  console.log(`Total manquants: ${missingInDB.length}\n`)
  if (missingInDB.length > 0) {
    missingInDB.forEach(s => {
      console.log(`  • ${s.code.padEnd(10)} → ${s.name}`)
    })
  } else {
    console.log('  ✅ Tous les services définis sont présents dans la DB')
  }
  console.log()

  // 4. SERVICES SANS MAPPING DE LOGO
  const servicesWithoutLogo = allDefinedServices.filter(s => !SERVICE_DOMAINS[s.code.toLowerCase()])
  
  console.log('🎨 SERVICES SANS MAPPING DE LOGO DANS logo-service.ts')
  console.log('======================================================')
  console.log(`Total sans mapping: ${servicesWithoutLogo.length}\n`)
  if (servicesWithoutLogo.length > 0) {
    servicesWithoutLogo.forEach(s => {
      console.log(`  • ${s.code.padEnd(10)} → ${s.name}`)
    })
  } else {
    console.log('  ✅ Tous les services définis ont un mapping de logo')
  }
  console.log()

  // 5. TOP 30 SERVICES MANQUANT DES MAPPINGS
  console.log('🔝 TOP 30 SERVICES À AJOUTER AU MAPPING (SERVICE_DOMAINS)')
  console.log('==========================================================')
  console.log('Services populaires dans sms-activate-data.ts sans domaine:\n')

  const servicesNeedingDomain = servicesWithoutLogo.sort((a, b) => {
    // Tri par catégorie et nom
    return a.name.localeCompare(b.name)
  })

  const recommendations = []
  servicesNeedingDomain.slice(0, 30).forEach(s => {
    // Suggestions de domaines basées sur le nom
    let suggestedDomain = ''
    const name = s.name.toLowerCase().replace(/\s+/g, '')
    
    // Mappings connus
    const knownMappings = {
      'snapchat': 'snapchat.com',
      'tiktok': 'tiktok.com',
      'linkedin': 'linkedin.com',
      'reddit': 'reddit.com',
      'shopee': 'shopee.com',
      'lazada': 'lazada.com',
      'temu': 'temu.com',
      'aliexpress': 'aliexpress.com',
      'shein': 'shein.com',
      'flipkart': 'flipkart.com',
      'payoneer': 'payoneer.com',
      'coinbase': 'coinbase.com',
      'binance': 'binance.com',
      'revolut': 'revolut.com',
      'wise': 'wise.com',
      'crypto.com': 'crypto.com',
      'grab': 'grab.com',
      'doordash': 'doordash.com',
      'glovo': 'glovoapp.com',
      'wolt': 'wolt.com',
      'foodpanda': 'foodpanda.com',
      'yahoo': 'yahoo.com',
      'aol': 'aol.com',
      'openai': 'openai.com',
      'bumble': 'bumble.com',
      'happn': 'happn.com',
      'hinge': 'hinge.co',
      'blizzard': 'blizzard.com',
      'escapefromtarkov': 'escapefromtarkov.com',
      'roblox': 'roblox.com',
      'epicgames': 'epicgames.com',
      'spotify': 'spotify.com',
      'twitch': 'twitch.tv',
    }
    
    suggestedDomain = knownMappings[name] || `${name}.com`
    
    const mapping = `  '${s.code}': '${suggestedDomain}',  // ${s.name}`
    recommendations.push(mapping)
    console.log(mapping)
  })
  console.log()

  // 6. ANALYSE DES INCOHÉRENCES
  console.log('🔍 ANALYSE DES INCOHÉRENCES CODE/NOM')
  console.log('=====================================\n')
  
  const inconsistencies = []
  for (const service of allDefinedServices) {
    const dbService = allServices.find(s => s.code.toLowerCase() === service.code.toLowerCase())
    if (dbService && dbService.name !== service.name) {
      inconsistencies.push({
        code: service.code,
        expectedName: service.name,
        actualName: dbService.name,
        active: dbService.active
      })
    }
  }

  console.log(`Total incohérences: ${inconsistencies.length}\n`)
  if (inconsistencies.length > 0) {
    inconsistencies.slice(0, 30).forEach(inc => {
      const status = inc.active ? '✅' : '❌'
      console.log(`  ${status} ${inc.code.padEnd(10)}`)
      console.log(`      Attendu: ${inc.expectedName}`)
      console.log(`      Actuel:  ${inc.actualName}`)
      console.log()
    })
  } else {
    console.log('  ✅ Aucune incohérence détectée')
  }

  // 7. ÉCHANTILLON DE SERVICES DANS LA DB
  console.log('📝 ÉCHANTILLON DE 50 SERVICES DANS LA BASE DE DONNÉES')
  console.log('======================================================\n')
  activeServices.slice(0, 50).forEach(s => {
    const hasMapping = SERVICE_DOMAINS[s.code.toLowerCase()] ? '🎨' : '❌'
    console.log(`  ${hasMapping} ${s.code.padEnd(15)} → ${s.name}`)
  })
  console.log()

  // 8. RÉSUMÉ ET RECOMMANDATIONS
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('📊 RÉSUMÉ ET RECOMMANDATIONS')
  console.log('═══════════════════════════════════════════════════════════════════\n')
  
  console.log('🔧 ACTIONS RECOMMANDÉES:')
  console.log()
  console.log(`1. Ajouter ${servicesWithoutLogo.length} mappings de domaines manquants dans logo-service.ts`)
  console.log(`2. Corriger ${weirdCodes.length} services avec codes bizarres`)
  console.log(`3. Ajouter ${missingInDB.length} services manquants dans la base de données`)
  console.log(`4. Vérifier ${inconsistencies.length} incohérences code/nom`)
  console.log()
  
  console.log('📋 PRIORITÉS:')
  console.log('   1. Services sociaux: WhatsApp, Instagram, TikTok, etc.')
  console.log('   2. Services de paiement: PayPal, Binance, Revolut, etc.')
  console.log('   3. Services de livraison: Uber, Grab, DoorDash, etc.')
  console.log('   4. Services de rencontre: Tinder, Bumble, Badoo, etc.')
  console.log()
}

analyzeServices().catch(console.error)
