/**
 * Mapping des codes courts SMS-Activate vers les noms complets
 * 
 * SMS-Activate utilise des codes courts (wa, tg, ig, etc.) dans leur API
 * Ce mapping permet de:
 * 1. Convertir code court → nom complet pour l'affichage
 * 2. Maintenir la compatibilité avec l'API SMS-Activate
 * 3. Gérer les alias et variations de noms
 * 
 * Source: https://sms-activate.ae/api2
 */

export interface ServiceMapping {
  code: string;           // Code court SMS-Activate (wa, tg, etc.)
  name: string;           // Nom complet pour l'affichage
  displayName: string;    // Nom formaté pour l'UI
  icon: string;           // Emoji représentatif
  category: string;       // Catégorie du service
  aliases: string[];      // Autres codes/noms possibles
  popularityRank: number; // Rang de popularité sur SMS-Activate (1 = plus populaire)
}

/**
 * Top 100 services SMS-Activate par ordre de popularité
 * Basé sur l'ordre de l'API getNumbersStatus et la homepage SMS-Activate
 */
export const SMS_ACTIVATE_SERVICES: ServiceMapping[] = [
  // Top 20 - Services les plus populaires
  { code: 'wa', name: 'WhatsApp', displayName: 'WhatsApp', icon: '💬', category: 'messaging', aliases: ['whatsapp'], popularityRank: 1 },
  { code: 'tg', name: 'Telegram', displayName: 'Telegram', icon: '✈️', category: 'messaging', aliases: ['telegram'], popularityRank: 2 },
  { code: 'vi', name: 'Viber', displayName: 'Viber', icon: '📞', category: 'messaging', aliases: ['viber'], popularityRank: 3 },
  { code: 'ig', name: 'Instagram', displayName: 'Instagram', icon: '📷', category: 'social', aliases: ['instagram'], popularityRank: 4 },
  { code: 'fb', name: 'Facebook', displayName: 'Facebook', icon: '👤', category: 'social', aliases: ['facebook'], popularityRank: 5 },
  { code: 'go', name: 'Google', displayName: 'Google', icon: '🔍', category: 'tech', aliases: ['google', 'gmail'], popularityRank: 6 },
  { code: 'tw', name: 'Twitter', displayName: 'Twitter (X)', icon: '🐦', category: 'social', aliases: ['twitter', 'x'], popularityRank: 7 },
  { code: 'wb', name: 'Weibo', displayName: 'Weibo', icon: '🇨🇳', category: 'social', aliases: ['weibo'], popularityRank: 8 },
  { code: 'ds', name: 'Discord', displayName: 'Discord', icon: '💬', category: 'messaging', aliases: ['discord'], popularityRank: 9 },
  { code: 'vk', name: 'VKontakte', displayName: 'VKontakte', icon: '🔵', category: 'social', aliases: ['vkontakte', 'vk'], popularityRank: 10 },
  { code: 'ok', name: 'Odnoklassniki', displayName: 'Odnoklassniki', icon: '🟠', category: 'social', aliases: ['odnoklassniki'], popularityRank: 11 },
  { code: 'mm', name: 'Microsoft', displayName: 'Microsoft', icon: '🪟', category: 'tech', aliases: ['microsoft', 'outlook'], popularityRank: 12 },
  { code: 'am', name: 'Amazon', displayName: 'Amazon', icon: '📦', category: 'shopping', aliases: ['amazon'], popularityRank: 13 },
  { code: 'nf', name: 'Netflix', displayName: 'Netflix', icon: '🎬', category: 'entertainment', aliases: ['netflix'], popularityRank: 14 },
  { code: 'ub', name: 'Uber', displayName: 'Uber', icon: '🚗', category: 'delivery', aliases: ['uber', 'ubereats'], popularityRank: 15 },
  { code: 'ts', name: 'PayPal', displayName: 'PayPal', icon: '💳', category: 'financial', aliases: ['paypal'], popularityRank: 16 },
  { code: 'li', name: 'LinkedIn', displayName: 'LinkedIn', icon: '💼', category: 'social', aliases: ['linkedin'], popularityRank: 17 },
  { code: 'ya', name: 'Yandex', displayName: 'Yandex', icon: '🔴', category: 'tech', aliases: ['yandex'], popularityRank: 18 },
  { code: 'sc', name: 'Snapchat', displayName: 'Snapchat', icon: '👻', category: 'social', aliases: ['snapchat'], popularityRank: 19 },
  { code: 'tt', name: 'TikTok', displayName: 'TikTok', icon: '🎵', category: 'entertainment', aliases: ['tiktok'], popularityRank: 20 },

  // 21-40 - Services populaires
  { code: 'ap', name: 'Apple', displayName: 'Apple', icon: '🍎', category: 'tech', aliases: ['apple', 'icloud'], popularityRank: 21 },
  { code: 'sp', name: 'Spotify', displayName: 'Spotify', icon: '🎵', category: 'entertainment', aliases: ['spotify'], popularityRank: 22 },
  { code: 'rd', name: 'Reddit', displayName: 'Reddit', icon: '🤖', category: 'social', aliases: ['reddit'], popularityRank: 23 },
  { code: 'pn', name: 'Pinterest', displayName: 'Pinterest', icon: '📌', category: 'social', aliases: ['pinterest'], popularityRank: 24 },
  { code: 'yt', name: 'YouTube', displayName: 'YouTube', icon: '▶️', category: 'entertainment', aliases: ['youtube'], popularityRank: 25 },
  { code: 'oi', name: 'Tinder', displayName: 'Tinder', icon: '🔥', category: 'dating', aliases: ['tinder'], popularityRank: 26 },
  { code: 'bu', name: 'Bumble', displayName: 'Bumble', icon: '💛', category: 'dating', aliases: ['bumble'], popularityRank: 27 },
  { code: 'ma', name: 'Match', displayName: 'Match', icon: '💕', category: 'dating', aliases: ['match'], popularityRank: 28 },
  { code: 'sg', name: 'Signal', displayName: 'Signal', icon: '🔒', category: 'messaging', aliases: ['signal'], popularityRank: 29 },
  { code: 'ln', name: 'Line', displayName: 'Line', icon: '💚', category: 'messaging', aliases: ['line'], popularityRank: 30 },
  { code: 'wc', name: 'WeChat', displayName: 'WeChat', icon: '💬', category: 'messaging', aliases: ['wechat'], popularityRank: 31 },
  { code: 'kk', name: 'KakaoTalk', displayName: 'KakaoTalk', icon: '💛', category: 'messaging', aliases: ['kakao', 'kakaotalk'], popularityRank: 32 },
  { code: 'cb', name: 'Coinbase', displayName: 'Coinbase', icon: '🪙', category: 'financial', aliases: ['coinbase'], popularityRank: 33 },
  { code: 'bn', name: 'Binance', displayName: 'Binance', icon: '🟡', category: 'financial', aliases: ['binance'], popularityRank: 34 },
  { code: 'rv', name: 'Revolut', displayName: 'Revolut', icon: '💳', category: 'financial', aliases: ['revolut'], popularityRank: 35 },
  { code: 'ws', name: 'Wise', displayName: 'Wise', icon: '💸', category: 'financial', aliases: ['wise', 'transferwise'], popularityRank: 36 },
  { code: 'ca', name: 'Cash App', displayName: 'Cash App', icon: '💵', category: 'financial', aliases: ['cashapp'], popularityRank: 37 },
  { code: 'dd', name: 'DoorDash', displayName: 'DoorDash', icon: '🍔', category: 'delivery', aliases: ['doordash'], popularityRank: 38 },
  { code: 'gh', name: 'GrubHub', displayName: 'GrubHub', icon: '🍕', category: 'delivery', aliases: ['grubhub'], popularityRank: 39 },
  { code: 'pm', name: 'Postmates', displayName: 'Postmates', icon: '🚚', category: 'delivery', aliases: ['postmates'], popularityRank: 40 },

  // 41-60 - Services moyennement populaires
  { code: 'dl', name: 'Deliveroo', displayName: 'Deliveroo', icon: '🛵', category: 'delivery', aliases: ['deliveroo'], popularityRank: 41 },
  { code: 'eb', name: 'eBay', displayName: 'eBay', icon: '🛍️', category: 'shopping', aliases: ['ebay'], popularityRank: 42 },
  { code: 'al', name: 'Alibaba', displayName: 'Alibaba', icon: '🛒', category: 'shopping', aliases: ['alibaba'], popularityRank: 43 },
  { code: 'et', name: 'Etsy', displayName: 'Etsy', icon: '🎨', category: 'shopping', aliases: ['etsy'], popularityRank: 44 },
  { code: 'wp', name: 'Wish', displayName: 'Wish', icon: '⭐', category: 'shopping', aliases: ['wish'], popularityRank: 45 },
  { code: 'sh', name: 'Shopify', displayName: 'Shopify', icon: '🏪', category: 'shopping', aliases: ['shopify'], popularityRank: 46 },
  { code: 'az', name: 'Airbnb', displayName: 'Airbnb', icon: '🏠', category: 'travel', aliases: ['airbnb'], popularityRank: 47 },
  { code: 'bk', name: 'Booking', displayName: 'Booking.com', icon: '🏨', category: 'travel', aliases: ['booking'], popularityRank: 48 },
  { code: 'ex', name: 'Expedia', displayName: 'Expedia', icon: '✈️', category: 'travel', aliases: ['expedia'], popularityRank: 49 },
  { code: 'sk', name: 'Skype', displayName: 'Skype', icon: '📞', category: 'messaging', aliases: ['skype'], popularityRank: 50 },
  { code: 'zm', name: 'Zoom', displayName: 'Zoom', icon: '📹', category: 'tech', aliases: ['zoom'], popularityRank: 51 },
  { code: 'sl', name: 'Slack', displayName: 'Slack', icon: '💬', category: 'tech', aliases: ['slack'], popularityRank: 52 },
  { code: 'dr', name: 'Dropbox', displayName: 'Dropbox', icon: '📦', category: 'tech', aliases: ['dropbox'], popularityRank: 53 },
  { code: 'gd', name: 'Google Drive', displayName: 'Google Drive', icon: '☁️', category: 'tech', aliases: ['googledrive', 'gdrive'], popularityRank: 54 },
  { code: 'od', name: 'OneDrive', displayName: 'OneDrive', icon: '☁️', category: 'tech', aliases: ['onedrive'], popularityRank: 55 },
  { code: 'tw', name: 'Twitch', displayName: 'Twitch', icon: '🎮', category: 'entertainment', aliases: ['twitch'], popularityRank: 56 },
  { code: 'dc', name: 'Disney+', displayName: 'Disney+', icon: '🏰', category: 'entertainment', aliases: ['disney', 'disneyplus'], popularityRank: 57 },
  { code: 'hp', name: 'HBO Max', displayName: 'HBO Max', icon: '📺', category: 'entertainment', aliases: ['hbo', 'hbomax'], popularityRank: 58 },
  { code: 'pr', name: 'Prime Video', displayName: 'Prime Video', icon: '📺', category: 'entertainment', aliases: ['primevideo', 'prime'], popularityRank: 59 },
  { code: 'hulu', name: 'Hulu', displayName: 'Hulu', icon: '📺', category: 'entertainment', aliases: ['hulu'], popularityRank: 60 },
];

