import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

// Corrections à appliquer basées sur sms-activate-data.ts
const CORRECTIONS = [
  // Social Media - CRITIQUES
  { code: 'fu', correctName: 'Snapchat', currentName: 'Fubao', priority: 1 },
  { code: 'lf', correctName: 'TikTok', currentName: 'Lifeline', priority: 1 },
  { code: 'tn', correctName: 'LinkedIn', currentName: 'Tinder', priority: 1 },
  { code: 'bnl', correctName: 'Reddit', currentName: 'Bnl', priority: 1 },
  { code: 'tw', correctName: 'Twitter', currentName: 'Twitter/X', priority: 2 }, // Proche mais à uniformiser
  
  // E-Commerce - CRITIQUES
  { code: 'ka', correctName: 'Shopee', currentName: 'Kakao', priority: 1 },
  { code: 'dl', correctName: 'Lazada', currentName: 'DealLabs', priority: 1 },
  { code: 'ep', correctName: 'Temu', currentName: 'EpicGames', priority: 1 },
  { code: 'hx', correctName: 'AliExpress', currentName: 'Service HX', priority: 1 },
  { code: 'aez', correctName: 'Shein', currentName: 'Aez', priority: 1 },
  { code: 'xt', correctName: 'Flipkart', currentName: 'Service XT', priority: 1 },
  
  // Finance & Paiement - CRITIQUES
  { code: 'ts', correctName: 'PayPal', currentName: 'TypeScript Services', priority: 1 },
  { code: 'nc', correctName: 'Payoneer', currentName: 'Service NC', priority: 1 },
  { code: 're', correctName: 'Coinbase', currentName: 'Reddit', priority: 1 },
  { code: 'aon', correctName: 'Binance', currentName: 'Aon', priority: 1 },
  { code: 'ij', correctName: 'Revolut', currentName: 'Service IJ', priority: 1 },
  { code: 'bo', correctName: 'Wise', currentName: 'Bolt', priority: 1 },
  { code: 'ti', correctName: 'Crypto.com', currentName: 'TikTok India', priority: 1 },
  
  // Food & Delivery - CRITIQUES
  { code: 'jg', correctName: 'Grab', currentName: 'JioGames', priority: 1 },
  { code: 'ac', correctName: 'DoorDash', currentName: 'Service AC', priority: 1 },
  { code: 'aq', correctName: 'Glovo', currentName: 'Service AQ', priority: 1 },
  { code: 'rr', correctName: 'Wolt', currentName: 'RailRoad', priority: 1 },
  { code: 'nz', correctName: 'Foodpanda', currentName: 'NewZealand Services', priority: 1 },
  
  // Tech - CRITIQUES
  { code: 'mm', correctName: 'Microsoft', currentName: 'Myanmar Services', priority: 1 },
  { code: 'wx', correctName: 'Apple', currentName: 'WeChat', priority: 1 },
  { code: 'mb', correctName: 'Yahoo', currentName: 'Mamba', priority: 1 },
  { code: 'pm', correctName: 'AOL', currentName: 'Payeer', priority: 1 },
  { code: 'dr', correctName: 'OpenAI', currentName: 'Dribbble', priority: 1 },
  
  // Dating - CRITIQUES
  { code: 'oi', correctName: 'Tinder', currentName: 'OLX', priority: 1 },
  { code: 'mo', correctName: 'Bumble', currentName: 'Moj', priority: 1 },
  { code: 'df', correctName: 'Happn', currentName: '???', priority: 1 },
  { code: 'vz', correctName: 'Hinge', currentName: '???', priority: 1 },
  
  // Gaming
  { code: 'bz', correctName: 'Blizzard', currentName: '???', priority: 2 },
  { code: 'ah', correctName: 'Escape From Tarkov', currentName: '???', priority: 2 },
  { code: 'aiw', correctName: 'Roblox', currentName: '???', priority: 2 },
  { code: 'blm', correctName: 'Epic Games', currentName: '???', priority: 2 },
  
  // Entertainment
  { code: 'alj', correctName: 'Spotify', currentName: '???', priority: 1 },
  { code: 'hb', correctName: 'Twitch', currentName: '???', priority: 1 },
]

