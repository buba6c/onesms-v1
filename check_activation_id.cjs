const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

async function check() {
  // Chercher l'activation avec order_id 4530504033
  const { data: badActivation } = await supabase
    .from('activations')
    .select('id, order_id, phone, status')
    .eq('order_id', '4530504033')
    .maybeSingle();
  
  if (badActivation) {
    console.log('Activation avec order_id 4530504033:');
    console.log('  UUID:', badActivation.id);
    console.log('  order_id:', badActivation.order_id);
    console.log('  status:', badActivation.status);
  } else {
    console.log('Aucune activation trouvée avec order_id 4530504033');
  }
  
  // Chercher les activations de buba6c
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'buba6c@gmail.com')
    .single();
  
  if (user) {
    const { data: activations } = await supabase
      .from('activations')
      .select('id, order_id, phone, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('\nActivations récentes pour buba6c:');
    activations?.forEach(a => {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a.id);
      console.log('  ID:', a.id, 'isUUID:', isUUID, 'order_id:', a.order_id);
    });
  }
}
check();
