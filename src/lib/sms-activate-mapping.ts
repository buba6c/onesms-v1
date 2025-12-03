/**
 * Mapping des codes courts SMS-Activate vers les noms complets
 * 
 * SMS-Activate utilise des codes courts (wa, tg, ig, etc.) dans leur API
 * Ce mapping permet de:
 * 1. Convertir code court → nom complet pour l'affichage
 * 2. Maintenir la compatibilité avec l'API SMS-Activate
 * 3. Gérer les alias et variations de noms
 * 
 * ORDRE OFFICIEL SMS-ACTIVATE (Homepage 2025):
 * 1. Snapchat, 2. WeChat, 3. Google, 4. TikTok, 5. Facebook, 
 * 6. OpenAI, 7. VK, 8. Instagram, 9. Viber, 10. WhatsApp,
 * 11. Amazon, 12. Netflix, 13. PayPal, 14. Grindr, etc.
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
 * Top 60+ services SMS-Activate par ordre de popularité OFFICIEL
 * Basé sur l'ordre exact affiché sur la homepage de SMS-Activate.io (2025)
 * 
 * L'ordre suit exactement la grille de services sur leur homepage:
 * Row 1: Snapchat, WeChat, Google, TikTok, Facebook, OpenAI, VK, Instagram, Viber, WhatsApp
 * Row 2: Amazon, Netflix, PayPal, Grindr, Telegram, Discord, Twitter, Tinder, Uber, Apple
 */
