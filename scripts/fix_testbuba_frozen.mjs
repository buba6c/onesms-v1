
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

async function fixUserFrozen() {
    console.log(`🔧 Fixing frozen status for: ${EMAIL}`)

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

    // 2. Calculate correct frozen amount
    const { data: activeActs, error: actError } = await supabase
        .from('activations')
        .select('id, status, frozen_amount')
        .eq('user_id', user.id)
        .in('status', ['pending', 'received', 'active', 'waiting'])

    if (actError) {
        console.error('❌ Error checking activations:', actError)
        return
    }

    let correctFrozen = 0
    const activeIds = []
    activeActs.forEach(act => {
        correctFrozen += (act.frozen_amount || 0)
        activeIds.push(act.id)
    })

    console.log(`✅ Found ${activeActs.length} active activations. Active IDs:`, activeIds)
    console.log(`🧮 Correct Frozen Balance should be: ${correctFrozen} XOF`)
    console.log(`📉 Current Frozen Balance: ${user.frozen_balance} XOF`)

    if (activeIds.length > 0 && correctFrozen === 0) {
        console.warn('⚠️ Warning: Active activations have 0 frozen amount? Check logic.')
    }

    // 3. Update Frozen Balance
    if (user.frozen_balance !== correctFrozen) {
        const { error: updateError } = await supabase
            .from('users')
            .update({ frozen_balance: correctFrozen })
            .eq('id', user.id)

        if (updateError) {
            console.error('❌ Failed to update frozen_balance:', updateError)
            return
        }
        console.log(`✅ Fixed! Frozen balance updated to ${correctFrozen}.`)
    } else {
        console.log('✅ Frozen balance is already correct.')
    }

    // 4. Mark STALE pending transactions as failed
    // We want to fail any 'pending' transaction that is NOT linked to our active activations
    const { data: pendingTxns, error: txnError } = await supabase
        .from('transactions')
        .select('id, related_activation_id')
        .eq('user_id', user.id)
        .eq('status', 'pending')

    if (txnError) {
        console.error('❌ Failed to fetch pending transactions:', txnError)
        return
    }

    const txnsToFail = pendingTxns.filter(txn => {
        // If no related activation, it's definitely stale (since we corrected balance)
        if (!txn.related_activation_id) return true
        // If related to an activation that is NOT in our active list, it's stale
        return !activeIds.includes(txn.related_activation_id)
    })

    if (txnsToFail.length > 0) {
        const idsToFail = txnsToFail.map(t => t.id)
        const { error: failError } = await supabase
            .from('transactions')
            .update({ status: 'failed', description: 'Auto-cleanup: Stale pending transaction' })
            .in('id', idsToFail)

        if (failError) {
            console.error('❌ Failed to fail transactions:', failError)
        } else {
            console.log(`✅ Cleaned up ${idsToFail.length} stale pending transactions.`)
        }
    } else {
        console.log('✅ No stale pending transactions found.')
    }
}

fixUserFrozen()