/**
 * Map pour recherche rapide par code
 */
export const SMS_ACTIVATE_CODE_MAP = new Map<string, ServiceMapping>(
  SMS_ACTIVATE_SERVICES.map(s => [s.code, s])
);

/**
 * Map pour recherche par alias (whatsapp → wa, telegram → tg, etc.)
 */
export const SMS_ACTIVATE_ALIAS_MAP = new Map<string, string>();
SMS_ACTIVATE_SERVICES.forEach(service => {
  service.aliases.forEach(alias => {
    SMS_ACTIVATE_ALIAS_MAP.set(alias.toLowerCase(), service.code);
  });
});

/**
 * Convertir un code/alias en code court SMS-Activate
 * @param input Code court (wa), code long (whatsapp), ou nom complet (WhatsApp)
 * @returns Code court SMS-Activate ou null si non trouvé
 */
export function normalizeServiceCode(input: string): string | null {
  const normalized = input.toLowerCase().trim();
  
  // Chercher dans les codes directs
  if (SMS_ACTIVATE_CODE_MAP.has(normalized)) {
    return normalized;
  }
  
  // Chercher dans les alias
  if (SMS_ACTIVATE_ALIAS_MAP.has(normalized)) {
    return SMS_ACTIVATE_ALIAS_MAP.get(normalized)!;
  }
  
  // Chercher par correspondance partielle
  for (const service of SMS_ACTIVATE_SERVICES) {
    if (service.name.toLowerCase() === normalized ||
        service.displayName.toLowerCase() === normalized) {
      return service.code;
    }
  }
  
  return null;
}

