/**
 * Script pour corriger les activations expirées qui bloquent du frozen
 * Utilise la fonction atomic_refund pour libérer les fonds
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const USER_ID = 'e108c02a-2012-4043-bbc2-fb09bb11f824';

async function fixExpiredActivations() {
  console.log('🔧 FIX ACTIVATIONS EXPIRÉES\n');

  // 1. Trouver toutes les activations expirées qui ont encore du frozen
  const { data: expired, error } = await supabase
    .from('activations')
    .select('id, status, frozen_amount, price, service_code, expires_at, order_id')
    .eq('user_id', USER_ID)
    .gt('frozen_amount', 0)
    .or(`status.eq.pending,status.eq.active`)
    .lt('expires_at', new Date().toISOString());

  if (error) {
    console.log('❌ Erreur:', error.message);
    return;
  }

  console.log(`📋 Activations expirées avec frozen > 0: ${expired?.length || 0}\n`);

  if (!expired || expired.length === 0) {
    console.log('✅ Aucune activation expirée à corriger');
    return;
  }

  for (const activation of expired) {
    console.log(`\n🔄 Traitement: ${activation.id}`);
    console.log(`   Service: ${activation.service_code}`);
    console.log(`   Status: ${activation.status}`);
    console.log(`   Frozen: ${activation.frozen_amount} Ⓐ`);
    console.log(`   Expiré le: ${activation.expires_at}`);

    // 2. Appeler atomic_refund pour libérer le frozen
    const { data: refundResult, error: refundError } = await supabase.rpc('atomic_refund', {
      p_user_id: USER_ID,
      p_activation_id: activation.id,
      p_reason: 'Auto-cleanup: activation expired without proper refund'
    });

    if (refundError) {
      console.log(`   ❌ Erreur refund: ${refundError.message}`);
      
      // Si atomic_refund échoue (ex: frozen déjà à 0 en DB), on met à jour manuellement le status
      const { error: updateError } = await supabase
        .from('activations')
        .update({ 
          status: 'expired',
          frozen_amount: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', activation.id);

      if (updateError) {
        console.log(`   ❌ Erreur update status: ${updateError.message}`);
      } else {
        console.log(`   ✅ Status mis à jour en 'expired'`);
      }
    } else {
      console.log(`   ✅ Refund effectué:`, refundResult);
      
      // Mettre à jour le status en 'expired'
      await supabase
        .from('activations')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', activation.id);
      
      console.log(`   ✅ Status mis à jour en 'expired'`);
    }
  }

  // 3. Vérifier l'état final
  console.log('\n📊 ÉTAT FINAL:');
  
  const { data: user } = await supabase
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', USER_ID)
    .single();
  
  console.log(`   Balance: ${user?.balance} Ⓐ`);
  console.log(`   Frozen: ${user?.frozen_balance} Ⓐ`);
  
  const { data: pendingCount } = await supabase
    .from('activations')
    .select('id')
    .eq('user_id', USER_ID)
    .in('status', ['pending', 'active']);
  
  console.log(`   Activations en cours: ${pendingCount?.length || 0}`);
}

fixExpiredActivations().catch(console.error);
