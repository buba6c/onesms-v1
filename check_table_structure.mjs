import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('🔍 Test insertion dans email_campaigns...\n')

// Essayer d'insérer une campagne test
const { data, error } = await supabase.from('email_campaigns').insert({
  name: 'Test Campaign',
  subject: 'Test Subject',
  title: 'Test Title',
  message: 'Test Message',
  email_type: 'operational',
  target_filter: 'all',
  status: 'sent',
  total_recipients: 1,
  sent_count: 1,
  created_by: '589c44ab-20aa-4e0c-b7a1-d5f4dda78137', // admin ID
  sent_at: new Date().toISOString(),
}).select()

if (error) {
  console.error('❌ Erreur insertion:', error)
  console.log('\nDétails:', JSON.stringify(error, null, 2))
} else {
  console.log('✅ Insertion réussie!')
  console.log(JSON.stringify(data, null, 2))
}
