/**
 * Force completion et crédit pour transactions MoneyFusion restées en pending.
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
if (!url || !key) throw new Error('Missing SUPABASE env')

const supabase = createClient(url, key)

const txIds = [
  '91c5b536-29d3-42e1-b1b7-ef928f2416b2',
  '442d6576-9a80-479f-bbb6-bc35d6670709'
]

async function completeTx(id) {
  console.log('\n' + '═'.repeat(70))
  console.log('🔧 Force completion TX', id)

  const { data: tx, error: txError } = await supabase.from('transactions').select('*').eq('id', id).single()
  if (txError || !tx) {
    console.error('❌ TX introuvable', txError)
    return
  }

  const credits = tx.metadata?.activations || tx.amount || 0
  if (!credits) {
    console.error('❌ Aucun crédit à appliquer (activations/amount manquant)')
    return
  }

  const { data: user } = await supabase.from('users').select('balance, email').eq('id', tx.user_id).single()
  const before = user?.balance ?? 0

  console.log('👤', user?.email, 'balance avant', before, 'crédits à ajouter', credits)

  // Crédit via admin_add_credit
  const { data: creditRes, error: creditErr } = await supabase.rpc('admin_add_credit', {
    p_user_id: tx.user_id,
    p_amount: credits,
    p_admin_note: `MoneyFusion manual completion ${tx.metadata?.moneyfusion_token || ''}`
  })

  if (creditErr) {
    console.error('❌ admin_add_credit error', creditErr)
    return
  }

  console.log('✅ Crédit appliqué', creditRes)

  // Mettre à jour la transaction originale en completed
  const { error: updErr } = await supabase
    .from('transactions')
    .update({
      status: 'completed',
      balance_before: creditRes.balance_before,
      balance_after: creditRes.balance_after,
      payment_method: null,
      metadata: {
        ...tx.metadata,
        moneyfusion_status: 'paid',
        source: 'manual-complete',
        related_credit_tx_id: creditRes.transaction_id
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (updErr) {
    console.error('❌ Update transaction failed', updErr)
    return
  }

  console.log('✅ Transaction passée en completed')
}

async function main() {
  for (const id of txIds) {
    await completeTx(id)
  }
}

main().catch(console.error)
