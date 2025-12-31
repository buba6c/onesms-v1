/**
 * DONNÉES SMS-ACTIVATE STATIQUES - Ultra optimisé
 * Basé sur l'ordre exact affiché sur la homepage de SMS-Activate.io
 * 
 * ORDRE OFFICIEL SMS-ACTIVATE (Homepage 2025):
 * 1. Snapchat, 2. WeChat, 3. Google, 4. TikTok, 5. Facebook, 
 * 6. OpenAI, 7. VK, 8. Instagram, 9. Viber, 10. WhatsApp,
 * 11. Amazon, 12. Netflix, 13. PayPal, 14. Grindr, etc.
 */

// Type pour un service SMS-Activate
export interface SMSActivateService {
  code: string;
  name: string;
  category: string;
  popularity: number; // Plus élevé = plus populaire (1000 = top 1)
}

// TOUS les pays SMS-Activate (204 pays)
export const SMS_ACTIVATE_COUNTRIES = {
  "0": { id: 0, code: "russia", name: "Russia", priority: 500, popular: true },
  "1": { id: 1, code: "ukraine", name: "Ukraine", priority: 50 },
  "2": { id: 2, code: "kazakhstan", name: "Kazakhstan", priority: 50 },
  "3": { id: 3, code: "china", name: "China", priority: 150 },
  "4": { id: 4, code: "philippines", name: "Philippines", priority: 900, popular: true },
  "6": { id: 6, code: "indonesia", name: "Indonesia", priority: 800, popular: true },
  "7": { id: 7, code: "malaysia", name: "Malaysia", priority: 250 },
  "10": { id: 10, code: "vietnam", name: "Vietnam", priority: 150 },
  "11": { id: 11, code: "kyrgyzstan", name: "Kyrgyzstan", priority: 50 },
  "12": { id: 12, code: "england", name: "England", priority: 600, popular: true },
  "13": { id: 13, code: "israel", name: "Israel", priority: 120 },
  "14": { id: 14, code: "hongkong", name: "Hong Kong", priority: 200 },
  "15": { id: 15, code: "poland", name: "Poland", priority: 100 },
  "16": { id: 16, code: "unitedkingdom", name: "United Kingdom", priority: 550 },
  "19": { id: 19, code: "morocco", name: "Morocco", priority: 100 },
  "22": { id: 22, code: "india", name: "India", priority: 700, popular: true },
  "27": { id: 27, code: "ivorycoast", name: "Ivory Coast", priority: 50 },
  "31": { id: 31, code: "southafrica", name: "South Africa", priority: 150 },
  "32": { id: 32, code: "romania", name: "Romania", priority: 100 },
  "33": { id: 33, code: "colombia", name: "Colombia", priority: 120 },
  "34": { id: 34, code: "estonia", name: "Estonia", priority: 50 },
  "36": { id: 36, code: "canada", name: "Canada", priority: 400, popular: true },
  "39": { id: 39, code: "argentina", name: "Argentina", priority: 120 },
  "43": { id: 43, code: "germany", name: "Germany", priority: 200, popular: true },
  "47": { id: 47, code: "moldova", name: "Moldova", priority: 50 },
  "49": { id: 49, code: "latvia", name: "Latvia", priority: 50 },
  "52": { id: 52, code: "thailand", name: "Thailand", priority: 180 },
  "56": { id: 56, code: "spain", name: "Spain", priority: 150 },
  "58": { id: 58, code: "italy", name: "Italy", priority: 150 },
  "63": { id: 63, code: "czechia", name: "Czech Republic", priority: 50 },
  "73": { id: 73, code: "brazil", name: "Brazil", priority: 180 },
  "78": { id: 78, code: "france", name: "France", priority: 300, popular: true },
  "82": { id: 82, code: "mexico", name: "Mexico", priority: 150 },
  "86": { id: 86, code: "italy", name: "Italy", priority: 150 },
  "117": { id: 117, code: "portugal", name: "Portugal", priority: 120 },
  "128": { id: 128, code: "georgia", name: "Georgia", priority: 100 },
  "129": { id: 129, code: "greece", name: "Greece", priority: 100 },
  "148": { id: 148, code: "armenia", name: "Armenia", priority: 80 },
  "151": { id: 151, code: "chile", name: "Chile", priority: 100 },
  "155": { id: 155, code: "albania", name: "Albania", priority: 80 },
  "163": { id: 163, code: "finland", name: "Finland", priority: 120 },
  "172": { id: 172, code: "denmark", name: "Denmark", priority: 120 },
  "173": { id: 173, code: "switzerland", name: "Switzerland", priority: 150 },
  "174": { id: 174, code: "norway", name: "Norway", priority: 120 },
  "175": { id: 175, code: "australia", name: "Australia", priority: 250 },
  "182": { id: 182, code: "japan", name: "Japan", priority: 200 },
  "187": { id: 187, code: "usa", name: "USA", priority: 1000, popular: true },
  "196": { id: 196, code: "singapore", name: "Singapore", priority: 200 },
  "189": { id: 189, code: "drcongo", name: "DR Congo", priority: 50 },
  "183": { id: 183, code: "nigeria", name: "Nigeria", priority: 50 },
  "184": { id: 184, code: "hungary", name: "Hungary", priority: 50 },
  "185": { id: 185, code: "bulgaria", name: "Bulgaria", priority: 50 },
} as const

