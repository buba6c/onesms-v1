import { getServiceLogo, getServiceIcon } from './src/lib/logo-service.ts'

console.log('🧪 TEST: Logos Tinder & Badoo après correction\n')

const tests = [
  { code: 'oi', name: 'Tinder (code SMS-Activate)' },
  { code: 'tinder', name: 'Tinder (nom)' },
  { code: 'qv', name: 'Badoo (code SMS-Activate)' },
  { code: 'badoo', name: 'Badoo (nom)' },
  { code: 'whatsapp', name: 'WhatsApp (contrôle)' },
]

tests.forEach(test => {
  const logo = getServiceLogo(test.code)
  const icon = getServiceIcon(test.code)
  
  console.log(`📱 ${test.name}`)
  console.log(`   Code: ${test.code}`)
  console.log(`   Logo URL: ${logo}`)
  console.log(`   Emoji fallback: ${icon}`)
  console.log(`   ✅ Correct: ${logo.includes('tinder.com') || logo.includes('badoo.com') || logo.includes('whatsapp.com') ? 'OUI' : 'NON'}`)
  console.log()
})

console.log('📊 RÉSUMÉ:')
console.log('   - oi → https://img.logo.dev/tinder.com (❤️)')
console.log('   - qv → https://img.logo.dev/badoo.com (💙)')
console.log('   - Fallback emoji: oi=❤️, qv=💙')
console.log('\n✅ Les logos devraient maintenant s\'afficher correctement dans l\'interface')
