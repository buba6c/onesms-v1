import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔧 QUICK FIX - REPAIR BUY-SMS-ACTIVATE-RENT\n')

async function quickFix() {
  try {
    // 1. Test simple insertion pour voir quelles colonnes posent problème
    console.log('🧪 Test insertion basique...')
    
    const testData = {
      user_id: 'e108c02a-9b9b-4b8b-8b1a-1234567890ab',
      rent_id: 'test123',
      service_code: 'hw',
      country_code: '6', 
      phone: '+1234567890',
      end_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      status: 'active'
    }
    
    const { data, error } = await sb
      .from('rentals')
      .insert(testData)
      .select()
    
    if (error) {
      console.log('❌ Erreur:', error.message)
      console.log('Code:', error.code)
      console.log('Details:', error.details)
      
      // Analyser l'erreur et suggérer fix
      if (error.message.includes('null value') && error.message.includes('violates not-null constraint')) {
        const match = error.message.match(/column "([^"]+)"/)
        if (match) {
          const missingColumn = match[1]
          console.log(`\n🎯 COLONNE MANQUANTE: ${missingColumn}`)
          
          // Ajouter la colonne manquante
          console.log(`🔧 Tentative ajout colonne ${missingColumn}...`)
          
          const alterSQL = `ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS ${missingColumn} TEXT`
          const { error: alterError } = await sb.rpc('exec_sql', { sql_query: alterSQL })
          
          if (alterError) {
            console.log('❌ Erreur ALTER:', alterError.message)
          } else {
            console.log('✅ Colonne ajoutée!')
          }
        }
      }
    } else {
      console.log('✅ Insertion réussie!')
      // Nettoyer
      await sb.from('rentals').delete().eq('id', data[0].id)
    }

    // 2. Vérifier les colonnes existantes
    console.log('\n📋 Vérification colonnes...')
    const { data: sample } = await sb
      .from('rentals')
      .select('*')
      .limit(1)
    
    if (sample && sample.length > 0) {
      const columns = Object.keys(sample[0])
      console.log('Colonnes disponibles:')
      columns.forEach(col => console.log(`   • ${col}`))
    }

  } catch (err) {
    console.error('❌ Erreur fix:', err.message)
  }
}

await quickFix()

console.log('\n🚀 Maintenant, déployons la fonction fixée...')

console.log(`
🎯 PLAN DE FIX:
1. ✅ Diagnostic effectué
2. 🔧 Réparer colonnes manquantes  
3. 🚀 Redéployer buy-sms-activate-rent
4. 🧪 Tester création rental
`)