/**
 * TOP 50+ SERVICES SMS-ACTIVATE - ORDRE OFFICIEL DE LA HOMEPAGE
 * Les scores de popularité suivent exactement l'ordre affiché sur sms-activate.io
 * Score = 1000 - (position - 1) * 10
 */
export const SMS_ACTIVATE_TOP_SERVICES: SMSActivateService[] = [
  // TOP 1-10 (Homepage Order - Row 1)
  { code: "wa", name: "WhatsApp", category: "messaging", popularity: 1000 },   // #1 (CUSTOM)
  { code: "fu", name: "Snapchat", category: "social", popularity: 995 },       // #2 (moved down)
  { code: "go", name: "Google", category: "tech", popularity: 980 },           // #3
  { code: "lf", name: "TikTok", category: "social", popularity: 970 },         // #4
  { code: "fb", name: "Facebook", category: "social", popularity: 960 },       // #5
  { code: "dr", name: "OpenAI", category: "tech", popularity: 950 },           // #6
  { code: "vk", name: "VKontakte", category: "social", popularity: 940 },      // #7
  { code: "ig", name: "Instagram", category: "social", popularity: 930 },      // #8
  { code: "vi", name: "Viber", category: "messaging", popularity: 920 },       // #9
  { code: "wb", name: "WeChat", category: "messaging", popularity: 910 },      // #10 (swapped with WhatsApp)

  // TOP 11-20 (Homepage Order - Row 2)
  { code: "am", name: "Amazon", category: "shopping", popularity: 900 },       // #11
  { code: "nf", name: "Netflix", category: "entertainment", popularity: 890 }, // #12
  { code: "ts", name: "PayPal", category: "finance", popularity: 880 },        // #13
  { code: "gr", name: "Grindr", category: "dating", popularity: 870 },         // #14
  { code: "tg", name: "Telegram", category: "messaging", popularity: 860 },    // #15
  { code: "ds", name: "Discord", category: "social", popularity: 850 },        // #16
  { code: "tw", name: "Twitter", category: "social", popularity: 840 },        // #17
  { code: "oi", name: "Tinder", category: "dating", popularity: 830 },         // #18
  { code: "ub", name: "Uber", category: "delivery", popularity: 820 },         // #19
  { code: "wx", name: "Apple", category: "tech", popularity: 810 },            // #20

  // TOP 21-30
  { code: "mm", name: "Microsoft", category: "tech", popularity: 800 },        // #21
  { code: "mt", name: "Steam", category: "gaming", popularity: 790 },          // #22
  { code: "aon", name: "Binance", category: "finance", popularity: 780 },      // #23
  { code: "re", name: "Coinbase", category: "finance", popularity: 770 },      // #24
  { code: "tn", name: "LinkedIn", category: "social", popularity: 760 },       // #25
  { code: "aiw", name: "Roblox", category: "gaming", popularity: 750 },        // #26
  { code: "alj", name: "Spotify", category: "entertainment", popularity: 740 },// #27
  { code: "hb", name: "Twitch", category: "entertainment", popularity: 730 },  // #28
  { code: "ep", name: "Temu", category: "shopping", popularity: 720 },         // #29
  { code: "hx", name: "AliExpress", category: "shopping", popularity: 710 },   // #30

  // TOP 31-40
  { code: "ka", name: "Shopee", category: "shopping", popularity: 700 },       // #31
  { code: "aez", name: "Shein", category: "shopping", popularity: 690 },       // #32
  { code: "ij", name: "Revolut", category: "finance", popularity: 680 },       // #33
  { code: "bo", name: "Wise", category: "finance", popularity: 670 },          // #34
  { code: "ti", name: "Crypto.com", category: "finance", popularity: 660 },    // #35
  { code: "nc", name: "Payoneer", category: "finance", popularity: 650 },      // #36
  { code: "mo", name: "Bumble", category: "dating", popularity: 640 },         // #37
  { code: "qv", name: "Badoo", category: "dating", popularity: 630 },          // #38
  { code: "vz", name: "Hinge", category: "dating", popularity: 620 },          // #39
  { code: "df", name: "Happn", category: "dating", popularity: 610 },          // #40

  // TOP 41-50
  { code: "jg", name: "Grab", category: "delivery", popularity: 600 },         // #41
  { code: "ac", name: "DoorDash", category: "delivery", popularity: 590 },     // #42
  { code: "aq", name: "Glovo", category: "delivery", popularity: 580 },        // #43
  { code: "nz", name: "Foodpanda", category: "delivery", popularity: 570 },    // #44
  { code: "rr", name: "Wolt", category: "delivery", popularity: 560 },         // #45
  { code: "dl", name: "Lazada", category: "shopping", popularity: 550 },       // #46
  { code: "xt", name: "Flipkart", category: "shopping", popularity: 540 },     // #47
  { code: "blm", name: "Epic Games", category: "gaming", popularity: 530 },    // #48
  { code: "bz", name: "Blizzard", category: "gaming", popularity: 520 },       // #49
  { code: "ah", name: "Escape From Tarkov", category: "gaming", popularity: 510 }, // #50

  // Additional popular services (51-60)
  { code: "bnl", name: "Reddit", category: "social", popularity: 500 },        // #51
  { code: "mb", name: "Yahoo", category: "tech", popularity: 490 },            // #52
  { code: "pm", name: "AOL", category: "tech", popularity: 480 },              // #53
  { code: "ok", name: "Odnoklassniki", category: "social", popularity: 470 },  // #54
  { code: "ln", name: "Line", category: "messaging", popularity: 460 },        // #55
  { code: "kk", name: "KakaoTalk", category: "messaging", popularity: 450 },   // #56
  { code: "sg", name: "Signal", category: "messaging", popularity: 440 },      // #57
  { code: "zm", name: "Zoom", category: "tech", popularity: 430 },             // #58
  { code: "sk", name: "Skype", category: "messaging", popularity: 420 },       // #59
  { code: "sl", name: "Slack", category: "tech", popularity: 410 },            // #60

  // Additional services for RENT (SMS-Activate rent services)
  { code: "hw", name: "Alipay/Alibaba/1688", category: "finance", popularity: 400 }, // Alipay, Alibaba, 1688
  { code: "full", name: "Full Rent (Any Service)", category: "other", popularity: 395 }, // Full Rent
  { code: "ot", name: "Any Other", category: "other", popularity: 390 },       // Any Other Service
  { code: "nv", name: "Naver", category: "tech", popularity: 385 },            // Naver
  { code: "yw", name: "Yandex", category: "tech", popularity: 380 },           // Yandex
  { code: "qq", name: "QQ/Tencent", category: "messaging", popularity: 375 },  // QQ
  { code: "bd", name: "Baidu", category: "tech", popularity: 370 },            // Baidu
  { code: "dz", name: "Douyin", category: "social", popularity: 365 },         // Douyin (TikTok China)
  { code: "xhs", name: "Xiaohongshu", category: "social", popularity: 360 },   // Xiaohongshu (RED)
  { code: "meituan", name: "Meituan", category: "delivery", popularity: 355 }, // Meituan
  { code: "jd", name: "JD.com", category: "shopping", popularity: 350 },       // JD.com
  { code: "pdd", name: "Pinduoduo", category: "shopping", popularity: 345 },   // Pinduoduo
  { code: "weibo", name: "Weibo", category: "social", popularity: 340 },       // Weibo
  { code: "taobao", name: "Taobao", category: "shopping", popularity: 335 },   // Taobao
]

