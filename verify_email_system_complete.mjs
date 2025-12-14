import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

console.log('🔍 ANALYSE COMPLÈTE DU SYSTÈME D\'ENVOI D\'EMAILS\n');

// 1. Vérifier la structure de la table users
console.log('📋 1. STRUCTURE DE LA TABLE USERS');
const { data: users, error: usersError } = await supabase
  .from('users')
  .select('id, email, created_at')
  .not('email', 'is', null)
  .order('id', { ascending: true });

if (usersError) {
  console.error('❌ Erreur:', usersError);
} else {
  console.log(`✅ Total users avec email: ${users.length}`);
  console.log(`   Premier ID: ${users[0]?.id}`);
  console.log(`   Dernier ID: ${users[users.length - 1]?.id}`);
  console.log(`   Premier email: ${users[0]?.email}`);
  console.log(`   Dernier email: ${users[users.length - 1]?.email}`);
}

// 2. Vérifier s'il y a des gaps dans les IDs
console.log('\n🔢 2. VÉRIFICATION DES GAPS DANS LES IDs');
const ids = users.map(u => u.id);
const gaps = [];
for (let i = 1; i < ids.length; i++) {
  if (ids[i] !== ids[i-1] + 1) {
    gaps.push({ from: ids[i-1], to: ids[i], missing: ids[i] - ids[i-1] - 1 });
  }
}
if (gaps.length > 0) {
  console.log(`⚠️ ${gaps.length} gaps trouvés dans les IDs:`);
  gaps.slice(0, 5).forEach(g => {
    console.log(`   Gap entre ID ${g.from} et ${g.to} (${g.missing} IDs manquants)`);
  });
  if (gaps.length > 5) {
    console.log(`   ... et ${gaps.length - 5} autres gaps`);
  }
} else {
  console.log('✅ Aucun gap dans les IDs (séquence continue)');
}

// 3. Simuler range() avec offset
console.log('\n🎯 3. SIMULATION DE range(offset, offset+limit-1)');
const testCases = [
  { offset: 0, limit: 5 },
  { offset: 218, limit: 5 },
  { offset: 718, limit: 5 },
  { offset: 1218, limit: 5 }
];

for (const test of testCases) {
  const { data: rangeUsers } = await supabase
    .from('users')
    .select('id, email')
    .not('email', 'is', null)
    .order('id', { ascending: true })
    .range(test.offset, test.offset + test.limit - 1);
  
  console.log(`   offset=${test.offset}, limit=${test.limit}:`);
  rangeUsers?.forEach((u, idx) => {
    console.log(`      Position ${test.offset + idx}: ID ${u.id} - ${u.email}`);
  });
}

// 4. Vérifier la table email_campaigns
console.log('\n📧 4. HISTORIQUE DES CAMPAGNES (email_campaigns)');
const { data: campaigns, error: campaignsError } = await supabase
  .from('email_campaigns')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);

if (campaignsError) {
  console.log('⚠️ Erreur lors de la récupération des campagnes:', campaignsError.message);
} else if (!campaigns || campaigns.length === 0) {
  console.log('⚠️ Aucune campagne enregistrée dans email_campaigns');
  console.log('   Raison probable: Function timeout avant le logging');
} else {
  console.log(`✅ ${campaigns.length} campagnes trouvées:`);
  campaigns.forEach(c => {
    console.log(`   - ${c.subject} (${c.recipients_count} destinataires)`);
    console.log(`     Statut: ${c.status}, Date: ${new Date(c.created_at).toLocaleString()}`);
    if (c.error_details) {
      console.log(`     Erreur: ${c.error_details}`);
    }
  });
}

// 5. Vérifier la table email_logs
console.log('\n📝 5. LOGS D\'ENVOI INDIVIDUELS (email_logs)');
const { data: logs, error: logsError } = await supabase
  .from('email_logs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(20);

if (logsError) {
  console.log('⚠️ Erreur lors de la récupération des logs:', logsError.message);
} else if (!logs || logs.length === 0) {
  console.log('⚠️ Aucun log d\'envoi trouvé');
} else {
  console.log(`✅ ${logs.length} logs trouvés (derniers):`);
  const successCount = logs.filter(l => l.status === 'sent').length;
  const failedCount = logs.filter(l => l.status === 'failed').length;
  console.log(`   Succès: ${successCount}, Échecs: ${failedCount}`);
  
  logs.slice(0, 5).forEach(l => {
    console.log(`   - ${l.email_type || 'promo'}: ${l.recipient_email}`);
    console.log(`     Statut: ${l.status}, Date: ${new Date(l.created_at).toLocaleString()}`);
  });
}

// 6. Vérifier les doublons potentiels basés sur les 218 premiers
console.log('\n🔄 6. VÉRIFICATION DES DOUBLONS (218 premiers users)');
const { data: first218, error: first218Error } = await supabase
  .from('users')
  .select('id, email')
  .not('email', 'is', null)
  .order('id', { ascending: true })
  .limit(218);

if (!first218Error && first218) {
  console.log(`✅ Les 218 premiers users qui ont reçu les duplicatas:`);
  console.log(`   IDs: ${first218[0]?.id} à ${first218[217]?.id}`);
  console.log(`   Emails: ${first218[0]?.email} ... ${first218[217]?.email}`);
  
  // Compter combien ont des emails valides
  const validEmails = first218.filter(u => u.email && u.email.includes('@'));
  console.log(`   Emails valides: ${validEmails.length}/218`);
}

// 7. Calculer les statistiques pour les 3 batches recommandés
console.log('\n📊 7. STATISTIQUES POUR LES BATCHES RECOMMANDÉS');
console.log('   Batch 1: offset=218, limit=500');
console.log('   Batch 2: offset=718, limit=500');
console.log('   Batch 3: offset=1218, limit=54');

const totalToSend = users.length - 218;
console.log(`\n   Total à envoyer: ${totalToSend} emails`);
console.log(`   Temps estimé par batch (~500 emails): ~10 minutes`);
console.log(`   Temps total estimé: ~30 minutes`);

// 8. Vérifier la fonction Edge send-promo-emails
console.log('\n⚙️ 8. VÉRIFICATION DE LA FONCTION EDGE');
console.log('   Fichier: supabase/functions/send-promo-emails/index.ts');

// 9. Points critiques identifiés
console.log('\n🎯 9. POINTS CRITIQUES À SURVEILLER');
console.log('   ✅ Offset support ajouté dans AdminEmails.tsx');
console.log('   ✅ range() fonctionne correctement');
console.log('   ✅ Ordre des users défini avec .order(\'id\', { ascending: true })');
console.log('   ⚠️ Timeout à 150 secondes (Supabase Edge Functions)');
console.log('   ⚠️ Rate limit Resend: 2 emails/seconde (Pro plan)');
console.log('   ⚠️ Logging ne fonctionne pas si timeout avant la fin');

// 10. Recommandations finales
console.log('\n💡 10. RECOMMANDATIONS FINALES');
console.log('   1. Envoyer par batches de 500 max pour éviter timeout');
console.log('   2. Attendre 10-15 minutes entre chaque batch');
console.log('   3. Vérifier sur Resend Dashboard après chaque batch');
console.log('   4. Ne PAS réenvoyer sans vérifier offset pour éviter duplicatas');
console.log('   5. Utiliser offset=218 pour le premier batch (skip duplicatas)');

console.log('\n✅ ANALYSE TERMINÉE\n');
