import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const sql = `
ALTER TABLE services ADD COLUMN IF NOT EXISTS icon_url TEXT;
CREATE INDEX IF NOT EXISTS idx_services_icon_url ON services(icon_url) WHERE icon_url IS NOT NULL;
`

console.log('🔧 Application de la migration...')
const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).single()

if (error) {
  console.log('⚠️ Utilisons une approche alternative...')
  // Try direct update to test if column exists
  const { error: updateError } = await supabase.from('services').update({ icon_url: null }).eq('id', -1)
  if (updateError && updateError.message.includes('does not exist')) {
    console.log('❌ La colonne icon_url doit être créée manuellement')
    console.log('\n📋 Allez sur: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/editor')
    console.log('Puis exécutez ce SQL:\n')
    console.log(sql)
    process.exit(1)
  }
} else {
  console.log('✅ Migration appliquée avec succès!')
}
