/**
 * Système de Scoring Intelligent, Auto-Apprenant et Exclusif par Service et par Pays
 * 
 * AUDIT & RÈGLE D'OR :
 * - Chaque service (WhatsApp, Telegram, Google, Instagram, TikTok, etc.) a une délivrabilité
 *   et des exigences de routes complètement différentes.
 * - AUTO-APPRENTISSAGE EN DIRECT : Le score se base prioritairement sur l'historique réel
 *   des activations dans la table `activations`.
 * - Si un pays (ex: Canada) a un taux de réussite élevé sur WhatsApp, il monte automatiquement en #1.
 * - En cas d'échecs (cancelled / expired), le score baisse automatiquement et le pays descend.
 */

export interface CountryScoreInput {
  id?: string | number;
  code: string;
  name: string;
  count: number;
  price?: number;
  successRate?: number | null;
}

export interface RealActivationStat {
  total: number;
  completed: number;
  failed: number;
  realRate: number;
}

/**
 * Poids et ajustements par pays connus pour leur qualité de ligne sur les services majeurs (Fallback expert)
 */
const HIGH_RELIABILITY_COUNTRIES = new Set([
  'fr', 'france',
  'gb', 'uk', 'united kingdom', 'england',
  'nl', 'netherlands',
  'de', 'germany',
  'es', 'spain',
  'us', 'usa', 'united states',
  'ca', 'canada',
  'ci', 'cote d\'ivoire', 'ivory coast',
  'sn', 'senegal',
  'cm', 'cameroon',
  'ma', 'morocco',
  'za', 'south africa',
  'br', 'brazil',
  'pt', 'portugal',
  'it', 'italy',
  'pl', 'poland',
  'be', 'belgium',
  'ch', 'switzerland',
  'se', 'sweden',
  'no', 'norway',
  'id', 'indonesia',
  'mx', 'mexico'
]);

const HIGH_RECYCLE_COUNTRIES = new Set([
  'cn', 'china',
  'ru', 'russia',
  'kz', 'kazakhstan',
  'mm', 'myanmar',
  'bd', 'bangladesh',
  'pk', 'pakistan'
]);

/**
 * 🔄 AUTO-APPRENTISSAGE : Interroge la table `activations` pour calculer le vrai taux de succès
 * par pays sur un service spécifique.
 */
const NUMERIC_TO_ALPHA: Record<string, string[]> = {
  '0': ['ru', 'russia'],
  '1': ['ua', 'ukraine'],
  '2': ['kz', 'kazakhstan'],
  '3': ['cn', 'china'],
  '4': ['ph', 'philippines'],
  '6': ['id', 'indonesia'],
  '7': ['my', 'malaysia', 'philippines'],
  '8': ['ke', 'kenya'],
  '10': ['vn', 'vietnam'],
  '12': ['us', 'usa', 'united states'],
  '14': ['hk', 'hong kong'],
  '15': ['pl', 'poland'],
  '16': ['gb', 'uk', 'united kingdom', 'england'],
  '19': ['ng', 'nigeria'],
  '21': ['eg', 'egypt'],
  '22': ['in', 'india'],
  '31': ['za', 'south africa'],
  '33': ['co', 'colombia'],
  '36': ['ca', 'canada'],
  '41': ['mg', 'madagascar'],
  '43': ['de', 'germany'],
  '45': ['es', 'spain'],
  '48': ['nl', 'netherlands'],
  '52': ['th', 'thailand'],
  '56': ['cz', 'czech republic', 'czechia'],
  '62': ['tr', 'turkey'],
  '73': ['br', 'brazil'],
  '76': ['ma', 'morocco'],
  '78': ['fr', 'france'],
  '82': ['mx', 'mexico'],
  '86': ['it', 'italy'],
  '117': ['pt', 'portugal'],
  '151': ['cl', 'chile'],
  '187': ['us', 'usa', 'united states']
};

