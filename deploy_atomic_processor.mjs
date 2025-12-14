import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🚀 DÉPLOIEMENT: Fonction SQL atomique 100% fiable\n')

// Lire le fichier SQL
const sql = readFileSync('CREATE_atomic_timeout_processor.sql', 'utf8')

console.log('📝 Exécution du SQL...')

// Exécuter le SQL
const { data, error } = await sb.rpc('exec', { sql })

if (error) {
  console.error('❌ ERREUR:', error)
} else {
  console.log('✅ Fonction créée avec succès!')
  
  // Tester la fonction
  console.log('\n🧪 TEST de la fonction...')
  
  const { data: testResult, error: testError } = await sb.rpc('process_expired_activations')
  
  if (testError) {
    console.error('❌ Erreur test:', testError)
  } else {
    console.log('✅ Test réussi!')
    console.log('📊 Résultat:', testResult)
  }
}