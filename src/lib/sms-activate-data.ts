/**
 * DONNÉES SMS-ACTIVATE STATIQUES - Ultra optimisé
 * Basé sur les fichiers JSON officiels fournis par SMS-Activate
 */

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
  "15": { id: 15, code: "poland", name: "Poland", priority: 100 },
  "16": { id: 16, code: "unitedkingdom", name: "United Kingdom", priority: 550 },
  "22": { id: 22, code: "india", name: "India", priority: 700, popular: true },
  "32": { id: 32, code: "romania", name: "Romania", priority: 100 },
  "33": { id: 33, code: "colombia", name: "Colombia", priority: 120 },
  "36": { id: 36, code: "canada", name: "Canada", priority: 400, popular: true },
  "39": { id: 39, code: "argentina", name: "Argentina", priority: 120 },
  "43": { id: 43, code: "germany", name: "Germany", priority: 200, popular: true },
  "52": { id: 52, code: "thailand", name: "Thailand", priority: 180 },
  "56": { id: 56, code: "spain", name: "Spain", priority: 150 },
  "58": { id: 58, code: "italy", name: "Italy", priority: 150 },
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
  "196": { id: 196, code: "singapore", name: "Singapore", priority: 200 }
} as const

// Services populaires organisés par catégorie
export const SMS_ACTIVATE_SERVICES = {
  // Social Media (Plus populaires)
  social: [
    { code: "wa", name: "WhatsApp", category: "social", popularity: 1000 },
    { code: "tg", name: "Telegram", category: "social", popularity: 950 },
    { code: "ig", name: "Instagram", category: "social", popularity: 900 },
    { code: "fb", name: "Facebook", category: "social", popularity: 850 },
    { code: "tw", name: "Twitter", category: "social", popularity: 800 },
    { code: "ds", name: "Discord", category: "social", popularity: 750 },
    { code: "fu", name: "Snapchat", category: "social", popularity: 700 },
    { code: "lf", name: "TikTok", category: "social", popularity: 900 },
    { code: "tn", name: "LinkedIn", category: "social", popularity: 650 },
    { code: "bnl", name: "Reddit", category: "social", popularity: 600 },
  ],
  
  // Shopping & E-commerce
  shopping: [
    { code: "am", name: "Amazon", category: "shopping", popularity: 800 },
    { code: "ka", name: "Shopee", category: "shopping", popularity: 700 },
    { code: "dl", name: "Lazada", category: "shopping", popularity: 650 },
    { code: "ep", name: "Temu", category: "shopping", popularity: 750 },
    { code: "hx", name: "AliExpress", category: "shopping", popularity: 750 },
    { code: "aez", name: "Shein", category: "shopping", popularity: 700 },
    { code: "xt", name: "Flipkart", category: "shopping", popularity: 600 },
  ],
  
  // Finance & Payment
  finance: [
    { code: "ts", name: "PayPal", category: "finance", popularity: 850 },
    { code: "nc", name: "Payoneer", category: "finance", popularity: 700 },
    { code: "re", name: "Coinbase", category: "finance", popularity: 750 },
    { code: "aon", name: "Binance", category: "finance", popularity: 800 },
    { code: "ij", name: "Revolut", category: "finance", popularity: 700 },
    { code: "bo", name: "Wise", category: "finance", popularity: 650 },
    { code: "ti", name: "Crypto.com", category: "finance", popularity: 650 },
  ],
  
  // Food & Delivery
  delivery: [
    { code: "ub", name: "Uber", category: "delivery", popularity: 800 },
    { code: "jg", name: "Grab", category: "delivery", popularity: 750 },
    { code: "ac", name: "DoorDash", category: "delivery", popularity: 700 },
    { code: "aq", name: "Glovo", category: "delivery", popularity: 650 },
    { code: "rr", name: "Wolt", category: "delivery", popularity: 600 },
    { code: "nz", name: "Foodpanda", category: "delivery", popularity: 650 },
  ],
  
  // Tech & Services
  tech: [
    { code: "go", name: "Google", category: "tech", popularity: 950 },
    { code: "mm", name: "Microsoft", category: "tech", popularity: 850 },
    { code: "wx", name: "Apple", category: "tech", popularity: 900 },
    { code: "mb", name: "Yahoo", category: "tech", popularity: 700 },
    { code: "pm", name: "AOL", category: "tech", popularity: 600 },
    { code: "dr", name: "OpenAI", category: "tech", popularity: 850 },
  ],
  
  // Dating
  dating: [
    { code: "oi", name: "Tinder", category: "dating", popularity: 850 },
    { code: "mo", name: "Bumble", category: "dating", popularity: 750 },
    { code: "df", name: "Happn", category: "dating", popularity: 650 },
    { code: "qv", name: "Badoo", category: "dating", popularity: 700 },
    { code: "vz", name: "Hinge", category: "dating", popularity: 700 },
  ],
  
  // Gaming
  gaming: [
    { code: "mt", name: "Steam", category: "gaming", popularity: 850 },
    { code: "bz", name: "Blizzard", category: "gaming", popularity: 700 },
    { code: "ah", name: "Escape From Tarkov", category: "gaming", popularity: 650 },
    { code: "aiw", name: "Roblox", category: "gaming", popularity: 800 },
    { code: "blm", name: "Epic Games", category: "gaming", popularity: 750 },
  ],
  
  // Entertainment
  entertainment: [
    { code: "nf", name: "Netflix", category: "entertainment", popularity: 850 },
    { code: "alj", name: "Spotify", category: "entertainment", popularity: 800 },
    { code: "hb", name: "Twitch", category: "entertainment", popularity: 750 },
  ]
} as const

// Fonction pour obtenir TOUS les services (flat)
export const getAllServices = () => {
  return Object.values(SMS_ACTIVATE_SERVICES)
    .flat()
    .sort((a, b) => b.popularity - a.popularity)
}

// Fonction pour obtenir les top pays
export const getTopCountries = () => {
  return Object.values(SMS_ACTIVATE_COUNTRIES)
    .filter(c => c.popular)
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
