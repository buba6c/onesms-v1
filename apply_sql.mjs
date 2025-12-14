import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'

const supabase = createClient(supabaseUrl, serviceRoleKey)

const sql = readFileSync('apply_referral_fix.sql', 'utf8')

console.log('🔄 Executing SQL migration...')

// Split into statements
const statements = sql.split(';').filter(s => s.trim())

for (const statement of statements) {
  if (!statement.trim()) continue
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query: statement.trim() })
    
    if (error) {
      console.error('❌ Error:', error)
      // Try direct SQL execution as fallback
      console.log('Trying alternative method...')
      
      // For DROP/CREATE FUNCTION, we can execute via REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: statement.trim() })
      })
      
      console.log('Response:', await response.text())
    } else {
      console.log('✅ Statement executed successfully')
    }
  } catch (err) {
    console.error('❌ Exception:', err.message)
  }
}

console.log('\n📝 Manual execution needed. Please run in Supabase SQL Editor:')
console.log('https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql/new')
console.log('\nSQL to execute:')
console.log(sql)
