#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('🔍 DIAGNOSTIC FROZEN BALANCE')
console.log('='.repeat(60))

async function diagnose() {
  try {
    // Authentifier d'abord
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123'
    })

    if (authError) {
      console.error('❌ Erreur d\'authentification:', authError.message)
      console.log('Essayez avec vos identifiants')
      return
    }

    const userId = authData.user.id
    console.log('✅ Authentifié, User ID:', userId)

    // 1. Récupérer le profil utilisateur
    const { data: user, error: usersError } = await supabase
      .from('users')
      .select('id, email, balance, frozen_balance')
      .eq('id', userId)
      .single()

    if (usersError) {
      console.error('❌ Erreur récupération user:', usersError.message)
      return
    }

    console.log(`\n📊 Profil utilisateur:\n`)
    console.log('═'.repeat(60))
    console.log(`👤 User: ${user.email}`)
    console.log(`   Balance: ${user.balance} Ⓐ`)
    console.log(`   Frozen: ${user.frozen_balance} Ⓐ`)
    console.log(`   Disponible: ${user.balance - user.frozen_balance} Ⓐ`)

    // 2. Vérifier les activations pending/waiting pour cet utilisateur
    const { data: pendingActivations, error: activError } = await supabase
      .from('activations')
      .select('id, order_id, phone, service_code, status, price, created_at, expires_at')
      .eq('user_id', user.id)
      .in('status', ['pending', 'waiting'])
      .order('created_at', { ascending: false })

    console.log(`\n   📱 Activations en attente: ${pendingActivations?.length || 0}`)
    
    let totalPendingPrice = 0
    for (const act of pendingActivations || []) {
      totalPendingPrice += act.price || 0
      const expiresAt = new Date(act.expires_at)
      const isExpired = expiresAt < new Date()
      console.log(`      - ${act.service_code}: ${act.phone} (${act.price} Ⓐ) [${act.status}]${isExpired ? ' ⚠️ EXPIRÉ!' : ''}`)
      console.log(`        Order ID: ${act.order_id}`)
    }

    // 3. Vérifier les transactions pending
    const { data: pendingTxns, error: txnError } = await supabase
      .from('transactions')
      .select('id, amount, status, description, created_at')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    console.log(`\n   💰 Transactions pending: ${pendingTxns?.length || 0}`)
    
    let totalPendingTxn = 0
    for (const txn of pendingTxns || []) {
      totalPendingTxn += Math.abs(txn.amount || 0)
      console.log(`      - ${txn.description}: ${txn.amount} Ⓐ`)
    }

    // 4. ANALYSE DU PROBLÈME
    console.log(`\n   🔍 ANALYSE:`)
    console.log(`      Total prix activations pending: ${totalPendingPrice} Ⓐ`)
    console.log(`      Total montant transactions pending: ${totalPendingTxn} Ⓐ`)
    console.log(`      Frozen balance actuel: ${user.frozen_balance} Ⓐ`)

    if (Math.abs(user.frozen_balance - totalPendingPrice) > 0.01) {
      console.log(`      ⚠️ ANOMALIE: frozen_balance (${user.frozen_balance}) ≠ total pending (${totalPendingPrice})`)
      console.log(`         Différence: ${user.frozen_balance - totalPendingPrice} Ⓐ`)
    } else {
      console.log(`      ✅ Frozen balance correspond aux activations pending`)
    }

    // 5. Vérifier les activations récentes (received) pour détecter un problème
    const { data: recentReceived, error: recentError } = await supabase
      .from('activations')
      .select('id, order_id, phone, service_code, status, price, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('status', 'received')
      .order('updated_at', { ascending: false })
      .limit(5)

    console.log(`\n   📥 5 dernières activations reçues:`)
    for (const act of recentReceived || []) {
      console.log(`      - ${act.service_code}: ${act.phone} (${act.price} Ⓐ) - ${act.updated_at}`)
    }

    // 6. Vérifier les transactions récentes
    const { data: recentTxns, error: recentTxnError } = await supabase
      .from('transactions')
      .select('id, amount, status, description, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    console.log(`\n   📜 10 dernières transactions:`)
    for (const txn of recentTxns || []) {
      console.log(`      - [${txn.status}] ${txn.amount} Ⓐ - ${txn.description?.substring(0, 50)}`)
    }

    } catch (error) {
    console.error('❌ Erreur:', error.message)
  }
}

diagnose()
