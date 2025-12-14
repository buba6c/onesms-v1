import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Utiliser la clé service_role pour bypass RLS
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

async function fixBalance() {
  console.log('🔧 CORRECTION URGENTE DU SOLDE\n');
  
  // 1. Trouver l'utilisateur
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, email, balance, frozen_balance')
    .eq('email', 'buba6c@gmail.com')
    .single();
  
  if (userErr || !user) {
    console.error('❌ Utilisateur non trouvé:', userErr);
    return;
  }
  
  console.log('👤 Utilisateur trouvé:', user.email);
  console.log('   ID:', user.id);
  console.log('   Balance actuelle:', user.balance);
  console.log('   Frozen actuel:', user.frozen_balance);
  
  // 2. Vérifier les activations en cours
  const { data: pendingActivations } = await supabase
    .from('activations')
    .select('id, status, frozen_amount, price')
    .eq('user_id', user.id)
    .in('status', ['pending', 'waiting']);
  
  console.log('\n📋 Activations en cours:', pendingActivations?.length || 0);
  
  const realFrozen = pendingActivations?.reduce((sum, a) => sum + (a.frozen_amount || 0), 0) || 0;
  console.log('   Frozen réel (sum of frozen_amount):', realFrozen);
  
  // 3. Calculer le solde correct
  // Le problème: on a fait des freeze (balance -= prix, frozen += prix) 
  // mais les achats ont échoué APRÈS le freeze sans rollback
  // Donc il faut: remettre balance = balance + (frozen_balance - realFrozen)
  
  const excessFrozen = user.frozen_balance - realFrozen;
  const correctBalance = user.balance + excessFrozen;
  const correctFrozen = realFrozen;
  
  console.log('\n🔢 Calcul de correction:');
  console.log('   Excess frozen (à rembourser):', excessFrozen);
  console.log('   Balance corrigée:', correctBalance);
  console.log('   Frozen corrigé:', correctFrozen);
  
  // 4. Appliquer la correction
  console.log('\n⚙️ Application de la correction...');
  
  const { error: updateErr } = await supabase
    .from('users')
    .update({
      balance: correctBalance,
      frozen_balance: correctFrozen
    })
    .eq('id', user.id);
  
  if (updateErr) {
    console.error('❌ Erreur lors de la mise à jour:', updateErr);
    return;
  }
  
  // 5. Vérifier le résultat
  const { data: updatedUser } = await supabase
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', user.id)
    .single();
  
  console.log('\n✅ CORRECTION APPLIQUÉE:');
  console.log('   Nouveau solde:', updatedUser.balance);
  console.log('   Nouveau frozen:', updatedUser.frozen_balance);
  console.log('   Disponible:', updatedUser.balance - updatedUser.frozen_balance);
}

fixBalance().catch(console.error);
