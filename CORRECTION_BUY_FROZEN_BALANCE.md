/\*\*

- ============================================================================
- CORRECTION CRITIQUE: buy-sms-activate-number avec frozen_balance
- ============================================================================
-
- Ce fichier montre les changements à apporter dans buy-sms-activate-number
- pour implémenter le gel des crédits AVANT l'appel API.
-
- PROBLÈME ACTUEL:
- - Vérifie balance
- - Appelle API SMS-Activate
- - Risque: user peut acheter 10× en même temps → balance négative
-
- SOLUTION:
- 1.  Vérifier balance disponible (balance - frozen_balance)
- 2.  Créer transaction pending
- 3.  GELER les crédits (frozen_balance += price)
- 4.  Appeler SMS-Activate
- 5.  Si succès: créer activation avec transaction_id
- 6.  Si échec: dégeler crédits immédiatement
-
- ============================================================================
  \*/

// ============================================================================
// SECTION À REMPLACER (lignes 170-220 environ)
// ============================================================================

// ❌ CODE ACTUEL (DANGEREUX):
/\*
// 3. Check user balance
const { data: userProfile, error: profileError } = await supabaseClient
.from('users')
.select('balance')
.eq('id', userId)
.single()

if (profileError || !userProfile) {
throw new Error('User profile not found')
}

if (userProfile.balance < price) {
throw new Error(`Insufficient balance. Required: $${price}, Available: $${userProfile.balance}`)
}

// 4. Buy number from SMS-Activate
const response = await fetch(apiUrl)
\*/

// ✅ NOUVEAU CODE (SÉCURISÉ):

// 3. Vérifier balance disponible (en tenant compte du gelé)
const { data: userProfile, error: profileError } = await supabaseClient
.from('users')
.select('balance, frozen_balance')
.eq('id', userId)
.single()

if (profileError || !userProfile) {
throw new Error('User profile not found')
}

const availableBalance = userProfile.balance - (userProfile.frozen_balance || 0)

console.log(`💰 [BUY-SMS-ACTIVATE] Balance check:`, {
balance: userProfile.balance,
frozen: userProfile.frozen_balance || 0,
available: availableBalance,
required: price
})

if (availableBalance < price) {
throw new Error(
`Insufficient available balance. Required: ${price} Ⓐ, Available: ${availableBalance} Ⓐ (${userProfile.frozen_balance || 0} Ⓐ frozen)`
)
}

// 4. Créer transaction pending (avant d'appeler l'API)
console.log('📝 [BUY-SMS-ACTIVATE] Creating pending transaction...')

const { data: transaction, error: transactionError } = await supabaseClient
.from('transactions')
.insert({
user_id: userId,
type: 'purchase',
amount: -price,
balance_before: userProfile.balance,
balance_after: userProfile.balance, // Pas encore débité
status: 'pending',
description: `Activation ${service} ${country}`,
payment_method: 'balance',
created_at: new Date().toISOString()
})
.select()
.single()

if (transactionError || !transaction) {
console.error('❌ [BUY-SMS-ACTIVATE] Failed to create transaction:', transactionError)
throw new Error('Failed to create transaction')
}

console.log(`✅ [BUY-SMS-ACTIVATE] Transaction created:`, transaction.id)

// 5. GELER les crédits AVANT l'appel API (CRITIQUE!)
console.log(`🔒 [BUY-SMS-ACTIVATE] Freezing ${price} Ⓐ...`)

const { error: freezeError } = await supabaseClient
.from('users')
.update({
frozen_balance: (userProfile.frozen_balance || 0) + price
})
.eq('id', userId)

if (freezeError) {
console.error('❌ [BUY-SMS-ACTIVATE] Failed to freeze balance:', freezeError)

// Rollback transaction
await supabaseClient
.from('transactions')
.update({ status: 'failed' })
.eq('id', transaction.id)

throw new Error('Failed to freeze balance')
}

console.log(`✅ [BUY-SMS-ACTIVATE] Frozen balance: ${(userProfile.frozen_balance || 0) + price} Ⓐ`)

// 6. Maintenant on peut appeler SMS-Activate en toute sécurité
let activationId: string | null = null
let phoneNumber: string | null = null