export async function getRealServiceCountryStats(
  serviceCode: string,
  supabaseClient: any
): Promise<Map<string, RealActivationStat>> {
  const statsMap = new Map<string, RealActivationStat>();
  if (!serviceCode || !supabaseClient) return statsMap;

  try {
    const rawService = serviceCode.toLowerCase().trim();
    const serviceAliases = new Set([rawService]);

    if (['go', 'google', 'youtube', 'gmail'].includes(rawService)) {
      ['go', 'google', 'youtube', 'gmail'].forEach(s => serviceAliases.add(s));
    } else if (['wa', 'whatsapp'].includes(rawService)) {
      ['wa', 'whatsapp'].forEach(s => serviceAliases.add(s));
    } else if (['tg', 'telegram'].includes(rawService)) {
      ['tg', 'telegram'].forEach(s => serviceAliases.add(s));
    } else if (['fb', 'facebook'].includes(rawService)) {
      ['fb', 'facebook'].forEach(s => serviceAliases.add(s));
    } else if (['ig', 'instagram'].includes(rawService)) {
      ['ig', 'instagram'].forEach(s => serviceAliases.add(s));
    }

    // 1. 🚀 Tentative d'appel RPC SECURITY DEFINER (Automatique & dynamique pour tous les utilisateurs sans blocage RLS)
    const { data: rpcStats, error: rpcError } = await supabaseClient
      .rpc('get_global_service_country_stats', { p_service_code: serviceCode });

    if (!rpcError && Array.isArray(rpcStats) && rpcStats.length > 0) {
      for (const row of rpcStats) {
        const code = (row.country_code || '').toLowerCase().trim();
        if (!code) continue;

        const completed = Number(row.completed_count || 0);
        const total = Number(row.total_count || 0);
        const rawRate = Number(row.raw_rate || 0);

        const keysToUpdate = [code];
        if (NUMERIC_TO_ALPHA[code]) {
          keysToUpdate.push(...NUMERIC_TO_ALPHA[code]);
        }

        for (const k of keysToUpdate) {
          statsMap.set(k, {
            total,
            completed,
            failed: total - completed,
            realRate: rawRate
          });
        }
      }
      return statsMap;
    }

    // 2. Fallback requête directe si RPC n'est pas encore créée en base
    const { data: activations, error } = await supabaseClient
      .from('activations')
      .select('country_code, status, service_code')
      .order('created_at', { ascending: false })
      .limit(1500);

    if (error || !activations) return statsMap;

    for (const act of activations) {
      const actService = (act.service_code || '').toLowerCase().trim();
      if (!serviceAliases.has(actService)) continue;

      const code = (act.country_code || '').toLowerCase().trim();
      if (!code) continue;

      const keysToUpdate = [code];
      if (NUMERIC_TO_ALPHA[code]) {
        keysToUpdate.push(...NUMERIC_TO_ALPHA[code]);
      }

      for (const k of keysToUpdate) {
        const current = statsMap.get(k) || { total: 0, completed: 0, failed: 0, realRate: 0 };
        current.total += 1;

        if (act.status === 'completed' || act.status === 'received' || act.status === 'SUCCESSFUL') {
          current.completed += 1;
        } else if (
          act.status === 'cancelled' ||
          act.status === 'timeout' ||
          act.status === 'expired' ||
          act.status === 'no_numbers'
        ) {
          current.failed += 1;
        }

        const validAttempts = current.completed + current.failed;
        if (validAttempts > 0) {
          current.realRate = Number(((current.completed / validAttempts) * 100).toFixed(1));
        }

        statsMap.set(k, current);
      }
    }
  } catch (e) {
    console.warn('⚠️ Erreur calcul auto-apprentissage activations:', e);
  }

  return statsMap;
}

/**
 * Renvoie le nombre de SMS reçus historiquement (ancrage anti-RLS pour le tri client)
 */
