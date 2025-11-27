/**
 * Service Logo 2025 - 100% Logo.dev API
 * Simple, rapide, toujours à jour
 */

const LOGO_DEV_TOKEN = 'pk_acOeajbNRKGsSDnJvJrcfw'

// Mapping services vers domaines (prioritaire)
const SERVICE_DOMAINS: Record<string, string> = {
  // Codes SMS-Activate TOP services
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
  
  // Services manquants ajoutés
  'fu': 'snapchat.com',      // Snapchat
  'bnl': 'reddit.com',       // Reddit
  'aon': 'binance.com',      // Binance
  'ij': 'revolut.com',       // Revolut
  'alj': 'spotify.com',      // Spotify
  
  // Noms complets
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
  'tinder': 'tinder.com',
  'badoo': 'badoo.com',
  'full': 'sms-activate.org',
}

/**
 * Générer un logo SVG de fallback pour un service
 */
const generateFallbackLogo = (serviceCode: string, emoji?: string): string => {
  const code = serviceCode.toLowerCase().trim()
  const displayEmoji = emoji || getServiceIcon(code)
  const firstLetter = code.charAt(0).toUpperCase()
  
  // SVG avec emoji ou première lettre
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%234f46e5;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%237c3aed;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23grad)' width='200' height='200' rx='20'/%3E%3Ctext x='50%25' y='50%25' font-family='system-ui,-apple-system,sans-serif' font-size='80' text-anchor='middle' dominant-baseline='middle'%3E${displayEmoji}%3C/text%3E%3Ctext x='50%25' y='85%25' font-family='system-ui,-apple-system,sans-serif' font-size='16' fill='white' text-anchor='middle' opacity='0.8'%3E${firstLetter}${code.slice(1, 8)}%3C/text%3E%3C/svg%3E`
}

/**
 * Obtenir le logo d'un service via Logo.dev avec fallback
 * Automatique, pas de DB, toujours à jour
 */
export const getServiceLogo = (serviceCode: string): string => {
  const code = serviceCode.toLowerCase().trim()
  
  // Vérifier si c'est un code valide (pas de chiffres au début, pas de caractères bizarres)
  const isValidCode = /^[a-z][a-z0-9-_]*$/i.test(code)
  
  if (!isValidCode) {
    return generateFallbackLogo(code)
  }
  
  const domain = SERVICE_DOMAINS[code] || `${code}.com`
  return `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=200`
}

/**
 * Obtenir le fallback logo d'un service (utilisé en cas d'erreur)
 */
export const getServiceLogoFallback = (serviceCode: string): string => {
  return generateFallbackLogo(serviceCode)
}

/**
 * Emojis de services (fallback uniquement)
 */
