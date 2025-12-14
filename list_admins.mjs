import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('👥 Liste des utilisateurs admin:\n')

const { data: admins, error } = await supabase
  .from('users')
  .select('id, email, role')
  .eq('role', 'admin')

if (error) {
  console.error('❌ Erreur:', error.message)
  process.exit(1)
}

console.log('Admins trouvés:', admins.length)
admins.forEach(admin => {
  console.log(`  - ${admin.email} (${admin.id})`)
})
