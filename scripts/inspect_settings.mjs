
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

async function checkSettings() {
    console.log('🔍 Checking system_settings structure...')

    // Try to select everything to see keys
    const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .limit(1)

    if (error) {
        console.error('❌ Error selecting *:', error)
    } else if (data && data.length > 0) {
        console.log('✅ Found row:', Object.keys(data[0]))
        console.log('📄 Data:', data[0])
    } else {
        console.log('⚠️ Table exists but is empty.')
    }
}

checkSettings()