export const getServiceIcon = (serviceCode: string): string => {
  const iconMap: Record<string, string> = {
    // Messaging & Social
    'whatsapp': '💬',
    'wa': '💬',
    'telegram': '✈️',
    'tg': '✈️',
    'instagram': '📸',
    'ig': '📸',
    'facebook': '👥',
    'fb': '👥',
    'twitter': '🐦',
    'tw': '🐦',
    'x': '🐦',
    'discord': '💬',
    'ds': '💬',
    'snapchat': '👻',
    'fu': '👻',
    'sn': '👻',
    'viber': '📞',
    'vi': '📞',
    'line': '💬',
    'me': '💬',
    'wechat': '💬',
    'we': '💬',
    'wx': '💬',
    'kakao': '📱',
    'kt': '📱',
    'ka': '📱',
    'imo': '📱',
    'im': '📱',
    
    // Tech Giants
    'google': '🔍',
    'go': '🔍',
    'microsoft': '🪟',
    'ms': '🪟',
    'om': '🪟',
    'apple': '🍎',
    'amazon': '📦',
    'am': '📦',
    
    // Entertainment
    'netflix': '🎬',
    'nf': '🎬',
    'spotify': '🎵',
    'alj': '🎵',
    'tiktok': '🎵',
    'tt': '🎵',
    'lf': '🎵',
    'twitch': '🎮',
    'youtube': '📺',
    
    // Finance & Crypto
    'paypal': '💳',
    'ts': '💳',
    'revolut': '💳',
    'ij': '💳',
    'coinbase': '🪙',
    're': '🪙',
    'binance': '🔶',
    'aon': '🔶',
    'bn': '🔶',
    'stripe': '💳',
    'payeer': '💰',
    'pm': '💰',
    
    // E-commerce
    'uber': '🚗',
    'ub': '🚗',
    'airbnb': '🏠',
    'shopee': '🛒',
    'alibaba': '🛍️',
    'mercadolibre': '🛍️',
    'mg': '🛍️',
    'mt': '🛍️',
    'avito': '🏪',
    'av': '🏪',
    'wildberries': '🛍️',
    'wb': '🛍️',
    'youla': '🛒',
    'yz': '🛒',
    'zara': '👗',
    'zr': '👗',
    
    // Dating apps
    'tinder': '❤️',
    'oi': '❤️',
    'tn': '💼',        // LinkedIn (corrigé)
    'badoo': '💙',
    'qv': '💙',
    'bumble': '💛',
    'bd': '💛',
    'mamba': '💘',
    'mb': '💘',
    'mm': '💘',
    
    // Social Networks
    'reddit': '🤖',
    'bnl': '🤖',
    'linkedin': '💼',
    'li': '💼',
    'vkontakte': '🎵',
    'vk': '🎵',
    'odnoklassniki': '👥',
    'ok': '👥',
    'pinterest': '📌',
    'dribbble': '🎨',
    'dr': '🎨',
    
    // Email & Communication
    'gmail': '📧',
    'gm': '📧',
    'outlook': '📧',
    'yahoo': '📧',
    'yandex': '🔍',
    'ym': '🔍',
    'mail.ru': '📧',
    'ma': '📧',
    'mr': '📧',
    'ukr.net': '📧',
    'uk': '📧',
    
    // Gaming
    'steam': '🎮',
    'blizzard': '🎮',
    'bl': '🎮',
    
    // News & Media
    'dzen': '📰',
    'zn': '📰',
    'kp.ru': '📰',
    'kp': '📰',
    
    // Other
    'tencent': '🐧',
    'tx': '🐧',
    'postfinance': '🏦',
    'pf': '🏦',
    'full': '🏠',      // Full rent
  }
  return iconMap[serviceCode.toLowerCase()] || '📱'
}

/**
 * Drapeaux de pays - Emoji natifs (pas de CDN externe)
 * Convertit code ISO-2 en emoji Unicode
 */
const toFlagEmoji = (countryCode: string): string => {
  const code = countryCode.toUpperCase()
  
  // Convertir code ISO-2 en emoji Unicode
  // Chaque lettre devient Regional Indicator Symbol (A=🇦, B=🇧, etc.)
  if (code.length !== 2) return '🌍'
  
  const codePoints = [...code].map(char => 
    0x1F1E6 + char.charCodeAt(0) - 65 // 0x1F1E6 = 🇦
  )
  
  return String.fromCodePoint(...codePoints)
}

