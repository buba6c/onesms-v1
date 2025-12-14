import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL

// Créer client avec service role (bypass RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🔧 Application du fix email_campaigns...\n')

console.log('📝 Test insertion direct (sans email_type ni target_filter)...')

const { data, error } = await supabase
  .from('email_campaigns')
  .insert({
    name: 'Test Campaign Simple',
    subject: 'Test Subject',
    title: 'Test Title',
    message: 'Test Message',
    status: 'sent',
    total_recipients: 1,
    sent_count: 1,
    created_by: '589c44ab-20aa-4e0c-b7a1-d5f4dda78137',
    sent_at: new Date().toISOString(),
  })
  .select()

if (error) {
  console.error('❌ Erreur:', error.message)
  console.log('\nCode:', error.code)
  console.log('Détails:', error.details)
  
  if (error.code === '42501') {
    console.log('\n💡 Problème de permission RLS!')
    console.log('Va sur: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/editor')
    console.log('SQL Editor > New Query > Colle et exécute:')
    console.log(`
DROP POLICY IF EXISTS "Service role can manage campaigns" ON email_campaigns;

CREATE POLICY "Service role can manage campaigns" ON email_campaigns
FOR ALL TO service_role USING (true) WITH CHECK (true);
    `)
  }
} else {
  console.log('✅ Insertion réussie!')
  console.log(data)
  
  // Nettoyer
  await supabase.from('email_campaigns').delete().eq('id', data[0].id)
  console.log('\n🧹 Test nettoyé')
}
