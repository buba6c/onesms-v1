/**
 * 🔧 Correction COMPLÈTE des noms de services
 * 
 * Ce script corrige TOUS les services avec noms incorrects
 * en utilisant le mapping complet étendu (250+ services)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

// MAPPING COMPLET synchronisé avec sync-services-realtime.js
const SERVICE_NAMES = {
  // Social Media & Messaging
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
  'gh': 'GitHub',
  
  // Services populaires
  'go': 'Google',
  'gp': 'Google Play',
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
  'za': 'Zalando',
  'bn': 'Binance',
  'bo': 'Bolt',
  'sf': 'Salesforce',
  'tc': 'Truecaller',
  'rl': 'Roblox',
  
  // Services chinois
  'wx': 'WeChat',
  'wb': 'Weibo',
  'qq': 'QQ Messenger',
  'tb': 'Taobao',
  'jd': 'JD.com',
  'dd': 'Didi',
  'iq': 'iQiyi',
  'hw': 'Huawei',
  'uz': 'Uzum',
  'mo': 'Moj',
  'yi': 'YiXin',
  'uu': 'UU Game',
  'tu': 'Tuniu',
  
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
  've': 'Venmo',
  
  // Jeux & Gaming
  'st': 'Steam',
  'tp': 'Twitch',
  'ep': 'EpicGames',
  'ea': 'EA Games',
  'bl': 'Blizzard',
  'rk': 'Rockstar',
  'fo': 'Fortnite',
  
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
  'bf': 'Bitfinex',
  'kc': 'KuCoin',
  'cq': 'CoinQuest',
  
  // Email & Communication
  'me': 'Mail.ru',
  'gm': 'Gmail',
  'om': 'Outlook',
  
  // Services 2 lettres (A-Z)
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
  'hp': 'HP Store',
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
  'dh': 'Dahua',
  'kf': 'Kafan',
  'dr': 'Dribbble',
  'bw': 'Bandwidth',
  'fd': 'FunDo',
  'et': 'Etisalat Services',
  'wc': 'WeChat Work',
  'ls': 'Listia',
  'fs': 'Foursquare',
  'df': 'DreamFields',
  'bz': 'Bazaar',
  'vz': 'Verizon',
  'cn': 'CNN',
  'dl': 'DealLabs',
  'an': 'Anitta',
  'mv': 'MVideo',
  'xk': 'XiaoKa',
  'xv': 'XiaoVi',
  'gx': 'GameX',
  'mj': 'Majid',
  'ry': 'Railway',
  'rt': 'RT News',
  'sg': 'Singapore Services',
  'jg': 'JioGames',
  'zy': 'Zynga',
  'ul': 'Ulmart',
  'ti': 'TikTok India',
  'fx': 'FitX',
  'vp': 'VPBank',
  'jn': 'JioNet',
  'ah': 'Alibaba Health',
  'qv': 'Qiwi Visa',
  'rc': 'RocketChat',
  'qf': 'QuikrFast',
  'lc': 'LoveCrafts',
  'ts': 'TypeScript Services',
  'sc': 'Snapchat Clone',
  'ln': 'LinkedIn Network',
  'bu': 'Business Services',
  'ma': 'MatchApp',
  'tv': 'TikTok Video',
  'rz': 'Razer',
  'tr': 'Travala',
  'fz': 'FunZone',
  'gf': 'GirlFriend',
  'ws': 'WhatsApp Status',
  'bk': 'Booking.com',
  'ni': 'Nike',
  'ck': 'Calvin Klein',
  'gg': 'Google Games',
  'un': 'Union',
  'dq': 'Dairy Queen',
  'ef': 'EF Education',
  'ee': 'Everything Everywhere',
  'wr': 'Warby Parker',
  'ex': 'Express',
  'qo': 'QooBee',
  'zs': 'ZoomSystems',
  'zx': 'ZXing',
  're': 'Reddit',
  'fg': 'FunGame',
  'vr': 'VRChat',
  'tl': 'TikTok Lite',
  'xf': 'XFactory',
  'tm': 'T-Mobile',
  'us': 'US Bank',
  'yr': 'Yr Weather',
  'dn': 'Deezer Now',
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
  'pb': 'Postbank',
  'qb': 'QuickBooks',
  'rb': 'Redbull',
  'sb': 'Sportbet',
  'vb': 'Viber',
  'xb': 'Xbox',
  'yb': 'YouBet',
  'zb': 'ZetaBet',
  
  // Services 3 lettres
  'bwm': 'BMW',
  'bfr': 'BFR Bank',
  'bsd': 'BSD Exchange',
  'bwv': 'BWV Services',
  'bqp': 'BQP Platform',
  'brk': 'Berkshire',
  'bjz': 'Bijaz',
  'bhh': 'BHH Group',
  'btv': 'BTV Network',
  'bsk': 'BSK Services',
  'btf': 'BTF Finance',
  'bqb': 'BQB Bank',
  'bsx': 'BSX Exchange',
  'bhr': 'Bahrain Services',
  'bgj': 'BGJ Platform',
  'bdg': 'Bandung Services',
  'bbl': 'Bangkok Bank',
  'bgb': 'BGB Token',
  'bhg': 'BHG Retail',
  'bxx': 'BXX Exchange',
  'blz': 'Blaze Network',
};

async function fixAllServiceNames() {
  console.log('\n🔧 CORRECTION COMPLÈTE DES NOMS DE SERVICES\n');
  console.log('='.repeat(80));
  console.log(`\nMapping disponible: ${Object.keys(SERVICE_NAMES).length} services\n`);
  
  try {
    // 1. Charger TOUS les services actifs
    const { data: services, error } = await supabase
      .from('services')
      .select('id, code, name, display_name, total_available')
      .eq('active', true)
      .order('total_available', { ascending: false });
    
    if (error) throw error;
    
    console.log(`✅ ${services.length} services chargés\n`);
    
    // 2. Identifier services avec noms incorrects
    const toFix = services.filter(s => {
      const displayName = (s.display_name || '').trim();
      const name = (s.name || '').trim();
      const code = s.code.trim();
      
      // Problèmes: nom générique "Service XX", trop court, ou code = nom
      return (
        displayName.startsWith('Service ') ||
        displayName.length <= 2 ||
        displayName === code ||
        displayName === code.toUpperCase() ||
        name.startsWith('Service ') ||
        name.length <= 2
      );
    });
    
    console.log(`🔍 ${toFix.length} services à corriger (${((toFix.length/services.length)*100).toFixed(1)}%)\n`);
    
    if (toFix.length === 0) {
      console.log('✅ Aucune correction nécessaire\n');
      return;
    }
    
    // 3. Afficher échantillon AVANT
    console.log('📋 ÉCHANTILLON AVANT CORRECTION (TOP 20):\n');
    toFix.slice(0, 20).forEach((s, i) => {
      console.log(`   ${String(i+1).padStart(2)}. ${s.code.padEnd(8)} → "${s.display_name.padEnd(25)}" (${s.total_available.toLocaleString().padStart(10)} numéros)`);
    });
    
    // 4. Corriger par batch (100 services à la fois)
    let fixed = 0;
    let notMapped = 0;
    const batchSize = 100;
    
    console.log('\n\n🔄 CORRECTION EN COURS...\n');
    
    for (let i = 0; i < toFix.length; i += batchSize) {
      const batch = toFix.slice(i, i + batchSize);
      const updates = [];
      
      for (const service of batch) {
        const correctName = SERVICE_NAMES[service.code];
        
        if (correctName) {
          updates.push({
            id: service.id,
            name: correctName,
            display_name: correctName,
            updated_at: new Date().toISOString()
          });
          fixed++;
        } else {
          // Générer nom par défaut
          const defaultName = `Service ${service.code.toUpperCase()}`;
          updates.push({
            id: service.id,
            name: defaultName,
            display_name: defaultName,
            updated_at: new Date().toISOString()
          });
          notMapped++;
        }
      }
      
      // Update batch
      if (updates.length > 0) {
        for (const update of updates) {
          const { error: updateError } = await supabase
            .from('services')
            .update({
              name: update.name,
              display_name: update.display_name,
              updated_at: update.updated_at
            })
            .eq('id', update.id);
          
          if (updateError) {
            console.error(`❌ Erreur: ${updateError.message}`);
          }
        }
        
        console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(toFix.length/batchSize)} traité (${updates.length} services)`);
      }
    }
    
    // 5. Vérification POST-correction
    console.log('\n\n🔍 VÉRIFICATION POST-CORRECTION...\n');
    
    const { data: afterServices } = await supabase
      .from('services')
      .select('code, display_name, total_available')
      .eq('active', true)
      .order('total_available', { ascending: false })
      .limit(20);
    
    console.log('✅ TOP 20 APRÈS CORRECTION:\n');
    afterServices.forEach((s, i) => {
      const isGood = s.display_name.length > 2 && !s.display_name.startsWith('Service ');
      const status = isGood ? '✅' : '⚠️ ';
      console.log(`   ${String(i+1).padStart(2)}. ${status} ${s.code.padEnd(8)} → "${s.display_name.padEnd(30)}" (${s.total_available.toLocaleString().padStart(10)} numéros)`);
    });
    
    // 6. Résumé final
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 RÉSUMÉ FINAL:\n');
    console.log(`   Services identifiés:       ${toFix.length}`);
    console.log(`   Corrigés avec mapping:     ${fixed} (${((fixed/toFix.length)*100).toFixed(1)}%)`);
    console.log(`   Noms génériques gardés:    ${notMapped} (${((notMapped/toFix.length)*100).toFixed(1)}%)`);
    console.log(`   \n   Taux de réussite:          ${((fixed/(fixed+notMapped))*100).toFixed(1)}%`);
    console.log('\n✅ CORRECTION COMPLÈTE TERMINÉE\n');
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    process.exit(1);
  }
}

// Exécution
fixAllServiceNames().then(() => process.exit(0));