export const SMS_ACTIVATE_SERVICES: ServiceMapping[] = [
  // TOP 1-10 - Homepage Row 1 (Services les plus mis en avant)
  { code: 'fu', name: 'Snapchat', displayName: 'Snapchat', icon: '👻', category: 'social', aliases: ['snapchat', 'snap'], popularityRank: 1 },
  { code: 'wb', name: 'WeChat', displayName: 'WeChat', icon: '💬', category: 'messaging', aliases: ['wechat', 'weixin'], popularityRank: 2 },
  { code: 'go', name: 'Google', displayName: 'Google', icon: '🔍', category: 'tech', aliases: ['google', 'gmail', 'youtube'], popularityRank: 3 },
  { code: 'lf', name: 'TikTok', displayName: 'TikTok', icon: '🎵', category: 'social', aliases: ['tiktok', 'douyin'], popularityRank: 4 },
  { code: 'fb', name: 'Facebook', displayName: 'Facebook', icon: '👤', category: 'social', aliases: ['facebook', 'meta'], popularityRank: 5 },
  { code: 'dr', name: 'OpenAI', displayName: 'OpenAI', icon: '🤖', category: 'tech', aliases: ['openai', 'chatgpt', 'gpt'], popularityRank: 6 },
  { code: 'vk', name: 'VKontakte', displayName: 'VKontakte', icon: '🔵', category: 'social', aliases: ['vkontakte', 'vk'], popularityRank: 7 },
  { code: 'ig', name: 'Instagram', displayName: 'Instagram', icon: '📷', category: 'social', aliases: ['instagram', 'threads'], popularityRank: 8 },
  { code: 'vi', name: 'Viber', displayName: 'Viber', icon: '📞', category: 'messaging', aliases: ['viber'], popularityRank: 9 },
  { code: 'wa', name: 'WhatsApp', displayName: 'WhatsApp', icon: '💬', category: 'messaging', aliases: ['whatsapp'], popularityRank: 10 },

  // TOP 11-20 - Homepage Row 2
  { code: 'am', name: 'Amazon', displayName: 'Amazon', icon: '📦', category: 'shopping', aliases: ['amazon'], popularityRank: 11 },
  { code: 'nf', name: 'Netflix', displayName: 'Netflix', icon: '🎬', category: 'entertainment', aliases: ['netflix'], popularityRank: 12 },
  { code: 'ts', name: 'PayPal', displayName: 'PayPal', icon: '💳', category: 'financial', aliases: ['paypal'], popularityRank: 13 },
  { code: 'yw', name: 'Grindr', displayName: 'Grindr', icon: '🌈', category: 'dating', aliases: ['grindr'], popularityRank: 14 },
  { code: 'tg', name: 'Telegram', displayName: 'Telegram', icon: '✈️', category: 'messaging', aliases: ['telegram'], popularityRank: 15 },
  { code: 'ds', name: 'Discord', displayName: 'Discord', icon: '🎮', category: 'social', aliases: ['discord'], popularityRank: 16 },
  { code: 'tw', name: 'Twitter', displayName: 'Twitter (X)', icon: '🐦', category: 'social', aliases: ['twitter', 'x'], popularityRank: 17 },
  { code: 'oi', name: 'Tinder', displayName: 'Tinder', icon: '🔥', category: 'dating', aliases: ['tinder'], popularityRank: 18 },
  { code: 'ub', name: 'Uber', displayName: 'Uber', icon: '🚗', category: 'delivery', aliases: ['uber', 'ubereats'], popularityRank: 19 },
  { code: 'wx', name: 'Apple', displayName: 'Apple', icon: '🍎', category: 'tech', aliases: ['apple', 'icloud'], popularityRank: 20 },

  // 21-30 - Services très populaires
  { code: 'mm', name: 'Microsoft', displayName: 'Microsoft', icon: '🪟', category: 'tech', aliases: ['microsoft', 'outlook'], popularityRank: 21 },
  { code: 'mt', name: 'Steam', displayName: 'Steam', icon: '🎮', category: 'gaming', aliases: ['steam'], popularityRank: 22 },
  { code: 'aon', name: 'Binance', displayName: 'Binance', icon: '🟡', category: 'financial', aliases: ['binance'], popularityRank: 23 },
  { code: 're', name: 'Coinbase', displayName: 'Coinbase', icon: '🪙', category: 'financial', aliases: ['coinbase'], popularityRank: 24 },
  { code: 'tn', name: 'LinkedIn', displayName: 'LinkedIn', icon: '💼', category: 'social', aliases: ['linkedin'], popularityRank: 25 },
  { code: 'aiw', name: 'Roblox', displayName: 'Roblox', icon: '🎲', category: 'gaming', aliases: ['roblox'], popularityRank: 26 },
  { code: 'alj', name: 'Spotify', displayName: 'Spotify', icon: '🎵', category: 'entertainment', aliases: ['spotify'], popularityRank: 27 },
  { code: 'hb', name: 'Twitch', displayName: 'Twitch', icon: '📺', category: 'entertainment', aliases: ['twitch'], popularityRank: 28 },
  { code: 'ep', name: 'Temu', displayName: 'Temu', icon: '🛍️', category: 'shopping', aliases: ['temu'], popularityRank: 29 },
  { code: 'hx', name: 'AliExpress', displayName: 'AliExpress', icon: '🛒', category: 'shopping', aliases: ['aliexpress', 'ali'], popularityRank: 30 },

  // 31-40 - Services populaires
  { code: 'ka', name: 'Shopee', displayName: 'Shopee', icon: '🧡', category: 'shopping', aliases: ['shopee'], popularityRank: 31 },
  { code: 'aez', name: 'Shein', displayName: 'Shein', icon: '👗', category: 'shopping', aliases: ['shein'], popularityRank: 32 },
  { code: 'ij', name: 'Revolut', displayName: 'Revolut', icon: '💳', category: 'financial', aliases: ['revolut'], popularityRank: 33 },
  { code: 'bo', name: 'Wise', displayName: 'Wise', icon: '💸', category: 'financial', aliases: ['wise', 'transferwise'], popularityRank: 34 },
  { code: 'ti', name: 'Crypto.com', displayName: 'Crypto.com', icon: '🔷', category: 'financial', aliases: ['cryptocom', 'crypto.com'], popularityRank: 35 },
  { code: 'nc', name: 'Payoneer', displayName: 'Payoneer', icon: '💱', category: 'financial', aliases: ['payoneer'], popularityRank: 36 },
  { code: 'mo', name: 'Bumble', displayName: 'Bumble', icon: '💛', category: 'dating', aliases: ['bumble'], popularityRank: 37 },
  { code: 'qv', name: 'Badoo', displayName: 'Badoo', icon: '💕', category: 'dating', aliases: ['badoo'], popularityRank: 38 },
  { code: 'vz', name: 'Hinge', displayName: 'Hinge', icon: '💖', category: 'dating', aliases: ['hinge'], popularityRank: 39 },
  { code: 'df', name: 'Happn', displayName: 'Happn', icon: '❤️', category: 'dating', aliases: ['happn'], popularityRank: 40 },

  // 41-50 - Services moyennement populaires
  { code: 'jg', name: 'Grab', displayName: 'Grab', icon: '🚕', category: 'delivery', aliases: ['grab'], popularityRank: 41 },
  { code: 'ac', name: 'DoorDash', displayName: 'DoorDash', icon: '🍔', category: 'delivery', aliases: ['doordash'], popularityRank: 42 },
  { code: 'aq', name: 'Glovo', displayName: 'Glovo', icon: '🛵', category: 'delivery', aliases: ['glovo'], popularityRank: 43 },
  { code: 'nz', name: 'Foodpanda', displayName: 'Foodpanda', icon: '🐼', category: 'delivery', aliases: ['foodpanda'], popularityRank: 44 },
  { code: 'rr', name: 'Wolt', displayName: 'Wolt', icon: '🍕', category: 'delivery', aliases: ['wolt'], popularityRank: 45 },
  { code: 'dl', name: 'Lazada', displayName: 'Lazada', icon: '🛒', category: 'shopping', aliases: ['lazada'], popularityRank: 46 },
  { code: 'xt', name: 'Flipkart', displayName: 'Flipkart', icon: '📱', category: 'shopping', aliases: ['flipkart'], popularityRank: 47 },
  { code: 'blm', name: 'Epic Games', displayName: 'Epic Games', icon: '🎯', category: 'gaming', aliases: ['epicgames', 'epic'], popularityRank: 48 },
  { code: 'bz', name: 'Blizzard', displayName: 'Blizzard', icon: '❄️', category: 'gaming', aliases: ['blizzard', 'battlenet'], popularityRank: 49 },
  { code: 'ah', name: 'Escape From Tarkov', displayName: 'EFT', icon: '🎖️', category: 'gaming', aliases: ['tarkov', 'eft'], popularityRank: 50 },

  // 51-60 - Services supplémentaires
  { code: 'bnl', name: 'Reddit', displayName: 'Reddit', icon: '🤖', category: 'social', aliases: ['reddit'], popularityRank: 51 },
  { code: 'mb', name: 'Yahoo', displayName: 'Yahoo', icon: '📧', category: 'tech', aliases: ['yahoo'], popularityRank: 52 },
  { code: 'pm', name: 'AOL', displayName: 'AOL', icon: '📩', category: 'tech', aliases: ['aol'], popularityRank: 53 },
  { code: 'ok', name: 'Odnoklassniki', displayName: 'Odnoklassniki', icon: '🟠', category: 'social', aliases: ['odnoklassniki', 'ok'], popularityRank: 54 },
  { code: 'ln', name: 'Line', displayName: 'Line', icon: '💚', category: 'messaging', aliases: ['line'], popularityRank: 55 },
  { code: 'kk', name: 'KakaoTalk', displayName: 'KakaoTalk', icon: '💛', category: 'messaging', aliases: ['kakao', 'kakaotalk'], popularityRank: 56 },
  { code: 'sg', name: 'Signal', displayName: 'Signal', icon: '🔒', category: 'messaging', aliases: ['signal'], popularityRank: 57 },
  { code: 'zm', name: 'Zoom', displayName: 'Zoom', icon: '📹', category: 'tech', aliases: ['zoom'], popularityRank: 58 },
  { code: 'sk', name: 'Skype', displayName: 'Skype', icon: '📞', category: 'messaging', aliases: ['skype'], popularityRank: 59 },
  { code: 'sl', name: 'Slack', displayName: 'Slack', icon: '💬', category: 'tech', aliases: ['slack'], popularityRank: 60 },
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
