// Test TextVerified API Authentication
// Run: node test_textverified_auth.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function testTextVerifiedAuth() {
    console.log('🔍 Testing TextVerified Authentication...\n')

    // 1. Fetch credentials from DB
    console.log('📦 Step 1: Fetching credentials from database...')
    const { data: keyData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'textverified_api_key')
        .single()

    const { data: userData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'textverified_api_username')
        .single()

    const tvKey = keyData?.value
    const tvUser = userData?.value

    console.log(`✅ API Key: ${tvKey ? tvKey.substring(0, 10) + '...' : '❌ EMPTY'}`)
    console.log(`✅ Username: ${tvUser || '❌ EMPTY'}\n`)

    if (!tvKey || !tvUser) {
        console.error('❌ Credentials missing!')
        return
    }

    // 2. Test Authentication
    console.log('🔐 Step 2: Testing authentication...')
    try {
        const authRes = await fetch('https://www.textverified.com/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: tvKey, api_username: tvUser })
        })

        console.log(`📡 Auth Response Status: ${authRes.status} ${authRes.statusText}`)

        if (!authRes.ok) {
            const errorText = await authRes.text()
            console.error(`❌ Auth Failed!`)
            console.error(`Response: ${errorText}`)
            return
        }

        const authData = await authRes.json()
        console.log('✅ Auth successful!')
        console.log(`Token: ${authData.bearer_token ? authData.bearer_token.substring(0, 20) + '...' : '❌ NO TOKEN'}\n`)

        if (!authData.bearer_token) {
            console.error('❌ No bearer token in response!')
            console.log('Full response:', JSON.stringify(authData, null, 2))
            return
        }

        // 3. Test User Info
        console.log('👤 Step 3: Fetching user info...')
        const userRes = await fetch('https://www.textverified.com/api/pub/v2/user', {
            headers: { 'Authorization': `Bearer ${authData.bearer_token}` }
        })

        console.log(`📡 User Info Status: ${userRes.status} ${userRes.statusText}`)

        if (!userRes.ok) {
            const errorText = await userRes.text()
            console.error(`❌ User info failed!`)
            console.error(`Response: ${errorText}`)
            return
        }

        const userInfo = await userRes.json()
        console.log('✅ User info retrieved!')
        console.log('User Data:', JSON.stringify(userInfo, null, 2))
        console.log(`\n💰 Balance: ${userInfo.credit_balance || 'N/A'} USD`)

    } catch (error) {
        console.error('❌ Error:', error.message)
    }
}

testTextVerifiedAuth()
