import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzcyMjI3MiwiZXhwIjoyMDUzMjk4MjcyfQ.4fCcSLdpSfMFuVCUEkzIEhtJ5Xs6U5bGT4wZYMxT_gk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserTransactions() {
  console.log('🔍 Vérification des transactions récentes...\n');

  // Récupérer l'ID de l'utilisateur buba6c@gmail.com
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email, balance')
    .eq('email', 'buba6c@gmail.com');

  if (userError) {
    console.error('❌ Erreur récupération utilisateur:', userError);
    return;
  }

  if (!users || users.length === 0) {
    console.log('⚠️ Utilisateur buba6c@gmail.com non trouvé');
    return;
  }

  const user = users[0];
  console.log('👤 Utilisateur:', user.email);
  console.log('💰 Solde actuel:', user.balance, 'Ⓐ\n');

  // Récupérer les transactions récentes
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (txError) {
    console.error('❌ Erreur récupération transactions:', txError);
    return;
  }

  if (!transactions || transactions.length === 0) {
    console.log('⚠️ Aucune transaction trouvée\n');
  } else {
    console.log('📊 Transactions récentes:');
    console.log('─'.repeat(80));
    transactions.forEach(tx => {
      console.log(`ID: ${tx.id}`);
      console.log(`Type: ${tx.type}`);
      console.log(`Montant: ${tx.amount}Ⓐ`);
      console.log(`Status: ${tx.status}`);
      console.log(`Description: ${tx.description}`);
      console.log(`Date: ${tx.created_at}`);
      if (tx.metadata) {
        console.log(`Metadata:`, JSON.stringify(tx.metadata, null, 2));
      }
      console.log('─'.repeat(80));
    });
  }

  // Récupérer toutes les activations
  console.log('\n📱 Toutes les activations:');
  const { data: activations, error: actError } = await supabase
    .from('activations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (actError) {
    console.error('❌ Erreur récupération activations:', actError);
    return;
  }

  if (!activations || activations.length === 0) {
    console.log('⚠️ Aucune activation trouvée');
  } else {
    console.log('─'.repeat(80));
    activations.forEach(act => {
      console.log(`ID: ${act.id}`);
      console.log(`Order ID: ${act.order_id}`);
      console.log(`Phone: ${act.phone}`);
      console.log(`Service: ${act.service_code}`);
      console.log(`Country: ${act.country_code}`);
      console.log(`Status: ${act.status}`);
      console.log(`Prix: ${act.price}Ⓐ`);
      console.log(`Charged: ${act.charged || 'false'}`);
      console.log(`Date: ${act.created_at}`);
      console.log('─'.repeat(80));
    });
  }
}

checkUserTransactions().catch(console.error);
