import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

async function fix() {
  // Trouver l'utilisateur par email
  const { data: user, error: findErr } = await supabase
    .from('users')
    .select('id, email, balance, frozen_balance')
    .eq('email', 'buba6c@gmail.com')
    .single();
  
  if (findErr || !user) {
    console.log('Utilisateur non trouve:', findErr?.message);
    return;
  }
  
  console.log('Utilisateur trouve:', user);
  
  // Calculer le vrai frozen (sum des activations en cours)
  const { data: pendingActs } = await supabase
    .from('activations')
    .select('frozen_amount, status')
    .eq('user_id', user.id)
    .in('status', ['pending', 'waiting']);
  
  console.log('Activations en cours:', pendingActs?.length || 0);
  
  const realFrozen = pendingActs?.reduce((sum, a) => sum + (a.frozen_amount || 0), 0) || 0;
  
  // Le solde correct = balance actuel + frozen orphelin
  const orphanedFrozen = user.frozen_balance - realFrozen;
  const correctBalance = user.balance + orphanedFrozen;
  
  console.log('\nCorrection:');
  console.log('  Frozen reel (lie aux activations):', realFrozen);
  console.log('  Frozen orphelin a restaurer:', orphanedFrozen);
  console.log('  Nouveau balance:', correctBalance);
  console.log('  Nouveau frozen:', realFrozen);
  
  // Appliquer la correction avec service role
  const { data, error } = await supabase
    .from('users')
    .update({
      balance: correctBalance,
      frozen_balance: realFrozen
    })
    .eq('id', user.id)
    .select();
  
  if (error) {
    console.log('\nErreur:', error.message);
  } else {
    console.log('\nSolde corrige avec succes!');
    console.log('Resultat:', data);
    console.log('\nSolde disponible:', correctBalance - realFrozen, 'FCFA');
  }
}

fix();
