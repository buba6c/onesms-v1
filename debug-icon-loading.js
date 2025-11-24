import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🔍 ANALYSE APPROFONDIE DU CHARGEMENT DES ICÔNES\n');

// 1. Vérifier la connexion Supabase
console.log('1️⃣ Configuration Supabase:');
console.log('   URL:', process.env.VITE_SUPABASE_URL);
console.log('   Key:', process.env.VITE_SUPABASE_ANON_KEY ? '✅ Présente' : '❌ Manquante');
console.log('');

// 2. Vérifier les services dans la DB
console.log('2️⃣ Services dans la base de données:');
const { data: services, error } = await supabase
  .from('services')
  .select('id, code, name, icon_url, updated_at')
  .limit(10);

if (error) {
  console.error('❌ Erreur DB:', error.message);
} else {
  console.log(`   Total récupéré: ${services.length}`);
  console.log('   Exemples:');
  services.forEach(s => {
    const hasIcon = s.icon_url ? '✅' : '❌';
    const iconType = s.icon_url?.startsWith('data:') ? 'BASE64' : s.icon_url?.startsWith('https://onesms') ? 'S3' : 'AUTRE';
    console.log(`   ${hasIcon} ${s.code.padEnd(12)} | ${iconType.padEnd(8)} | ${s.icon_url?.substring(0, 60) || 'PAS D\'ICÔNE'}`);
  });
}
console.log('');

// 3. Compter les services avec et sans icon_url
console.log('3️⃣ Statistiques icon_url:');
const { data: allServices } = await supabase
  .from('services')
  .select('id, code, icon_url');

const withIcon = allServices?.filter(s => s.icon_url) || [];
const withoutIcon = allServices?.filter(s => !s.icon_url) || [];
const s3Icons = withIcon.filter(s => s.icon_url.startsWith('https://onesms'));
const base64Icons = withIcon.filter(s => s.icon_url.startsWith('data:'));
const otherIcons = withIcon.filter(s => !s.icon_url.startsWith('https://onesms') && !s.icon_url.startsWith('data:'));

console.log(`   Total services: ${allServices?.length || 0}`);
console.log(`   ✅ Avec icon_url: ${withIcon.length} (${Math.round(withIcon.length / (allServices?.length || 1) * 100)}%)`);
console.log(`   ❌ Sans icon_url: ${withoutIcon.length}`);
console.log(`   📦 URLs S3: ${s3Icons.length}`);
console.log(`   📄 Base64: ${base64Icons.length}`);
console.log(`   🔗 Autres: ${otherIcons.length}`);
console.log('');

// 4. Tester les URLs S3
console.log('4️⃣ Test des URLs S3:');
const testServices = ['whatsapp', 'google', 'facebook', 'telegram', 'instagram'];
for (const code of testServices) {
  const service = allServices?.find(s => s.code === code);
  if (!service) {
    console.log(`   ❌ ${code} - Service non trouvé dans la DB`);
    continue;
  }

  if (!service.icon_url) {
    console.log(`   ❌ ${code} - Pas d'icon_url dans la DB`);
    continue;
  }

  const url = service.icon_url;
  const urlType = url.startsWith('data:') ? 'BASE64' : url.startsWith('https://onesms') ? 'S3' : 'AUTRE';
  
  if (urlType === 'S3') {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const status = response.ok ? '✅' : '❌';
      console.log(`   ${status} ${code.padEnd(12)} | HTTP ${response.status} | ${url.substring(0, 70)}`);
      
      if (response.ok) {
        const lastModified = response.headers.get('last-modified');
        const contentType = response.headers.get('content-type');
        console.log(`      └─ Modified: ${lastModified}, Type: ${contentType}`);
      }
    } catch (err) {
      console.log(`   ❌ ${code.padEnd(12)} | Erreur: ${err.message}`);
    }
  } else {
    console.log(`   ℹ️  ${code.padEnd(12)} | Type: ${urlType} | ${url.substring(0, 70)}`);
  }
}
console.log('');

// 5. Vérifier si les services sans icon_url
if (withoutIcon.length > 0) {
  console.log('5️⃣ Services SANS icon_url (besoin de mise à jour):');
  console.log(withoutIcon.slice(0, 10).map(s => `   - ${s.code}`).join('\n'));
  if (withoutIcon.length > 10) {
    console.log(`   ... et ${withoutIcon.length - 10} autres`);
  }
}

console.log('\n✅ Analyse terminée');
