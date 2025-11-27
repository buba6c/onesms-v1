/**
 * 🔄 Synchronisation Automatique Temps Réel - Services SMS-Activate
 * 
 * Ce script intelligent synchronise la DB avec l'API SMS-Activate en temps réel:
 * - Désactive les services obsolètes (n'existent plus dans API)
 * - Ajoute les nouveaux services (manquants en DB)
 * - Met à jour les stocks en temps réel
 * - Log toutes les opérations pour monitoring
 * 
 * Utilisation:
 *   node scripts/sync-services-realtime.js
 * 
 * Cron (toutes les 5 min):
 *   Voir scripts/setup-cron.sh pour configuration automatique
 */

import { createClient } from '@supabase/supabase-js';
import https from 'https';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // API SMS-Activate
  API_KEY: process.env.VITE_SMS_ACTIVATE_API_KEY,
  API_HOST: 'api.sms-activate.ae',
  
  // Supabase (utiliser SERVICE_ROLE_KEY pour bypass RLS)
  SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  SUPABASE_KEY: process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL || process.env.VITE_SUPABASE_ANON_KEY,
  
  // Options sync
  DRY_RUN: process.env.DRY_RUN === 'true', // Test sans modification DB
  VERBOSE: process.env.VERBOSE === 'true', // Logs détaillés
  
  // Seuils
  MIN_STOCK_TO_ACTIVATE: 0, // Activer service si stock >= 0
  BATCH_SIZE: 100, // Nombre de services à update par batch
};

// ============================================================================
// INITIALISATION
// ============================================================================

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

const stats = {
  startTime: new Date(),
  endTime: null,
  
  // API
  apiServices: 0,
  apiCountries: 0,
  apiTotalStock: 0,
  
  // DB
  dbServicesTotal: 0,
  dbServicesActive: 0,
  dbServicesInactive: 0,
  
  // Modifications
  servicesDeactivated: 0,
  servicesAdded: 0,
  servicesReactivated: 0,
  stocksUpdated: 0,
  
  // Erreurs
  errors: [],
};

// ============================================================================
// HELPERS
// ============================================================================

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    'info': '✅',
    'warn': '⚠️ ',
    'error': '❌',
    'success': '🎉',
    'sync': '🔄',
  }[level] || 'ℹ️ ';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
  
  if (data && CONFIG.VERBOSE) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logError(message, error) {
  log('error', message);
  console.error(error);
  stats.errors.push({ message, error: error.message, timestamp: new Date() });
}

// ============================================================================
// API SMS-ACTIVATE
// ============================================================================

/**
 * Récupère tous les prix/stocks depuis l'API SMS-Activate
 * Format: { "countryId": { "serviceCode": { cost, count } } }
 */
