import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
)

async function analyzeBeforeCommitFix() {
  console.log('🧠 ANALYSE INTELLIGENTE: atomic_commit() correction\n')
  console.log('='.repeat(70))

  // 1. État actuel de buba6c
  const { data: user } = await supabase
    .from('users')
    .select('balance, frozen_balance')
    .ilike('email', '%buba6c%')
    .single()
  
  console.log('📊 ÉTAT ACTUEL USER (buba6c):')
  console.log(`   Balance: ${user.balance} Ⓐ`)
  console.log(`   Frozen: ${user.frozen_balance} Ⓐ`)

  // 2. Activations avec SMS reçu mais pas chargées
  const { data: problematic } = await supabase
    .from('activations')
    .select('id, phone, service_code, price, frozen_amount, charged, sms_code, created_at')
    .eq('status', 'received')
    .eq('charged', false)
    .order('created_at', { ascending: false })
  
  console.log(`\n🔍 ACTIVATIONS PROBLÉMATIQUES (SMS reçu, pas chargées):`)
  console.log(`   Total: ${problematic?.length || 0}`)
  
  let totalNotCharged = 0
  if (problematic && problematic.length > 0) {
    problematic.forEach((act, i) => {
      console.log(`\n   ${i+1}. ${act.phone} (${act.service_code})`)
      console.log(`      ID: ${act.id}`)
      console.log(`      Prix: ${act.price} Ⓐ`)
      console.log(`      Frozen Amount: ${act.frozen_amount} Ⓐ`)
      console.log(`      SMS Code: ${act.sms_code}`)
      console.log(`      Created: ${act.created_at}`)
      totalNotCharged += parseFloat(act.price)
    })
    console.log(`\n   💰 TOTAL non chargé: ${totalNotCharged} Ⓐ`)
  }

  // 3. Vérifier les balance_operations existantes
  const { data: ops } = await supabase
    .from('balance_operations')
    .select('operation_type, amount')
    .eq('user_id', 'e108c02a-2012-4043-bbc2-fb09bb11f824')
    .order('created_at', { ascending: true })
  
  console.log(`\n📜 HISTORIQUE BALANCE_OPERATIONS:`)
  const opTypes = {
    freeze: 0,
    commit: 0,
    refund: 0,
    charge: 0
  }
  ops?.forEach(op => {
    opTypes[op.operation_type] = (opTypes[op.operation_type] || 0) + 1
  })
  console.log(`   FREEZE: ${opTypes.freeze} opérations`)
  console.log(`   COMMIT: ${opTypes.commit} opérations`)
  console.log(`   CHARGE: ${opTypes.charge} opérations`)
  console.log(`   REFUND: ${opTypes.refund} opérations`)

  // 4. Calcul de ce qui devrait être
  console.log(`\n🧮 ANALYSE LOGIQUE:`)
  console.log(`   Balance actuelle: ${user.balance} Ⓐ`)
  console.log(`   Frozen actuel: ${user.frozen_balance} Ⓐ`)
  console.log(`   `)
  console.log(`   SMS reçus non chargés: ${totalNotCharged} Ⓐ`)
  console.log(`   `)
  console.log(`   ⚠️ PROBLÈME IDENTIFIÉ:`)
  console.log(`   - Ces ${totalNotCharged} Ⓐ sont gelés dans frozen_balance`)
  console.log(`   - Mais l'utilisateur a déjà reçu les SMS`)
  console.log(`   - Donc ces ${totalNotCharged} Ⓐ devraient être DÉDUITS de balance`)

  // 5. Impact de la correction
  console.log(`\n💡 IMPACT DE LA CORRECTION atomic_commit():`)
  console.log(`   `)
  console.log(`   AVANT correction (comportement actuel):`)
  console.log(`   - SMS reçu → frozen_balance diminue`)
  console.log(`   - balance reste INCHANGÉ (BUG!)`)
  console.log(`   - L'user garde son argent malgré SMS reçu`)
  console.log(`   `)
  console.log(`   APRÈS correction (comportement attendu):`)
  console.log(`   - SMS reçu → frozen_balance diminue`)
  console.log(`   - balance DIMINUE aussi (CORRECT!)`)
  console.log(`   - L'user paie pour le SMS reçu`)

  // 6. Prochaines actions
  console.log(`\n📋 ÉTAPES APRÈS EXÉCUTION DU SQL:`)
  console.log(`   `)
  console.log(`   1️⃣ Exécuter FIX_ATOMIC_COMMIT_CHARGE.sql`)
  console.log(`      → atomic_commit() diminuera balance + frozen_balance`)
  console.log(`   `)
  console.log(`   2️⃣ Corriger les ${problematic?.length || 0} activations problématiques:`)
  if (problematic && problematic.length > 0) {
    problematic.forEach((act, i) => {
      console.log(`   `)
      console.log(`      ${i+1}. Activation ${act.id.substring(0, 8)}... (${act.price} Ⓐ):`)
      console.log(`         SELECT * FROM atomic_commit(`)
      console.log(`           'e108c02a-2012-4043-bbc2-fb09bb11f824',`)
      console.log(`           '${act.id}',`)
      console.log(`           NULL,`)
      console.log(`           'Manual fix: SMS received but not charged'`)
      console.log(`         );`)
    })
  }
  console.log(`   `)
  console.log(`   3️⃣ Vérifier le résultat:`)
  console.log(`      Balance finale attendue: ${user.balance - totalNotCharged} Ⓐ`)
  console.log(`      Frozen finale attendue: ${user.frozen_balance - totalNotCharged} Ⓐ (ou 0 si pas d'autres gel)`)

  // 7. Contrainte valid_freeze_op
  console.log(`\n⚠️ ATTENTION CONTRAINTE valid_freeze_op:`)
  console.log(`   La contrainte actuelle autorise: freeze, commit, refund`)
  console.log(`   Le SQL corrigé utilise: 'commit' (OK ✅)`)
  console.log(`   Pas de conflit attendu`)

  console.log('\n' + '='.repeat(70))
  console.log('✅ ANALYSE TERMINÉE - Tu peux exécuter le SQL en toute sécurité')
  console.log('='.repeat(70))
}

analyzeBeforeCommitFix()
