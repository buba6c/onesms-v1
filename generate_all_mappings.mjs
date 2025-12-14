/**
 * Analyse complète et génération des mappings pour TOUS les services populaires
 */
import { createClient } from '@supabase/supabase-js'
import https from 'https'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

const LOGO_DEV_TOKEN = 'pk_acOeajbNRKGsSDnJvJrcfw'

async function testLogo(domain) {
  return new Promise((resolve) => {
    https.get(`https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}`, (res) => {
      resolve({ domain, ok: res.statusCode === 200 })
    }).on('error', () => resolve({ domain, ok: false }))
  })
}

// Mapping intelligent des noms de services vers domaines
function guessServiceDomain(name, code) {
  const normalized = name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  
  // Mappings connus
  const knownMappings = {
    // Apps populaires
    'snapchat': 'snapchat.com',
    'wechat': 'wechat.com',
    'google': 'google.com',
    'googleyoutubegmail': 'google.com',
    'tiktok': 'tiktok.com',
    'tiktokdouyin': 'tiktok.com',
    'facebook': 'facebook.com',
    'openai': 'openai.com',
    'chatgpt': 'openai.com',
    'vkcom': 'vk.com',
    'vk': 'vk.com',
    'instagramthreads': 'instagram.com',
    'instagram': 'instagram.com',
    'viber': 'viber.com',
    'whatsapp': 'whatsapp.com',
    'amazon': 'amazon.com',
    'netflix': 'netflix.com',
    'paypal': 'paypal.com',
    'astropay': 'astropay.com',
    'telegram': 'telegram.org',
    'discord': 'discord.com',
    'twitter': 'x.com',
    'uber': 'uber.com',
    'apple': 'apple.com',
    'microsoft': 'microsoft.com',
    'steam': 'steampowered.com',
    'binance': 'binance.com',
    'coinbase': 'coinbase.com',
    'linkedin': 'linkedin.com',
    'roblox': 'roblox.com',
    'spotify': 'spotify.com',
    'twitch': 'twitch.tv',
    'temu': 'temu.com',
    'aliexpress': 'aliexpress.com',
    'shopee': 'shopee.com',
    'shein': 'shein.com',
    'revolut': 'revolut.com',
    'wise': 'wise.com',
    'cryptocom': 'crypto.com',
    'payoneer': 'payoneer.com',
    'bumble': 'bumble.com',
    'badoo': 'badoo.com',
    'hinge': 'hinge.co',
    'happn': 'happn.com',
    'grab': 'grab.com',
    'doordash': 'doordash.com',
    'glovo': 'glovoapp.com',
    'foodpanda': 'foodpanda.com',
    'wolt': 'wolt.com',
    'lazada': 'lazada.com',
    'flipkart': 'flipkart.com',
    'epicgames': 'epicgames.com',
    'blizzard': 'blizzard.com',
    'escapefromtarkov': 'escapefromtarkov.com',
    'reddit': 'reddit.com',
    'tinder': 'tinder.com',
    'okcupid': 'okcupid.com',
    'pofcom': 'pof.com',
    'grindr': 'grindr.com',
    'yahoo': 'yahoo.com',
    'naver': 'naver.com',
    'gojek': 'gojek.com',
    'ovo': 'ovo.id',
    'line': 'line.me',
    'linemessenger': 'line.me',
    'mercado': 'mercadolibre.com',
    'mercadolibre': 'mercadolibre.com',
    'dana': 'dana.id',
    'ebay': 'ebay.com',
    'aol': 'aol.com',
    'walmart': 'walmart.com',
    '99app': '99app.com',
    'jdcom': 'jd.com',
    'yandex': 'yandex.com',
    'yandexuber': 'yandex.com',
    'alfagift': 'alfagift.id',
    'okru': 'ok.ru',
    'signal': 'signal.org',
    'zoho': 'zoho.com',
    'mamba': 'mamba.ru',
    'tencentqq': 'qq.com',
    'qq': 'qq.com',
    'bigolive': 'bigo.tv',
    'protonmail': 'protonmail.com',
    'claude': 'anthropic.com',
    'anthropic': 'anthropic.com',
    'clubhouse': 'clubhouse.com',
    'novaposhta': 'novaposhta.ua',
    'allegro': 'allegro.pl',
    'zalo': 'zalo.me',
    'weverse': 'weverse.io',
    'hybe': 'weverse.io',
    'akulaku': 'akulaku.com',
    'globo': 'globo.com',
    'groupon': 'groupon.com',
    'hepsiburada': 'hepsiburada.com',
    'lydia': 'lydia-app.com',
    'lalamove': 'lalamove.com',
    'mercadopago': 'mercadopago.com',
    'nykaa': 'nykaa.com',
    'ola': 'olacabs.com',
    'quora': 'quora.com',
    'rakuten': 'rakuten.com',
    'swiggy': 'swiggy.com',
    'salesforce': 'salesforce.com',
    'skype': 'skype.com',
    'samsung': 'samsung.com',
    'squarespace': 'squarespace.com',
    'tripadvisor': 'tripadvisor.com',
    'zomato': 'zomato.com',
    'zendesk': 'zendesk.com',
    'zelle': 'zellepay.com',
    'zillow': 'zillow.com',
    'zoom': 'zoom.us',
    'zapier': 'zapier.com',
    'zara': 'zara.com',
    
    // Services financiers
    'bybit': 'bybit.com',
    'okx': 'okx.com',
    'skrill': 'skrill.com',
    'caixa': 'caixabank.es',
    'paysera': 'paysera.com',
    'transfergo': 'transfergo.com',
    'moonpay': 'moonpay.com',
    'wirex': 'wirex.com',
    'exness': 'exness.com',
    'bitrue': 'bitrue.com',
    'kraken': 'kraken.com',
    'gemini': 'gemini.com',
    'kucoin': 'kucoin.com',
    'n26': 'n26.com',
    'monzo': 'monzo.com',
    'venmo': 'venmo.com',
    'cashapp': 'cashapp.com',
    'klarna': 'klarna.com',
    'nubank': 'nubank.com.br',
    
    // Delivery
    'indriver': 'indriver.com',
    'didi': 'didiglobal.com',
    'bolt': 'bolt.eu',
    'deliveroo': 'deliveroo.com',
    'ifood': 'ifood.com.br',
    'rappi': 'rappi.com',
    'ubereats': 'ubereats.com',
    'grubhub': 'grubhub.com',
    
    // Gaming
    'epicgames': 'epicgames.com',
    'ea': 'ea.com',
    'ubisoft': 'ubisoft.com',
    'riotgames': 'riotgames.com',
    'activision': 'activision.com',
    
    // Mail
    'mailru': 'mail.ru',
    'gmail': 'gmail.com',
    'gmx': 'gmx.net',
    'mailcom': 'mail.com',
    'outlook': 'outlook.com',
    
    // Autres
    'geekay': 'geekay.com',
    'belwest': 'belwest.by',
    'manus': 'manus.im',
    'bossrevolution': 'bossrevolution.com',
    'booking': 'booking.com',
    'expedia': 'expedia.com',
    'airbnb': 'airbnb.com',
  }
  
  // Chercher une correspondance
  for (const [key, domain] of Object.entries(knownMappings)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return domain
    }
  }
  
  // Si le nom ressemble à un domaine
  if (normalized.includes('.')) {
    return name.toLowerCase()
  }
  
  // Fallback: nom + .com
  return `${normalized}.com`
}

