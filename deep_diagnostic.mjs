#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('🔍 DEEP DIAGNOSTIC - POURQUOI LE SMS NE S\'AFFICHE PAS')
console.log('='.repeat(60))

try {
  const userEmail = 'buba6c@gmail.com'
  const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'
  
  console.log('👤 Utilisateur:', userEmail)
  console.log('🆔 User ID:', userId)
  console.log('')

  // 1. Vérifier TOUTES les activations de cet utilisateur
  console.log('📊 ÉTAPE 1: Vérification des activations en base de données')
  console.log('-'.repeat(60))
  
  const { data: allActivations, error: allError } = await supabase
    .from('activations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (allError) {
    console.error('❌ Erreur RLS ou permissions:', allError.message)
    console.log('⚠️  Possible problème de Row Level Security (RLS)')
  } else {
    console.log(`✅ Trouvé ${allActivations.length} activations`)
    
    if (allActivations.length === 0) {
      console.log('⚠️  AUCUNE ACTIVATION POUR CET UTILISATEUR!')
      console.log('   Le dashboard sera vide.')
    } else {
      allActivations.forEach((act, i) => {
        console.log(`\n${i + 1}. ID: ${act.id}`)
        console.log(`   Order ID: ${act.order_id}`)
        console.log(`   Phone: ${act.phone}`)
        console.log(`   Status: ${act.status}`)
        console.log(`   SMS Code: ${act.sms_code || 'Aucun'}`)
        console.log(`   Charged: ${act.charged}`)
        console.log(`   Created: ${act.created_at}`)
      })
    }
  }

  // 2. Vérifier spécifiquement l'activation 4450751126
  console.log('\n\n📊 ÉTAPE 2: Vérification de l\'activation spécifique')
  console.log('-'.repeat(60))
  
  const { data: specificActivation, error: specificError } = await supabase
    .from('activations')
    .select('*')
    .eq('order_id', '4450751126')
    .maybeSingle()

  if (specificError) {
    console.error('❌ Erreur:', specificError.message)
  } else if (!specificActivation) {
    console.log('❌ Activation 4450751126 NON TROUVÉE!')
  } else {
    console.log('✅ Activation trouvée!')
    console.log('   ID:', specificActivation.id)
    console.log('   User ID:', specificActivation.user_id)
    console.log('   Phone:', specificActivation.phone)
    console.log('   Status:', specificActivation.status)
    console.log('   SMS Code:', specificActivation.sms_code)
    console.log('   Charged:', specificActivation.charged)
    console.log('')
    
    if (specificActivation.user_id !== userId) {
      console.log('⚠️  PROBLÈME: User ID ne correspond pas!')
      console.log('   Attendu:', userId)
      console.log('   Actuel:', specificActivation.user_id)
    } else {
      console.log('✅ User ID correspond')
    }
  }

  // 3. Vérifier les RLS policies
  console.log('\n\n📊 ÉTAPE 3: Test des permissions RLS')
  console.log('-'.repeat(60))
  
  // Essayer de se connecter
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password: 'test123' // Essayer différents mots de passe
  })

  if (authError) {
    console.log('⚠️  Impossible de s\'authentifier:', authError.message)
    console.log('   Cela peut causer des problèmes RLS')
  } else {
    console.log('✅ Authentification réussie')
    console.log('   Session User ID:', authData.user.id)
    
    // Re-tester la requête avec auth
    const { data: withAuth, error: authQueryError } = await supabase
      .from('activations')
      .select('*')
      .eq('user_id', authData.user.id)

    if (authQueryError) {
      console.error('❌ Erreur avec auth:', authQueryError.message)
    } else {
      console.log(`✅ Avec auth: ${withAuth.length} activations trouvées`)
    }
  }

  // 4. Vérifier les tables liées
  console.log('\n\n📊 ÉTAPE 4: Vérification des transactions')
  console.log('-'.repeat(60))
  
  const { data: transactions, error: transError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (transError) {
    console.error('❌ Erreur transactions:', transError.message)
  } else {
    console.log(`✅ Trouvé ${transactions.length} transactions`)
    transactions.forEach((trans, i) => {
      console.log(`\n${i + 1}. Type: ${trans.type}`)
      console.log(`   Amount: ${trans.amount}`)
      console.log(`   Status: ${trans.status}`)
      console.log(`   Related Activation: ${trans.related_activation_id || 'Aucun'}`)
    })
  }

  // 5. Résumé
  console.log('\n\n📊 RÉSUMÉ DU DIAGNOSTIC')
  console.log('='.repeat(60))
  console.log('Activations trouvées:', allActivations?.length || 0)
  console.log('Activation spécifique:', specificActivation ? '✅ Existe' : '❌ Introuvable')
  console.log('Authentification:', authError ? '❌ Échouée' : '✅ OK')
  console.log('Transactions:', transactions?.length || 0)

} catch (error) {
  console.error('❌ Erreur critique:', error.message)
  console.error(error.stack)
}