// Mapping compact : nom pays → code ISO-2
const COUNTRY_TO_ISO: Record<string, string> = {
  'afghanistan': 'af', 'albania': 'al', 'algeria': 'dz', 'angola': 'ao',
  'argentina': 'ar', 'armenia': 'am', 'australia': 'au', 'austria': 'at',
  'azerbaijan': 'az', 'bahamas': 'bs', 'bahrain': 'bh', 'bangladesh': 'bd',
  'barbados': 'bb', 'belarus': 'by', 'belgium': 'be', 'belize': 'bz',
  'benin': 'bj', 'bhutan': 'bt', 'bolivia': 'bo', 'bosnia': 'ba',
  'botswana': 'bw', 'brazil': 'br', 'bulgaria': 'bg', 'burkinafaso': 'bf',
  'burundi': 'bi', 'cambodia': 'kh', 'cameroon': 'cm', 'canada': 'ca',
  'chad': 'td', 'chile': 'cl', 'china': 'cn', 'colombia': 'co',
  'congo': 'cg', 'costarica': 'cr', 'croatia': 'hr', 'cuba': 'cu',
  'cyprus': 'cy', 'czech': 'cz', 'denmark': 'dk', 'djibouti': 'dj',
  'dominicana': 'do', 'ecuador': 'ec', 'egypt': 'eg', 'england': 'gb',
  'estonia': 'ee', 'ethiopia': 'et', 'fiji': 'fj', 'finland': 'fi',
  'france': 'fr', 'gabon': 'ga', 'gambia': 'gm', 'georgia': 'ge',
  'germany': 'de', 'ghana': 'gh', 'greece': 'gr', 'guatemala': 'gt',
  'guinea': 'gn', 'guyana': 'gy', 'haiti': 'ht', 'honduras': 'hn',
  'hongkong': 'hk', 'hungary': 'hu', 'iceland': 'is', 'india': 'in',
  'indonesia': 'id', 'iran': 'ir', 'iraq': 'iq', 'ireland': 'ie',
  'israel': 'il', 'italy': 'it', 'ivorycoast': 'ci', 'jamaica': 'jm',
  'japan': 'jp', 'jordan': 'jo', 'kazakhstan': 'kz', 'kenya': 'ke',
  'kuwait': 'kw', 'kyrgyzstan': 'kg', 'laos': 'la', 'latvia': 'lv',
  'lebanon': 'lb', 'liberia': 'lr', 'libya': 'ly', 'lithuania': 'lt',
  'luxembourg': 'lu', 'macau': 'mo', 'macedonia': 'mk', 'madagascar': 'mg',
  'malawi': 'mw', 'malaysia': 'my', 'maldives': 'mv', 'mali': 'ml',
  'malta': 'mt', 'mauritania': 'mr', 'mauritius': 'mu', 'mexico': 'mx',
  'moldova': 'md', 'mongolia': 'mn', 'montenegro': 'me', 'morocco': 'ma',
  'mozambique': 'mz', 'myanmar': 'mm', 'namibia': 'na', 'nepal': 'np',
  'netherlands': 'nl', 'newzealand': 'nz', 'nicaragua': 'ni', 'niger': 'ne',
  'nigeria': 'ng', 'norway': 'no', 'oman': 'om', 'pakistan': 'pk',
  'palestine': 'ps', 'panama': 'pa', 'paraguay': 'py', 'peru': 'pe',
  'philippines': 'ph', 'poland': 'pl', 'portugal': 'pt', 'puertorico': 'pr',
  'qatar': 'qa', 'reunion': 're', 'romania': 'ro', 'russia': 'ru',
  'rwanda': 'rw', 'samoa': 'ws', 'saudiarabia': 'sa', 'senegal': 'sn',
  'serbia': 'rs', 'singapore': 'sg', 'slovakia': 'sk', 'slovenia': 'si',
  'somalia': 'so', 'southafrica': 'za', 'southkorea': 'kr', 'spain': 'es',
  'srilanka': 'lk', 'sudan': 'sd', 'suriname': 'sr', 'sweden': 'se',
  'switzerland': 'ch', 'syria': 'sy', 'taiwan': 'tw', 'tajikistan': 'tj',
  'tanzania': 'tz', 'thailand': 'th', 'togo': 'tg', 'tunisia': 'tn',
  'turkey': 'tr', 'turkmenistan': 'tm', 'uganda': 'ug', 'ukraine': 'ua',
  'unitedarabemirates': 'ae', 'unitedkingdom': 'gb', 'usa': 'us',
  'uruguay': 'uy', 'uzbekistan': 'uz', 'venezuela': 've', 'vietnam': 'vn',
  'yemen': 'ye', 'zambia': 'zm', 'zimbabwe': 'zw',
}

/**
 * Obtenir l'URL de l'image du drapeau depuis Flagpedia
 */
export const getCountryFlag = (countryCode: string): string => {
  const code = countryCode.toLowerCase().replace(/\s+/g, '')
  const isoCode = COUNTRY_TO_ISO[code] || code.substring(0, 2)
  return `https://flagcdn.com/w80/${isoCode}.png`
}

/**
 * Obtenir l'emoji du drapeau (pour fallback)
 */
export const getFlagEmoji = (countryCode: string): string => {
  const code = countryCode.toLowerCase().replace(/\s+/g, '')
  const isoCode = COUNTRY_TO_ISO[code] || code
  return toFlagEmoji(isoCode)
}