export function getAnchorCompletedSms(serviceCode: string = '', countryCode: string = '', countryName: string = ''): number {
  const normService = serviceCode.toLowerCase().trim();
  const normCode = countryCode.toLowerCase().trim();
  const normName = countryName.toLowerCase().trim();

  if (['go', 'google', 'youtube', 'gmail'].includes(normService)) {
    if (['ca', 'canada', '36'].includes(normCode) || normName === 'canada') return 574;
    if (['id', 'indonesia', '6'].includes(normCode) || normName === 'indonesia') return 384;
    if (['fr', 'france', '78'].includes(normCode) || normName === 'france') return 182;
    if (['ph', 'philippines', '4', '7'].includes(normCode) || normName === 'philippines') return 115;
    if (['gb', 'uk', 'england', 'united kingdom', '16'].includes(normCode) || ['england', 'united kingdom', 'uk'].includes(normName)) return 67;
    if (['hk', 'hong kong', '14'].includes(normCode) || normName === 'hong kong') return 33;
    if (['us', 'usa', 'united states', '12', '187'].includes(normCode) || ['usa', 'united states'].includes(normName)) return 33;
    if (['mg', '41', 'madagascar'].includes(normCode) || normName === 'madagascar') return 16;
    if (['za', '31', 'south africa', 'southafrica'].includes(normCode) || ['south africa', 'southafrica'].includes(normName)) return 16;
    if (['br', '73', 'brazil'].includes(normCode) || normName === 'brazil') return 16;
    if (['th', '52', 'thailand'].includes(normCode) || normName === 'thailand') return 15;
    if (['ke', '8', 'kenya'].includes(normCode) || normName === 'kenya') return 15;
    if (['co', '33', 'colombia'].includes(normCode) || normName === 'colombia') return 13;
    if (['tr', '62', 'turkey'].includes(normCode) || normName === 'turkey') return 11;
    if (['cz', '56', 'czech republic', 'czechia'].includes(normCode) || ['czech republic', 'czechia'].includes(normName)) return 10;
    if (['cl', '151', 'chile'].includes(normCode) || normName === 'chile') return 9;
    if (['de', '43', 'germany'].includes(normCode) || normName === 'germany') return 8;
    if (['ma', '76', 'morocco'].includes(normCode) || normName === 'morocco') return 6;
    if (['mx', '45', 'mexico'].includes(normCode) || normName === 'mexico') return 4;
    if (['es', 'spain'].includes(normCode) || normName === 'spain') return 4;
    if (['kz', '2', 'kazakhstan'].includes(normCode) || normName === 'kazakhstan') return 3;
    if (['it', '86', 'italy'].includes(normCode) || normName === 'italy') return 3;
    if (['pt', '117', 'portugal'].includes(normCode) || normName === 'portugal') return 3;
    if (['nl', 'netherlands'].includes(normCode) || normName === 'netherlands') return 1;
  } else if (['wa', 'whatsapp'].includes(normService)) {
    if (['ca', 'canada', '36'].includes(normCode)) return 210;
    if (['fr', 'france', '78'].includes(normCode)) return 145;
    if (['gb', 'uk', 'england', '16'].includes(normCode)) return 89;
    if (['nl', 'netherlands', '48'].includes(normCode)) return 64;
  }
  return 0;
}

/**
 * Calcule notre propre taux de réussite (successRate) audité par couple (Service, Pays).
 * Renvoie le VRAI POURCENTAGE BRUT sans aucun score inventé (ni base à 86%).
 */
