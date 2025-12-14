/* eslint-env node */
import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

// Simple remediation script: commit all activations that are received but not charged OR still frozen.
// Uses secure_unfreeze_balance (guard-safe) to debit balance and clear frozen_amount.
// Idempotent: secure_unfreeze_balance returns success even if already unfrozen.

const { Client } = pg
const DB = {
  host: process.env.PGHOST || 'aws-1-eu-central-2.pooler.supabase.com',
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'postgres',
  user: process.env.PGUSER || 'postgres.htfqmamvmhdoixqcbbbw',
  password: process.env.PGPASSWORD || 'Workeverytime@4##',
  ssl: { rejectUnauthorized: false },
}

async function main() {
  const client = new Client(DB)
  await client.connect()

  // Find candidates: received AND (charged=false OR frozen_amount>0)
  const { rows: acts } = await client.query(`
    SELECT id, user_id, order_id, frozen_amount, charged, status, sms_code, sms_text
    FROM activations
    WHERE status = 'received'
      AND (charged = false OR frozen_amount > 0)
    ORDER BY created_at ASC
    LIMIT 200;
  `)

  console.log(`Found ${acts.length} activations to reconcile`)

  for (const act of acts) {
    console.log(`\n🔧 Commit ${act.id} (order ${act.order_id}) frozen=${act.frozen_amount} charged=${act.charged}`)
    try {
      const res = await client.query(
        'SELECT * FROM secure_unfreeze_balance($1,$2,NULL,false,$3)',
        [act.user_id, act.id, 'Auto-reconcile received not charged']
      )
      console.log('secure_unfreeze_balance =>', res.rows[0])

      const after = await client.query(
        'SELECT frozen_amount, charged, status FROM activations WHERE id=$1',
        [act.id]
      )
      console.log('After activation =>', after.rows[0])
    } catch (err) {
      console.error('❌ Error committing', act.id, err.message)
    }
  }

  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
