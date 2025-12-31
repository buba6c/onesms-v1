#!/usr/bin/env node
/**
 * Mettre à jour les clés PayDunya de production
 */
import { createClient } from '@supabase/supabase-js';

// Supabase Cloud (Production) - Nouvelles clés
const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Nouvelles clés de production PayDunya
const PAYDUNYA_CONFIG = {
  master_key: 'NRimGfVs-w3HH-U396-4KyR-AXNV5vmF0uEW',
  private_key: 'live_private_MptaDaAADwpfmUi5rIhi2tP5wFc',
  token: 'igh8jsikXdOst2oY85NT',
  mode: 'live'
};

async function updatePayDunyaKeys() {
  console.log('🔑 Mise à jour des clés PayDunya...\n');

  // Récupérer la config actuelle
  const { data: provider, error: fetchError } = await supabase
    .from('payment_providers')
    .select('*')
    .eq('provider_code', 'paydunya')
    .single();

  if (fetchError) {
    console.error('❌ Erreur récupération:', fetchError.message);
    return;
  }

  console.log('📋 Configuration actuelle:');
  console.log('- is_active:', provider.is_active);
  console.log('- Mode actuel:', provider.config?.mode || 'non défini');

  // Mettre à jour avec les nouvelles clés
  const newConfig = {
    ...provider.config,
    ...PAYDUNYA_CONFIG
  };

  const { data: updated, error: updateError } = await supabase
    .from('payment_providers')
    .update({ 
      config: newConfig,
      is_active: true 
    })
    .eq('provider_code', 'paydunya')
    .select()
    .single();

  if (updateError) {
    console.error('\n❌ Erreur mise à jour:', updateError.message);
    return;
  }

  console.log('\n✅ Clés PayDunya mises à jour avec succès!');
  console.log('- Mode:', updated.config.mode);
  console.log('- Master Key:', updated.config.master_key?.substring(0, 20) + '...');
  console.log('- Private Key:', updated.config.private_key?.substring(0, 20) + '...');
  console.log('- Token:', updated.config.token?.substring(0, 10) + '...');
  console.log('- is_active:', updated.is_active);
}

updatePayDunyaKeys().catch(console.error);
