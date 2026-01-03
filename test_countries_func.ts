
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function testGetTopCountries() {
    console.log('🧪 Testing get-top-countries-by-service...')

    const { data, error } = await supabase.functions.invoke('get-top-countries-by-service', {
        body: { service: 'wa' } // WhatsApp
    })

    if (error) {
        console.error('❌ Function Error:', error)
    } else {
        console.log('✅ Function Success:')
        if (data.countries && data.countries.length > 0) {
            console.log(`Received ${data.countries.length} countries. First few:`)
            console.log(data.countries.slice(0, 3))
        } else {
            console.warn('⚠️ No countries returned:', data)
        }
    }
}

testGetTopCountries()
