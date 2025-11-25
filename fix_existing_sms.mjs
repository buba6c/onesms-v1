import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.i31PDBp-K02RqZs35gfqEUQp9OHtxEQ6FqwfBV33wac'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixExistingSms() {
  console.log('🔧 Correction du SMS pour 6283187992499...\n')

  // Get the activation
  const { data: activation, error: fetchError } = await supabase
    .from('activations')
    .select('*')
    .eq('phone', '6283187992499')
    .single()

  if (fetchError || !activation) {
    console.error('❌ Activation non trouvée:', fetchError)
    return
  }

  console.log('📊 Activation actuelle:')
  console.log('   ID:', activation.id)
  console.log('   Phone:', activation.phone)
  console.log('   sms_code:', activation.sms_code)
  console.log('   sms_text:', activation.sms_text)
  console.log('   Status:', activation.status)
  console.log('')

  // Update with formatted text
  const formattedText = `Votre code de validation est ${activation.sms_code}`
  
  const { data: updated, error: updateError } = await supabase
    .from('activations')
    .update({
      sms_text: formattedText
    })
    .eq('id', activation.id)
    .select()
    .single()

  if (updateError) {
    console.error('❌ Erreur de mise à jour:', updateError)
    return
  }

  console.log('✅ SMS mis à jour avec succès!')
  console.log('   Nouveau sms_text:', updated.sms_text)
  console.log('')
  console.log('🎯 Le texte complet devrait maintenant s\'afficher sur la plateforme.')
}

fixExistingSms()
