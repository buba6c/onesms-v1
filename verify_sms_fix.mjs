import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSms() {
  console.log('🔍 Vérification du SMS pour 6283187992499...\n')

  const { data: activations, error } = await supabase
    .from('activations')
    .select('*')
    .eq('order_id', '4450751126')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error || !activations || activations.length === 0) {
    console.error('❌ Erreur:', error || 'Aucune activation trouvée')
    return
  }

  const activation = activations[0]

  console.log('📊 État actuel:')
  console.log('   ID:', activation.id)
  console.log('   Phone:', activation.phone)
  console.log('   Order ID:', activation.order_id)
  console.log('   sms_code:', activation.sms_code)
  console.log('   sms_text:', activation.sms_text)
  console.log('   Status:', activation.status)
  console.log('   Service:', activation.service)
  console.log('')

  if (activation.sms_text && activation.sms_text !== activation.sms_code) {
    console.log('✅ Le SMS est correctement formaté!')
  } else {
    console.log('⚠️  Le sms_text n\'est pas formaté (contient juste le code)')
  }
}

checkSms()
