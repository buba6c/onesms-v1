import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824' // buba6c@gmail.com

console.log('🔍 AUDIT FROZEN BALANCE: Pourquoi 21Ⓐ frozen pour buba6c?\n')

try {
  // 1. État actuel utilisateur
  console.log('1️⃣ État actuel utilisateur...')
  
  const { data: user } = await sb
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  console.log(`👤 USER: ${user.email}`)
  console.log(`   Balance: ${user.balance}Ⓐ`)
  console.log(`   Frozen: ${user.frozen_balance}Ⓐ ← PROBLÈME`)
  console.log(`   Disponible: ${user.balance - user.frozen_balance}Ⓐ`)

  // 2. Toutes les activations de cet utilisateur
  console.log(`\n2️⃣ TOUTES LES ACTIVATIONS (dernières 20)...`)
  
  const { data: allActivations } = await sb
    .from('activations')
    .select('id, service_code, price, frozen_amount, status, expires_at, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (allActivations && allActivations.length > 0) {
    let totalShouldBeFrozen = 0
    const activeActivations = []
    
    console.log(`\n📱 ANALYSE PAR STATUS:`)
    
    // Grouper par status
    const byStatus = {}
    allActivations.forEach(act => {
      if (!byStatus[act.status]) byStatus[act.status] = []
      byStatus[act.status].push(act)
    })
    
    Object.keys(byStatus).forEach(status => {
      const acts = byStatus[status]
      const totalAmount = acts.reduce((sum, act) => sum + (act.price || 0), 0)
      const totalFrozen = acts.reduce((sum, act) => sum + (act.frozen_amount || 0), 0)
      
      console.log(`\n   ${status.toUpperCase()}: ${acts.length} activations`)
      console.log(`     Prix total: ${totalAmount}Ⓐ`)
      console.log(`     Frozen total: ${totalFrozen}Ⓐ`)
      
      if (status === 'pending' || status === 'waiting') {
        totalShouldBeFrozen += totalFrozen
        acts.forEach(act => {
          const now = new Date()
          const expires = new Date(act.expires_at)
          const expired = now > expires
          const timeInfo = expired ? 'EXPIRÉ' : `${Math.round((expires - now) / 60000)}min`
          
          console.log(`     - ${act.id.substring(0,8)}... | ${act.service_code} | ${act.price}Ⓐ | ${act.frozen_amount}Ⓐ frozen | ${timeInfo}`)
          activeActivations.push(act)
        })
      }
    })
    
    console.log(`\n📊 CALCUL FROZEN ATTENDU: ${totalShouldBeFrozen}Ⓐ`)
    console.log(`📊 FROZEN RÉEL: ${user.frozen_balance}Ⓐ`)
    console.log(`📊 DIFFÉRENCE: ${user.frozen_balance - totalShouldBeFrozen}Ⓐ`)
    
    if (user.frozen_balance !== totalShouldBeFrozen) {
      console.log(`🚨 INCOHÉRENCE DÉTECTÉE!`)
    }
  }

  // 3. Balance operations récentes
  console.log(`\n3️⃣ BALANCE OPERATIONS RÉCENTES...`)
  
  const { data: recentOps } = await sb
    .from('balance_operations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(15)

  if (recentOps && recentOps.length > 0) {
    console.log(`\n💰 DERNIÈRES OPERATIONS:`)
    
    let runningFrozen = user.frozen_balance
    
    recentOps.reverse().forEach((op, i) => {
      const opTime = new Date(op.created_at).toLocaleTimeString()
      const activationId = op.activation_id?.substring(0, 8) || 'N/A'
      
      console.log(`\n   ${i+1}. ${op.operation_type.toUpperCase()}: ${op.amount}Ⓐ (${opTime})`)
      console.log(`      Activation: ${activationId}...`)
      console.log(`      Balance: ${op.balance_before} → ${op.balance_after}Ⓐ`)
      console.log(`      Frozen: ${op.frozen_before} → ${op.frozen_after}Ⓐ`)
      
      // Vérifier la cohérence
      if (op.operation_type === 'freeze') {
        const expectedAfter = (op.frozen_before || 0) + op.amount
        if (op.frozen_after !== expectedAfter) {
          console.log(`      ⚠️ INCOHÉRENCE FREEZE: attendu ${expectedAfter}, obtenu ${op.frozen_after}`)
        }
      } else if (op.operation_type === 'refund') {
        const expectedAfter = Math.max(0, (op.frozen_before || 0) - op.amount)
        if (op.frozen_after !== expectedAfter) {
          console.log(`      ⚠️ INCOHÉRENCE REFUND: attendu ${expectedAfter}, obtenu ${op.frozen_after}`)
        }
      }
    })
  }

  // 4. Vérifier les activations "fantômes"
  console.log(`\n4️⃣ DÉTECTION ACTIVATIONS FANTÔMES...`)
  
  // Activations timeout sans refund
  const { data: phantomTimeouts } = await sb
    .from('activations')
    .select('id, service_code, price, frozen_amount, status, updated_at')
    .eq('user_id', userId)
    .eq('status', 'timeout')
    .eq('frozen_amount', 0) // Marqué timeout mais frozen_amount=0
    .order('updated_at', { ascending: false })
    .limit(10)

  if (phantomTimeouts && phantomTimeouts.length > 0) {
    console.log(`\n👻 TIMEOUTS FANTÔMES DÉTECTÉS: ${phantomTimeouts.length}`)
    
    for (const phantom of phantomTimeouts) {
      const { data: phantomOps } = await sb
        .from('balance_operations')
        .select('operation_type, amount')
        .eq('activation_id', phantom.id)

      const hasRefund = phantomOps?.some(op => op.operation_type === 'refund')
      const timeoutAge = Math.round((new Date() - new Date(phantom.updated_at)) / 60000)
      
      console.log(`   ${phantom.id.substring(0,8)}... | ${phantom.service_code} | ${phantom.price}Ⓐ | ${timeoutAge}min ago`)
      console.log(`     Ops: ${phantomOps?.map(o => o.operation_type).join(', ') || 'aucune'}`)
      console.log(`     Refund: ${hasRefund ? '✅' : '❌ MANQUANT'}`)
      
      if (!hasRefund) {
        console.log(`     🚨 Fonds possiblement encore gelés par ce fantôme!`)
      }
    }
  }

  // 5. Calculer le frozen balance correct
  console.log(`\n5️⃣ CALCUL FROZEN BALANCE CORRECT...`)
  
  const { data: activeOnly } = await sb
    .from('activations')
    .select('id, frozen_amount')
    .eq('user_id', userId)
    .in('status', ['pending', 'waiting'])
    .gt('frozen_amount', 0)

  const correctFrozen = activeOnly?.reduce((sum, act) => sum + act.frozen_amount, 0) || 0
  
  console.log(`\n🎯 RÉSUMÉ:`)
  console.log(`   Frozen actuel: ${user.frozen_balance}Ⓐ`)
  console.log(`   Frozen correct: ${correctFrozen}Ⓐ`)
  console.log(`   Écart: ${user.frozen_balance - correctFrozen}Ⓐ`)
  
  if (user.frozen_balance !== correctFrozen) {
    console.log(`\n🔧 CORRECTION NÉCESSAIRE:`)
    console.log(`   Action: Mettre frozen_balance à ${correctFrozen}Ⓐ`)
    console.log(`   Différence: ${user.frozen_balance - correctFrozen}Ⓐ à corriger`)
  } else {
    console.log(`\n✅ Frozen balance correct!`)
  }

} catch (error) {
  console.error('❌ ERREUR AUDIT:', error.message)
}