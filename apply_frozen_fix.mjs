#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env
dotenv.config({ path: join(__dirname, '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('🔧 Applying frozen_balance fix...')

const sql = `
-- Add frozen_balance column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS frozen_balance DECIMAL(10,2) DEFAULT 0 NOT NULL;

-- Initialize for existing users
UPDATE users 
SET frozen_balance = 0 
WHERE frozen_balance IS NULL;

-- Add constraint
ALTER TABLE users
DROP CONSTRAINT IF EXISTS check_frozen_balance_non_negative;

ALTER TABLE users
ADD CONSTRAINT check_frozen_balance_non_negative 
CHECK (frozen_balance >= 0);
`

try {
  // Execute via RPC if available, or use direct SQL
  const { data, error } = await supabase.rpc('exec_sql', { query: sql })
  
  if (error) {
    console.error('❌ Error:', error.message)
    console.log('\n📋 Please execute this SQL manually in Supabase Dashboard > SQL Editor:')
    console.log('='.repeat(80))
    console.log(sql)
    console.log('='.repeat(80))
    process.exit(1)
  }
  
  console.log('✅ frozen_balance column added successfully!')
  console.log(data)
} catch (err) {
  console.error('❌ Error:', err.message)
  console.log('\n📋 Please execute this SQL manually in Supabase Dashboard > SQL Editor:')
  console.log('='.repeat(80))
  console.log(sql)
  console.log('='.repeat(80))
  process.exit(1)
}