async function fixServiceNames(dryRun = true) {
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('🔧 CORRECTION DES NOMS DE SERVICES ONE SMS')
  console.log('═══════════════════════════════════════════════════════════════════\n')
  
  if (dryRun) {
    console.log('🔍 MODE DRY-RUN (simulation seulement, aucune modification)')
    console.log('   Exécutez avec: node fix_service_names.mjs --apply pour appliquer\n')
  } else {
    console.log('⚠️  MODE APPLY - Les modifications seront appliquées à la base de données!\n')
  }

  const results = {
    total: CORRECTIONS.length,
    success: 0,
    failed: 0,
    notFound: 0,
    alreadyCorrect: 0,
    errors: []
  }

  console.log(`📋 ${CORRECTIONS.length} corrections à vérifier\n`)

  for (const correction of CORRECTIONS) {
    const { code, correctName, currentName, priority } = correction
    const priorityIcon = priority === 1 ? '🔴' : '🟡'
    
    // Vérifier le service actuel dans la DB
    const { data: service, error: fetchError } = await supabase
      .from('services')
      .select('code, name, active')
      .eq('code', code)
      .single()

    if (fetchError || !service) {
      console.log(`${priorityIcon} ❌ ${code.padEnd(10)} → Service non trouvé dans la DB`)
      results.notFound++
      results.errors.push({ code, error: 'Service non trouvé' })
      continue
    }

    // Vérifier si le nom est déjà correct
    if (service.name === correctName) {
      console.log(`${priorityIcon} ✅ ${code.padEnd(10)} → ${correctName} (déjà correct)`)
      results.alreadyCorrect++
      continue
    }

    console.log(`${priorityIcon} 🔄 ${code.padEnd(10)}`)
    console.log(`      Actuel:  "${service.name}"`)
    console.log(`      Correct: "${correctName}"`)

    if (!dryRun) {
      // Appliquer la correction
      const { error: updateError } = await supabase
        .from('services')
        .update({ name: correctName })
        .eq('code', code)

      if (updateError) {
        console.log(`      ❌ ÉCHEC: ${updateError.message}`)
        results.failed++
        results.errors.push({ code, error: updateError.message })
      } else {
        console.log(`      ✅ CORRIGÉ!`)
        results.success++
      }
    } else {
      console.log(`      📝 Sera corrigé en mode --apply`)
      results.success++ // Compte comme succès potentiel
    }
    
    console.log()
  }

  // Résumé
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('📊 RÉSUMÉ')
  console.log('═══════════════════════════════════════════════════════════════════\n')
  
  console.log(`Total vérifié:       ${results.total}`)
  console.log(`✅ Déjà corrects:    ${results.alreadyCorrect}`)
  console.log(`🔄 À corriger:       ${results.success}`)
  console.log(`❌ Échecs:           ${results.failed}`)
  console.log(`⚠️  Non trouvés:     ${results.notFound}`)
  console.log()

  if (results.errors.length > 0) {
    console.log('❌ ERREURS DÉTAILLÉES:')
    results.errors.forEach(err => {
      console.log(`   • ${err.code}: ${err.error}`)
    })
    console.log()
  }

  if (dryRun && results.success > 0) {
    console.log('💡 Pour appliquer les corrections:')
    console.log('   node fix_service_names.mjs --apply')
    console.log()
  } else if (!dryRun) {
    console.log('✅ Corrections appliquées avec succès!')
    console.log()
  }

  // Statistiques par priorité
  const priority1 = CORRECTIONS.filter(c => c.priority === 1).length
  const priority2 = CORRECTIONS.filter(c => c.priority === 2).length
  
  console.log('📈 PAR PRIORITÉ:')
  console.log(`   🔴 Critique (P1): ${priority1} services`)
  console.log(`   🟡 Important (P2): ${priority2} services`)
  console.log()
}

// Exécution
const isDryRun = !process.argv.includes('--apply')
fixServiceNames(isDryRun).catch(console.error)
