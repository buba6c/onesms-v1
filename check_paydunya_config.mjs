#!/usr/bin/env node
/**
 * Vérifier que les clés PayDunya sont bien dans la DB
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5NDQzODQsImV4cCI6MjA0NzUyMDM4NH0.LGEBnZAYH56hOTgbYX1S0Y97W3lzbJt2hfhZBjmG-lc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔍 Vérification config PayDunya dans la base...\n');

const { data, error } = await supabase
  .from('payment_providers')
  .select('*')
  .eq('provider_code', 'paydunya')
  .single();

if (error) {
  console.error('❌ Erreur:', error);
  process.exit(1);
}

console.log('📋 PayDunya:');
console.log('- ID:', data.id);
console.log('- Nom:', data.provider_name);
console.log('- Actif:', data.is_active);
console.log('- Par défaut:', data.is_default);
console.log('');

if (data.config && Object.keys(data.config).length > 0) {
  console.log('✅ Config trouvée:');
  console.log('- Master Key:', data.config.master_key ? data.config.master_key.substring(0, 10) + '...' : '❌ Manquante');
  console.log('- Private Key:', data.config.private_key ? data.config.private_key.substring(0, 15) + '...' : '❌ Manquante');
  console.log('- Token:', data.config.token ? data.config.token.substring(0, 10) + '...' : '❌ Manquante');
  console.log('- Mode:', data.config.mode || '❌ Non défini');
  console.log('');
  console.log('🎉 Les clés sont configurées! Le problème vient d\'ailleurs.');
} else {
  console.log('❌ Config vide ou manquante!');
  console.log('');
  console.log('💡 Solution:');
  console.log('Va sur https://onesms-sn.com/admin/payment-providers');
  console.log('Et configure les clés PayDunya manuellement.');
}
