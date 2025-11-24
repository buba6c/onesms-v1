/**
 * Service pour obtenir les logos - SYSTÈME SIMPLIFIÉ 2025
 * STRATÉGIE: Logo.dev UNIQUEMENT via URL directe
 * Format: https://img.logo.dev/{domain}?token=pk_acOeajbNRKGsSDnJvJrcfw
 */

import { supabase } from './supabase'

// Token Logo.dev API
const LOGO_DEV_TOKEN = 'pk_acOeajbNRKGsSDnJvJrcfw'

// Cache pour icon_url depuis DB
const iconUrlCache = new Map<string, string>()
let iconUrlCacheLoaded = false

// Placeholder transparent
const TRANSPARENT_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

// Charger icon_url depuis DB
const loadIconUrlCache = async () => {
  if (iconUrlCacheLoaded) return
  
  try {
    const { data } = await supabase
      .from('services')
      .select('code, icon_url')
      .not('icon_url', 'is', null) as { data: { code: string; icon_url: string }[] | null; error: any }
    
    data?.forEach(service => {
      if (service.code && service.icon_url) {
        iconUrlCache.set(service.code.toLowerCase(), service.icon_url)
      }
    })
    
    iconUrlCacheLoaded = true
    console.log(`✅ [LOGO] ${iconUrlCache.size} logos chargés`)
  } catch (err) {
    console.error('❌ [LOGO] Erreur:', err)
  }
}

loadIconUrlCache()

// Services connus qui n'ont PAS de logo sur DuckDuckGo (évite les 404)
// Ces services retourneront directement le placeholder pour utiliser l'emoji
const NO_LOGO_SERVICES = new Set([
  'indomaret', 'bigbazaar', 'alfamart', 'lottemart', 'hypermart',
  'transmart', 'giant', 'carrefour', 'superindo', 'foodpanda',
  'zomato', 'swiggy', 'dunzo', 'blinkit', 'bigbasket', 'grofers',
  'jiomart', 'dmart', 'more', 'reliance', 'easyday', 'spencers',
  'nilgiris', 'heritage', 'ratnadeep', 'trinethra', 'aavin',
  'milkyway', 'nandhini', 'dodla', 'thirumala', 'jersey',
  'kwality', 'vadilal', 'havmor', 'naturals', 'baskin',
  'kalyan', 'tanishq', 'malabar', 'joyalukkas', 'bhima',
  'grt', 'pothys', 'chennai', 'nalli', 'rmkv',
  'saravana', 'kumaran', 'pothy', 'handloom', 'fabindia',
  'westside', 'shoppersstop', 'lifestyle', 'centralretail', 'max',
  'pantaloons', 'brand', 'factory', 'reliance', 'trends'
])

