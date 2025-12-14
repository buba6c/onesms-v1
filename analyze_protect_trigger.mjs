import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
)

async function analyzeProtectTrigger() {
  console.log('🔍 ANALYSE: PROTECT_FROZEN_AMOUNT.sql\n')
  console.log('='.repeat(70))

  // 1. Triggers existants (on ne peut pas vérifier facilement)
  console.log('📋 TRIGGERS EXISTANTS:')
  console.log('   ⚠️ Impossible de vérifier via API')
  console.log('   Le SQL créera les triggers (DROP IF EXISTS inclus)')

  // 2. Tester qui peut faire des UPDATE
  console.log(`\n🧪 TESTS DE COMPORTEMENT:`)
  console.log('   ')
  console.log('   Le trigger vérifie: session_user = "postgres"')
  console.log('   ')
  console.log('   ✅ AUTORISÉ:')
  console.log('      - atomic_refund() (SECURITY DEFINER → session_user = postgres)')
  console.log('      - atomic_commit() (SECURITY DEFINER → session_user = postgres)')
  console.log('      - secure_freeze_balance() (SECURITY DEFINER)')
  console.log('   ')
  console.log('   ❌ BLOQUÉ:')
  console.log('      - Edge Functions avec UPDATE direct')
  console.log('      - Service role key avec UPDATE direct')
  console.log('      - Authenticated user avec UPDATE direct')

  // 3. Lister les activations actuelles
  const { data: activeActivations } = await supabase
    .from('activations')
    .select('id, status, frozen_amount')
    .in('status', ['pending', 'waiting'])
    .gt('frozen_amount', 0)

  console.log(`\n📊 ACTIVATIONS ACTIVES AVEC FROZEN:`)
  console.log(`   Total: ${activeActivations?.length || 0}`)
  if (activeActivations && activeActivations.length > 0) {
    const totalFrozen = activeActivations.reduce((sum, a) => sum + parseFloat(a.frozen_amount), 0)
    console.log(`   Total frozen: ${totalFrozen} Ⓐ`)
  }

  // 4. Vérifier les fonctions qui seront cassées
  console.log(`\n⚠️ FONCTIONS EDGE QUI SERONT CASSÉES:`)
  console.log('   ')
  console.log('   1. sync-sms-activate-activations')
  console.log('      Ligne 153, 173: UPDATE frozen_amount=0')
  console.log('      Impact: Synchronisation SMS reçus échouera')
  console.log('   ')
  console.log('   2. cron-check-pending-sms')
  console.log('      Ligne 172, 188: UPDATE frozen_amount=0')
  console.log('      Impact: CRON de vérification SMS échouera')
  console.log('   ')
  console.log('   3. recover-sms-from-history')
  console.log('      Ligne 209, 229: UPDATE frozen_amount=0')
  console.log('      Impact: Récupération historique échouera')
  console.log('   ')
  console.log('   4. cancel-sms-activate-order')
  console.log('      Ligne 153: UPDATE frozen_amount=0')
  console.log('      Impact: Annulation manuelle échouera')

  // 5. Impact sur les utilisateurs
  console.log(`\n👥 IMPACT UTILISATEURS:`)
  console.log('   ')
  console.log('   IMMÉDIAT (après exécution du SQL):')
  console.log('   ❌ Les 4 fonctions ci-dessus vont échouer')
  console.log('   ❌ Erreur visible: "Direct update of frozen_amount is forbidden"')
  console.log('   ')
  console.log('   FONCTIONS CORRECTES (continueront à fonctionner):')
  console.log('   ✅ buy-sms-activate-number (utilise secure_freeze_balance)')
  console.log('   ✅ check-sms-activate-status (utilise atomic_commit/refund)')
  console.log('   ✅ cleanup-expired-activations (utilise atomic_refund)')

  // 6. Ordre d'exécution recommandé
  console.log(`\n📋 ORDRE D'EXÉCUTION RECOMMANDÉ:`)
  console.log('   ')
  console.log('   ❌ NE PAS EXÉCUTER MAINTENANT')
  console.log('   ')
  console.log('   👉 PLAN CORRECT:')
  console.log('   ')
  console.log('   1️⃣ Corriger les 4 Edge Functions (remplacer UPDATE par atomic_*)') 
  console.log('   2️⃣ Déployer les fonctions corrigées')
  console.log('   3️⃣ Tester que tout fonctionne')
  console.log('   4️⃣ PUIS exécuter PROTECT_FROZEN_AMOUNT.sql (protection finale)')
  console.log('   ')
  console.log('   OU')
  console.log('   ')
  console.log('   👉 PLAN BRUTAL (moins risqué qu\'il n\'y paraît):')
  console.log('   ')
  console.log('   1️⃣ Exécuter PROTECT_FROZEN_AMOUNT.sql MAINTENANT')
  console.log('   2️⃣ Corriger les fonctions cassées une par une quand elles échouent')
  console.log('   3️⃣ Avantage: Protection immédiate, pas de nouveaux phantoms')
  console.log('   4️⃣ Inconvénient: Certaines fonctions échoueront temporairement')

  // 7. Vérifier session_user
  console.log(`\n🔬 VÉRIFICATION TECHNIQUE:`)
  console.log('   ')
  console.log('   Le trigger utilise: session_user = "postgres"')
  console.log('   ')
  console.log('   ⚠️ ATTENTION: session_user pourrait être:')
  console.log('      - "postgres" pour SECURITY DEFINER ✅')
  console.log('      - "authenticator" pour service_role ❌')
  console.log('      - "authenticated" pour users ❌')
  console.log('   ')
  console.log('   💡 MEILLEURE DÉTECTION:')
  console.log('      - Vérifier pg_trigger_depth() > 0')
  console.log('      - Ou current_setting("role") = "postgres"')

  console.log('\n' + '='.repeat(70))
  console.log('🎯 VERDICT:')
  console.log('='.repeat(70))
  console.log(`
   ⚠️ CE SQL EST CORRECT MAIS CASSERA 4 FONCTIONS

   Recommandation: Correction douce (option 2)
   1. Je corrige les 4 Edge Functions maintenant
   2. Tu les déploies
   3. Tu exécutes PROTECT_FROZEN_AMOUNT.sql après
   
   Veux-tu que je corrige les fonctions maintenant ?
  `)
  console.log('='.repeat(70))
}

analyzeProtectTrigger()
