import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const rentalId = '5fee6b1e-bba2-4235-9661-c7cbd402fed7'

console.log('🔍 Diagnostic rental:', rentalId)

// 1. Chercher le rental dans la DB
const { data: rental, error: rentalError } = await supabase
  .from('rentals')
  .select('*')
  .eq('id', rentalId)
  .single()

if (rentalError) {
  console.error('❌ Rental not found:', rentalError.message)
  
  // Essayer par rent_id ou rental_id
  const { data: rentals, error: searchError } = await supabase
    .from('rentals')
    .select('*')
    .or(`rent_id.eq.${rentalId},rental_id.eq.${rentalId}`)
  
  if (searchError) {
    console.error('❌ Search error:', searchError.message)
  } else {
    console.log('📋 Found rentals by rent_id/rental_id:', rentals)
  }
  process.exit(1)
}

console.log('✅ Rental trouvé:', {
  id: rental.id,
  user_id: rental.user_id,
  rent_id: rental.rent_id,
  rental_id: rental.rental_id,
  phone: rental.phone,
  status: rental.status,
  frozen_amount: rental.frozen_amount,
  total_cost: rental.total_cost,
  created_at: rental.created_at,
  end_date: rental.end_date
})

// 2. Vérifier les logs rental
const { data: logs, error: logsError } = await supabase
  .from('rental_logs')
  .select('*')
  .eq('rental_id', rental.rental_id)
  .order('created_at', { ascending: false })
  .limit(10)

if (logsError) {
  console.warn('⚠️ Could not fetch logs:', logsError.message)
} else {
  console.log(`\n📋 Derniers logs (${logs.length}):`)
  logs.forEach(log => {
    console.log(`  - ${log.created_at} | ${log.action} | ${log.status} | ${log.response_text}`)
  })
}

// 3. Vérifier la transaction associée
const { data: transaction, error: txError } = await supabase
  .from('transactions')
  .select('*')
  .eq('related_rental_id', rental.id)
  .maybeSingle()

if (txError) {
  console.warn('⚠️ Could not fetch transaction:', txError.message)
} else if (transaction) {
  console.log('\n💳 Transaction associée:', {
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    status: transaction.status,
    created_at: transaction.created_at
  })
} else {
  console.log('\n⚠️ Aucune transaction trouvée')
}

// 4. Vérifier frozen_amount vs balance
const { data: user, error: userError } = await supabase
  .from('users')
  .select('balance, frozen_balance')
  .eq('id', rental.user_id)
  .single()

if (userError) {
  console.warn('⚠️ Could not fetch user:', userError.message)
} else {
  console.log('\n👤 User balance:', {
    balance: user.balance,
    frozen_balance: user.frozen_balance,
    rental_frozen: rental.frozen_amount
  })
}

// 5. Tester l'appel set-rent-status
console.log('\n🧪 Test appel set-rent-status...')
console.log('Params:', {
  rentId: rental.rent_id || rental.rental_id,
  action: 'finish',
  userId: rental.user_id
})

const { data: result, error: invokeError } = await supabase.functions.invoke('set-rent-status', {
  body: {
    rentId: rental.rent_id || rental.rental_id,
    action: 'finish',
    userId: rental.user_id
  }
})

if (invokeError) {
  console.error('❌ Invoke error:', invokeError)
} else {
  console.log('✅ Result:', result)
}
