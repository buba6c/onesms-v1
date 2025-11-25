import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL')
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY')

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Checking rentals table schema...\n')

// Query to get table structure
const { data, error } = await supabase
  .from('rentals')
  .select('*')
  .limit(1)

if (error) {
  console.log('❌ Error querying rentals:', error.message)
  console.log('\n📋 Trying to get schema from information_schema...')
  
  const { data: columns, error: schemaError } = await supabase
    .rpc('exec_sql', {
      sql: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'rentals' ORDER BY ordinal_position`
    })
  
  if (schemaError) {
    console.log('❌ Schema query failed:', schemaError.message)
  } else {
    console.log('✅ Columns:', columns)
  }
} else {
  console.log('✅ Sample row:', data)
  if (data && data.length > 0) {
    console.log('\n📋 Columns in rentals table:')
    Object.keys(data[0]).forEach(col => {
      console.log(`   - ${col}`)
    })
  } else {
    console.log('\n⚠️  No rows in rentals table')
  }
}
