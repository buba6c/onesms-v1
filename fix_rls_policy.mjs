import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' }
})

console.log('🔧 Fix des politiques RLS pour email_campaigns...\n')

// Supprimer l'ancienne politique et créer la nouvelle
const sqlCommands = [
  `DROP POLICY IF EXISTS "Service role can manage campaigns" ON email_campaigns;`,
  `CREATE POLICY "Service role can manage campaigns" ON email_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);`
]

for (const sql of sqlCommands) {
  console.log(`Exécution: ${sql.substring(0, 50)}...`)
  
  const { error } = await supabase.rpc('exec_sql', { sql })
  
  if (error) {
    console.log(`  ⚠️  Erreur (peut-être que exec_sql n'existe pas): ${error.message}`)
  } else {
    console.log(`  ✅ OK`)
  }
}

console.log('\n📝 Test d\'insertion...')

const { data, error } = await supabase
  .from('email_campaigns')
  .insert({
    name: 'Test Campaign Fix',
    subject: 'Test',
    title: 'Test',
    message: 'Test',
    target_filter: 'all',
    status: 'sent',
    total_recipients: 1,
    sent_count: 1,
    created_by: '589c44ab-20aa-4e0c-b7a1-d5f4dda78137',
    sent_at: new Date().toISOString(),
  })
  .select()

if (error) {
  console.error('❌ Erreur insertion:', error)
} else {
  console.log('✅ Test insertion réussie!')
  console.log(data)
}
