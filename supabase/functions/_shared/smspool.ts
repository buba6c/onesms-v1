
export const SMSPOOL_BASE_URL = 'https://api.smspool.net'

export interface SMSPoolOrder {
    order_id: string
    country: string
    service: string
    pool: string
    expires_in: number
    phonenumber: string
    cost: string // API returns cost as string
}

export interface SMSPoolCheckResponse {
    status: number // 1 = pending, 2 = completed, 3 = expired/cancelled
    sms: string | null
    full_sms: string | null
    sender: string | null
    time_left: number
}

// Order Response often has success: 1/0
export interface SMSPoolOrderResponse {
    success: number
    number?: string
    order_id?: string
    country?: string
    service?: string
    pool?: string
    cost?: string
    message?: string // Error message
}

export class SMSPoolClient {
    private apiKey: string

    constructor(apiKey: string) {
        this.apiKey = apiKey
    }

    /**
     * Purchase a number
     * @param country Country ID (e.g., 'US', 'GB')
     * @param service Service ID (e.g., 'whatsapp', 'google')
     * @param pool Optional pool ID
     */
    async purchaseNumber(country: string, service: string, pool?: string): Promise<SMSPoolOrderResponse> {
        const params = new URLSearchParams({
            key: this.apiKey,
            country,
            service,
        })

        if (pool) params.append('pool', pool)

        // Using Purchase SMS endpoint with POST method
        const url = `${SMSPOOL_BASE_URL}/purchase/sms`
        console.log('🏊 [SMSPOOL] Ordering:', { country, service, pool })

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString(),
                signal: AbortSignal.timeout(15000) // 15s Timeout to trigger fallback faster
            })
            const data = await res.json()
            return data
        } catch (error) {
            console.error('❌ [SMSPOOL] Order Failed:', error)
            throw new Error(`SMSPool Connection Error: ${error.message}`)
        }
    }

    /**
     * Check order status
     * @param orderId The order ID returned by purchase
     */
    async checkOrder(orderId: string): Promise<SMSPoolCheckResponse> {
        const params = new URLSearchParams({
            key: this.apiKey,
            orderid: orderId,
        })

        const url = `${SMSPOOL_BASE_URL}/sms/check?${params.toString()}`
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
            const data = await res.json()
            return data
        } catch (error) {
            console.error('❌ [SMSPOOL] Check Failed:', error)
            throw error
        }
    }

    /**
     * Cancel an order
     * @param orderId The order ID
     */
    async cancelOrder(orderId: string): Promise<{ success: number }> {
        const params = new URLSearchParams({
            key: this.apiKey,
            orderid: orderId,
        })

        const url = `${SMSPOOL_BASE_URL}/sms/cancel?${params.toString()}`
        try {
            const res = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(10000) })
            const data = await res.json()
            return data
        } catch (error) {
            console.error('❌ [SMSPOOL] Cancel Failed:', error)
            throw error
        }
    }

    /**
     * Get Balance
     */
    async getBalance(): Promise<{ balance: string }> {
        const params = new URLSearchParams({
            key: this.apiKey,
        })
        const url = `${SMSPOOL_BASE_URL}/request/balance?${params.toString()}`
        try {
            const res = await fetch(url)
            const data = await res.json()
            return data
        } catch (error) {
            // Try fallback to just /balance if request/balance fails (undocumented sometimes)
            console.warn('⚠️ [SMSPOOL] request/balance failed, trying /balance')
            try {
                const url2 = `${SMSPOOL_BASE_URL}/balance?${params.toString()}`
                const res2 = await fetch(url2)
                const data2 = await res2.json()
                return data2
            } catch (e2) {
                throw error
            }
        }
    }
}
