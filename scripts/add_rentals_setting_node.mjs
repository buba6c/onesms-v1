
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

async function addSetting() {
    console.log('🔧 Adding rentals_enabled setting...')

    // Check if exists
    const { data: existing } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'rentals_enabled')
        .single()

    if (existing) {
        console.log('✅ Setting already exists:', existing)
        return
    }

    const { data, error } = await supabase
        .from('system_settings')
        .insert([{
            key: 'rentals_enabled',
            value: 'true',
            category: 'features',
            description: 'Enable or disable the Rentals (Location) feature globally'
        }])
        .select()

    if (error) {
        console.error('❌ Failed to insert setting:', error)
    } else {
        console.log('✅ Successfully added setting:', data)
    }
}

addSetting()