function getPricesAPI() {
  return new Promise((resolve, reject) => {
    const path = `/stubs/handler_api.php?api_key=${CONFIG.API_KEY}&action=getPrices`;
    
    log('sync', `Requête API: https://${CONFIG.API_HOST}${path.substring(0, 60)}...`);
    
    https.get({ 
      hostname: CONFIG.API_HOST, 
      path,
      headers: { 'User-Agent': 'OneSMS-Sync/1.0' },
      timeout: 30000, // 30 secondes
    }, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          
          // Vérifier si erreur API
          if (typeof parsed === 'string' && parsed.startsWith('ERROR')) {
            reject(new Error(`API Error: ${parsed}`));
            return;
          }
          
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Récupère la liste officielle des services avec leurs noms
 * Format: { "serviceCode": "Service Name" }
 */
function getServicesListAPI() {
  return new Promise((resolve, reject) => {
    const path = `/stubs/handler_api.php?api_key=${CONFIG.API_KEY}&action=getServicesList`;
    
    https.get({ 
      hostname: CONFIG.API_HOST, 
      path,
      headers: { 'User-Agent': 'OneSMS-Sync/1.0' },
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({}); // Fallback si erreur
        }
      });
    }).on('error', () => resolve({})); // Fallback
  });
}

// ============================================================================
// TRAITEMENT DONNÉES
// ============================================================================

/**
 * Extrait tous les services uniques de l'API avec leur stock total
 */
function extractServicesFromAPI(apiData) {
  const services = {};
  const countriesPerService = {};
  
  Object.entries(apiData).forEach(([countryId, countryServices]) => {
    stats.apiCountries++;
    
    Object.entries(countryServices).forEach(([code, data]) => {
      const count = parseInt(data.count) || 0;
      const cost = parseFloat(data.cost) || 0;
      
      if (!services[code]) {
        services[code] = {
          code,
          totalStock: 0,
          minCost: Infinity,
          maxCost: 0,
          countries: [],
        };
        countriesPerService[code] = new Set();
      }
      
      services[code].totalStock += count;
      services[code].minCost = Math.min(services[code].minCost, cost);
      services[code].maxCost = Math.max(services[code].maxCost, cost);
      countriesPerService[code].add(countryId);
      
      stats.apiTotalStock += count;
    });
  });
  
  // Convertir Set en Array
  Object.keys(services).forEach(code => {
    services[code].countriesCount = countriesPerService[code].size;
    services[code].countries = Array.from(countriesPerService[code]);
  });
  
  stats.apiServices = Object.keys(services).length;
  
  return services;
}

/**
 * Catégorise automatiquement un service selon son code
 */
function categorizeService(code) {
  // Mapping intelligent des catégories
  const categories = {
    // Messaging / Social
    'wa': 'messaging', 'tg': 'messaging', 'vi': 'messaging', 'wb': 'messaging',
    'ig': 'social', 'fb': 'social', 'tw': 'social', 'vk': 'social', 'ok': 'social',
    'ds': 'social', 'sn': 'social',
    
    // Dating
    'oi': 'dating', 'bd': 'dating', 'tm': 'dating',
    
    // E-commerce
    'am': 'ecommerce', 'al': 'ecommerce',
    
    // Finance / Crypto
    'bt': 'finance', 'cb': 'finance',
    
    // Entertainment
    'nf': 'entertainment', 'sp': 'entertainment',
    
    // Transport
    'ub': 'transport', 'bl': 'transport', 'gt': 'transport',
    
    // Email
    'go': 'email', 'ym': 'email', 'ml': 'email',
    
    // Popular (high stock)
    'uk': 'popular', 'xk': 'popular', 'mv': 'popular',
  };
  
  return categories[code] || 'other';
}

/**
 * Génère un nom lisible pour un service
 */
function generateServiceName(code, officialName = null) {
  if (officialName && officialName !== code) {
    return officialName;
  }
  
  // Mapping manuel des services connus (250+ services)
  const knownNames = {
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
    
    // Jeux & Gaming
    'st': 'Steam',
    'dc': 'Discord',
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
    'ya': 'YandexEats',
    'gr': 'GrubHub',
    'dd': 'DoorDash',
    
    // Crypto & Trading
    'bi': 'Binance',
    'co': 'Coinbase',
    'kr': 'Kraken',
    'bp': 'Bitpanda',
    'bt': 'Bitstamp',
    'cm': 'CoinMarketCap',
    
    // Email & Communication
    'me': 'Mail.ru',
    'gm': 'Gmail',
    'ym': 'Yahoo Mail',
    'om': 'Outlook',
    'pm': 'ProtonMail',
    
    // Services avec codes courts (2 lettres) - EXTENDED
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
    
    // Ajouts basés sur analyse deep (TOP stock)
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
    'kc': 'KuCoin',
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
    'bf': 'Bitfinex',
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
    've': 'Venmo',
    'ni': 'Nike',
    'ck': 'Calvin Klein',
    'gg': 'Google Games',
    'cq': 'CoinQuest',
    'un': 'Union',
    'dq': 'Dairy Queen',
    'ef': 'EF Education',
    'ee': 'Everything Everywhere',
    'wr': 'Warby Parker',
    'ex': 'Express',
    'qo': 'QooBee',
    'zs': 'ZoomSystems',
    'zx': 'ZXing',
    'fo': 'Fortnite',
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
    
    // Services avec codes 3 lettres
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
  
  return knownNames[code] || `Service ${code.toUpperCase()}`;
}

/**
 * Calcule un score de popularité basé sur le stock et le nombre de pays
 */
function calculatePopularityScore(totalStock, countriesCount) {
  // Score de 0 à 1000
  const stockScore = Math.min(totalStock / 10000, 500); // Max 500 points
  const countryScore = Math.min(countriesCount * 2.5, 500); // Max 500 points
  
  return Math.round(stockScore + countryScore);
}

// ============================================================================
// SYNCHRONISATION DB
// ============================================================================

async function syncServices() {
  try {
    log('sync', '🚀 Démarrage synchronisation automatique...');
    
    // ========================================================================
    // 1. RÉCUPÉRER DONNÉES API
    // ========================================================================
    
    log('sync', '📡 Récupération données API SMS-Activate...');
    
    const [apiPrices, apiServicesList] = await Promise.all([
      getPricesAPI(),
      getServicesListAPI(),
    ]);
    
    const apiServices = extractServicesFromAPI(apiPrices);
    
    log('success', `API: ${stats.apiServices} services, ${stats.apiCountries} pays, ${stats.apiTotalStock.toLocaleString()} numéros`);
    
    // ========================================================================
    // 2. CHARGER SERVICES DB
    // ========================================================================
    
    log('sync', '💾 Chargement services depuis DB...');
    
    const { data: dbServices, error: dbError } = await supabase
      .from('services')
      .select('id, code, name, total_available, active, category, popularity_score');
    
    if (dbError) {
      throw new Error(`DB error: ${dbError.message}`);
    }
    
    stats.dbServicesTotal = dbServices.length;
    stats.dbServicesActive = dbServices.filter(s => s.active).length;
    stats.dbServicesInactive = dbServices.filter(s => !s.active).length;
    
    log('success', `DB: ${stats.dbServicesTotal} services (${stats.dbServicesActive} actifs, ${stats.dbServicesInactive} inactifs)`);
    
    // ========================================================================
    // 3. ANALYSER DIFFÉRENCES
    // ========================================================================
    
    log('sync', '🔍 Analyse des différences...');
    
    const dbCodes = new Set(dbServices.map(s => s.code));
    const apiCodes = Object.keys(apiServices);
    
    const obsolete = dbServices.filter(s => s.active && !apiCodes.includes(s.code));
    const missing = apiCodes.filter(code => !dbCodes.has(code));
    const toUpdate = dbServices.filter(s => apiCodes.includes(s.code));
    
    log('info', `Obsolètes: ${obsolete.length}, Manquants: ${missing.length}, À mettre à jour: ${toUpdate.length}`);
    
    // ========================================================================
    // 4. DÉSACTIVER SERVICES OBSOLÈTES
    // ========================================================================
    
    if (obsolete.length > 0 && !CONFIG.DRY_RUN) {
      log('sync', `🗑️  Désactivation ${obsolete.length} services obsolètes...`);
      
      const obsoleteCodes = obsolete.map(s => s.code);
      
      const { error: deactivateError } = await supabase
        .from('services')
        .update({ 
          active: false,
          total_available: 0,
          updated_at: new Date().toISOString(),
        })
        .in('code', obsoleteCodes);
      
      if (deactivateError) {
        logError('Erreur désactivation services', deactivateError);
      } else {
        stats.servicesDeactivated = obsolete.length;
        log('success', `${obsolete.length} services désactivés`);
      }
    } else if (obsolete.length > 0) {
      log('warn', `DRY_RUN: ${obsolete.length} services seraient désactivés`);
    }
    
    // ========================================================================
    // 5. AJOUTER SERVICES MANQUANTS
    // ========================================================================
    
    if (missing.length > 0 && !CONFIG.DRY_RUN) {
      log('sync', `➕ Ajout ${missing.length} nouveaux services...`);
      
      const newServices = missing.map(code => {
        const apiData = apiServices[code];
        const officialName = apiServicesList[code];
        
        return {
          code,
          name: generateServiceName(code, officialName),
          display_name: generateServiceName(code, officialName),
          icon: '📱',
          category: categorizeService(code),
          popularity_score: calculatePopularityScore(apiData.totalStock, apiData.countriesCount),
          total_available: apiData.totalStock,
          active: apiData.totalStock >= CONFIG.MIN_STOCK_TO_ACTIVATE,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });
      
      // Batch insert (100 à la fois)
      for (let i = 0; i < newServices.length; i += CONFIG.BATCH_SIZE) {
        const batch = newServices.slice(i, i + CONFIG.BATCH_SIZE);
        
        const { error: insertError } = await supabase
          .from('services')
          .insert(batch);
        
        if (insertError) {
          logError(`Erreur ajout batch ${i}-${i + batch.length}`, insertError);
        } else {
          stats.servicesAdded += batch.length;
          log('info', `Batch ${Math.floor(i/CONFIG.BATCH_SIZE) + 1}/${Math.ceil(newServices.length/CONFIG.BATCH_SIZE)}: ${batch.length} services ajoutés`);
        }
      }
      
      log('success', `${stats.servicesAdded} nouveaux services ajoutés`);
    } else if (missing.length > 0) {
      log('warn', `DRY_RUN: ${missing.length} services seraient ajoutés`);
    }
    
    // ========================================================================
    // 6. METTRE À JOUR STOCKS (OPTIMISÉ - Batch updates)
    // ========================================================================
    
    if (toUpdate.length > 0 && !CONFIG.DRY_RUN) {
      log('sync', `🔄 Mise à jour stocks pour ${toUpdate.length} services (par batch de 50)...`);
      
      let updated = 0;
      let reactivated = 0;
      let skipped = 0;
      
      // Préparer tous les updates
      const servicesToUpdate = [];
      for (const dbService of toUpdate) {
        const apiData = apiServices[dbService.code];
        const newStock = apiData.totalStock;
        const oldStock = dbService.total_available || 0;
        
        const needsUpdate = oldStock !== newStock;
        const needsReactivation = !dbService.active && newStock >= CONFIG.MIN_STOCK_TO_ACTIVATE;
        
        if (needsUpdate || needsReactivation) {
          servicesToUpdate.push({
            id: dbService.id,
            code: dbService.code,
            newStock,
            needsReactivation,
          });
        } else {
          skipped++;
        }
      }
      
      log('info', `${servicesToUpdate.length} services à mettre à jour, ${skipped} déjà à jour`);
      
      // Updates par batch de 50
      const BATCH_SIZE = 50;
      for (let i = 0; i < servicesToUpdate.length; i += BATCH_SIZE) {
        const batch = servicesToUpdate.slice(i, i + BATCH_SIZE);
        
        // Update en parallèle
        const promises = batch.map(service => {
          const updateData = {
            total_available: service.newStock,
            updated_at: new Date().toISOString(),
          };
          
          if (service.needsReactivation) {
            updateData.active = true;
          }
          
          return supabase
            .from('services')
            .update(updateData)
            .eq('id', service.id)
            .then(({ error }) => {
              if (error) {
                logError(`Erreur update ${service.code}`, error);
                return { success: false };
              }
              if (service.needsReactivation) reactivated++;
              return { success: true };
            });
        });
        
        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.success).length;
        updated += successCount;
        
        log('info', `Batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(servicesToUpdate.length/BATCH_SIZE)}: ${successCount}/${batch.length} OK`);
      }
      
      stats.stocksUpdated = updated;
      stats.servicesReactivated = reactivated;
      
      log('success', `${updated} stocks mis à jour, ${reactivated} services réactivés`);
    } else if (toUpdate.length > 0) {
      log('warn', `DRY_RUN: ${toUpdate.length} services seraient mis à jour`);
    }
    
    // ========================================================================
    // 7. LOGGER RÉSULTATS
    // ========================================================================
    
    stats.endTime = new Date();
    const duration = (stats.endTime - stats.startTime) / 1000;
    
    if (!CONFIG.DRY_RUN) {
      const { error: logError } = await supabase
        .from('sync_logs')
        .insert({
          sync_type: 'full',
          status: stats.errors.length > 0 ? 'partial' : 'success',
          duration_seconds: duration,
          
          // Stats API
          api_services_count: stats.apiServices,
          api_countries_count: stats.apiCountries,
          api_total_stock: stats.apiTotalStock,
          
          // Stats DB
          db_services_total: stats.dbServicesTotal,
          db_services_active: stats.dbServicesActive,
          
          // Modifications
          services_deactivated: stats.servicesDeactivated,
          services_added: stats.servicesAdded,
          services_reactivated: stats.servicesReactivated,
          stocks_updated: stats.stocksUpdated,
          
          // Erreurs
          error_count: stats.errors.length,
          error_details: stats.errors.length > 0 ? JSON.stringify(stats.errors) : null,
          
          started_at: stats.startTime.toISOString(),
          completed_at: stats.endTime.toISOString(),
        });
      
      if (logError) {
        logError('Erreur logging sync', logError);
      }
    }
    
    // ========================================================================
    // 8. RÉSUMÉ FINAL
    // ========================================================================
    
    console.log('\n' + '='.repeat(80));
    log('success', `✅ SYNCHRONISATION TERMINÉE en ${duration.toFixed(2)}s`);
    console.log('='.repeat(80));
    
    console.log('\n📊 RÉSUMÉ:\n');
    console.log(`   API:                   ${stats.apiServices} services, ${stats.apiCountries} pays`);
    console.log(`   DB Avant:              ${stats.dbServicesActive} actifs, ${stats.dbServicesInactive} inactifs`);
    console.log(`   \n   Modifications:`);
    console.log(`   - Désactivés:          ${stats.servicesDeactivated}`);
    console.log(`   - Ajoutés:             ${stats.servicesAdded}`);
    console.log(`   - Réactivés:           ${stats.servicesReactivated}`);
    console.log(`   - Stocks mis à jour:   ${stats.stocksUpdated}`);
    console.log(`   \n   DB Après:              ${stats.dbServicesActive + stats.servicesAdded + stats.servicesReactivated - stats.servicesDeactivated} actifs`);
    
    if (stats.errors.length > 0) {
      console.log(`\n   ⚠️  Erreurs:            ${stats.errors.length}`);
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    if (CONFIG.DRY_RUN) {
      log('warn', '🧪 DRY_RUN mode - Aucune modification appliquée');
    }
    
    return {
      success: stats.errors.length === 0,
      stats,
    };
    
  } catch (error) {
    logError('Erreur critique synchronisation', error);
    
    stats.endTime = new Date();
    
    // Logger l'erreur en DB
    if (!CONFIG.DRY_RUN) {
      await supabase
        .from('sync_logs')
        .insert({
          sync_type: 'full',
          status: 'error',
          error_count: 1,
          error_details: JSON.stringify([{ message: error.message, stack: error.stack }]),
          started_at: stats.startTime.toISOString(),
          completed_at: stats.endTime.toISOString(),
        });
    }
    
    throw error;
  }
}

// ============================================================================
// EXÉCUTION
// ============================================================================

// Exécution directe
syncServices()
  .then(result => {
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });

export { syncServices };
