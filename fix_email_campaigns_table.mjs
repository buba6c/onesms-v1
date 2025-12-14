import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'
import 'dotenv/config'

const DB_URL = process.env.SUPABASE_DB_URL

console.log('🔧 Ajout de la colonne email_type via SQL direct...\n')

const sql = postgres(DB_URL, { ssl: 'require' })

try {
  await sql`
    ALTER TABLE email_campaigns 
    ADD COLUMN IF NOT EXISTS email_type TEXT DEFAULT 'promo'
  `
  console.log('✅ Colonne email_type ajoutée!')
  
  // Tester insertion
  const result = await sql`
    INSERT INTO email_campaigns (
      name, subject, title, message, email_type, 
      target_filter, status, total_recipients, sent_count,
      created_by, sent_at
    ) VALUES (
      'Test Campaign', 'Test Subject', 'Test', 'Test message',
      'operational', 'all', 'sent', 1, 1,
      '589c44ab-20aa-4e0c-b7a1-d5f4dda78137', NOW()
    )
    RETURNING *
  `
  
  console.log('✅ Test insertion réussie!', result[0])
  
} catch (error) {
  console.error('❌ Erreur:', error.message)
} finally {
  await sql.end()
}
