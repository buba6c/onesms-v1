import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkCampaigns() {
  console.log('🔍 Vérification des campagnes email...\n');

  // Utiliser la service role key pour accès admin
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
  );

  // Récupérer les dernières campagnes
  const { data: campaigns, error } = await supabaseAdmin
    .from('email_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  if (!campaigns || campaigns.length === 0) {
    console.log('⚠️  Aucune campagne trouvée');
    return;
  }

  console.log(`✅ ${campaigns.length} campagne(s) trouvée(s):\n`);

  campaigns.forEach((campaign, index) => {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Campagne #${index + 1}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Titre: ${campaign.title}`);
    console.log(`Type: ${campaign.email_type || 'promo'}`);
    console.log(`Status: ${campaign.status}`);
    console.log(`Envoyés: ${campaign.sent_count}/${campaign.total_recipients}`);
    console.log(`Code promo: ${campaign.promo_code || 'Aucun'}`);
    console.log(`Réduction: ${campaign.discount || 'Aucune'}`);
    console.log(`Date: ${new Date(campaign.sent_at || campaign.created_at).toLocaleString('fr-FR')}`);
    console.log();
  });
}

checkCampaigns();
