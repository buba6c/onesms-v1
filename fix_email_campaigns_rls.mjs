import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🔧 Création politique RLS pour service_role...\n')

// Créer une politique qui permet au service_role d'écrire
const { error } = await supabase.rpc('exec', {
  sql: `
    DROP POLICY IF EXISTS "Service role can manage campaigns" ON email_campaigns;
    
    CREATE POLICY "Service role can manage campaigns" ON email_campaigns
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);
  `
})

if (error) {
  console.error('❌ Erreur SQL:', error)
  console.log('\n💡 Solution: Va sur le dashboard Supabase et exécute ce SQL:')
  console.log(`
DROP POLICY IF EXISTS "Service role can manage campaigns" ON email_campaigns;

CREATE POLICY "Service role can manage campaigns" ON email_campaigns
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);
  `)
} else {
  console.log('✅ Politique créée!')
}