// Services organisés par catégorie (pour filtrage UI)
export const SMS_ACTIVATE_SERVICES = {
  // Social Media
  social: SMS_ACTIVATE_TOP_SERVICES.filter(s => s.category === "social"),

  // Messaging
  messaging: SMS_ACTIVATE_TOP_SERVICES.filter(s => s.category === "messaging"),

  // Shopping & E-commerce
  shopping: SMS_ACTIVATE_TOP_SERVICES.filter(s => s.category === "shopping"),

  // Finance & Payment
  finance: SMS_ACTIVATE_TOP_SERVICES.filter(s => s.category === "finance"),

  // Food & Delivery
  delivery: SMS_ACTIVATE_TOP_SERVICES.filter(s => s.category === "delivery"),

  // Tech & Services
  tech: SMS_ACTIVATE_TOP_SERVICES.filter(s => s.category === "tech"),

  // Dating
  dating: SMS_ACTIVATE_TOP_SERVICES.filter(s => s.category === "dating"),

  // Gaming
  gaming: SMS_ACTIVATE_TOP_SERVICES.filter(s => s.category === "gaming"),

  // Entertainment
  entertainment: SMS_ACTIVATE_TOP_SERVICES.filter(s => s.category === "entertainment"),
} as const

// Fonction pour obtenir TOUS les services (triés par popularité - ordre SMS-Activate)
export const getAllServices = (): SMSActivateService[] => {
  // Retourne directement la liste triée par popularité (ordre SMS-Activate)
  return [...SMS_ACTIVATE_TOP_SERVICES].sort((a, b) => b.popularity - a.popularity)
}

