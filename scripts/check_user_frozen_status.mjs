
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const EMAIL = 'testbuba@onesms.com'

async function checkUserFrozen() {
    console.log(`🔍 Checking frozen status for: ${EMAIL}`)

    // 1. Get User
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, balance, frozen_balance')
        .eq('email', EMAIL)
        .single()

    if (userError || !user) {
        console.error('❌ User not found or error:', userError)
        return
    }

    console.log('👤 User Profile:')
    console.log(`   ID: ${user.id}`)
    console.log(`   Balance: ${user.balance} XOF`)
    console.log(`   Frozen Balance: ${user.frozen_balance} XOF`)

    // 2. Get Active Activations (Potential causes of freeze)
    const { data: activations, error: actError } = await supabase
        .from('activations')
        .select('id, phone, service, price, status, provider, created_at, expires_at, frozen_amount')
        .eq('user_id', user.id)
        .in('status', ['pending', 'received', 'active', 'waiting'])
        .order('created_at', { ascending: false })

    console.log('\n📲 Active Activations (Should match frozen balance):')
    let calculatedFrozen = 0
    if (activations && activations.length > 0) {
        activations.forEach(act => {
            console.log(`   - [${act.status.toUpperCase()}] ${act.service} (${act.provider}) - Price: ${act.price}, Frozen: ${act.frozen_amount}`)
            console.log(`     Phone: ${act.phone}, Created: ${act.created_at}`)
            calculatedFrozen += (act.frozen_amount || 0)
        })
    } else {
        console.log('   No active activations found.')
    }

    console.log(`\n🧮 Calculated Expected Frozen: ${calculatedFrozen} XOF`)

    if (calculatedFrozen !== user.frozen_balance) {
        console.log('⚠️ MISMATCH DETECTED: Database frozen_balance does not match sum of active activations.')
        console.log(`   Difference: ${user.frozen_balance - calculatedFrozen} XOF (Phantom frozen funds)`)
    } else {
        console.log('✅ Frozen balance is perfectly reconciled.')
    }

    // 3. Check Pending Transactions
    const { data: transactions, error: txnError } = await supabase
        .from('transactions')
        .select('id, amount, type, status, created_at, related_activation_id')
        .eq('user_id', user.id)
        .eq('status', 'pending')

    console.log('\n💸 Pending Transactions:')
    if (transactions && transactions.length > 0) {
        transactions.forEach(txn => {
            console.log(`   - [${txn.type}] ${txn.amount} - Activation: ${txn.related_activation_id}`)
        })
    } else {
        console.log('   No pending transactions.')
    }
}

checkUserFrozen()