/**
 * Obtenir les informations complètes d'un service
 * @param input Code court, alias ou nom
 * @returns ServiceMapping ou null si non trouvé
 */
export function getServiceInfo(input: string): ServiceMapping | null {
  const code = normalizeServiceCode(input);
  if (!code) return null;
  
  return SMS_ACTIVATE_CODE_MAP.get(code) || null;
}

/**
 * Obtenir le nom d'affichage d'un service
 * @param code Code court SMS-Activate
 * @returns Nom formaté pour l'UI ou le code si non trouvé
 */
export function getServiceDisplayName(code: string): string {
  const service = SMS_ACTIVATE_CODE_MAP.get(code.toLowerCase());
  return service?.displayName || code;
}

/**
 * Obtenir l'emoji d'un service
 * @param code Code court SMS-Activate
 * @returns Emoji ou 📱 par défaut
 */
export function getServiceEmoji(code: string): string {
  const service = SMS_ACTIVATE_CODE_MAP.get(code.toLowerCase());
  return service?.icon || '📱';
}

/**
 * Obtenir la catégorie d'un service
 * @param code Code court SMS-Activate
 * @returns Catégorie ou 'other' par défaut
 */
export function getServiceCategory(code: string): string {
  const service = SMS_ACTIVATE_CODE_MAP.get(code.toLowerCase());
  return service?.category || 'other';
}

