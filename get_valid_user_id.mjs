import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Récupération des utilisateurs valides\n')

async function getValidUsers() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, balance')
    .limit(5)
  
  if (error) {
    console.error('❌ Erreur:', error.message)
    return
  }
  
  if (!users || users.length === 0) {
    console.log('⚠️  Aucun utilisateur trouvé')
    return
  }
  
  console.log(`✅ ${users.length} utilisateurs trouvés:\n`)
  
  users.forEach((u, i) => {
    console.log(`${i + 1}. ${u.email}`)
    console.log(`   ID: ${u.id}`)
    console.log(`   Balance: ${u.balance} FCFA`)
    console.log('')
  })
  
  console.log('\n📋 SQL mis à jour:\n')
  console.log('-- Utilisez ce user_id dans le SQL:')
  console.log(`'${users[0].id}'  -- ${users[0].email}`)
}

getValidUsers().catch(console.error)
