/**
 * Test rapide des logos pour services supplémentaires
 */
import https from 'https'

const LOGO_DEV_TOKEN = 'pk_acOeajbNRKGsSDnJvJrcfw'

async function testLogo(domain) {
  return new Promise((resolve) => {
    https.get(`https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}`, (res) => {
      resolve({ domain, ok: res.statusCode === 200, status: res.statusCode })
    }).on('error', () => resolve({ domain, ok: false, status: 0 }))
  })
}

// Services financiers et populaires à tester
const tests = [
  // Crypto
  'crypto.com', 'kraken.com', 'gemini.com', 'huobi.com', 'kucoin.com',
  'gate.io', 'bitstamp.net', 'poloniex.com', 'bitfinex.com',
  
  // Gaming
  'epicgames.com', 'ea.com', 'ubisoft.com', 'riotgames.com',
  'activision.com', 'rockstargames.com', 'bethesda.net',
  
  // Social
  'reddit.com', 'tumblr.com', 'quora.com', 'medium.com',
  
  // E-commerce
  'flipkart.com', 'myntra.com', 'jabong.com', 'ajio.com',
  'meesho.com', 'snapdeal.com', 'paytmmall.com',
  
  // Streaming
  'twitch.tv', 'spotify.com', 'deezer.com', 'soundcloud.com',
  'pandora.com', 'tidal.com', 'primevideo.com',
  
  // Finance
  'westernunion.com', 'moneygram.com', 'remitly.com', 'worldremit.com',
  'n26.com', 'monzo.com', 'chime.com', 'venmo.com',
  'cashapp.com', 'klarna.com', 'afterpay.com', 'affirm.com',
  'curve.app', 'starlingbank.com', 'nubank.com.br',
  
  // Travel
  'booking.com', 'expedia.com', 'tripadvisor.com', 'kayak.com',
  'skyscanner.com', 'momondo.com', 'agoda.com', 'hotels.com',
  
  // Food delivery
  'ubereats.com', 'grubhub.com', 'postmates.com', 'instacart.com',
  'seamless.com', 'caviar.com', 'eatstreet.com',
  
  // Job/Work
  'indeed.com', 'glassdoor.com', 'monster.com', 'ziprecruiter.com',
  'workday.com', 'adp.com', 'gusto.com',
  
  // Communication
  'teams.microsoft.com', 'webex.com', 'gotomeeting.com', 'whereby.com',
  'bluejeans.com', 'ringcentral.com', 'dialpad.com',
  
  // VPN/Security
  'nordvpn.com', 'expressvpn.com', 'surfshark.com', 'protonvpn.com',
  'tunnelbear.com', 'cyberghost.com', 'privateinternetaccess.com',
  
  // Autres
  'glovoapp.com', 'rappi.com', 'cornershopapp.com', 'pedidosya.com',
  'ifood.com.br', 'justeat.com', 'takeaway.com', 'foodora.com'
]

console.log('🔍 Test des logos Logo.dev pour services additionnels\n')
console.log('=' .repeat(60))

const working = []
const notWorking = []

for (const d of tests) {
  const r = await testLogo(d)
  if (r.ok) {
    working.push(d)
    console.log(`✅ ${d}`)
  } else {
    notWorking.push(d)
    console.log(`❌ ${d} (HTTP ${r.status})`)
  }
}

console.log('\n' + '=' .repeat(60))
console.log(`\n📊 Résultats: ${working.length}/${tests.length} logos disponibles`)
console.log(`✅ Disponibles: ${working.length}`)
console.log(`❌ Non disponibles: ${notWorking.length}`)

if (notWorking.length > 0) {
  console.log('\n⚠️ Services sans logo:')
  notWorking.forEach(d => console.log(`   - ${d}`))
}