/**
 * Obtenir le rang de popularité d'un service
 * @param code Code court SMS-Activate
 * @returns Rang (1 = le plus populaire) ou 9999 si non trouvé
 */
export function getServicePopularityRank(code: string): number {
  const service = SMS_ACTIVATE_CODE_MAP.get(code.toLowerCase());
  return service?.popularityRank || 9999;
}

/**
 * Obtenir tous les services d'une catégorie
 * @param category Nom de la catégorie
 * @returns Liste des services de cette catégorie
 */
export function getServicesByCategory(category: string): ServiceMapping[] {
  return SMS_ACTIVATE_SERVICES.filter(s => s.category === category);
}

/**
 * Obtenir les top N services par popularité
 * @param n Nombre de services à retourner
 * @returns Liste des N services les plus populaires
 */
export function getTopServices(n: number = 50): ServiceMapping[] {
  return SMS_ACTIVATE_SERVICES.slice(0, n);
}

/**
 * Vérifier si un service est dans le top N
 * @param code Code du service
 * @param topN Seuil de popularité (par défaut 50)
 * @returns true si le service est dans le top N
 */
export function isPopularService(code: string, topN: number = 50): boolean {
  const rank = getServicePopularityRank(code);
  return rank <= topN;
}

/**
 * Calculer le popularity_score basé sur le rang SMS-Activate
 * Score = 1000 - (rank - 1) * 10
 * wa (rank 1) = 1000, tg (rank 2) = 990, etc.
 * 
 * @param code Code du service
 * @returns Score de popularité (0-1000)
 */
export function calculatePopularityScore(code: string): number {
  const rank = getServicePopularityRank(code);
  if (rank === 9999) return 0; // Service non répertorié
  
  // Formule: 1000 points pour le #1, -10 points par rang
  return Math.max(0, 1000 - (rank - 1) * 10);
}
