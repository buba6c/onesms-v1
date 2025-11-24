import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function findServiceCodes() {
  console.log('\n🔍 Recherche des codes de services dans la base...\n');

  const searchTerms = [
    'amazon', 'facebook', 'telegram', 'whatsapp', 'google', 
    'microsoft', 'twitter', 'instagram', 'tiktok', 'uber'
  ];

  for (const term of searchTerms) {
    const { data, error } = await supabase
      .from('services')
      .select('code, name, display_name')
      .or(`code.ilike.%${term}%,name.ilike.%${term}%,display_name.ilike.%${term}%`);

    if (data && data.length > 0) {
      console.log(`\n📦 "${term}":`);
      data.forEach(s => {
        console.log(`   • code: "${s.code}" | name: "${s.name}" | display: "${s.display_name}"`);
      });
    } else {
      console.log(`\n❌ "${term}": Aucun résultat`);
    }
  }

  // Afficher TOUS les services pour voir les codes réels
  console.log('\n\n📋 TOUS LES SERVICES (triés par stock):\n');
  
  const { data: allServices } = await supabase
    .from('services')
    .select('code, name, display_name, total_available')
    .order('total_available', { ascending: false })
    .limit(50);

  allServices?.forEach((s, i) => {
    const display = s.display_name || s.name;
    console.log(`  ${(i + 1).toString().padStart(2)}. code="${s.code.padEnd(20)}" | ${display}`);
  });
}

findServiceCodes().catch(console.error);
