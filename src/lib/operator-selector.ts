/**
 * Fonction pour choisir automatiquement le meilleur opérateur
 * Basé sur la stratégie: POPULARITÉ (Stock × Rate)
 * Priorise: Disponibilité élevée + Taux de succès élevé
 */

import { Sim5CountryData } from './sync-service'

export interface BestOperator {
  name: string
  cost: number
  count: number
  rate: number
  score: number // Stock × Rate
}

/**
 * Sélectionne le meilleur opérateur pour un pays donné
 * @param countryData - Données du pays depuis l'API 5sim
 * @returns Le meilleur opérateur ou null si aucun disponible
 */
export function selectBestOperator(countryData: Sim5CountryData): BestOperator | null {
  if (!countryData.operators || Object.keys(countryData.operators).length === 0) {
    return null
  }

  const operators = Object.entries(countryData.operators)
    .map(([name, details]) => ({
      name,
      cost: details.cost,
      count: details.count,
      rate: details.rate || 0,
      score: details.count * ((details.rate || 0) / 100) // Popularité
    }))
    .filter(op => op.count > 0) // Seulement les opérateurs avec du stock
    .sort((a, b) => {
      // Stratégie 1: Tri par score de popularité (Stock × Rate)
      if (b.score !== a.score) return b.score - a.score
      
      // Stratégie 2: En cas d'égalité, favoriser le meilleur taux
      if (b.rate !== a.rate) return b.rate - a.rate
      
      // Stratégie 3: Ensuite le plus de stock
      if (b.count !== a.count) return b.count - a.count
      
      // Stratégie 4: Enfin le moins cher
      return a.cost - b.cost
    })

  return operators[0] || null
}

/**
 * Sélectionne le meilleur opérateur directement depuis les données API 5sim
 * @param serviceCode - Code du service (ex: 'google')
 * @param countryCode - Code du pays (ex: 'england')
 * @returns Le nom de l'opérateur ou 'any' par défaut
 */
export async function getBestOperatorFor5sim(
  serviceCode: string,
  countryCode: string
): Promise<string> {
  try {
    // Appel direct à l'API 5sim
    const response = await fetch(
      `https://5sim.net/v1/guest/prices?product=${serviceCode.toLowerCase()}`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      }
    )

    if (!response.ok) {
      console.warn(`⚠️ [OPERATOR] Impossible de récupérer les prix pour ${serviceCode}`)
      return 'any'
    }

    const data = await response.json()
    const serviceData = data[serviceCode.toLowerCase()]

    if (!serviceData || !serviceData[countryCode]) {
      console.warn(`⚠️ [OPERATOR] Pays ${countryCode} non trouvé pour ${serviceCode}`)
      return 'any'
    }

    // Construire les données du pays
    const operators = serviceData[countryCode]
    const operatorMap: Record<string, any> = {}
    
    for (const [operatorName, operatorData] of Object.entries(operators)) {
      const op = operatorData as any
      if (!op || typeof op !== 'object') continue
      
      operatorMap[operatorName] = {
        cost: op.cost || 0,
        count: op.count || 0,
        rate: op.rate || 0
      }
    }

    const countryData: Sim5CountryData = {
      countryCode,
      countryName: countryCode,
      operators: operatorMap,
      totalCount: 0,
      avgCost: 0,
      maxRate: 0
    }

    const bestOperator = selectBestOperator(countryData)

    if (bestOperator) {
      // console.log(
      //   `✅ [OPERATOR] Meilleur opérateur pour ${serviceCode}/${countryCode}: ` +
      //   `${bestOperator.name} (score: ${bestOperator.score.toFixed(0)}, ` +
      //   `rate: ${bestOperator.rate}%, stock: ${bestOperator.count})`
      // )
      return bestOperator.name
    }

    // console.warn(`⚠️ [OPERATOR] Aucun opérateur disponible pour ${serviceCode}/${countryCode}`)
    return 'any'

  } catch (error) {
    console.error('❌ [OPERATOR] Erreur lors de la sélection:', error)
    return 'any'
  }
}
