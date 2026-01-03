/**
 * Service Logo 2025 - 100% Logo.dev API
 * Simple, rapide, toujours à jour
 */

import * as ServicesComplete from './sms-activate-services-complete'

const LOGO_DEV_TOKEN = 'pk_acOeajbNRKGsSDnJvJrcfw'

// Collect all service codes from the comprehensive catalogue to auto-fill fallbacks
const ALL_SERVICE_CODES: Set<string> = (() => {
  const codes = new Set<string>()
  Object.values(ServicesComplete).forEach(value => {
    if (Array.isArray(value)) {
      value.forEach((s: any) => {
        if (s && typeof s.code === 'string') codes.add(s.code)
      })
    }
  })
  return codes
})()

// ============================================================================
// Mapping services SMS-Activate vers domaines
// OFFICIEL: Basé sur API getServicesList de SMS-Activate (29 Nov 2025)
// ============================================================================
const SERVICE_DOMAINS: Record<string, string> = {
  // 🔥 TOP SERVICES (ordre API SMS-Activate)
  'full': 'sms-activate.io',      // Full rent
  'fb': 'facebook.com',           // facebook
  'ig': 'instagram.com',          // Instagram+Threads
  'wa': 'whatsapp.com',           // Whatsapp
  'go': 'google.com',             // Google,youtube,Gmail
  'am': 'amazon.com',             // Amazon
  'oi': 'tinder.com',             // Tinder
  'tg': 'telegram.org',           // Telegram
  'hw': 'alibaba.com',            // Alipay/Alibaba/1688
  'lf': 'tiktok.com',             // TikTok/Douyin
  'yw': 'youwin.com',              // Youwin (code yw)
  'ot': 'sms-activate.io',        // Any other
  'tw': 'x.com',                  // Twitter
  'mm': 'microsoft.com',          // Microsoft (PAS Mamba!)
  'ka': 'shopee.com',             // Shopee (PAS KakaoTalk!)
  'wb': 'wechat.com',             // WeChat
  'ds': 'discord.com',            // Discord
  'gp': 'ticketmaster.com',       // Ticketmaster (pas Google Play!)
  'jg': 'grab.com',               // Grab
  'li': 'baidu.com',              // Baidu (PAS LinkedIn!)
  'vi': 'viber.com',              // Viber
  'nv': 'naver.com',              // Naver
  'ni': 'gojek.com',              // Gojek
  'mb': 'yahoo.com',              // Yahoo (PAS Mamba!)
  'ub': 'uber.com',               // Uber
  'vk': 'vk.com',                 // vk.com
  'xh': 'ovo.id',                 // OVO
  'me': 'line.me',                // Line messenger
  'cq': 'mercadolibre.com',       // Mercado
  'vz': 'hinge.co',               // Hinge
  'dl': 'lazada.com',             // Lazada
  'fr': 'dana.id',                // Dana
  'dh': 'ebay.com',               // eBay
  'pm': 'aol.com',                // AOL (PAS Payeer!)
  'ts': 'paypal.com',             // PayPal
  'wr': 'walmart.com',            // Walmart
  'df': 'happn.com',              // Happn
  'ki': '99app.com',              // 99app
  'za': 'jd.com',                 // JDcom
  'ya': 'yandex.com',             // Yandex/Uber
  'wx': 'apple.com',              // Apple (PAS WeChat!)
  'bn': 'alfagift.id',            // Alfagift (PAS Binance!)
  'nf': 'netflix.com',            // Netflix
  'ok': 'ok.ru',                  // ok.ru
  'nc': 'payoneer.com',           // Payoneer
  'bw': 'signal.org',             // Signal
  'nz': 'foodpanda.com',          // Foodpanda
  'aez': 'shein.com',             // Shein
  'mo': 'bumble.com',             // Bumble
  'pf': 'pof.com',                // pof.com
  'tn': 'linkedin.com',           // LinkedIN
  'tx': 'bolt.eu',                // Bolt (PAS Tencent!)
  'sn': 'olx.com',                // OLX (PAS Snapchat!)
  'ah': 'escapefromtarkov.com',   // EscapeFromTarkov
  'cn': 'fiverr.com',             // Fiverr
  'zk': 'deliveroo.com',          // Deliveroo
  'kc': 'vinted.com',             // Vinted
  'xk': 'didiglobal.com',         // DiDi
  'fu': 'snapchat.com',           // Snapchat
  're': 'coinbase.com',           // Coinbase
  'pc': 'bet365.com',             // Casino/bet/gambling
  'xd': 'tokopedia.com',          // Tokopedia
  'mv': 'fruitz.io',              // Fruitz
  'kt': 'kakaocorp.com',          // KakaoTalk
  'bz': 'blizzard.com',           // Blizzard
  'do': 'leboncoin.fr',           // Leboncoin
  'ac': 'doordash.com',           // DoorDash
  'im': 'imo.im',                 // Imo
  'kl': 'kolesa.kz',              // kolesa.kz
  'ua': 'blablacar.com',          // BlaBlaCar
  'kf': 'weibo.com',              // Weibo
  'ew': 'nike.com',               // Nike
  'rr': 'wolt.com',               // Wolt
  'pr': 'trendyol.com',           // Trendyol
  'gf': 'voice.google.com',       // GoogleVoice
  'yl': 'yalla.com',              // Yalla
  'uu': 'wildberries.ru',         // Wildberries
  'sg': 'signal.org',             // Signal (CORRECTED - was OZON)
  'fz': 'kfc.com',                // KFC
  'vm': 'okcupid.com',            // OkCupid
  'pd': 'ifood.com.br',           // IFood
  'rs': 'lotuscars.com',          // Lotus
  'wh': 'tantan.com',             // TanTan
  'uk': 'airbnb.com',             // Airbnb (PAS ukr.net!)
  'ef': 'nextdoor.com',           // Nextdoor
  'ep': 'temu.com',               // Temu
  'hx': 'aliexpress.com',         // AliExpress
  'bo': 'wise.com',               // Wise
  'zh': 'zoho.com',               // Zoho
  'fd': 'mamba.ru',               // Mamba (code fd, pas mm!)
  'aiw': 'roblox.com',            // Roblox
  'qq': 'qq.com',                 // Tencent QQ
  'bl': 'bigo.tv',                // BIGO LIVE
  'mt': 'steampowered.com',       // Steam (PAS MercadoLibre!)
  'dr': 'openai.com',             // OpenAI
  'qv': 'badoo.com',              // Badoo
  'iq': 'icq.com',                // icq
  'dp': 'protonmail.com',         // ProtonMail (pas Disney+!)
  'acz': 'anthropic.com',         // Claude
  'aon': 'binance.com',           // Binance (code aon!)

  // ============================================================================
  // Services demandés - Mappings ajoutés (30 Nov 2025)
  // ============================================================================
  'aq': 'glovoapp.com',           // Glovo
  'aow': 'geekay.com',            // Geekay
  'yq': 'mail.com',               // mail.com
  'mw': 'transfergo.com',         // Transfergo
  'bgj': 'moonpay.com',           // MoonPay
  'baa': 'wirex.com',             // Wirex
  'bwv': 'manus.im',              // Manus
  'gmx': 'gmx.net',               // gmx
  'abk': 'gmx.net',               // GMX
  'ahx': 'bitrue.com',            // Bitrue
  'ma': 'mail.ru',                // Mail.ru
  'apa': 'exness.com',            // Exness
  'rl': 'indriver.com',           // inDriver
  'um': 'belwest.by',             // Belwest
  'ij': 'revolut.com',            // Revolut
  'abn': 'bybit.com',             // Bybit
  'aor': 'okx.com',               // OKX
  'okx': 'okx.com',               // okx
  'aqt': 'skrill.com',            // Skrill
  'my': 'caixabank.es',           // CAIXA
  'aol': 'paysera.com',           // Paysera
  'cad': 'bossrevolution.com',    // BOSS Revolution

  // ============================================================================
  // TOP 100 Services populaires - Mappings complets
  // ============================================================================
  'alj': 'spotify.com',           // Spotify
  'hb': 'twitch.tv',              // Twitch
  'ti': 'crypto.com',             // Crypto.com
  'blm': 'epicgames.com',         // Epic Games
  'bnl': 'reddit.com',            // Reddit
  'xt': 'flipkart.com',           // Flipkart
  'ln': 'line.me',                // Line (CORRECTED - was Grofers)
  'kk': 'kakaocorp.com',          // KakaoTalk (CORRECTED - was Idealista)
  'zm': 'zoom.us',                // Zoom (CORRECTED - was OfferUp)
  'cc': 'sms-activate.io',        // Service CC
  'bqp': 'zara.com',              // Zara
  'ccb': 'nintendo.com',          // Nintendo
  'baz': 'christianfilipina.com', // Christian Filipina
  'an': 'adidas.com',             // Adidas
  'aqf': 'coze.com',              // Coze
  'dc': 'yikyak.com',             // YikYak
  'acc': 'luckyland.com',         // LuckyLand Slots
  'dd': 'cloudchat.com',          // CloudChat
  'acb': 'sparkdriver.com',       // Spark Driver
  'wc': 'craigslist.org',         // Craigslist
  'fs': 'sikayetvar.com',         // Şikayet var
  'avu': 'karos.fr',              // Karos
  'bli': 'scalapay.com',          // Scalapay
  'bub': 'sparda.de',             // Sparda Bank

  // ============================================================================
  // Services financiers et crypto populaires
  // ============================================================================
  'kraken': 'kraken.com',         // Kraken
  'gemini': 'gemini.com',         // Gemini
  'kucoin': 'kucoin.com',         // KuCoin
  'huobi': 'huobi.com',           // Huobi
  'ftx': 'ftx.com',               // FTX
  'bitstamp': 'bitstamp.net',     // Bitstamp
  'n26': 'n26.com',               // N26
  'monzo': 'monzo.com',           // Monzo
  'chime': 'chime.com',           // Chime
  'venmo': 'venmo.com',           // Venmo
  'cashapp': 'cashapp.com',       // Cash App
  'klarna': 'klarna.com',         // Klarna
  'afterpay': 'afterpay.com',     // Afterpay
  'affirm': 'affirm.com',         // Affirm
  'nubank': 'nubank.com.br',      // Nubank
  'westernunion': 'westernunion.com', // Western Union
  'moneygram': 'moneygram.com',   // MoneyGram
  'remitly': 'remitly.com',       // Remitly
  'worldremit': 'worldremit.com', // WorldRemit

  // ============================================================================
  // Services de livraison et transport
  // ============================================================================
  'ubereats': 'ubereats.com',     // Uber Eats
  'grubhub': 'grubhub.com',       // GrubHub
  'postmates': 'postmates.com',   // Postmates
  'instacart': 'instacart.com',   // Instacart
  'rappi': 'rappi.com',           // Rappi
  'pedidosya': 'pedidosya.com',   // PedidosYa
  'justeat': 'justeat.com',       // Just Eat
  'takeaway': 'takeaway.com',     // Takeaway
  'didi': 'didiglobal.com',       // DiDi
  'lyft': 'lyft.com',             // Lyft
  'cabify': 'cabify.com',         // Cabify

  // ============================================================================
  // Services de streaming et gaming
  // ============================================================================
  'deezer': 'deezer.com',         // Deezer
  'soundcloud': 'soundcloud.com', // SoundCloud
  'pandora': 'pandora.com',       // Pandora
  'tidal': 'tidal.com',           // Tidal
  'primevideo': 'primevideo.com', // Prime Video
  'hulu': 'hulu.com',             // Hulu
  'disneyplus': 'disneyplus.com', // Disney+
  'hbomax': 'hbomax.com',         // HBO Max
  'peacock': 'peacocktv.com',     // Peacock
  'paramount': 'paramountplus.com', // Paramount+
  'ea': 'ea.com',                 // EA Games
  'ubisoft': 'ubisoft.com',       // Ubisoft
  'riotgames': 'riotgames.com',   // Riot Games
  'activision': 'activision.com', // Activision
  'bethesda': 'bethesda.net',     // Bethesda

  // ============================================================================
  // Services de voyage et hébergement
  // ============================================================================
  'booking': 'booking.com',       // Booking.com
  'expedia': 'expedia.com',       // Expedia
  'kayak': 'kayak.com',           // Kayak
  'skyscanner': 'skyscanner.com', // Skyscanner
  'agoda': 'agoda.com',           // Agoda
  'hotels': 'hotels.com',         // Hotels.com
  'trivago': 'trivago.com',       // Trivago
  'vrbo': 'vrbo.com',             // VRBO
  'hostelworld': 'hostelworld.com', // Hostelworld

  // ============================================================================
  // Services professionnels et emploi
  // ============================================================================
  'indeed': 'indeed.com',         // Indeed
  'glassdoor': 'glassdoor.com',   // Glassdoor
  'monster': 'monster.com',       // Monster
  'ziprecruiter': 'ziprecruiter.com', // ZipRecruiter
  'upwork': 'upwork.com',         // Upwork
  'fiverr': 'fiverr.com',         // Fiverr
  'freelancer': 'freelancer.com', // Freelancer

  // ============================================================================
  // VPN et sécurité
  // ============================================================================
  'nordvpn': 'nordvpn.com',       // NordVPN
  'expressvpn': 'expressvpn.com', // ExpressVPN
  'surfshark': 'surfshark.com',   // Surfshark
  'protonvpn': 'protonvpn.com',   // ProtonVPN
  'cyberghost': 'cyberghostvpn.com', // CyberGhost

  // Services additionnels
  'gr': 'grindr.com',             // Grindr (code SMS-Activate: gr)
  'afk': 'astropay.com',          // AstroPay (autre code possible)
  'astropay': 'astropay.com',     // AstroPay (nom complet)
  'et': 'clubhouse.com',          // Clubhouse (code SMS-Activate: et)
  'ch': 'clubhouse.com',          // Clubhouse (fallback)
  'clubhouse': 'clubhouse.com',   // Clubhouse (nom complet)
  'ms': 'novaposhta.ua',          // NovaPoshta (code SMS-Activate: ms)
  'np': 'novaposhta.ua',          // Nova Poshta (fallback)
  'novaposhta': 'novaposhta.ua',  // Nova Poshta (nom complet)
  'pn': 'allegro.pl',             // Allegro
  'ld': 'zalo.me',                // Zalo
  'bd': 'baidu.com',              // Baidu (Corrected)
  'dz': 'douyin.com',             // Douyin/TikTok (Corrected)
  'xhs': 'xiaohongshu.com',       // Xiaohongshu
  // 'ot' déjà défini plus haut
  'st': 'steampowered.com',       // Steam (code st)
  'gl': 'globo.com',              // Globo
  'gm': 'game.com',               // Game
  'gu': 'groupon.com',            // Groupon
  'hz': 'hepsiburada.com',        // Hepsiburada
  'ly': 'lydia-app.com',          // Lydia
  'lz': 'lalamove.com',           // Lalamove
  'mz': 'mercadopago.com',        // MercadoPago
  'nk': 'nykaa.com',              // Nykaa
  'oe': 'omegle.com',             // Omegle
  'ol': 'olacabs.com',            // Ola
  'pz': 'pizza.com',              // Pizza Hut
  'qz': 'quora.com',              // Quora
  'rc': 'rakuten.com',            // Rakuten
  'sd': 'swiggy.com',             // Swiggy
  'sf': 'salesforce.com',         // Salesforce
  'sk': 'skype.com',              // Skype
  'sl': 'slack.com',              // Slack (CORRECTED - was Shopee)
  'sm': 'samsung.com',            // Samsung
  // 'ln', 'kk', 'sg', 'sk', 'sl' define below or above - keeping consistent single source
  'mk': 'mercari.com',            // Mercari
  'sp': 'spotify.com',            // Spotify
  'sq': 'squarespace.com',        // Squarespace
  'sr': 'surveymonkey.com',       // SurveyMonkey
  'sv': 'imgur.com',              // Imgur
  'sy': 'symphony.com',           // Symphony
  'sz': 'souq.com',               // Souq
  'ta': 'talabat.com',            // Talabat
  'tc': 'ticketfly.com',          // Ticketfly
  'te': 'telegram.org',           // Telegram (autre code)
  'tf': 'tiffany.com',            // Tiffany
  // 'ti' déjà défini comme crypto.com plus haut
  'to': 'tokopedia.com',          // Tokopedia (autre code)
  'tp': 'tripadvisor.com',        // TripAdvisor
  'tt': 'tiktok.com',             // TikTok (autre code)
  'tv': 'twitch.tv',              // Twitch
  'ty': 'toyota.com',             // Toyota
  'tz': 'taobao.com',             // Taobao
  'vd': 'vodafone.com',           // Vodafone
  've': 'verizon.com',            // Verizon
  'vf': 'vodafone.com',           // Vodafone
  'vp': 'vimeo.com',              // Vimeo
  'vr': 'vrbo.com',               // VRBO
  'vs': 'visa.com',               // Visa
  'wd': 'weddingwire.com',        // WeddingWire
  'we': 'wework.com',             // WeWork
  'wf': 'wellsfargo.com',         // Wells Fargo
  'wl': 'walmart.com',            // Walmart
  'wm': 'walmart.com',            // Walmart
  'wn': 'southwest.com',          // Southwest
  'wo': 'woocommerce.com',        // WooCommerce
  'wp': 'wordpress.com',          // WordPress
  'ws': 'wsj.com',                // Wall Street Journal
  'wt': 'wetransfer.com',         // WeTransfer
  'wy': 'wyze.com',               // Wyze
  'xp': 'expedia.com',            // Expedia
  'xr': 'xero.com',               // Xero
  'xs': 'xsolla.com',             // Xsolla
  // 'xt' déjà défini comme flipkart.com plus haut
  'yb': 'youtube.com',            // YouTube
  'yc': 'ycombinator.com',        // Y Combinator
  'yd': 'yandex.com',             // Yandex
  'ye': 'yelp.com',               // Yelp
  'yi': 'yidio.com',              // Yidio
  'yo': 'yahoo.com',              // Yahoo
  'yp': 'yellowpages.com',        // Yellow Pages
  'yr': 'yoox.com',               // Yoox
  'ys': 'yousign.com',            // YouSign
  'yt': 'youtube.com',            // YouTube
  'yu': 'yubo.live',              // Yubo
  'yv': 'yves-rocher.com',        // Yves Rocher
  'zb': 'zomato.com',             // Zomato
  'zc': 'zendesk.com',            // Zendesk
  'zd': 'zdnet.com',              // ZDNet
  'ze': 'zellepay.com',           // Zelle
  'zf': 'zaful.com',              // Zaful
  'zg': 'zillow.com',             // Zillow
  'zi': 'zoom.us',                // Zoom
  'zl': 'zalo.me',                // Zalo
  // 'zm' déjà défini comme offerup.com plus haut
  'zn': 'zenith.com',             // Zenith
  'zo': 'zomato.com',             // Zomato
  'zp': 'zapier.com',             // Zapier
  'zr': 'zara.com',               // Zara
  'zs': 'zscaler.com',            // Zscaler
  'zt': 'zepto.com',              // Zepto
  'zu': 'zuora.com',              // Zuora
  'zv': 'zwift.com',              // Zwift
  'zw': 'zomato.com',             // Zomato
  'zx': 'zoox.com',               // Zoox
  'zy': 'zynga.com',              // Zynga
  'zz': 'zazzle.com',             // Zazzle

  // Noms complets (fallback pour recherche)
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
  'tinder': 'tinder.com',
  'badoo': 'badoo.com',
}

