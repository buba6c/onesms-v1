import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824';

async function fixBalance() {
  // Remettre les valeurs correctes
  const { error } = await supabase
    .from('users')
    .update({
      balance: 21,
      frozen_balance: 12
    })
    .eq('id', userId);

  if (error) {
    console.log('Erreur:', error.message);
  } else {
    console.log('✅ Solde remis à 21 Ⓐ, Frozen remis à 12 Ⓐ');
  }

  // Vérifier
  const { data: user } = await supabase
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', userId)
    .single();

  console.log('\nNouveau état:');
  console.log('Balance:', user?.balance);
  console.log('Frozen:', user?.frozen_balance);
  
  // Remettre aussi frozen_amount sur l'activation pending
  const { data: pendingActivation } = await supabase
    .from('activations')
    .select('id, price, frozen_amount')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .single();
    
  if (pendingActivation) {
    console.log('\nActivation pending trouvée:', pendingActivation.id);
    console.log('Price:', pendingActivation.price, 'Frozen_amount:', pendingActivation.frozen_amount);
    
    // S'assurer que frozen_amount = price
    if (pendingActivation.frozen_amount !== pendingActivation.price) {
      await supabase
        .from('activations')
        .update({ frozen_amount: pendingActivation.price })
        .eq('id', pendingActivation.id);
      console.log('✅ frozen_amount mis à jour à', pendingActivation.price);
    }
  }
}

fixBalance();
