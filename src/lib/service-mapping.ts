export const SMS_ACTIVATE_TO_5SIM: Record<string, string> = {
    'wa': 'whatsapp',
    'go': 'google',
    'tg': 'telegram',
    'fb': 'facebook',
    'ig': 'instagram',
    'tw': 'twitter',
    'ds': 'discord',
    'vi': 'viber',
    'lf': 'tiktok',
    'fu': 'snapchat',
    'wb': 'wechat',
    'vk': 'vkontakte',
    'ok': 'odnoklassniki',
    'ma': 'mail.ru',
    'me': 'line',
    'mm': 'microsoft',
    'mb': 'yahoo',
    'am': 'amazon',
    'nf': 'netflix',
    'st': 'steam',
    'pl': 'paypal',
    'ub': 'uber',
    'ot': 'other',
    'hw': 'alibaba',
    'dr': 'openai',
    'ts': 'paypal', // duplicate check
    'gr': 'grindr',
    'mt': 'steam',
    'blm': 'blizzard',
    'bz': 'blizzard',
    'mo': 'bumble',
    'oi': 'tinder',
    'qv': 'badoo',
    'vz': 'hinge',
    'alj': 'spotify',
    'hb': 'twitch',
    'yt': 'youtube',
    'tn': 'linkedIn',
    'li': 'linkedin',
    'ew': 'nike',
    'av': 'avito',
    'kl': 'kakaotalk',
    'dh': 'ebay',
    'dp': 'deliveroo',
    'uk': 'airbnb',
    'pz': 'lalamove',
    'pm': 'aol',
    'ft': 'grab',
    'bd': 'bolt',
    'kp': 'hq trivia',
    'dt': 'delivery club',
    'ya': 'yandex',
    'ym': 'yandex',
}

export const get5simProductName = (smsActivateCode: string): string => {
    return SMS_ACTIVATE_TO_5SIM[smsActivateCode.toLowerCase()] || smsActivateCode.toLowerCase();
}

/**
 * Maps standard country names to the exact format expected by 5sim API
 * 5sim generally expects lowercase names with NO spaces and no special characters
 */
export const get5simCountryName = (countryName: string): string => {
    if (!countryName) return 'any';

    let normalized = countryName.toLowerCase().trim();

    // Explicit Aliases
    const aliases: Record<string, string> = {
        'united kingdom': 'england',
        'uk': 'england',
        'usa': 'usa',
        'united states': 'usa',
        'russia': 'russia',
        'russian federation': 'russia',
        "cote d'ivoire": 'cotedivoire',
        "côte d'ivoire": 'cotedivoire',
        'ivory coast': 'cotedivoire',
        'south africa': 'southafrica',
        'new zealand': 'newzealand',
        'saudi arabia': 'saudiarabia',
        'sri lanka': 'srilanka',
        'costa rica': 'costarica',
        'el salvador': 'elsalvador',
        'puerto rico': 'puertorico',
        'czech republic': 'czech',
        'dominican republic': 'dominican',
        'south korea': 'korea', // typically just "korea" for south on 5sim
    };

    if (aliases[normalized]) {
        return aliases[normalized];
    }

    // Default cleanup: remove spaces and non-alphanumeric chars
    return normalized.replace(/[^a-z0-9]/g, '');
}