try {
console.log('🌐 [BUY-SMS-ACTIVATE] Calling SMS-Activate API...')

const orderId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

const params = new URLSearchParams({
api_key: SMS_ACTIVATE_API_KEY!,
action: 'getNumberV2',
service: smsActivateService,
country: smsActivateCountry.toString(),
orderId: orderId
})

if (operator && operator !== 'any') {
params.append('operator', operator)
}

const apiUrl = `${SMS_ACTIVATE_BASE_URL}?${params.toString()}`
const response = await fetch(apiUrl, {
signal: AbortSignal.timeout(10000) // Timeout 10s
})

const responseText = await response.text()
console.log('📥 [BUY-SMS-ACTIVATE] API Response:', responseText)

// Parse JSON response from getNumberV2
let data
try {
data = JSON.parse(responseText)
} catch (e) {
// Fallback: text format (ACCESS_NUMBER:id:phone)
if (responseText.startsWith('ACCESS_NUMBER:')) {
const [, id, phone] = responseText.split(':')
data = { activationId: id, phoneNumber: phone }
} else {
throw new Error(`SMS-Activate error: ${responseText}`)
}
}

activationId = data.activationId || data.id
phoneNumber = data.phoneNumber || data.phone

if (!activationId || !phoneNumber) {
throw new Error('Invalid response: missing activationId or phoneNumber')
}

console.log(`✅ [BUY-SMS-ACTIVATE] Success! ID: ${activationId}, Phone: ${phoneNumber}`)

// 7. Créer activation avec lien vers transaction
const expiresAt = new Date(Date.now() + 15 _ 60 _ 1000) // 15 minutes

const { error: activationError } = await supabaseClient
.from('activations')
.insert({
user_id: userId,
order_id: activationId,
phone: phoneNumber,
service_code: service,
country_code: country,
operator: operator || 'any',
price: price,
status: 'pending',
expires_at: expiresAt.toISOString(),
transaction_id: transaction.id, // ← Lien important!
created_at: new Date().toISOString()
})

if (activationError) {
console.error('❌ [BUY-SMS-ACTIVATE] Failed to create activation:', activationError)

    // Tenter d'annuler le numéro chez SMS-Activate
    try {
      await fetch(`${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&id=${activationId}&status=8`)
    } catch (e) {
      console.error('⚠️ Failed to cancel number at provider:', e)
    }

    throw new Error('Failed to create activation record')

}

// Succès! La transaction reste pending, elle sera completed quand le SMS arrivera
console.log('✅ [BUY-SMS-ACTIVATE] Activation created successfully')

return new Response(
JSON.stringify({
success: true,
activationId,
phoneNumber,
price,
expiresAt: expiresAt.toISOString(),
status: 'pending'
}),
{
status: 200,
headers: { ...corsHeaders, 'Content-Type': 'application/json' }
}
)

} catch (error: any) {
console.error('❌ [BUY-SMS-ACTIVATE] Error during purchase:', error.message)

// 8. ROLLBACK: Dégeler les crédits immédiatement
console.log('🔓 [BUY-SMS-ACTIVATE] Rolling back frozen balance...')

await supabaseClient
.from('users')
.update({
frozen_balance: Math.max(0, (userProfile.frozen_balance || 0))
// On remet la valeur d'avant (le +price sera annulé)
})
.eq('id', userId)

// Marquer transaction comme failed
await supabaseClient
.from('transactions')
.update({
status: 'failed',
metadata: { error: error.message }
})
.eq('id', transaction.id)

console.log('✅ [BUY-SMS-ACTIVATE] Rollback completed')

// Re-throw l'erreur pour que le frontend la reçoive
throw error
}

// ============================================================================
// NOTES IMPORTANTES:
// ============================================================================
/\*

1. frozen_balance doit exister en BDD (migration 20251128_add_frozen_balance_and_logs.sql)

2. Le cron-check-pending-sms va:

   - Si SMS reçu: transaction.status = 'completed', débit balance, release frozen
   - Si timeout: transaction.status = 'refunded', release frozen

3. Avantages de cette approche:
   ✅ Impossible de dépenser 2× le même crédit
   ✅ Balance ne peut jamais devenir négative
   ✅ Traçabilité complète via transactions
   ✅ Rollback automatique en cas d'erreur

4. À faire après cette correction:
   - Déployer la migration SQL
   - Déployer cette version corrigée de buy-sms-activate-number
   - Tester avec un compte test
   - Vérifier dans les logs que frozen_balance monte/descend correctement
     \*/
