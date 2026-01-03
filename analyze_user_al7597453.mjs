import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function analyzeUser() {
    const email = 'al7597453@gmail.com'

    console.log(`\n🔍 Analyzing user: ${email}\n`)

    // 1. Get user info
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

    if (userError) {
        console.error('❌ User not found:', userError.message)
        return
    }

    console.log('👤 USER INFO:')
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Full Name: ${user.full_name || 'N/A'}`)
    console.log(`   Balance: ${user.balance} Ⓐ`)
    console.log(`   Frozen: ${user.frozen_balance || 0} Ⓐ`)
    console.log(`   Available: ${user.balance - (user.frozen_balance || 0)} Ⓐ`)
    console.log(`   Created: ${user.created_at}`)
    console.log(`   Role: ${user.role}`)

    // 2. Get transactions
    const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (txError) {
        console.error('❌ Transactions error:', txError.message)
    } else {
        console.log(`\n💰 TRANSACTIONS (${transactions.length} total):`)

        // Group by type
        const deposits = transactions.filter(t => t.type === 'deposit')
        const purchases = transactions.filter(t => t.type === 'purchase')
        const refunds = transactions.filter(t => t.type === 'refund')
        const referrals = transactions.filter(t => t.type === 'referral_bonus')

        console.log(`   📥 Deposits: ${deposits.length} (Total: ${deposits.reduce((sum, t) => sum + t.amount, 0)} Ⓐ)`)
        console.log(`   🛒 Purchases: ${purchases.length} (Total: ${Math.abs(purchases.reduce((sum, t) => sum + t.amount, 0))} Ⓐ)`)
        console.log(`   ↩️  Refunds: ${refunds.length} (Total: ${refunds.reduce((sum, t) => sum + t.amount, 0)} Ⓐ)`)
        console.log(`   🎁 Referral Bonus: ${referrals.length} (Total: ${referrals.reduce((sum, t) => sum + t.amount, 0)} Ⓐ)`)

        // Show last 10 transactions
        console.log(`\n   📋 Last 10 transactions:`)
        transactions.slice(0, 10).forEach((tx, i) => {
            const sign = tx.amount >= 0 ? '+' : ''
            console.log(`   ${i + 1}. [${tx.type.padEnd(15)}] ${sign}${tx.amount} Ⓐ | ${new Date(tx.created_at).toLocaleString()} | Status: ${tx.status || 'N/A'}`)
        })
    }

    // 3. Get activations
    const { data: activations, error: actError } = await supabase
        .from('activations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (actError) {
        console.error('❌ Activations error:', actError.message)
    } else {
        console.log(`\n📱 ACTIVATIONS (${activations.length} total):`)

        // Group by status
        const pending = activations.filter(a => a.status === 'pending')
        const waiting = activations.filter(a => a.status === 'waiting')
        const received = activations.filter(a => a.status === 'received')
        const cancelled = activations.filter(a => a.status === 'cancelled')
        const timeout = activations.filter(a => a.status === 'timeout')

        console.log(`   ⏳ Pending: ${pending.length}`)
        console.log(`   ⏱️  Waiting: ${waiting.length}`)
        console.log(`   ✅ Received: ${received.length}`)
        console.log(`   ❌ Cancelled: ${cancelled.length}`)
        console.log(`   ⏰ Timeout: ${timeout.length}`)

        // Check frozen amounts
        const totalFrozen = activations.reduce((sum, a) => sum + (a.frozen_amount || 0), 0)
        console.log(`\n   💎 Total Frozen in Activations: ${totalFrozen} Ⓐ`)

        // Show activations with frozen amounts
        const frozenActivations = activations.filter(a => (a.frozen_amount || 0) > 0)
        if (frozenActivations.length > 0) {
            console.log(`\n   🔒 Activations with frozen funds (${frozenActivations.length}):`)
            frozenActivations.forEach((act, i) => {
                console.log(`   ${i + 1}. ID: ${act.id.substring(0, 8)}... | Status: ${act.status} | Frozen: ${act.frozen_amount} Ⓐ | Service: ${act.service_code}`)
            })
        }

        // Show last 5 activations
        console.log(`\n   📋 Last 5 activations:`)
        activations.slice(0, 5).forEach((act, i) => {
            console.log(`   ${i + 1}. [${act.status.padEnd(10)}] ${act.service_code} | ${act.phone || 'N/A'} | ${new Date(act.created_at).toLocaleString()}`)
        })
    }

    // 4. Get rentals
    const { data: rentals, error: rentError } = await supabase
        .from('rentals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (rentError) {
        console.error('❌ Rentals error:', rentError.message)
    } else if (rentals.length > 0) {
        console.log(`\n🏠 RENTALS (${rentals.length} total):`)

        const active = rentals.filter(r => r.status === 'active')
        const completed = rentals.filter(r => r.status === 'completed')
        const cancelled_r = rentals.filter(r => r.status === 'cancelled')

        console.log(`   🟢 Active: ${active.length}`)
        console.log(`   ✅ Completed: ${completed.length}`)
        console.log(`   ❌ Cancelled: ${cancelled_r.length}`)

        const totalFrozenRentals = rentals.reduce((sum, r) => sum + (r.frozen_amount || 0), 0)
        console.log(`\n   💎 Total Frozen in Rentals: ${totalFrozenRentals} Ⓐ`)

        // Show rentals with frozen amounts
        const frozenRentals = rentals.filter(r => (r.frozen_amount || 0) > 0)
        if (frozenRentals.length > 0) {
            console.log(`\n   🔒 Rentals with frozen funds (${frozenRentals.length}):`)
            frozenRentals.forEach((rent, i) => {
                console.log(`   ${i + 1}. ID: ${rent.id.substring(0, 8)}... | Status: ${rent.status} | Frozen: ${rent.frozen_amount} Ⓐ | Phone: ${rent.phone}`)
            })
        }
    }

    // 5. Financial summary
    console.log(`\n\n📊 FINANCIAL SUMMARY:`)
    console.log(`   Total Balance: ${user.balance} Ⓐ`)
    console.log(`   Frozen Balance: ${user.frozen_balance || 0} Ⓐ`)
    console.log(`   Available: ${user.balance - (user.frozen_balance || 0)} Ⓐ`)

    if (transactions) {
        const totalDeposits = transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0)
        const totalPurchases = Math.abs(transactions.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0))
        const totalRefunds = transactions.filter(t => t.type === 'refund').reduce((sum, t) => sum + t.amount, 0)

        console.log(`\n   💳 Total Deposits: ${totalDeposits} Ⓐ`)
        console.log(`   🛒 Total Purchases: ${totalPurchases} Ⓐ`)
        console.log(`   ↩️  Total Refunds: ${totalRefunds} Ⓐ`)
        console.log(`   📈 Net: ${totalDeposits - totalPurchases + totalRefunds} Ⓐ`)
    }
}

analyzeUser().catch(console.error)
