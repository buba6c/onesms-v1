import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

console.log('🔍 ANALYSE INTELLIGENTE DU CONTENU DES EMAILS\n');

// Récupérer les derniers messages
const { data: messages, error } = await supabase
  .from('contact_messages')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5);

if (error) {
  console.error('❌ Erreur:', error);
  process.exit(1);
}

console.log(`📧 ${messages.length} derniers messages analysés:\n`);

messages.forEach((msg, idx) => {
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Message ${idx + 1}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`👤 De: ${msg.name} (${msg.email})`);
  console.log(`📋 Sujet: ${msg.subject}`);
  console.log(`🕐 Date: ${new Date(msg.created_at).toLocaleString('fr-FR')}`);
  console.log(`\n💬 Contenu:`);
  console.log(`   Longueur: ${msg.message.length} caractères`);
  console.log(`   Contient HTML: ${msg.message.includes('<') ? 'Oui' : 'Non'}`);
  console.log(`   Contient <html>: ${msg.message.toLowerCase().includes('<html') ? 'Oui' : 'Non'}`);
  console.log(`   Premier 200 caractères:`);
  console.log(`   "${msg.message.substring(0, 200)}..."`);
  console.log('');
});

console.log('\n🔍 DIAGNOSTIC:\n');

const allEmpty = messages.every(m => 
  m.message === 'Email sans contenu texte' || 
  m.message === 'Contenu non disponible'
);

if (allEmpty) {
  console.log('❌ PROBLÈME: Tous les messages ont un contenu vide ou générique\n');
  console.log('Causes possibles:');
  console.log('1. L\'API Resend /content ne retourne pas de données');
  console.log('2. Le webhook ne reçoit pas les champs "html" ou "text"');
  console.log('3. Les emails reçus n\'ont vraiment pas de contenu\n');
  console.log('💡 SOLUTION: Vérifier les logs Supabase de la fonction receive-email');
  console.log('   https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/functions/receive-email/logs\n');
  console.log('📝 Rechercher dans les logs:');
  console.log('   - "Email content retrieved" → L\'API a répondu');
  console.log('   - "Failed to fetch email content" → L\'API a échoué');
  console.log('   - Les valeurs de emailContent.html et emailContent.text');
} else {
  console.log('✅ Au moins un message a du contenu\n');
  const withContent = messages.filter(m => 
    m.message !== 'Email sans contenu texte' && 
    m.message !== 'Contenu non disponible'
  );
  console.log(`${withContent.length}/${messages.length} messages avec contenu valide`);
}

console.log('\n🔧 VÉRIFICATION DE L\'API RESEND:\n');
console.log('Test: Récupérer le contenu d\'un email via l\'API Resend...\n');

// Prendre le dernier message pour tester
if (messages.length > 0) {
  const lastMsg = messages[0];
  console.log(`Tentative de récupération du dernier email...`);
  console.log(`Email ID devrait être dans les logs du webhook\n`);
  console.log('💡 Pour tester manuellement:');
  console.log('1. Va sur https://resend.com/emails/receiving');
  console.log('2. Clique sur un email reçu');
  console.log('3. Note l\'email_id');
  console.log('4. Teste avec: curl https://api.resend.com/emails/{email_id}/content \\');
  console.log('     -H "Authorization: Bearer re_..." \\');
  console.log('     -H "Content-Type: application/json"\n');
}

console.log('✅ ANALYSE TERMINÉE');
console.log('\nProchaines étapes:');
console.log('1. Vérifie les logs Supabase');
console.log('2. Teste l\'API Resend manuellement');
console.log('3. Envoie un nouvel email simple pour re-tester');
