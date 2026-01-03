// Simple TextVerified API Test - Direct Fetch
// This will use the credentials you entered in the Admin UI

const SUPABASE_URL = 'https://api.onesms-sn.com'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

console.log('🔍 Testing TextVerified via Edge Function...\n')

async function testViaEdgeFunction() {
    try {
        // Call get-providers-status which already has the logic
        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-providers-status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        })

        console.log(`📡 Response Status: ${response.status} ${response.statusText}`)

        if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ Request failed!')
            console.error('Response:', errorText)
            return
        }

        const data = await response.json()

        if (!data.providers) {
            console.error('❌ No providers in response!')
            console.log('Full response:', JSON.stringify(data, null, 2))
            return
        }

        // Find TextVerified
        const textverified = data.providers.find(p => p.name === 'TextVerified')

        if (!textverified) {
            console.error('❌ TextVerified not found in providers list!')
            console.log('Available providers:', data.providers.map(p => p.name))
            return
        }

        console.log('\n📊 TextVerified Status:')
        console.log('─'.repeat(50))
        console.log(`Status: ${textverified.status}`)
        console.log(`Balance: ${textverified.balance} ${textverified.currency}`)
        console.log(`Last Check: ${textverified.lastCheck}`)

        if (textverified.error) {
            console.log(`\n❌ Error: ${textverified.error}`)
            console.log('\n💡 Common Issues:')
            console.log('  1. Invalid API Key or Username')
            console.log('  2. TextVerified API is down')
            console.log('  3. Account not activated on TextVerified')
            console.log('  4. Incorrect email format for username')
        } else if (textverified.status === 'active') {
            console.log('\n✅ TextVerified is working correctly!')
        } else if (textverified.status === 'inactive') {
            console.log('\n⚠️ Credentials not configured or empty')
        }

        console.log('\n📋 Full TextVerified Data:')
        console.log(JSON.stringify(textverified, null, 2))

    } catch (error) {
        console.error('❌ Fatal Error:', error.message)
        console.error(error.stack)
    }
}

testViaEdgeFunction()