console.log('🔍 GÉNÉRATION AUTOMATIQUE DES MAPPINGS\n')
console.log('=' .repeat(80))

// Récupérer les 300 services les plus populaires
const { data: services } = await supabase
  .from('services')
  .select('code, name, active')
  .eq('active', true)
  .order('popularity_score', { ascending: false })
  .limit(300)

console.log(`📊 ${services?.length || 0} services actifs récupérés\n`)

// Mappings existants dans logo-service.ts
const existingMappings = new Set([
  'full', 'fb', 'ig', 'wa', 'go', 'am', 'oi', 'tg', 'hw', 'lf', 'yw', 'ot',
  'tw', 'mm', 'ka', 'wb', 'ds', 'gp', 'jg', 'li', 'vi', 'nv', 'ni', 'mb',
  'ub', 'vk', 'xh', 'me', 'cq', 'vz', 'dl', 'fr', 'dh', 'pm', 'ts', 'wr',
  'df', 'ki', 'za', 'ya', 'wx', 'bn', 'nf', 'ok', 'nc', 'bw', 'nz', 'aez',
  'mo', 'pf', 'tn', 'tx', 'sn', 'ah', 'cn', 'zk', 'kc', 'xk', 'fu', 're',
  'pc', 'xd', 'mv', 'kt', 'bz', 'do', 'ac', 'im', 'kl', 'ua', 'kf', 'ew',
  'rr', 'pr', 'gf', 'yl', 'uu', 'sg', 'fz', 'vm', 'pd', 'rs', 'wh', 'uk',
  'ef', 'ep', 'hx', 'bo', 'zh', 'fd', 'aiw', 'qq', 'bl', 'mt', 'dr', 'qv',
  'iq', 'dp', 'acz', 'aon', 'aq', 'aow', 'yq', 'mw', 'bgj', 'baa', 'bwv',
  'gmx', 'abk', 'ahx', 'ma', 'apa', 'rl', 'um', 'ij', 'abn', 'aor', 'okx',
  'aqt', 'my', 'aol', 'cad', 'alj', 'hb', 'ti', 'blm', 'bnl', 'xt',
  'gr', 'afk', 'astropay', 'et', 'ch', 'clubhouse', 'ms', 'np', 'novaposhta',
  'pn', 'ld', 'bd', 'dz', 'st', 'gl', 'gm', 'gu', 'hz', 'ly', 'lz', 'mz',
  'nk', 'oe', 'ol', 'pz', 'qz', 'rc', 'sd', 'sf', 'sk', 'sl', 'sm', 'sp',
  'sq', 'sr', 'sv', 'sy', 'sz', 'ta', 'tc', 'te', 'tf', 'ti', 'to', 'tp',
  'tt', 'tv', 'ty', 'tz', 'vd', 've', 'vf', 'vp', 'vr', 'vs', 'wd', 'we',
  'wf', 'wl', 'wm', 'wn', 'wo', 'wp', 'ws', 'wt', 'wy', 'xp', 'xr', 'xs',
  'xt', 'yb', 'yc', 'yd', 'ye', 'yi', 'yo', 'yp', 'yr', 'ys', 'yt', 'yu',
  'yv', 'zb', 'zc', 'zd', 'ze', 'zf', 'zg', 'zi', 'zl', 'zm', 'zn', 'zo',
  'zp', 'zr', 'zs', 'zt', 'zu', 'zv', 'zw', 'zx', 'zy', 'zz'
])

