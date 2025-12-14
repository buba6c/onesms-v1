import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const activationToWatch = 'f624f014' // L'activation qui expire dans 1 minute

console.log('👀 MONITORING: Activation qui expire dans 1 minute\n')

async function monitorActivation() {
  try {
    // Trouver l'activation complète
    const { data: activations } = await sb
      .from('activations')
      .select('*')
      .like('id', `${activationToWatch}%`)
      .single()

    if (!activations) {
      console.log('❌ Activation non trouvée')
      return
    }

    const fullId = activations.id
    console.log(`🎯 Monitoring: ${fullId}`)
    console.log(`   Service: ${activations.service_code}`)
    console.log(`   Prix: ${activations.price}Ⓐ`)
    console.log(`   Expire: ${new Date(activations.expires_at).toLocaleTimeString()}`)

    // Surveiller toutes les 15 secondes pendant 5 minutes
    let checkCount = 0
    const maxChecks = 20 // 5 minutes = 20 checks de 15s

    const interval = setInterval(async () => {
      checkCount++
      
      try {
        const now = new Date()
        
        // État activation
        const { data: currentActivation } = await sb
          .from('activations')
          .select('status, frozen_amount, expires_at')
          .eq('id', fullId)
          .single()

        // Balance operations
        const { data: ops } = await sb
          .from('balance_operations')
          .select('operation_type, amount, created_at')
          .eq('activation_id', fullId)
          .order('created_at', { ascending: true })

        // User état
        const { data: user } = await sb
          .from('users')
          .select('frozen_balance')
          .eq('id', activations.user_id)
          .single()

        const expires = new Date(currentActivation.expires_at)
        const expired = now > expires
        const timeToExpiry = Math.round((expires - now) / 1000) // secondes

        console.log(`\n[${checkCount.toString().padStart(2, '0')}] ${now.toLocaleTimeString()}`)
        console.log(`   Status: ${currentActivation.status}`)
        console.log(`   frozen_amount: ${currentActivation.frozen_amount}Ⓐ`)
        console.log(`   User frozen: ${user.frozen_balance}Ⓐ`)
        console.log(`   Expire: ${expired ? 'EXPIRÉ' : `${timeToExpiry}s`}`)
        console.log(`   Ops: ${ops?.map(o => o.operation_type).join(', ') || 'freeze seulement'}`)

        // Analyser les changements
        if (expired && currentActivation.status === 'pending') {
          console.log('   🔶 Expiré mais pas encore traité par le cron')
        } else if (expired && currentActivation.status === 'timeout') {
          const hasRefund = ops?.some(o => o.operation_type === 'refund')
          if (hasRefund) {
            console.log('   🎉 SUCCÈS! Timeout + Refund automatique')
            clearInterval(interval)
          } else {
            console.log('   ⚠️ Timeout mais pas de refund (ancien bug)')
          }
        }

        // Arrêter après 20 checks
        if (checkCount >= maxChecks) {
          console.log('\n⏰ Monitoring terminé (5 minutes)')
          clearInterval(interval)
        }

      } catch (error) {
        console.error('❌ Erreur check:', error.message)
      }
    }, 15000) // Toutes les 15 secondes

    console.log(`\n⏳ Monitoring démarré (checks toutes les 15s pendant 5 min)`)

  } catch (error) {
    console.error('❌ ERREUR MONITORING:', error.message)
  }
}

monitorActivation()