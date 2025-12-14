import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

async function testRentalsInsert() {
  console.log('=== TEST INSERTION RENTALS ===\n');

  // 1. Test INSERT
  console.log('1. Test INSERT...');
  const { data: insertData, error: insertError } = await supabase
    .from('rentals')
    .insert({
      user_id: 'e108c02a-2012-4043-bbc2-fb09bb11f824',
      rent_id: 'TEST_' + Date.now(),
      phone: '+221771234567',
      service_code: 'wa',
      country_code: '140',
      total_cost: 5.00,
      status: 'completed',
      end_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      rent_hours: 4,
      hourly_rate: 1.25
    })
    .select();

  if (insertError) {
    console.log('❌ INSERT FAILED:', insertError.message);
    console.log('   Code:', insertError.code);
    console.log('   Details:', insertError.details);
  } else {
    console.log('✅ INSERT SUCCESS:', insertData[0]?.id);
  }

  // 2. Test SELECT
  console.log('\n2. Test SELECT...');
  const { data: selectData, error: selectError } = await supabase
    .from('rentals')
    .select('*')
    .limit(5);

  if (selectError) {
    console.log('❌ SELECT FAILED:', selectError.message);
  } else {
    console.log('✅ SELECT SUCCESS:', selectData.length, 'rentals trouvés');
    selectData.forEach(r => {
      console.log(`   - ${r.id.slice(0,8)}... | ${r.phone} | ${r.status} | ${r.total_cost}Ⓐ`);
    });
  }

  // 3. Comparer avec activations
  console.log('\n3. Test INSERT activations (comparaison)...');
  const { data: actData, error: actError } = await supabase
    .from('activations')
    .insert({
      user_id: 'e108c02a-2012-4043-bbc2-fb09bb11f824',
      order_id: 'TEST_ACT_' + Date.now(),
      phone: '+999TEST',
      service_code: 'test',
      country_code: '0',
      price: 1,
      status: 'pending'
    })
    .select();

  if (actError) {
    console.log('❌ ACTIVATIONS INSERT FAILED:', actError.message);
  } else {
    console.log('✅ ACTIVATIONS INSERT SUCCESS:', actData[0]?.id);
    // Cleanup
    await supabase.from('activations').delete().eq('id', actData[0].id);
    console.log('   (nettoyé)');
  }

  // 4. Vérifier les colonnes requises
  console.log('\n4. Vérifier structure table rentals...');
  const { data: columns, error: colError } = await supabase
    .rpc('get_table_columns', { table_name: 'rentals' });
  
  if (colError) {
    // Fallback: tester avec un SELECT vide
    const { error: structError } = await supabase
      .from('rentals')
      .select('id, user_id, rent_id, rental_id, phone, service_code, country_code, total_cost, status, end_date, rent_hours, hourly_rate, frozen_amount, expires_at')
      .limit(0);
    
    if (structError) {
      console.log('⚠️ Colonnes manquantes possibles:', structError.message);
    } else {
      console.log('✅ Toutes les colonnes existent');
    }
  }

  console.log('\n=== FIN DES TESTS ===');
}

testRentalsInsert().catch(console.error);
