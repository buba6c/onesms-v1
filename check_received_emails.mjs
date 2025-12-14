import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

console.log('🔍 Vérification des emails reçus\n');

// Récupérer les derniers messages
const { data: messages, error } = await supabase
  .from('contact_messages')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);

if (error) {
  console.error('❌ Erreur:', error);
} else if (!messages || messages.length === 0) {
  console.log('⚠️ Aucun message trouvé dans contact_messages');
  console.log('\nPossibles raisons:');
  console.log('1. Le DNS n\'est pas encore propagé (statut "Pending" sur Resend)');
  console.log('2. Le webhook n\'est pas configuré sur Resend');
  console.log('3. L\'email n\'est pas encore arrivé (délai possible)');
  console.log('4. Erreur dans la fonction webhook\n');
} else {
  console.log(`✅ ${messages.length} messages trouvés:\n`);
  messages.forEach((msg, idx) => {
    console.log(`${idx + 1}. 📧 De: ${msg.name} (${msg.email})`);
    console.log(`   📋 Sujet: ${msg.subject}`);
    console.log(`   💬 Message: ${msg.message.substring(0, 100)}${msg.message.length > 100 ? '...' : ''}`);
    console.log(`   🕐 Date: ${new Date(msg.created_at).toLocaleString('fr-FR')}`);
    console.log(`   📊 Statut: ${msg.status}\n`);
  });
}

// Vérifier les logs Supabase
console.log('💡 Pour voir les logs de la fonction webhook:');
console.log('https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/functions/receive-email/logs');
