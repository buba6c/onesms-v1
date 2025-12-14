#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🔍 Lecture config PayDunya actuelle...\n');

// Lire avec service role pour voir les données sensibles
const { data, error } = await supabase
  .from('payment_providers')
  .select('*')
  .eq('provider_code', 'paydunya')
  .single();

if (error) {
  console.error('❌ Erreur:', error);
  process.exit(1);
}

console.log('📋 Provider PayDunya:');
console.log('ID:', data.id);
console.log('Nom:', data.provider_name);
console.log('Actif:', data.is_active);
console.log('Config type:', typeof data.config);
console.log('Config vide?:', Object.keys(data.config || {}).length === 0);
console.log('\n📦 Config complète:');
console.log(JSON.stringify(data.config, null, 2));

// Maintenant on UPDATE avec les vraies clés
console.log('\n🔧 Mise à jour avec les clés...');

const newConfig = {
  master_key: 'NRimGfVs-w3HH-U396-4KyR-AXNV5vmF0uEW',
  public_key: 'test_public_iQ2Xt5KoOC1KT9l7tstvVhLLkiC',
  private_key: 'test_private_c7KkCGiFSBjGGlK59kaM87dUXKa',
  token: 'w8wLEciWYNOm6tmWNEDI',
  mode: 'test'
};

const { data: updated, error: updateError } = await supabase
  .from('payment_providers')
  .update({ config: newConfig })
  .eq('provider_code', 'paydunya')
  .select()
  .single();

if (updateError) {
  console.error('❌ Erreur UPDATE:', updateError);
  process.exit(1);
}

console.log('✅ Config mise à jour!');
console.log('\n📦 Nouvelle config:');
console.log(JSON.stringify(updated.config, null, 2));
