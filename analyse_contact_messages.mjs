import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

console.log('📊 ANALYSE COMPLÈTE DES MESSAGES DE CONTACT\n');

// 1. Total messages
const { data: allMessages, error: allError } = await supabase
  .from('contact_messages')
  .select('*')
  .order('created_at', { ascending: false });

if (allError) {
  console.error('❌ Erreur:', allError);
  process.exit(1);
}

console.log(`📧 TOTAL MESSAGES: ${allMessages.length}\n`);

if (allMessages.length === 0) {
  console.log('⚠️ Aucun message trouvé');
  console.log('\n💡 Cela signifie:');
  console.log('   - Aucun utilisateur n\'a encore envoyé de message via le formulaire de contact');
  console.log('   - Ou le système de réception d\'emails Resend n\'est pas encore actif');
  process.exit(0);
}

// 2. Statistiques par statut
console.log('📊 RÉPARTITION PAR STATUT:');
const statuses = {};
allMessages.forEach(msg => {
  statuses[msg.status] = (statuses[msg.status] || 0) + 1;
});
Object.entries(statuses).forEach(([status, count]) => {
  const emoji = {
    'new': '🆕',
    'read': '👁️',
    'replied': '✅',
    'archived': '📦'
  }[status] || '❓';
  console.log(`   ${emoji} ${status}: ${count}`);
});

// 3. Messages récents
console.log('\n📬 LES 10 DERNIERS MESSAGES:\n');
allMessages.slice(0, 10).forEach((msg, idx) => {
  const statusEmoji = {
    'new': '🆕',
    'read': '👁️',
    'replied': '✅',
    'archived': '📦'
  }[msg.status] || '❓';
  
  console.log(`${idx + 1}. ${statusEmoji} [${msg.status.toUpperCase()}]`);
  console.log(`   👤 De: ${msg.name} (${msg.email})`);
  console.log(`   📋 Sujet: ${msg.subject}`);
  console.log(`   💬 Message: ${msg.message.substring(0, 150)}${msg.message.length > 150 ? '...' : ''}`);
  console.log(`   🕐 Date: ${new Date(msg.created_at).toLocaleString('fr-FR')}`);
  if (msg.replied_at) {
    console.log(`   ✅ Répondu le: ${new Date(msg.replied_at).toLocaleString('fr-FR')}`);
  }
  console.log('');
});

// 4. Messages non traités
const unreadMessages = allMessages.filter(msg => msg.status === 'new');
if (unreadMessages.length > 0) {
  console.log(`⚠️ ATTENTION: ${unreadMessages.length} messages NON TRAITÉS\n`);
  unreadMessages.forEach((msg, idx) => {
    console.log(`   ${idx + 1}. De: ${msg.name} - "${msg.subject}"`);
    console.log(`      Email: ${msg.email}`);
    console.log(`      Date: ${new Date(msg.created_at).toLocaleString('fr-FR')}`);
  });
  console.log('');
}

// 5. Sujets les plus fréquents
console.log('📈 SUJETS LES PLUS FRÉQUENTS:');
const subjects = {};
allMessages.forEach(msg => {
  const subject = msg.subject.toLowerCase();
  subjects[subject] = (subjects[subject] || 0) + 1;
});
const topSubjects = Object.entries(subjects)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);

topSubjects.forEach(([subject, count]) => {
  console.log(`   • "${subject}" - ${count} fois`);
});

// 6. Emails les plus actifs
console.log('\n👥 UTILISATEURS LES PLUS ACTIFS:');
const emails = {};
allMessages.forEach(msg => {
  emails[msg.email] = (emails[msg.email] || 0) + 1;
});
const topEmails = Object.entries(emails)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);

topEmails.forEach(([email, count]) => {
  console.log(`   • ${email} - ${count} messages`);
});

// 7. Timeline (messages par jour)
console.log('\n📅 MESSAGES PAR JOUR (7 derniers jours):');
const today = new Date();
const last7Days = {};

for (let i = 6; i >= 0; i--) {
  const date = new Date(today);
  date.setDate(date.getDate() - i);
  const dateStr = date.toISOString().split('T')[0];
  last7Days[dateStr] = 0;
}

allMessages.forEach(msg => {
  const dateStr = msg.created_at.split('T')[0];
  if (last7Days.hasOwnProperty(dateStr)) {
    last7Days[dateStr]++;
  }
});

Object.entries(last7Days).forEach(([date, count]) => {
  const bar = '█'.repeat(count);
  console.log(`   ${date}: ${bar} ${count}`);
});

console.log('\n✅ ANALYSE TERMINÉE');
console.log('\n💡 Pour voir les messages dans l\'interface admin:');
console.log('   https://onesms-sn.com/admin/contact-messages');