// Auto-fill missing service codes with a generic fallback domain to remove gaps
ALL_SERVICE_CODES.forEach(code => {
  if (!SERVICE_DOMAINS[code]) {
    SERVICE_DOMAINS[code] = 'sms-activate.io'
  }
})

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

// Liste des codes pays ISO-2 à exclure de logo.dev (ils génèrent des erreurs 404)
const ISO_COUNTRY_CODES = new Set([
  'ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'ao', 'aq', 'ar', 'as', 'at', 'au', 'aw', 'ax', 'az',
  'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bl', 'bm', 'bn', 'bo', 'bq', 'br', 'bs', 'bt', 'bv', 'bw', 'by', 'bz',
  'ca', 'cc', 'cd', 'cf', 'cg', 'ch', 'ci', 'ck', 'cl', 'cm', 'cn', 'co', 'cr', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz',
  'de', 'dj', 'dk', 'dm', 'do', 'dz', 'ec', 'ee', 'eg', 'eh', 'er', 'es', 'et', 'fi', 'fj', 'fk', 'fm', 'fo', 'fr',
  'ga', 'gb', 'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gl', 'gm', 'gn', 'gp', 'gq', 'gr', 'gs', 'gt', 'gu', 'gw', 'gy',
  'hk', 'hm', 'hn', 'hr', 'ht', 'hu', 'id', 'ie', 'il', 'im', 'in', 'io', 'iq', 'ir', 'is', 'it',
  'je', 'jm', 'jo', 'jp', 'ke', 'kg', 'kh', 'ki', 'km', 'kn', 'kp', 'kr', 'kw', 'ky', 'kz',
  'la', 'lb', 'lc', 'li', 'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly',
  'ma', 'mc', 'md', 'me', 'mf', 'mg', 'mh', 'mk', 'ml', 'mm', 'mn', 'mo', 'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'mv', 'mw', 'mx', 'my', 'mz',
  'na', 'nc', 'ne', 'nf', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu', 'nz',
  'om', 'pa', 'pe', 'pf', 'pg', 'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'ps', 'pt', 'pw', 'py',
  'qa', 're', 'ro', 'rs', 'ru', 'rw',
  'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'sh', 'si', 'sj', 'sk', 'sl', 'sm', 'sn', 'so', 'sr', 'ss', 'st', 'sv', 'sx', 'sy', 'sz',
  'tc', 'td', 'tf', 'tg', 'th', 'tj', 'tk', 'tl', 'tm', 'tn', 'to', 'tr', 'tt', 'tv', 'tw', 'tz',
  'ua', 'ug', 'um', 'us', 'uy', 'uz', 'va', 've', 'vg', 'vi', 'vn', 'vu', 'wf', 'ws', 'ye', 'yt', 'za', 'zm', 'zw',
  // Codes pays SMS-Activate communs
  'usa', 'russia', 'ukraine', 'china', 'india', 'indonesia', 'philippines', 'thailand', 'vietnam', 'malaysia',
  'england', 'france', 'germany', 'spain', 'italy', 'poland', 'netherlands', 'belgium', 'sweden', 'norway',
  'brazil', 'mexico', 'argentina', 'colombia', 'chile', 'peru', 'venezuela',
  'egypt', 'nigeria', 'southafrica', 'kenya', 'morocco', 'algeria', 'tunisia',
  'turkey', 'saudiarabia', 'uae', 'israel', 'pakistan', 'bangladesh', 'srilanka',
  'australia', 'newzealand', 'japan', 'southkorea', 'hongkong', 'taiwan', 'singapore'
])

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

  // Overrides pour services dont le logo.dev est trompeur
  if (code === 'afk' || code === 'astropay') {
    return '/logos/astropay.svg'
  }

  // PRIORITÉ 1: Si le code est dans SERVICE_DOMAINS, utiliser le domaine mappé
  // Ceci résout le conflit tg=Telegram vs tg=Togo, am=Amazon vs am=Armenia, etc.
  if (SERVICE_DOMAINS[code]) {
    const domain = SERVICE_DOMAINS[code]
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=200`
  }

  // PRIORITÉ 2: Si c'est un code pays ISO (et PAS un service connu), retourner le fallback
  if (ISO_COUNTRY_CODES.has(code)) {
    return generateFallbackLogo(code)
  }

  // PRIORITÉ 3: Essayer avec le domaine .com par défaut
  const domain = `${code}.com`
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
 * OFFICIEL: Basé sur API getServicesList de SMS-Activate
 */
export const getServiceIcon = (serviceCode: string): string => {
  const iconMap: Record<string, string> = {
    // TOP Services SMS-Activate
    'full': '📱',     // Full rent
    'fb': '👥',       // Facebook
    'ig': '📸',       // Instagram+Threads
    'wa': '💬',       // Whatsapp
    'go': '🔍',       // Google,youtube,Gmail
    'am': '📦',       // Amazon
    'oi': '❤️',       // Tinder
    'tg': '✈️',       // Telegram
    'hw': '🛍️',       // Alipay/Alibaba/1688
    'lf': '🎵',       // TikTok/Douyin
    'yw': '🎰',       // Youwin
    'gr': '🌈',       // Grindr
    'ot': '📱',       // Any other
    'tw': '🐦',       // Twitter
    'mm': '🪟',       // Microsoft (PAS Mamba!)
    'ka': '🛒',       // Shopee (PAS KakaoTalk!)
    'wb': '💬',       // WeChat
    'ds': '🎮',       // Discord
    'gp': '🎫',       // Ticketmaster (pas Google Play!)
    'jg': '🚕',       // Grab
    'li': '🔍',       // Baidu (PAS LinkedIn!)
    'vi': '📞',       // Viber
    'nv': '🇰🇷',      // Naver
    'ni': '🛵',       // Gojek
    'mb': '📧',       // Yahoo (PAS Mamba!)
    'ub': '🚗',       // Uber
    'vk': '🔵',       // vk.com
    'me': '💚',       // Line messenger
    'ts': '💳',       // PayPal
    'dh': '🛒',       // eBay
    'pm': '📩',       // AOL (PAS Payeer!)
    'ya': '🔍',       // Yandex/Uber
    'wx': '🍎',       // Apple (PAS WeChat!)
    'bn': '🏪',       // Alfagift (PAS Binance!)
    'nf': '🎬',       // Netflix
    'ok': '🟠',       // ok.ru
    'nc': '💱',       // Payoneer
    'bw': '🔒',       // Signal
    'nz': '🐼',       // Foodpanda
    'aez': '👗',      // Shein
    'mo': '💛',       // Bumble
    'tn': '💼',       // LinkedIN
    'tx': '🚗',       // Bolt (PAS Tencent!)
    'sn': '📦',       // OLX (PAS Snapchat!)
    'fu': '👻',       // Snapchat
    're': '🪙',       // Coinbase
    'kt': '💛',       // KakaoTalk
    'bz': '❄️',       // Blizzard
    'ac': '🍔',       // DoorDash
    'im': '📱',       // Imo
    'kf': '📱',       // Weibo
    'ew': '👟',       // Nike
    'rr': '🍕',       // Wolt
    'uu': '🛍️',       // Wildberries
    'sg': '🔒',       // Signal (CORRECTED)
    'vm': '💗',       // OkCupid
    'uk': '🏠',       // Airbnb (PAS ukr.net!)
    'ep': '🛍️',       // Temu
    'hx': '🛒',       // AliExpress
    'bo': '💸',       // Wise
    'zh': '📧',       // Zoho
    'fd': '💘',       // Mamba (code fd!)
    'aiw': '🎲',      // Roblox
    'qq': '🐧',       // Tencent QQ
    'bl': '📺',       // BIGO LIVE
    'mt': '🎮',       // Steam
    'dr': '🤖',       // OpenAI
    'qv': '💙',       // Badoo
    'aon': '🔶',      // Binance (code aon!)
    'acz': '🤖',      // Claude
    'df': '❤️',       // Happn
    'vz': '💖',       // Hinge
    'afk': '💳',      // AstroPay
    'astropay': '💳', // AstroPay (nom complet)

    // Noms complets (fallback)
    'whatsapp': '💬',
    'telegram': '✈️',
    'instagram': '📸',
    'facebook': '👥',
    'twitter': '🐦',
    'x': '🐦',
    'discord': '🎮',
    'snapchat': '👻',
    'viber': '📞',
    'line': '💚',
    'wechat': '💬',
    'google': '🔍',
    'microsoft': '🪟',
    'apple': '🍎',
    'amazon': '📦',
    'netflix': '🎬',
    'spotify': '🎵',
    'tiktok': '🎵',
    'uber': '🚗',
    'airbnb': '🏠',
    'paypal': '💳',
    'linkedin': '💼',
    'reddit': '🤖',
    'pinterest': '📌',
    'steam': '🎮',
    'twitch': '📺',
    'youtube': '📺',
    'yahoo': '📧',
    'coinbase': '🪙',
    'binance': '🔶',
    // 'ln', 'kk', 'sg', 'mb', 'pm', 'ok', 'zm', 'sk', 'sl' managed via consolidated list below or above

    'xhs': '📕',      // Xiaohongshu (xhs)
    'jd': '🛒',       // JD.com (jd)
    'pdd': '🛒',      // Pinduoduo (pdd)
    'meituan': '🥡',  // Meituan
    'weibo': '📱',    // Weibo
    'taobao': '🛍️',   // Taobao
    'tinder': '❤️',
    'badoo': '💙',
    'bumble': '💛',
  }

  // Auto-fill missing codes with a neutral icon to avoid inconsistent UI for long-tail services
  ALL_SERVICE_CODES.forEach(code => {
    if (!iconMap[code]) {
      iconMap[code] = '📱'
    }
  })
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
  'cyprus': 'cy', 'czech': 'cz', 'czechrepublic': 'cz', 'denmark': 'dk', 'djibouti': 'dj',
  'dominicana': 'do', 'dominicanrepublic': 'do', 'ecuador': 'ec', 'egypt': 'eg', 'england': 'gb',
  'elsalvador': 'sv', 'estonia': 'ee', 'ethiopia': 'et', 'fiji': 'fj', 'finland': 'fi',
  'france': 'fr', 'gabon': 'ga', 'gambia': 'gm', 'georgia': 'ge',
  'germany': 'de', 'ghana': 'gh', 'greece': 'gr', 'guatemala': 'gt',
  'guinea': 'gn', 'guyana': 'gy', 'haiti': 'ht', 'honduras': 'hn',
  'hongkong': 'hk', 'hungary': 'hu', 'iceland': 'is', 'india': 'in',
  'indonesia': 'id', 'iran': 'ir', 'iraq': 'iq', 'ireland': 'ie',
  'israel': 'il', 'italy': 'it', 'ivorycoast': 'ci', 'jamaica': 'jm',
  'japan': 'jp', 'jordan': 'jo', 'kazakhstan': 'kz', 'kenya': 'ke',
  'kuwait': 'kw', 'kyrgyzstan': 'kg', 'laos': 'la', 'latvia': 'lv',
  'lebanon': 'lb', 'liberia': 'lr', 'libya': 'ly', 'lithuania': 'lt',
  'luxembourg': 'lu', 'macau': 'mo', 'macedonia': 'mk', 'northmacedonia': 'mk', 'madagascar': 'mg',
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
  'tanzania': 'tz', 'thailand': 'th', 'togo': 'tg', 'trinidad': 'tt', 'trinidadandtobago': 'tt', 'tunisia': 'tn',
  'turkey': 'tr', 'turkmenistan': 'tm', 'uae': 'ae', 'uganda': 'ug', 'ukraine': 'ua',
  'unitedarabemirates': 'ae', 'unitedkingdom': 'gb', 'uk': 'gb', 'united kingdom': 'gb', 'greatbritain': 'gb', 'usa': 'us',
  'uruguay': 'uy', 'uzbekistan': 'uz', 'venezuela': 've', 'vietnam': 'vn',
  'yemen': 'ye', 'zambia': 'zm', 'zimbabwe': 'zw',

  // Aliases & Variations (Spaces stripped automatically by resolveToIso)
  'unitedstates': 'us', 'unitedstatesofamerica': 'us', 'us': 'us',
  'russianfederation': 'ru',
  'korea': 'kr', 'republicofkorea': 'kr',
  'moldovarepublicof': 'md',
  'tanzaniaunitedrepublicof': 'tz',
  'congodemocraticrepublic': 'cd', 'democraticrepublicofthecongo': 'cd', 'drcongo': 'cd',
  'bosniaandherzegovina': 'ba',
  'papuanewguinea': 'pg',
  'cotedivoire': 'ci', // ivorycoast already defined above on line 698
  'laopeoplesdemocraticrepublic': 'la',
  'syrianarabrepublic': 'sy',
  'bolivaringrepublicofvenezuela': 've',
  // 'vietnam' already defined above
  'burma': 'mm',
  'macao': 'mo',
  'timorleste': 'tl', 'easttimor': 'tl',
  'bruneidarussalam': 'bn',
}

// Liste des codes ISO valides pour validation
const VALID_ISO_CODES = new Set([
  'ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'ao', 'aq', 'ar', 'as', 'at', 'au', 'aw', 'ax', 'az',
  'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bl', 'bm', 'bn', 'bo', 'bq', 'br', 'bs', 'bt', 'bv', 'bw', 'by', 'bz',
  'ca', 'cc', 'cd', 'cf', 'cg', 'ch', 'ci', 'ck', 'cl', 'cm', 'cn', 'co', 'cr', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz',
  'de', 'dj', 'dk', 'dm', 'do', 'dz', 'ec', 'ee', 'eg', 'eh', 'er', 'es', 'et', 'fi', 'fj', 'fk', 'fm', 'fo', 'fr',
  'ga', 'gb', 'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gl', 'gm', 'gn', 'gp', 'gq', 'gr', 'gs', 'gt', 'gu', 'gw', 'gy',
  'hk', 'hm', 'hn', 'hr', 'ht', 'hu', 'id', 'ie', 'il', 'im', 'in', 'io', 'iq', 'ir', 'is', 'it',
  'je', 'jm', 'jo', 'jp', 'ke', 'kg', 'kh', 'ki', 'km', 'kn', 'kp', 'kr', 'kw', 'ky', 'kz',
  'la', 'lb', 'lc', 'li', 'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly',
  'ma', 'mc', 'md', 'me', 'mf', 'mg', 'mh', 'mk', 'ml', 'mm', 'mn', 'mo', 'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'mv', 'mw', 'mx', 'my', 'mz',
  'na', 'nc', 'ne', 'nf', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu', 'nz',
  'om', 'pa', 'pe', 'pf', 'pg', 'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'ps', 'pt', 'pw', 'py',
  'qa', 're', 'ro', 'rs', 'ru', 'rw',
  'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'sh', 'si', 'sj', 'sk', 'sl', 'sm', 'sn', 'so', 'sr', 'ss', 'st', 'sv', 'sx', 'sy', 'sz',
  'tc', 'td', 'tf', 'tg', 'th', 'tj', 'tk', 'tl', 'tm', 'tn', 'to', 'tr', 'tt', 'tv', 'tw', 'tz',
  'ua', 'ug', 'um', 'us', 'uy', 'uz', 'va', 've', 'vg', 'vi', 'vn', 'vu', 'wf', 'ws', 'ye', 'yt', 'za', 'zm', 'zw'
])

// Mapping SMS-Activate ID numérique → code ISO-2
// Les country_code stockés dans la DB peuvent être des IDs numériques (ex: "187" pour USA)
const SMS_ACTIVATE_ID_TO_ISO: Record<string, string> = {
  // Basé sur sms-activate-data.ts (Homepage 2025)
  '0': 'ru',    // Russia
  '1': 'ua',    // Ukraine
  '2': 'kz',    // Kazakhstan
  '3': 'cn',    // China
  '4': 'ph',    // Philippines
  '6': 'id',    // Indonesia
  '7': 'my',    // Malaysia
  '10': 'vn',   // Vietnam
  '11': 'kg',   // Kyrgyzstan
  '12': 'gb',   // England
  '13': 'il',   // Israel
  '14': 'hk',   // Hong Kong
  '15': 'pl',   // Poland
  '16': 'gb',   // United Kingdom
  '19': 'ma',   // Morocco
  '22': 'in',   // India
  '32': 'ro',   // Romania
  '33': 'co',   // Colombia
  '36': 'ca',   // Canada
  '39': 'ar',   // Argentina
  '43': 'de',   // Germany
  '52': 'th',   // Thailand
  '56': 'es',   // Spain
  '58': 'it',   // Italy
  '73': 'br',   // Brazil
  '78': 'fr',   // France
  '82': 'mx',   // Mexico
  '86': 'it',   // Italy (Alternative)
  '117': 'pt',  // Portugal
  '128': 'ge',  // Georgia
  '129': 'gr',  // Greece
  '148': 'am',  // Armenia
  '151': 'cl',  // Chile
  '155': 'al',  // Albania
  '163': 'fi',  // Finland
  '172': 'dk',  // Denmark
  '173': 'ch',  // Switzerland
  '174': 'no',  // Norway
  '175': 'au',  // Australia
  '182': 'jp',  // Japan
  '187': 'us',  // USA
  '196': 'sg',  // Singapore
}

/**
 * Helper: résoudre un country code en ISO-2
 * Gère: code ISO, nom de pays, ou ID numérique SMS-Activate
 */
const resolveToIso = (countryCode: string): string => {
  if (!countryCode) return ''
  // Normalize: lowercase, remove spaces, hyphens, AND underscores (handles "Hong-Kong", "South Africa", "hong_kong")
  let code = countryCode.toLowerCase().replace(/[\s\-_]+/g, '')

  // 0. Gérer le préfixe "rent-" (legacy bug: parfois stocké comme "rent-6" au lieu de "6")
  if (code.startsWith('rent-')) {
    code = code.replace('rent-', '')
  }

  // 1. D'abord vérifier si c'est un ID numérique SMS-Activate
  if (SMS_ACTIVATE_ID_TO_ISO[code]) {
    return SMS_ACTIVATE_ID_TO_ISO[code]
  }

  // 2. Ensuite vérifier si c'est un nom de pays
  if (COUNTRY_TO_ISO[code]) {
    return COUNTRY_TO_ISO[code]
  }

  // 3. Si c'est déjà un code ISO de 2 lettres valide, l'utiliser
  if (code.length === 2 && VALID_ISO_CODES.has(code)) {
    return code
  }

  // 4. Fallback: essayer les 2 premiers caractères (seulement si pas numérique)
  if (!/^\d+$/.test(code)) {
    const twoChars = code.substring(0, 2)
    if (VALID_ISO_CODES.has(twoChars)) {
      return twoChars
    }
  }

  return ''
}

/**
 * Obtenir l'URL de l'image du drapeau depuis Flagpedia
 */
export const getCountryFlag = (countryCode: string): string => {
  const isoCode = resolveToIso(countryCode)

  // Validate ISO code - return empty string for invalid codes to prevent 404s
  if (!isoCode || !VALID_ISO_CODES.has(isoCode)) {
    return ''
  }

  return `https://flagcdn.com/w80/${isoCode}.png`
}

/**
 * Obtenir l'emoji du drapeau (pour fallback)
 */
export const getFlagEmoji = (countryCode: string): string => {
  const isoCode = resolveToIso(countryCode)

  if (!isoCode) return '🌍'

  return toFlagEmoji(isoCode)
}