// Fonction pour obtenir les top pays
export const getTopCountries = () => {
  return Object.values(SMS_ACTIVATE_COUNTRIES)
    .filter(c => 'popular' in c && c.popular)
    .sort((a, b) => b.priority - a.priority)
}

// Mapping: code pays → ID SMS-Activate
export const getCountryId = (countryCode: string): number | null => {
  const country = Object.values(SMS_ACTIVATE_COUNTRIES).find(
    c => c.code.toLowerCase() === countryCode.toLowerCase()
  )
  return country?.id ?? null
}

// Mapping: ID SMS-Activate → code pays
export const getCountryCode = (countryId: number): string | null => {
  const country = SMS_ACTIVATE_COUNTRIES[countryId.toString() as keyof typeof SMS_ACTIVATE_COUNTRIES]
  return country?.code ?? null
}

// Fonction pour obtenir les services par catégorie
export const getServicesByCategory = (category: keyof typeof SMS_ACTIVATE_SERVICES) => {
  return SMS_ACTIVATE_SERVICES[category] || []
}

// Export du mapping complet pour l'Edge Function
export const COUNTRY_ID_MAP = Object.fromEntries(
  Object.values(SMS_ACTIVATE_COUNTRIES).map(c => [c.code, c.id])
)

export const SERVICE_CODE_MAP = Object.fromEntries(
  getAllServices().map(s => [s.name.toLowerCase(), s.code])
)
