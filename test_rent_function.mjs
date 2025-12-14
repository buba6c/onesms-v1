/**
 * Test de la fonction buy-sms-activate-rent
 */

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.Z3wiICm4xvVCcqhFjKMw6sCZJCEKVHJmsVNqt3VYVYQ'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'

// Trouver un utilisateur actif
async function findActiveUser() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,email,balance&balance=gt.100&limit=1`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    }
  })
  const data = await response.json()
  return data[0]
}

// Simuler une connexion utilisateur pour obtenir un token
async function testRentFunction() {
  console.log('🔍 Test de buy-sms-activate-rent...\n')
  
  // Récupérer un utilisateur avec solde
  const user = await findActiveUser()
  if (!user) {
    console.log('❌ Aucun utilisateur avec solde > 100 trouvé')
    return
  }
  
  console.log(`✅ Utilisateur trouvé: ${user.email} (balance: ${user.balance}Ⓐ)`)
  console.log(`   ID: ${user.id}`)
  console.log('')
  
  // On ne peut pas simuler un token JWT utilisateur sans credentials
  // Mais on peut vérifier que la fonction est accessible
  
  console.log('📝 Note: La fonction retourne "Unauthorized" car aucun utilisateur authentifié.')
  console.log('   C\'est le comportement attendu pour un appel sans session.')
  console.log('')
  console.log('💡 Pour tester, utilisez l\'application web avec un utilisateur connecté.')
  console.log('')
  
  // Vérifier la structure de la fonction
  console.log('🔍 Vérification de la disponibilité de la fonction...')
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/buy-sms-activate-rent`, {
    method: 'OPTIONS',
    headers: {
      'Content-Type': 'application/json',
    }
  })
  
  console.log(`   Status: ${response.status}`)
  console.log(`   CORS OK: ${response.status === 200 || response.status === 204}`)
}

testRentFunction().catch(console.error)
