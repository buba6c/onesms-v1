import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔍 DIAGNOSTIC STRUCTURE TABLE RENTALS\n')

async function diagnoseTables() {
  try {
    console.log('📊 1. STRUCTURE TABLE RENTALS:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Obtenir la structure de la table rentals
    const { data: columns, error: colError } = await sb.rpc('exec_sql', {
      sql_query: `
        SELECT 
          column_name, 
          data_type, 
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = 'rentals' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
    })
    
    if (colError) {
      console.error('❌ Erreur structure:', colError)
      return
    }
    
    console.log('\n📋 COLONNES EXISTANTES:')
    if (columns && columns.length > 0) {
      columns.forEach((col, index) => {
        const nullable = col.is_nullable === 'YES' ? '✅ NULL OK' : '🚨 NOT NULL'
        console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - ${nullable}`)
        if (col.column_default) {
          console.log(`       Default: ${col.column_default}`)
        }
      })
    }

    console.log('\n📊 2. TEST INSERTION MINIMALE:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Test avec insertion minimale
    const testRental = {
      user_id: 'e108c02a-9b9b-4b8b-8b1a-1234567890ab', // UUID de test
      rent_id: '12345',
      service_code: 'hw',  
      country_code: '6',
      phone: '+1234567890',
      end_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      frozen_amount: 5.0,
      price: 5.0,
      rent_hours: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('\n🧪 Test insertion avec données:')
    Object.entries(testRental).forEach(([key, value]) => {
      console.log(`   • ${key}: ${value}`)
    })
    
    console.log('\n⚡ Tentative insertion...')
    
    const { data: insertResult, error: insertError } = await sb
      .from('rentals')
      .insert(testRental)
      .select()
    
    if (insertError) {
      console.log('❌ ERREUR INSERTION:', insertError.message)
      console.log('Details:', insertError.details)
      console.log('Hint:', insertError.hint)
    } else {
      console.log('✅ INSERTION RÉUSSIE!')
      console.log('Result:', insertResult[0]?.id)
      
      // Nettoyer le test
      await sb.from('rentals').delete().eq('id', insertResult[0]?.id)
      console.log('🧹 Test nettoyé')
    }

    console.log('\n📊 3. ANALYSE RENTALS RÉCENTS:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const { data: recentRentals } = await sb
      .from('rentals')
      .select('id, user_id, rent_id, service_code, country_code, phone, end_date, status, frozen_amount, created_at')
      .order('created_at', { ascending: false })
      .limit(3)
    
    if (recentRentals && recentRentals.length > 0) {
      console.log(`\n📋 RENTALS RÉCENTS (${recentRentals.length}):`)
      
      recentRentals.forEach((rental, index) => {
        console.log(`\n   ${index + 1}. ${rental.id?.substring(0,8)}...`)
        console.log(`      rent_id: ${rental.rent_id || 'NULL'}`)
        console.log(`      service_code: ${rental.service_code || 'NULL'}`) 
        console.log(`      country_code: ${rental.country_code || 'NULL'}`)
        console.log(`      phone: ${rental.phone || 'NULL'}`)
        console.log(`      end_date: ${rental.end_date || 'NULL'}`)
        console.log(`      frozen_amount: ${rental.frozen_amount || 'NULL'}`)
      })
    }

    console.log('\n🎯 DIAGNOSTIC FINAL:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Identifier les colonnes NOT NULL problématiques
    const notNullColumns = columns ? columns.filter(col => 
      col.is_nullable === 'NO' && 
      !col.column_default && 
      !['id', 'created_at', 'updated_at'].includes(col.column_name)
    ) : []
    
    if (notNullColumns.length > 0) {
      console.log('\n🚨 COLONNES NOT NULL SANS DEFAULT:')
      notNullColumns.forEach(col => {
        console.log(`   • ${col.column_name} (${col.data_type})`)
      })
    } else {
      console.log('\n✅ Aucune colonne NOT NULL problématique')
    }

  } catch (error) {
    console.error('❌ ERREUR DIAGNOSTIC:', error.message)
  }
}

await diagnoseTables()
console.log('\n✅ DIAGNOSTIC TERMINÉ')