const newMappings = []
const testedDomains = new Map()

for (const service of services || []) {
  const code = service.code.toLowerCase()
  
  if (existingMappings.has(code)) {
    continue // Déjà mappé
  }
  
  const domain = guessServiceDomain(service.name, code)
  
  // Éviter les tests en double
  if (!testedDomains.has(domain)) {
    const result = await testLogo(domain)
    testedDomains.set(domain, result.ok)
  }
  
  const logoWorks = testedDomains.get(domain)
  
  newMappings.push({
    code,
    name: service.name,
    domain,
    logoWorks
  })
}

// Afficher les résultats
console.log('\n📋 NOUVEAUX MAPPINGS À AJOUTER:\n')
console.log('// Ajouter dans SERVICE_DOMAINS de logo-service.ts:')

const workingMappings = newMappings.filter(m => m.logoWorks)
const failedMappings = newMappings.filter(m => !m.logoWorks)

workingMappings.forEach(m => {
  console.log(`  '${m.code}': '${m.domain}', // ${m.name}`)
})

console.log('\n' + '=' .repeat(80))
console.log(`\n📊 STATISTIQUES:`)
console.log(`✅ Mappings fonctionnels: ${workingMappings.length}`)
console.log(`❌ Domaines sans logo: ${failedMappings.length}`)

if (failedMappings.length > 0) {
  console.log('\n⚠️ Services nécessitant un mapping manuel:')
  failedMappings.slice(0, 30).forEach(m => {
    console.log(`   '${m.code}': '???', // ${m.name} (essayé: ${m.domain})`)
  })
}

// Générer le code TypeScript à copier
console.log('\n\n' + '=' .repeat(80))
console.log('📝 CODE TYPESCRIPT À COPIER:\n')
console.log('```typescript')
workingMappings.forEach(m => {
  console.log(`  '${m.code}': '${m.domain}',${' '.repeat(Math.max(1, 25 - m.domain.length))}// ${m.name}`)
})
console.log('```')
