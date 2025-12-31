import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://supabasekong-q84gs0csso48co84gw0s0o4g.46.202.171.108.sslip.io';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 MISE À JOUR CONFIGURATION PAYDUNYA');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Nouvelles clés valides
const NOUVELLES_CLES_PAYDUNYA = {
  master_key: "NRimGfVs-w3HH-U396-4KyR-AXNV5vmF0uEW",
  public_key: "live_public_rbPkH6aQ9epok05sb2k2nGvvqR2",
  private_key: "live_private_MptaDaAADwpfmUi5rIhi2tP5wFc",
  token: "igh8jsikXdOst2oY85NT",
  mode: "live"
};

try {
  console.log('\n1️⃣ Vérification de la configuration actuelle...');
  
  // Vérifier si PayDunya existe déjà
  const { data: existing, error: checkError } = await supabase
    .from('payment_providers')
    .select('*')
    .eq('provider_code', 'paydunya')
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    throw new Error(`Erreur vérification: ${checkError.message}`);
  }

  if (existing) {
    console.log('   📋 Configuration PayDunya existante trouvée');
    console.log(`   🏷️ Provider: ${existing.provider_name}`);
    console.log(`   🔧 Status: ${existing.is_active ? 'Actif' : 'Inactif'}`);
    
    // Mettre à jour la configuration existante
    console.log('\n2️⃣ Mise à jour de la configuration...');
    
    const { data: updated, error: updateError } = await supabase
      .from('payment_providers')
      .update({
        config: NOUVELLES_CLES_PAYDUNYA,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('provider_code', 'paydunya')
      .select()
      .single();

    if (updateError) {
      throw new Error(`Erreur mise à jour: ${updateError.message}`);
    }

    console.log('   ✅ Configuration mise à jour avec succès !');
    
  } else {
    console.log('   ➕ Aucune configuration existante, création...');
    
    // Créer une nouvelle configuration
    console.log('\n2️⃣ Création de la configuration PayDunya...');
    
    const { data: created, error: createError } = await supabase
      .from('payment_providers')
      .insert({
        provider_name: 'PayDunya',
        provider_code: 'paydunya',
        config: NOUVELLES_CLES_PAYDUNYA,
        is_active: true,
        webhook_url: 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/paydunya-webhook'
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Erreur création: ${createError.message}`);
    }

    console.log('   ✅ Configuration créée avec succès !');
  }

  console.log('\n3️⃣ Vérification de la configuration finale...');
  
  const { data: final, error: finalError } = await supabase
    .from('payment_providers')
    .select('*')
    .eq('provider_code', 'paydunya')
    .single();

  if (finalError) {
    throw new Error(`Erreur vérification finale: ${finalError.message}`);
  }

  console.log('   📊 Configuration finale:');
  console.log(`   🏷️ Nom: ${final.provider_name}`);
  console.log(`   🔧 Code: ${final.provider_code}`);
  console.log(`   ✅ Actif: ${final.is_active}`);
  console.log(`   🔑 Master Key: ${final.config.master_key.substring(0, 15)}...`);
  console.log(`   🌐 Public Key: ${final.config.public_key.substring(0, 15)}...`);
  console.log(`   🗝️ Private Key: ${final.config.private_key.substring(0, 15)}...`);
  console.log(`   🎫 Token: ${final.config.token}`);
  console.log(`   🌍 Mode: ${final.config.mode}`);

  console.log('\n🎉 SUCCÈS ! Configuration PayDunya mise à jour !');
  console.log('➡️ Les fonctions Supabase utiliseront maintenant les nouvelles clés valides');

} catch (error) {
  console.error('\n🚨 ERREUR:', error.message);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
