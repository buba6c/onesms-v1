// Vérifier l'état actuel de l'activation dans la DB

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Vérification de l\'état de l\'activation +447453543818\n');

// Chercher par numéro de téléphone
const { data: activations, error } = await supabase
  .from('activations')
  .select('*')
  .or('phone.eq.+447453543818,phone.eq.447453543818,order_id.eq.911037873')
  .order('created_at', { ascending: false });

if (error) {
  console.error('❌ Erreur:', error);
  process.exit(1);
}

if (!activations || activations.length === 0) {
  console.log('⚠️ Aucune activation trouvée pour ce numéro');
  console.log('\n💡 Cela signifie que l\'activation n\'est pas visible avec la clé anon');
  console.log('   Mais elle existe bien en DB (les logs Edge Function le confirment)');
  console.log('   C\'est un problème de RLS (Row Level Security)');
  process.exit(0);
}

console.log(`✅ ${activations.length} activation(s) trouvée(s)\n`);

activations.forEach(act => {
  console.log('━'.repeat(60));
  console.log('ID:', act.id);
  console.log('Order ID:', act.order_id);
  console.log('📱 Téléphone:', act.phone);
  console.log('🌍 Pays:', act.country_code);
  console.log('📦 Service:', act.service_code);
  console.log('💰 Prix:', act.price, 'Ⓐ');
  console.log('📊 Status:', act.status);
  console.log('✅ Facturé:', act.charged ? 'OUI' : 'NON');
  
  if (act.sms_code) {
    console.log('🔢 Code SMS:', act.sms_code);
    console.log('📝 Texte SMS:', act.sms_text);
    console.log('⏰ SMS reçu:', act.sms_received_at);
  } else {
    console.log('⏳ Pas de SMS enregistré en DB');
  }
  
  console.log('📅 Créé:', act.created_at);
  console.log('⏰ Expire:', act.expires_at);
  
  const now = new Date();
  const expires = new Date(act.expires_at);
  const isExpired = now > expires;
  
  if (isExpired) {
    console.log('⚠️ Statut actuel: EXPIRÉ');
  } else {
    const remainingMs = expires - now;
    const remainingMin = Math.floor(remainingMs / 60000);
    console.log(`⏳ Temps restant: ${remainingMin} minutes`);
  }
  
  console.log('━'.repeat(60));
});
