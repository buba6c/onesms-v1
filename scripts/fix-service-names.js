/**
 * 🔧 Correction des noms de services
 * 
 * Ce script corrige les services qui affichent leur code (2 lettres)
 * au lieu de leur vrai nom en utilisant le mapping complet.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

// Même mapping que dans sync-services-realtime.js
const SERVICE_NAMES = {
  // Social Media & Messaging (TOP prioritaires)
  'wa': 'WhatsApp',
  'tg': 'Telegram',
  'vi': 'Viber',
  'ig': 'Instagram',
  'fb': 'Facebook',
  'tw': 'Twitter/X',
  'ds': 'Discord',
  'vk': 'VKontakte',
  'ok': 'Odnoklassniki',
  'sn': 'Snapchat',
  'li': 'LinkedIn',
  'tt': 'TikTok',
  'we': 'WeChat',
  'sk': 'Skype',
  'ms': 'Microsoft',
  'ap': 'Apple',
  
  // Services populaires
  'go': 'Google',
  'ym': 'Yandex',
  'am': 'Amazon',
  'nf': 'Netflix',
  'ub': 'Uber',
  'tn': 'Tinder',
  'bd': 'Badoo',
  'mb': 'Mamba',
  'oi': 'OLX',
  'av': 'Avito',
  'yu': 'YouDo',
  'ya': 'Yahoo',
  'eb': 'eBay',
  'al': 'AliExpress',
  'pp': 'PayPal',
  
  // Services chinois
  'wx': 'WeChat',
  'wb': 'Weibo',
  'qq': 'QQ',
  'tb': 'Taobao',
  'jd': 'JD.com',
  'dd': 'Didi',
  
  // Services financiers
  'pm': 'Payeer',
  'pa': 'Paysafecard',
  'wy': 'WesternUnion',
  'mt': 'MercadoLibre',
  'mp': 'MercadoPago',
  'nu': 'Nubank',
  'rv': 'Revolut',
  'cs': 'CashApp',
  'vn': 'Venmo',
  
  // Jeux & Gaming
  'st': 'Steam',
  'tp': 'Twitch',
  'ep': 'EpicGames',
  'ea': 'EA Games',
  'bl': 'Blizzard',
  'rk': 'Rockstar',
  
  // Delivery & Food
  'gl': 'Glovo',
  'ue': 'UberEats',
  'de': 'Delivery',
  'wl': 'Wolt',
  'gr': 'GrubHub',
  
  // Crypto & Trading
  'bi': 'Binance',
  'co': 'Coinbase',
  'kr': 'Kraken',
  'bt': 'Bitstamp',
  'cm': 'CoinMarketCap',
  
  // Email & Communication
  'me': 'Mail.ru',
  'gm': 'Gmail',
  'om': 'Outlook',
  
  // Services avec codes courts (2 lettres max)
  'ew': 'Eastwood',
  'nz': 'NewZealand Services',
  'nv': 'Nevada Services',
  'fu': 'Fubao',
  'pf': 'PostFinance',
  'mm': 'Myanmar Services',
  'kt': 'Kakaotalk',
  'uk': 'UK Services',
  'yw': 'Youwin',
  'ka': 'Kakao',
  'zh': 'ZhongHua',
  'tx': 'Tencent',
  'zk': 'ZuluKid',
  'yl': 'YellowPages',
  'lf': 'Lifeline',
  'im': 'IMO Messenger',
  'dp': 'DP Services',
  'rr': 'RailRoad',
  'wg': 'WeGame',
  'zr': 'Zara',
  'mc': 'Mastercard',
  'ox': 'Oxford',
  'hp': 'HP',
  'ao': 'AOL',
  'dg': 'Digikala',
  'dt': 'Deutsche Telekom',
  'em': 'Email Services',
  'fp': 'FitPro',
  'gs': 'GameStop',
  'hb': 'Habbo',
  'ic': 'iCloud',
  'jm': 'Jumia',
  'kk': 'Kik',
  'lm': 'Lime',
  'mn': 'MineCraft',
  'no': 'Norton',
  'op': 'Opera',
  'pn': 'Pinterest',
  'qs': 'QuestSurvey',
  'rm': 'Rambler',
  'sm': 'Sizmek',
  'um': 'UMusic',
  'vm': 'VietnamMobile',
  'wm': 'Walmart',
  'xm': 'XiaoMi',
  'yt': 'YouTube',
  'zm': 'Zoom',
  'ab': 'AirBnB',
  'bb': 'BlackBerry',
  'cb': 'Coinbase',
  'db': 'Dropbox',
  'gb': 'Gumtree',
  'hm': 'H&M',
  'ib': 'IndeedJobs',
  'jb': 'JobBank',
  'kb': 'Keyboard',
  'lb': 'LocalBitcoins',
  'nb': 'Netbank',
  'ob': 'OneBit',
  'qb': 'QuickBooks',
  'rb': 'Redbull',
  'sb': 'Sportbet',
  'vb': 'Viber',
  'xb': 'Xbox',
  'yb': 'YouBet',
  'zb': 'ZetaBet',
};

async function fixServiceNames() {
  console.log('\n🔧 CORRECTION DES NOMS DE SERVICES\n');
  console.log('='.repeat(80));
  
  try {
    // 1. Charger tous les services actifs
    const { data: services, error } = await supabase
      .from('services')
      .select('id, code, name, display_name')
      .eq('active', true);
    
    if (error) throw error;
    
    console.log(`\n✅ ${services.length} services chargés\n`);
    
    // 2. Identifier services avec noms incorrects
    const toFix = services.filter(s => {
      const displayName = (s.display_name || '').trim();
      const name = (s.name || '').trim();
      const code = s.code.trim();
      
      // Service avec code au lieu du nom ou nom trop court
      return (
        displayName === code || 
        displayName === code.toUpperCase() || 
        displayName.length <= 2 ||
        name === code ||
        name === code.toUpperCase() ||
        name.length <= 2
      );
    });
    
    console.log(`🔍 ${toFix.length} services à corriger\n`);
    
    if (toFix.length === 0) {
      console.log('✅ Aucune correction nécessaire\n');
      return;
    }
    
    // 3. Corriger les noms
    let fixed = 0;
    let notFound = 0;
    
    console.log('📝 Correction en cours...\n');
    
    for (const service of toFix) {
      const correctName = SERVICE_NAMES[service.code];
      
      if (correctName) {
        const { error: updateError } = await supabase
          .from('services')
          .update({
            name: correctName,
            display_name: correctName,
            updated_at: new Date().toISOString()
          })
          .eq('id', service.id);
        
        if (updateError) {
          console.error(`❌ ${service.code}: ${updateError.message}`);
        } else {
          console.log(`✅ ${service.code.padEnd(6)} → "${correctName}"`);
          fixed++;
        }
      } else {
        // Générer un nom par défaut
        const defaultName = `Service ${service.code.toUpperCase()}`;
        
        const { error: updateError } = await supabase
          .from('services')
          .update({
            name: defaultName,
            display_name: defaultName,
            updated_at: new Date().toISOString()
          })
          .eq('id', service.id);
        
        if (!updateError) {
          console.log(`⚠️  ${service.code.padEnd(6)} → "${defaultName}" (mapping non trouvé)`);
          notFound++;
        }
      }
    }
    
    // 4. Résumé
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 RÉSUMÉ:\n');
    console.log(`   Services corrigés:         ${fixed}`);
    console.log(`   Sans mapping (défaut):     ${notFound}`);
    console.log(`   Total traités:             ${fixed + notFound}/${toFix.length}`);
    console.log('\n✅ CORRECTION TERMINÉE\n');
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    process.exit(1);
  }
}

// Exécution
fixServiceNames().then(() => process.exit(0));