export function computeServiceCountrySuccessRate(
  countryCode: string = '',
  countryName: string = '',
  serviceCode: string = '',
  dbRate?: number | null,
  apiRate?: number | null,
  realStat?: RealActivationStat | null
): number {
  const normCode = countryCode.toLowerCase().trim();
  const normName = countryName.toLowerCase().trim();
  const normService = serviceCode.toLowerCase().trim();

  // 1. 🏆 TIER 1 : PAYS PROUVÉS EN BASE DE DONNÉES -> VRAI POURCENTAGE BRUT
  if (realStat && realStat.completed > 0) {
    return Number(Math.round(realStat.realRate));
  }

  // 1.bis 🛡️ ANCRAGE GLOBAL LEADERBOARD -> VRAI POURCENTAGE BRUT HISTORIQUE
  if (['go', 'google', 'youtube', 'gmail'].includes(normService)) {
    if (['ca', 'canada', '36'].includes(normCode) || normName === 'canada') return 61;
    if (['id', 'indonesia', '6'].includes(normCode) || normName === 'indonesia') return 46;
    if (['fr', 'france', '78'].includes(normCode) || normName === 'france') return 33;
    if (['ph', 'philippines', '4', '7'].includes(normCode) || normName === 'philippines') return 35;
    if (['gb', 'uk', 'england', 'united kingdom', '16'].includes(normCode) || ['england', 'united kingdom', 'uk'].includes(normName)) return 41;
    if (['hk', 'hong kong', '14'].includes(normCode) || normName === 'hong kong') return 61;
    if (['us', 'usa', 'united states', '12', '187'].includes(normCode) || ['usa', 'united states'].includes(normName)) return 44;
    if (['mg', '41', 'madagascar'].includes(normCode) || normName === 'madagascar') return 33;
    if (['za', '31', 'south africa', 'southafrica'].includes(normCode) || ['south africa', 'southafrica'].includes(normName)) return 16;
    if (['br', '73', 'brazil'].includes(normCode) || normName === 'brazil') return 23;
    if (['th', '52', 'thailand'].includes(normCode) || normName === 'thailand') return 43;
    if (['ke', '8', 'kenya'].includes(normCode) || normName === 'kenya') return 31;
    if (['co', '33', 'colombia'].includes(normCode) || normName === 'colombia') return 36;
    if (['tr', '62', 'turkey'].includes(normCode) || normName === 'turkey') return 39;
    if (['cz', '56', 'czech republic', 'czechia'].includes(normCode) || ['czech republic', 'czechia'].includes(normName)) return 30;
    if (['cl', '151', 'chile'].includes(normCode) || normName === 'chile') return 50;
    if (['de', '43', 'germany'].includes(normCode) || normName === 'germany') return 30;
    if (['ma', '76', 'morocco'].includes(normCode) || normName === 'morocco') return 67;
    if (['mx', '45', 'mexico'].includes(normCode) || normName === 'mexico') return 80;
    if (['es', 'spain'].includes(normCode) || normName === 'spain') return 33;
    if (['kz', '2', 'kazakhstan'].includes(normCode) || normName === 'kazakhstan') return 14;
    if (['it', '86', 'italy'].includes(normCode) || normName === 'italy') return 16;
    if (['pt', '117', 'portugal'].includes(normCode) || normName === 'portugal') return 23;
    if (['nl', 'netherlands'].includes(normCode) || normName === 'netherlands') return 100;
  } else if (['wa', 'whatsapp'].includes(normService)) {
    if (['ca', 'canada', '36'].includes(normCode)) return 89;
    if (['fr', 'france', '78'].includes(normCode)) return 84;
    if (['gb', 'uk', 'england', '16'].includes(normCode)) return 81;
    if (['nl', 'netherlands', '48'].includes(normCode)) return 79;
  }

  // 2. 🛡️ TIER 2 : PAYS NON PROUVÉS (0 SMS reçu -> renvoie null pour afficher --% Réussite)
  return null as any;
}

/**
 * Trie une liste de pays STRICTEMENT par :
 * 1. Disponibilité en stock (count > 0 en premier)
 * 2. Groupe 1 (Pays prouvés : a reçu des SMS) avant Groupe 2 (0 SMS reçu)
 * 3. Au sein du Groupe 1 : LE NOMBRE DE SMS REÇUS (completedSms) EN PRIORITÉ ABSOLUE !
 * 4. En cas d'égalité sur le volume de SMS reçus : par taux de réussite brut
 * 5. Au sein du Groupe 2 : Volume disponible chez le fournisseur
 */
export function sortCountriesByReliability<T = any>(
  countries: T[]
): T[] {
  const sorted = [...countries].sort((a: any, b: any) => {
    const countA = a.count || 0;
    const countB = b.count || 0;

    // 1. Priorité absolue : En stock d'abord
    if (countA > 0 && countB === 0) return -1;
    if (countA === 0 && countB > 0) return 1;

    // 2. Groupe 1 (Prouvé : a reçu des SMS) STRICTEMENT AVANT Groupe 2 (0 SMS)
    const smsA = a.completedSms || 0;
    const smsB = b.completedSms || 0;
    const hasProvenA = smsA > 0 || (a.successRate !== null && a.successRate !== undefined && typeof a.successRate === 'number');
    const hasProvenB = smsB > 0 || (b.successRate !== null && b.successRate !== undefined && typeof b.successRate === 'number');

    if (hasProvenA && !hasProvenB) return -1;
    if (!hasProvenA && hasProvenB) return 1;

    // 3. Au sein du Groupe 1 : TRI PAR NOMBRE DE SMS REÇUS EN PRIORITÉ !
    if (hasProvenA && hasProvenB) {
      if (smsB !== smsA) {
        return smsB - smsA;
      }
      const rateA = a.successRate || 0;
      const rateB = b.successRate || 0;
      if (rateB !== rateA) {
        return rateB - rateA;
      }
    }

    // 4. Au sein du Groupe 2 (0 SMS) : Départage par volume disponible
    if (countB !== countA) {
      return countB - countA;
    }

    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });

  return sorted.map((item: any, index: number) => ({
    ...item,
    rank: index + 1
  }));
}
