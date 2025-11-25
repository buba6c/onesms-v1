#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('🔍 DEEP ANALYSE - AFFICHAGE SMS ET POLLING AUTOMATIQUE')
console.log('='.repeat(70))

try {
  // 1. Vérifier les données actuelles
  console.log('📊 PARTIE 1: VÉRIFICATION DES DONNÉES SMS')
  console.log('-'.repeat(70))
  
  const { data, error } = await supabase.functions.invoke('check-activation-owner', {
    body: { orderId: '4450751126' }
  })

  if (error) {
    console.error('❌ Erreur:', error)
  } else {
    console.log('📱 Activation 4450751126:')
    console.log('   sms_code:', data.activation.sms_code)
    console.log('   sms_text:', data.activation.sms_text)
    console.log('')
    
    if (data.activation.sms_text === data.activation.sms_code) {
      console.log('⚠️  PROBLÈME: sms_text contient uniquement le code!')
      console.log('   Le texte devrait être formaté comme:')
      console.log('   "Votre code de validation WhatsApp est 300828"')
    }
  }

  // 2. Analyser le flux d'achat
  console.log('')
  console.log('📊 PARTIE 2: ANALYSE DU FLUX D\'ACHAT')
  console.log('-'.repeat(70))
  
  console.log('🔍 Lecture de buy-sms-activate-number/index.ts...')
  console.log('')

} catch (error) {
  console.error('❌ Erreur:', error.message)
}