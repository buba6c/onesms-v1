import axios from 'axios'
import CryptoJS from 'crypto-js'

const API_KEY = import.meta.env.VITE_PAYTECH_API_KEY
const API_SECRET = import.meta.env.VITE_PAYTECH_API_SECRET
const BASE_URL = import.meta.env.VITE_PAYTECH_API_URL || 'https://paytech.sn/api'
const ENV = import.meta.env.VITE_PAYTECH_ENV || 'test'

const apiPaytech = axios.create({
  baseURL: BASE_URL,
  headers: {
    'API_KEY': API_KEY,
    'API_SECRET': API_SECRET,
    'Content-Type': 'application/json',
  },
})

export interface PaymentRequest {
  item_name: string
  item_price: number
  currency?: string
  ref_command: string
  command_name: string
  target_payment?: string
  custom_field?: any
}

export interface PaymentResponse {
  success: number
  token?: string
  redirect_url?: string
  redirectUrl?: string
  message?: string
}

export interface PaymentStatus {
  type_event: string
  ref_command: string
  item_name: string
  item_price: number
  currency: string
  payment_method: string
  client_phone: string
  api_key_sha256: string
  api_secret_sha256: string
}

// Request payment
export const requestPayment = async (
  payment: PaymentRequest,
  ipnUrl?: string,
  successUrl?: string,
  cancelUrl?: string
): Promise<PaymentResponse> => {
  const payload: any = {
    item_name: payment.item_name,
    item_price: payment.item_price,
    currency: payment.currency || 'XOF',
    ref_command: payment.ref_command,
    command_name: payment.command_name,
    env: ENV,
  }

  if (payment.target_payment) {
    payload.target_payment = payment.target_payment
  }

  if (payment.custom_field) {
    payload.custom_field = JSON.stringify(payment.custom_field)
  }

  if (ipnUrl) {
    payload.ipn_url = ipnUrl
  }

  if (successUrl) {
    payload.success_url = successUrl
  }

  if (cancelUrl) {
    payload.cancel_url = cancelUrl
  }

  const { data } = await apiPaytech.post('/payment/request-payment', payload)
  return data
}

// Get payment status
export const getPaymentStatus = async (token: string): Promise<any> => {
  const { data } = await apiPaytech.get(`/payment/get-status?token_payment=${token}`)
  return data
}

// Verify IPN (Instant Payment Notification)
export const verifyIPN = (ipnData: any): boolean => {
  const expectedKeyHash = CryptoJS.SHA256(API_KEY).toString()
  const expectedSecretHash = CryptoJS.SHA256(API_SECRET).toString()

  return (
    expectedKeyHash === ipnData.api_key_sha256 &&
    expectedSecretHash === ipnData.api_secret_sha256
  )
}

// Verify HMAC (more secure)
export const verifyHMAC = (
  amount: number,
  refCommand: string,
  receivedHmac: string
): boolean => {
  const message = `${amount}|${refCommand}|${API_KEY}`
  const expectedHmac = CryptoJS.HmacSHA256(message, API_SECRET).toString()
  return expectedHmac === receivedHmac
}

// Refund payment
export const refundPayment = async (refCommand: string): Promise<any> => {
  const { data } = await apiPaytech.post('/payment/refund-payment', {
    ref_command: refCommand,
  })
  return data
}

// Transfer funds (mobile money)
export const transferFunds = async (
  amount: number,
  destinationNumber: string,
  service: string,
  callbackUrl?: string,
  externalId?: string
): Promise<any> => {
  const payload: any = {
    amount,
    destination_number: destinationNumber,
    service,
  }

  if (callbackUrl) {
    payload.callback_url = callbackUrl
  }

  if (externalId) {
    payload.external_id = externalId
  }

  const { data } = await apiPaytech.post('/transfer/transferFund', payload)
  return data
}

// Get transfer status
export const getTransferStatus = async (idTransfer: string): Promise<any> => {
  const { data } = await apiPaytech.get(`/transfer/get-status?id_transfer=${idTransfer}`)
  return data
}

// Get account info
export const getAccountInfo = async (): Promise<any> => {
  const { data } = await apiPaytech.get('/transfer/get-account-info')
  return data
}

// Export all methods as default
const paytech = {
  requestPayment,
  getPaymentStatus,
  verifyIPN,
  verifyHMAC,
  refundPayment,
  transferFunds,
  getTransferStatus,
  getAccountInfo,
}

export default paytech