// API pour les logos de services - Stratégie multi-fallback
// 1. icon_url depuis DB (AWS S3) passé en paramètre - PRIORITAIRE ✅
// 2. icon_url depuis cache DB asynchrone
// 3. Logo.dev (meilleure couverture globale)
// 4. Clearbit (grandes entreprises)
// 5. Brandfetch API (backup)
// 6. DuckDuckGo Icons (toujours disponible)
export const getServiceLogo = (serviceCode: string, iconUrlFromDb?: string): string => {
  const code = serviceCode.toLowerCase().trim()
  
  // PRIORITÉ 0: Si icon_url est passé directement en paramètre, l'utiliser 🎯
  if (iconUrlFromDb) {
    console.log(`🎯 [LOGO] ${code} → Utilisation icon_url DB:`, iconUrlFromDb.substring(0, 50) + '...')
    logoCache.set(code, iconUrlFromDb)
    return iconUrlFromDb
  }
  
  console.log(`⚠️  [LOGO] ${code} → Pas d'icon_url, fallback vers cache/DuckDuckGo`)
  
  // Vérifier le cache d'abord
  if (logoCache.has(code)) {
    return logoCache.get(code)!
  }
  
  // PRIORITÉ 1: Vérifier icon_url depuis cache DB (AWS S3) 🎯
  if (iconUrlCache.has(code)) {
    const iconUrl = iconUrlCache.get(code)!
    logoCache.set(code, iconUrl)
    return iconUrl
  }
  
  // Mapping complet des domaines (200+ services)
  const serviceDomains: Record<string, string> = {
    // Top services avec logos confirmés
    'instagram': 'instagram.com',
    'whatsapp': 'whatsapp.com',
    'google': 'google.com',
    'facebook': 'facebook.com',
    'telegram': 'telegram.org',
    'tiktok': 'tiktok.com',
    'twitter': 'twitter.com',
    'x': 'twitter.com',
    'apple': 'apple.com',
    'microsoft': 'microsoft.com',
    'discord': 'discord.com',
    'snapchat': 'snapchat.com',
    'linkedin': 'linkedin.com',
    'netflix': 'netflix.com',
    'spotify': 'spotify.com',
    'uber': 'uber.com',
    'amazon': 'amazon.com',
    'paypal': 'paypal.com',
    'viber': 'viber.com',
    'wechat': 'wechat.com',
    'line': 'line.me',
    'reddit': 'reddit.com',
    'youtube': 'youtube.com',
    'gmail': 'gmail.com',
    'yahoo': 'yahoo.com',
    'outlook': 'outlook.com',
    'skype': 'skype.com',
    'zoom': 'zoom.us',
    'twitch': 'twitch.tv',
    'tinder': 'tinder.com',
    'bumble': 'bumble.com',
    'pinterest': 'pinterest.com',
    'steam': 'steampowered.com',
    'airbnb': 'airbnb.com',
    'alibaba': 'alibaba.com',
    'ebay': 'ebay.com',
    'booking': 'booking.com',
    'bolt': 'bolt.eu',
    'nike': 'nike.com',
    'adidas': 'adidas.com',
    'walmart': 'walmart.com',
    'target': 'target.com',
    'ikea': 'ikea.com',
    'tesla': 'tesla.com',
    'mcdonald': 'mcdonalds.com',
    'mcdonalds': 'mcdonalds.com',
    'starbucks': 'starbucks.com',
    'coca-cola': 'coca-cola.com',
    'cocacola': 'coca-cola.com',
    'pepsi': 'pepsi.com',
    'samsung': 'samsung.com',
    'sony': 'sony.com',
    'nintendo': 'nintendo.com',
    'playstation': 'playstation.com',
    'xbox': 'xbox.com',
    'ea': 'ea.com',
    'riot': 'riotgames.com',
    'epicgames': 'epicgames.com',
    'epic': 'epicgames.com',
    'blizzard': 'blizzard.com',
    'rockstar': 'rockstargames.com',
    'valve': 'valvesoftware.com',
    'ubisoft': 'ubisoft.com',
    'github': 'github.com',
    'gitlab': 'gitlab.com',
    'bitbucket': 'bitbucket.org',
    'slack': 'slack.com',
    'dropbox': 'dropbox.com',
    'box': 'box.com',
    'trello': 'trello.com',
    'asana': 'asana.com',
    'notion': 'notion.so',
    'monday': 'monday.com',
    'salesforce': 'salesforce.com',
    'shopify': 'shopify.com',
    'wordpress': 'wordpress.com',
    'wix': 'wix.com',
    'squarespace': 'squarespace.com',
    'webex': 'webex.com',
    'teams': 'microsoft.com',
    'office365': 'office.com',
    'vk': 'vk.com',
    'ok': 'ok.ru',
    'odnoklassniki': 'ok.ru',
    'yandex': 'yandex.ru',
    'mail.ru': 'mail.ru',
    'mailru': 'mail.ru'
  }

  // Services populaires supplémentaires
  const additionalServices: Record<string, string> = {
    'fiverr': 'fiverr.com',
    'fivver': 'fiverr.com',
    'aol': 'aol.com',
    'imo': 'imo.im',
    'imochat': 'imo.im',
    'zalo': 'zalo.me',
    'viber': 'viber.com',
    'qq': 'qq.com',
    'wechat': 'wechat.com',
    'weibo': 'weibo.com',
    'kakaotalk': 'kakao.com',
    'kakao': 'kakao.com',
    'naver': 'naver.com',
    'gett': 'gett.com',
    'yandex': 'yandex.ru',
    'mailru': 'mail.ru',
    'vk': 'vk.com',
    'ok': 'ok.ru',
    'mamba': 'mamba.ru',
    'drom': 'drom.ru',
    'avito': 'avito.ru',
    'ozon': 'ozon.ru',
    'wildberries': 'wildberries.ru',
    'rambler': 'rambler.ru',
    'tencent': 'tencent.com',
    'baidu': 'baidu.com',
    'taobao': 'taobao.com',
    'alipay': 'alipay.com',
    'meituan': 'meituan.com',
    'didi': 'didiglobal.com',
    'bilibili': 'bilibili.com',
    'douyin': 'douyin.com',
    'xiaohongshu': 'xiaohongshu.com',
    'redbook': 'xiaohongshu.com',
    'lazada': 'lazada.com',
    'shopee': 'shopee.com',
    'tokopedia': 'tokopedia.com',
    'bukalapak': 'bukalapak.com',
    'gojek': 'gojek.com',
    'grab': 'grab.com',
    'deliveroo': 'deliveroo.com',
    'doordash': 'doordash.com',
    'grubhub': 'grubhub.com',
    'postmates': 'postmates.com',
    'instacart': 'instacart.com',
    'wish': 'wish.com',
    'etsy': 'etsy.com',
    'mercado': 'mercadolibre.com',
    'mercadolibre': 'mercadolibre.com',
    'olx': 'olx.com',
    'allegro': 'allegro.pl',
    'jumia': 'jumia.com',
    'flipkart': 'flipkart.com',
    'myntra': 'myntra.com',
    'paytm': 'paytm.com',
    'phonepe': 'phonepe.com',
    'gpay': 'pay.google.com',
    'googlepay': 'pay.google.com',
    'venmo': 'venmo.com',
    'cashapp': 'cash.app',
    'revolut': 'revolut.com',
    'wise': 'wise.com',
    'transferwise': 'wise.com',
    'n26': 'n26.com',
    'monzo': 'monzo.com',
    'chime': 'chime.com',
    'robinhood': 'robinhood.com',
    'coinbase': 'coinbase.com',
    'binance': 'binance.com',
    'kraken': 'kraken.com',
    'signal': 'signal.org',
    'wickr': 'wickr.com',
    'element': 'element.io',
    'matrix': 'matrix.org',
    'threema': 'threema.ch',
    'wire': 'wire.com',
    'icq': 'icq.com',
    'kik': 'kik.com',
    'badoo': 'badoo.com',
    'match': 'match.com',
    'okcupid': 'okcupid.com',
    'pof': 'pof.com',
    'hinge': 'hinge.co',
    'grindr': 'grindr.com',
    'scruff': 'scruff.com',
    'happn': 'happn.com',
    'meetme': 'meetme.com',
    'tagged': 'tagged.com',
    'meetup': 'meetup.com',
    'nextdoor': 'nextdoor.com',
    'clubhouse': 'clubhouse.com',
    'discord': 'discord.com',
    'teamspeak': 'teamspeak.com',
    'mumble': 'mumble.info',
    'ventrilo': 'ventrilo.com',
    'curse': 'curseforge.com',
    'overwolf': 'overwolf.com',
    'battlenet': 'blizzard.com',
    'origin': 'origin.com',
    'uplay': 'ubisoft.com',
    'gog': 'gog.com',
    'epicgames': 'epicgames.com',
    'itch': 'itch.io',
    'humble': 'humblebundle.com',
    'greenmangaming': 'greenmangaming.com',
    'gamestop': 'gamestop.com'
  }
  
  // Vérifier d'abord si le service n'a PAS de logo disponible
  if (NO_LOGO_SERVICES.has(code)) {
    // Retourner directement le placeholder transparent pour éviter les 404
    logoCache.set(code, TRANSPARENT_PIXEL)
    return TRANSPARENT_PIXEL
  }
  
  // Fusionner tous les mappings
  const allDomains = { ...serviceDomains, ...additionalServices }
  const domain = allDomains[code]
  
  let logoUrl: string
  
  // Si icon_url n'est pas disponible dans le cache, retourner placeholder transparent
  // Les icônes doivent être dans la DB maintenant (1300+ services avec icon_url)
  // Pour éviter les 404 DuckDuckGo, on utilise le placeholder par défaut
  if (domain) {
    // Utiliser DuckDuckGo Icons uniquement pour services très connus (legacy fallback)
    logoUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`
  } else {
    // Retourner placeholder transparent pour éviter les 404
    // L'emoji s'affichera à la place (via handleLogoError dans les composants)
    logoUrl = TRANSPARENT_PIXEL
  }
  
  // Mettre en cache
  logoCache.set(code, logoUrl)
  
  return logoUrl
}

// API pour les drapeaux de pays (gratuit CDN)
export const getCountryFlag = (countryCode: string): string => {
  // Mapping des codes 5sim vers ISO 3166-1 alpha-2
  const countryCodeMap: Record<string, string> = {
    'russia': 'ru',
    'ukraine': 'ua',
    'kazakhstan': 'kz',
    'china': 'cn',
    'philippines': 'ph',
    'myanmar': 'mm',
    'indonesia': 'id',
    'malaysia': 'my',
    'kenya': 'ke',
    'tanzania': 'tz',
    'vietnam': 'vn',
    'kyrgyzstan': 'kg',
    'usa': 'us',
    'israel': 'il',
    'hongkong': 'hk',
    'poland': 'pl',
    'england': 'gb',
    'uk': 'gb',
    'madagascar': 'mg',
    'congo': 'cd',
    'nigeria': 'ng',
    'macau': 'mo',
    'egypt': 'eg',
    'india': 'in',
    'ireland': 'ie',
    'cambodia': 'kh',
    'laos': 'la',
    'haiti': 'ht',
    'ivorycoast': 'ci',
    'gambia': 'gm',
    'serbia': 'rs',
    'yemen': 'ye',
    'southafrica': 'za',
    'romania': 'ro',
    'colombia': 'co',
    'estonia': 'ee',
    'azerbaijan': 'az',
    'canada': 'ca',
    'morocco': 'ma',
    'ghana': 'gh',
    'argentina': 'ar',
    'uzbekistan': 'uz',
    'cameroon': 'cm',
    'chad': 'td',
    'germany': 'de',
    'lithuania': 'lt',
    'croatia': 'hr',
    'sweden': 'se',
    'iraq': 'iq',
    'netherlands': 'nl',
    'latvia': 'lv',
    'austria': 'at',
    'belarus': 'by',
    'thailand': 'th',
    'saudiarabia': 'sa',
    'mexico': 'mx',
    'taiwan': 'tw',
    'spain': 'es',
    'iran': 'ir',
    'algeria': 'dz',
    'slovenia': 'si',
    'bangladesh': 'bd',
    'senegal': 'sn',
    'turkey': 'tr',
    'czechia': 'cz',
    'czech': 'cz',
    'srilanka': 'lk',
    'peru': 'pe',
    'pakistan': 'pk',
    'newzealand': 'nz',
    'guinea': 'gn',
    'mali': 'ml',
    'venezuela': 've',
    'ethiopia': 'et',
    'mongolia': 'mn',
    'brazil': 'br',
    'afghanistan': 'af',
    'uganda': 'ug',
    'angola': 'ao',
    'cyprus': 'cy',
    'france': 'fr',
    'papuanewguinea': 'pg',
    'mozambique': 'mz',
    'nepal': 'np',
    'belgium': 'be',
    'bulgaria': 'bg',
    'hungary': 'hu',
    'moldova': 'md',
    'italy': 'it',
    'paraguay': 'py',
    'honduras': 'hn',
    'tunisia': 'tn',
    'nicaragua': 'ni',
    'bolivia': 'bo',
    'costarica': 'cr',
    'guatemala': 'gt',
    'uae': 'ae',
    'zimbabwe': 'zw',
    'puertorico': 'pr',
    'sudan': 'sd',
    'togo': 'tg',
    'kuwait': 'kw',
    'salvador': 'sv',
    'libya': 'ly',
    'jamaica': 'jm',
    'trinidad': 'tt',
    'ecuador': 'ec',
    'swaziland': 'sz',
    'oman': 'om',
    'bosniaandherzegovina': 'ba',
    'bih': 'ba',
    'dominicanrepublic': 'do',
    'dominicana': 'do',
    'panama': 'pa',
    'luxembourg': 'lu',
    'lebanon': 'lb',
    'mauritania': 'mr',
    'malta': 'mt',
    'guyana': 'gy',
    'japan': 'jp',
    'southkorea': 'kr',
    'singapore': 'sg',
    'australia': 'au',
    'portugal': 'pt',
    'switzerland': 'ch',
    'norway': 'no',
    'finland': 'fi',
    'denmark': 'dk',
    'greece': 'gr',
    // Codes manquants qui causent des 404
    'easttimor': 'tl',
    'timorleste': 'tl',
    'antiguaandbarbuda': 'ag',
    'burundi': 'bi',
    'equatorialguinea': 'gq',
    'lesotho': 'ls',
    'uruguay': 'uy',
    'turkmenistan': 'tm',
    'suriname': 'sr',
    'solomonislands': 'sb',
    'saintlucia': 'lc',
    'samoa': 'ws',
    'tajikistan': 'tj',
    'tit': 'tt',
    'trinidadandtobago': 'tt',
    'bhutane': 'bt',
    'bhutan': 'bt',
    'burkinafaso': 'bf',
    'capeverde': 'cv',
    'comoros': 'km',
    'gabon': 'ga',
    'georgia': 'ge',
    'guineabissau': 'gw',
    'malawi': 'mw',
    'maldives': 'mv',
    'mauritius': 'mu',
    'namibia': 'na',
    'rwanda': 'rw',
    'seychelles': 'sc',
    'sierraleone': 'sl',
    'somalia': 'so',
    'zambia': 'zm',
    // Nouveaux ajouts pour corriger les 404
    'albania': 'al',
    'armenia': 'ar',
    'aruba': 'aw',
    'bahamas': 'bs',
    'bahrain': 'bh',
    'barbados': 'bb',
    'belize': 'bz',
    'benin': 'bj',
    'botswana': 'bw',
    'chile': 'cl',
    'djibouti': 'dj',
    'frenchguiana': 'gf',
    'guadeloupe': 'gp',
    'jordan': 'jo',
    'liberia': 'lr',
    'montenegro': 'me',
    'newcaledonia': 'nc',
    'northmacedonia': 'mk',
    'reunion': 're',
    'saintkittsandnevis': 'kn',
    'saintvincentandgrenadines': 'vc',
    'slovakia': 'sk'
  }

  const isoCode = countryCodeMap[countryCode.toLowerCase()] || countryCode.toLowerCase().slice(0, 2)
  
  // Utilise flagcdn.com (gratuit CDN avec fallback)
  return `https://flagcdn.com/64x48/${isoCode}.png`
}

// Fallback vers emoji si l'image ne charge pas
export const getServiceIcon = (serviceCode: string): string => {
  const iconMap: Record<string, string> = {
    'instagram': '📷',
    'whatsapp': '💬',
    'google': '🔍',
    'facebook': '👥',
    'telegram': '✈️',
    'tiktok': '🎵',
    'twitter': '🐦',
    'apple': '🍎',
    'microsoft': '🪟',
    'discord': '🎮',
    'snapchat': '👻',
    'linkedin': '💼',
    'netflix': '🎬',
    'spotify': '🎵',
    'uber': '🚗',
    'amazon': '📦',
    'paypal': '💳',
    'viber': '☎️',
    'wechat': '💬',
    'line': '💚',
    'nike': '👟',
    'adidas': '👟',
    'walmart': '🏪',
    'target': '🎯',
    'ikea': '🛋️',
    'tesla': '🚗',
    'mcdonald': '🍔',
    'mcdonalds': '🍔',
    'starbucks': '☕',
    'coca-cola': '🥤',
    'cocacola': '🥤',
    'pepsi': '🥤',
    'samsung': '📱',
    'sony': '🎮',
    'nintendo': '🎮',
    'playstation': '🎮',
    'xbox': '🎮',
    'steam': '🎮',
    'twitch': '📺',
    'youtube': '📹',
    'reddit': '🤖',
    'github': '💻',
    'slack': '💼',
    'zoom': '📹',
    'notion': '📝',
    'vk': '👥',
    'yandex': '🔍',
    'fiverr': '💼',
    'fivver': '💼',
    'aol': '📧',
    'imo': '💬',
    'zalo': '💬',
    'qq': '🐧',
    'weibo': '📱',
    'kakaotalk': '💬',
    'kakao': '💬',
    'naver': '🔍',
    'mailru': '📧',
    'ok': '👥',
    'mamba': '💕',
    'baidu': '🔍',
    'taobao': '🛒',
    'alipay': '💳',
    'lazada': '🛒',
    'shopee': '🛒',
    'tokopedia': '🛒',
    'gojek': '🛵',
    'grab': '🚗',
    'deliveroo': '🍔',
    'doordash': '🍕',
    'grubhub': '🍽️',
    'postmates': '📦',
    'instacart': '🛒',
    'wish': '🎁',
    'etsy': '🎨',
    'mercado': '🛒',
    'olx': '🏪',
    'flipkart': '🛒',
    'paytm': '💳',
    'phonepe': '💳',
    'gpay': '💳',
    'venmo': '💸',
    'cashapp': '💰',
    'revolut': '🏦',
    'wise': '💱',
    'coinbase': '₿',
    'binance': '₿',
    'signal': '🔒',
    'icq': '💬',
    'kik': '💬',
    'badoo': '💕',
    'match': '❤️',
    'tinder': '🔥',
    'bumble': '🐝',
    'okcupid': '💑',
    'hinge': '🔗',
    'grindr': '💛',
    'meetup': '👥',
    'clubhouse': '🎙️',
    'battlenet': '⚔️',
    'origin': '🎮',
    'gog': '🎮',
    'itch': '🎮',
    'humble': '🎮',
    // Services indonésiens et indiens
    'indomaret': '🏪',
    'alfamart': '🏪',
    'bigbazaar': '🛒',
    'lottemart': '🛒',
    'hypermart': '🛒',
    'transmart': '🏬',
    'giant': '🛒',
    'carrefour': '🛒',
    'superindo': '🏪',
    'foodpanda': '🍔',
    'zomato': '🍕',
    'swiggy': '🍽️',
    'dunzo': '📦',
    'blinkit': '🛒',
    'bigbasket': '🛒',
    'grofers': '🛒',
    'jiomart': '🛒',
    'dmart': '🏪',
    'more': '🏪',
    'reliance': '🏬',
    'easyday': '🏪',
    'spencers': '🏪',
    'nilgiris': '🛒',
    'heritage': '🏪',
    'ratnadeep': '🛒',
    'trinethra': '🛒',
    'aavin': '🥛',
    'milkyway': '🥛',
    'nandhini': '🥛',
    'dodla': '🥛',
    'thirumala': '🥛',
    'jersey': '🥛',
    'kwality': '🥛',
    'vadilal': '🍦',
    'havmor': '🍦',
    'naturals': '🍦',
    'baskin': '🍦',
    'kalyan': '💍',
    'tanishq': '💎',
    'malabar': '💍',
    'joyalukkas': '💎',
    'bhima': '💍',
    'grt': '💍',
    'pothys': '👗',
    'chennai': '👗',
    'nalli': '👗',
    'rmkv': '👗',
    'saravana': '👗',
    'kumaran': '👗',
    'pothy': '👗',
    'handloom': '🧵',
    'fabindia': '👗',
    'westside': '🛍️',
    'shoppersstop': '🛍️',
    'lifestyle': '🛍️',
    'centralretail': '🏬',
    'max': '🛍️',
    'pantaloons': '👔',
    'brand': '🏷️',
    'factory': '🏭',
    'trends': '👗'
  }
  return iconMap[serviceCode.toLowerCase()] || '📱'
}

export const getFlagEmoji = (countryCode: string): string => {
  const flagMap: Record<string, string> = {
    'russia': '🇷🇺',
    'ukraine': '🇺🇦',
    'usa': '🇺🇸',
    'france': '🇫🇷',
    'germany': '🇩🇪',
    'england': '🇬🇧',
    'uk': '🇬🇧',
    'spain': '🇪🇸',
    'italy': '🇮🇹',
    'canada': '🇨🇦',
    'brazil': '🇧🇷',
    'india': '🇮🇳',
    'china': '🇨🇳',
    'japan': '🇯🇵'
  }
  return flagMap[countryCode.toLowerCase()] || '🌍'
}
