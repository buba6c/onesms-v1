import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('🔧 Ajout de la colonne email_type...\n')

// Ajouter la colonne
const { error } = await supabase.rpc('exec_sql', {
  sql: `
    ALTER TABLE email_campaigns 
    ADD COLUMN IF NOT EXISTS email_type TEXT DEFAULT 'promo';
  `
})

if (error) {
  console.error('❌ Erreur:', error)
} else {
  console.log('✅ Colonne email_type ajoutée!')
  
  // Tester l'insertion maintenant
  const { data: testData, error: testError } = await supabase
    .from('email_campaigns')
    .insert({
      name: 'Test Campaign',
      subject: 'Test Subject',
      title: 'Test Title',
      message: 'Test Message',
      email_type: 'operational',
      target_filter: 'all',
      status: 'sent',
      total_recipients: 1,
      sent_count: 1,
      created_by: '589c44ab-20aa-4e0c-b7a1-d5f4dda78137',
      sent_at: new Date().toISOString(),
    })
    .select()
  
  if (testError) {
    console.error('❌ Test insertion:', testError)
  } else {
    console.log('✅ Test insertion réussie!')
  }
}
