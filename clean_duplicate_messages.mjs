import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

console.log('🧹 NETTOYAGE DES MESSAGES EN DOUBLE\n');

// Supprimer tous les messages de support@onesms-sn.com (notifications en boucle)
const { data: deletedNotifs, error: deleteNotifsError } = await supabase
  .from('contact_messages')
  .delete()
  .eq('email', 'support@onesms-sn.com')
  .select();

if (deleteNotifsError) {
  console.error('❌ Erreur:', deleteNotifsError);
} else {
  console.log(`✅ ${deletedNotifs?.length || 0} messages de notification supprimés (boucle infinie)`);
}

// Supprimer le message DMARC de Google
const { data: deletedDmarc, error: deleteDmarcError } = await supabase
  .from('contact_messages')
  .delete()
  .eq('email', 'noreply-dmarc-support@google.com')
  .select();

if (!deleteDmarcError && deletedDmarc) {
  console.log(`✅ ${deletedDmarc.length} message DMARC de Google supprimé`);
}

// Vérifier ce qui reste
const { data: remaining, error: remainingError } = await supabase
  .from('contact_messages')
  .select('*')
  .order('created_at', { ascending: false });

if (remainingError) {
  console.error('❌ Erreur:', remainingError);
} else {
  console.log(`\n📧 Messages restants: ${remaining.length}\n`);
  remaining.forEach((msg, idx) => {
    console.log(`${idx + 1}. 👤 ${msg.name} (${msg.email})`);
    console.log(`   📋 ${msg.subject}`);
    console.log(`   🕐 ${new Date(msg.created_at).toLocaleString('fr-FR')}`);
    console.log('');
  });
}

console.log('✅ NETTOYAGE TERMINÉ');
