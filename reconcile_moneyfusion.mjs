// Reconciliation des transactions MoneyFusion
// Usage: node reconcile_moneyfusion.mjs [--apply]
// Par défaut: dry-run (aucun crédit). Avec --apply : crédite via admin_add_credit.

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

/* eslint-env node */
const APPLY = process.argv.includes('--apply')

dotenv.config()

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('❌ Env manquant: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY_LOCAL')
  process.exit(1)
}

const sb = createClient(url, key)

const STATUS_URL = 'https://www.pay.moneyfusion.net/paiementNotif'

async function fetchStatus(token) {
  if (!token) return { statut: 'unknown' }
  const res = await fetch(`${STATUS_URL}/${token}`)
  if (!res.ok) {
    throw new Error(`status ${res.status}`)
  }
  const data = await res.json()
  return data?.data || data
}

async function hasCreditOp(txId) {
  const { data, error } = await sb
    .from('balance_operations')
    .select('id')
    .eq('related_transaction_id', txId)
    .eq('operation_type', 'credit_admin')
    .limit(1)
  if (error) {
    console.error('⚠️ balance_operations error', error.message)
    return true // ne pas tenter de créditer en cas d'erreur
  }
  return (data || []).length > 0
}

async function main() {
  console.log(`🔍 Reconciliation MoneyFusion (dry-run=${!APPLY})`)

  const { data: txs, error } = await sb
    .from('transactions')
    .select('*')
    .eq('type', 'deposit')
    .eq('metadata->>payment_provider', 'moneyfusion')
    .in('status', ['pending', 'pending_credit_error', 'completed'])
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('❌ Query error', error.message)
    process.exit(1)
  }

  for (const tx of txs || []) {
    const activations = Number(tx.metadata?.activations || 0)
    const amount = Number(tx.amount || 0)
    const creditAmount = activations > 0 ? activations : amount

    const alreadyCredited = await hasCreditOp(tx.id)
    const needsCredit = creditAmount > 0 && !alreadyCredited

    const token = tx.metadata?.moneyfusion_token
    console.log(`\nTX ${tx.id} | status=${tx.status} | ref=${tx.reference} | token=${token || 'N/A'} | credit=${creditAmount} | credited=${alreadyCredited}`)

    let remoteStatus = 'unknown'
    try {
      const status = await fetchStatus(token)
      remoteStatus = status?.statut || 'unknown'
      console.log(`  → Remote status: ${remoteStatus}`)
    } catch (e) {
      console.log(`  → Remote status check failed: ${e.message}`)
    }

    if (!needsCredit) {
      console.log('  → Skip (déjà crédité ou montant=0)')
      continue
    }

    if (remoteStatus !== 'paid') {
      console.log('  → Non payé côté MoneyFusion (skip)')
      continue
    }

    if (!APPLY) {
      console.log('  → Dry-run: crédit serait appliqué via admin_add_credit')
      continue
    }

    // Call secure_moneyfusion_credit via REST with service role bearer (SECURITY DEFINER)
    const restRes = await fetch(`${url}/rest/v1/rpc/secure_moneyfusion_credit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        p_transaction_id: tx.id,
        p_token: token,
        p_reference: tx.reference || token || 'moneyfusion'
      })
    })

    if (!restRes.ok) {
      const txt = await restRes.text()
      console.error('  ❌ Credit failed', restRes.status, txt)
      await sb
        .from('transactions')
        .update({ status: 'pending_credit_error', metadata: { ...tx.metadata, reconciliation_error: txt } })
        .eq('id', tx.id)
      continue
    }
    await restRes.json().catch(() => null)

    const { data: userAfter } = await sb
      .from('users')
      .select('balance')
      .eq('id', tx.user_id)
      .single()

    await sb
      .from('transactions')
      .update({
        status: 'completed',
        balance_before: tx.balance_before ?? null,
        balance_after: userAfter?.balance ?? tx.balance_after,
        metadata: { ...tx.metadata, reconciliation_applied: true, reconciliation_at: new Date().toISOString() }
      })
      .eq('id', tx.id)

    console.log('  ✅ Crédit appliqué et transaction complétée')
  }

  console.log('\n✅ Reconciliation terminée')
}

main().catch((e) => {
  console.error('❌ Fatal', e)
  process.exit(1)
})
