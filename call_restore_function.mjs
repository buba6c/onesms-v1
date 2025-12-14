// Script pour appeler la fonction de restauration des frozen_amount
async function callRestoreFunction() {
  console.log('📞 Appel de la fonction restore-frozen-amounts...\n')
  
  try {
    const response = await fetch('https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/restore-frozen-amounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const result = await response.json()
    
    console.log('📊 RÉSULTAT:')
    console.log(`   Succès: ${result.success ? '✅' : '❌'}`)
    console.log(`   Message: ${result.message}`)
    
    if (result.corrected_count !== undefined) {
      console.log(`   Activations corrigées: ${result.corrected_count}`)
    }
    
    if (result.total_frozen_added !== undefined) {
      console.log(`   Total frozen_amount ajouté: ${result.total_frozen_added}Ⓐ`)
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n⚠️  ERREURS:')
      result.errors.forEach(error => console.log(`   - ${error}`))
    }
    
    if (result.success && result.corrected_count > 0) {
      console.log('\n🎉 BUG CORRIGÉ!')
      console.log('   Le problème "annuler une activation libère tout le frozen_balance"')
      console.log('   devrait maintenant être résolu.')
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'appel:', error.message)
  }
}

// Exécuter
callRestoreFunction()