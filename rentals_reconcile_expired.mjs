/* eslint-env node */
import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

// Reconcile rentals: expired/finished/cancelled with frozen_amount > 0
// Uses secure_unfreeze_balance to refund (cancel/expired) or commit (finished/completed)
// Idempotent: secure_unfreeze_balance no-ops if frozen=0.

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

  const { rows } = await client.query(`
    SELECT id, user_id, status, frozen_amount
    FROM rentals
    WHERE frozen_amount > 0
      AND status IN ('expired','cancelled','finished','completed')
    ORDER BY created_at ASC
    LIMIT 200;
  `)

  console.log(`Found ${rows.length} rentals with frozen>0 in terminal states`)

  for (const r of rows) {
    const refund = r.status === 'expired' || r.status === 'cancelled'
    const reason = refund ? `Auto refund rental (${r.status})` : `Auto commit rental (${r.status})`
    console.log(`\n🔧 Rental ${r.id} status=${r.status} frozen=${r.frozen_amount} -> ${refund ? 'refund' : 'commit'}`)
    try {
      const res = await client.query(
        'SELECT * FROM secure_unfreeze_balance($1, NULL, $2, $3, $4)',
        [r.user_id, r.id, refund, reason]
      )
      console.log('secure_unfreeze_balance =>', res.rows[0])
    } catch (e) {
      console.error('❌ Error on rental', r.id, e.message)
    }
  }

  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
