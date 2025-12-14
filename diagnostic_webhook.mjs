import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 DIAGNOSTIC WEBHOOK RESEND\n');

// Informations de configuration
console.log('📋 CONFIGURATION ACTUELLE:');
console.log('   Webhook URL: https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/receive-email');
console.log('   Event type: email.received');
console.log('');

// Vérifier les logs Supabase
console.log('💡 ÉTAPES DE DIAGNOSTIC:\n');

console.log('1. ✅ Email reçu sur Resend Dashboard');
console.log('   → L\'email est bien arrivé chez Resend\n');

console.log('2. ❓ Webhook appelé ?');
console.log('   → Vérifie sur Resend Dashboard → Webhooks → Delivery logs');
console.log('   → Tu dois voir une requête POST vers ta fonction\n');

console.log('3. ❓ Fonction exécutée ?');
console.log('   → Vérifie les logs Supabase:');
console.log('   → https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/functions/receive-email/logs');
console.log('   → Tu devrais voir "📧 Received email webhook"\n');

console.log('4. ❓ Webhook configuré sur Resend ?');
console.log('   → Va sur https://resend.com/webhooks');
console.log('   → Vérifie que le webhook existe avec:');
console.log('     • URL: https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/receive-email');
console.log('     • Event: email.received (coché)');
console.log('     • Status: Active\n');

// Tester la fonction directement
console.log('5. 🧪 TEST MANUEL DE LA FONCTION:\n');
console.log('   Tu peux tester en envoyant une requête POST depuis Resend:');
console.log('   → Va dans Webhooks → Ton webhook → Test');
console.log('   → Ou clique sur l\'email reçu → "Resend to webhook"\n');

// Vérifier la base de données
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

console.log('6. 🔍 Vérification de la base de données...\n');

const { data: messages, error } = await supabase
  .from('contact_messages')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5);

if (error) {
  console.error('   ❌ Erreur DB:', error.message);
} else if (messages.length === 0) {
  console.log('   ❌ Toujours aucun message dans la DB');
  console.log('   → Le webhook n\'a probablement pas été appelé ou a échoué\n');
} else {
  console.log(`   ✅ ${messages.length} messages trouvés !`);
  messages.forEach(msg => {
    console.log(`      • ${msg.name} - ${msg.subject} (${new Date(msg.created_at).toLocaleString('fr-FR')})`);
  });
  console.log('');
}

console.log('🎯 SOLUTION RECOMMANDÉE:\n');
console.log('1. Va sur https://resend.com/webhooks');
console.log('2. Vérifie que le webhook existe');
console.log('3. Si il n\'existe pas, crée-le maintenant');
console.log('4. Si il existe, clique dessus → Onglet "Delivery"');
console.log('5. Tu verras les tentatives d\'envoi et les erreurs éventuelles');
console.log('6. Renvoie l\'email test avec "Retry" ou "Resend to webhook"\n');
