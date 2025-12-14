import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔧 MISE À JOUR DE LA CONTRAINTE rentals_status_check\n')

const sql = `
ALTER TABLE rentals 
DROP CONSTRAINT IF EXISTS rentals_status_check;

ALTER TABLE rentals 
ADD CONSTRAINT rentals_status_check 
CHECK (status IN ('active', 'completed', 'cancelled', 'expired'));
`

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

if (error) {
  console.error('❌ Erreur:', error)
  console.log('\n💡 Exécutez manuellement dans Supabase SQL Editor:')
  console.log(sql)
} else {
  console.log('✅ Contrainte mise à jour avec succès !')
  console.log('Les status autorisés sont maintenant:')
  console.log('  - active')
  console.log('  - completed')
  console.log('  - cancelled')
  console.log('  - expired ⭐ (nouveau)')
}
