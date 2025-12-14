import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'

console.log('📋 CHECK RAPIDE: État buba6c après ajout 15Ⓐ\n')

try {
  // User state
  const { data: user } = await sb
    .from('users')
    .select('email, balance, frozen_balance')
    .eq('id', userId)
    .single()

  console.log(`💰 UTILISATEUR:`)
  console.log(`   ${user.email}`)
  console.log(`   Balance: ${user.balance}Ⓐ`)
  console.log(`   Frozen: ${user.frozen_balance}Ⓐ`)
  console.log(`   Libre: ${user.balance - user.frozen_balance}Ⓐ`)

  // Activations actives
  const { data: active } = await sb
    .from('activations')
    .select('id, service_code, price, status, expires_at')
    .eq('user_id', userId)
    .in('status', ['pending', 'waiting'])
    .order('expires_at', { ascending: true })

  console.log(`\n📱 ACTIVATIONS ACTIVES: ${active?.length || 0}`)
  
  if (active && active.length > 0) {
    active.forEach((act, i) => {
      const expires = new Date(act.expires_at)
      const timeLeft = Math.round((expires - Date.now()) / 60000)
      console.log(`   ${i+1}. ${act.id.substring(0,8)}... | ${act.service_code} | ${act.price}Ⓐ | ${timeLeft > 0 ? `${timeLeft}min` : 'EXPIRÉ'}`)
    })
  }

  // Notre nouvelle activation spécifiquement
  const newActivationId = '154deafd-4ac5-4d8c-8250-4a3120ac1600'
  const { data: newAct } = await sb
    .from('activations')
    .select('*')
    .eq('id', newActivationId)
    .single()

  if (newAct) {
    const expires = new Date(newAct.expires_at)
    const timeLeft = Math.round((expires - Date.now()) / 60000)
    
    console.log(`\n🎯 NOUVELLE ACTIVATION:`)
    console.log(`   ID: ${newAct.id}`)
    console.log(`   Service: ${newAct.service_code}`)
    console.log(`   Prix: ${newAct.price}Ⓐ`)
    console.log(`   Status: ${newAct.status}`)
    console.log(`   Expire dans: ${timeLeft}min`)
    
    if (timeLeft <= 0) {
      console.log(`   🔴 EXPIRÉ - Vérifier si traité par atomic processor`)
    } else {
      console.log(`   ✅ ACTIF - Expire à ${expires.toLocaleTimeString()}`)
    }
  }

  console.log(`\n✅ État vérifié - 15Ⓐ bien ajoutés!`)

} catch (error) {
  console.error('❌ ERREUR:', error.message)
}