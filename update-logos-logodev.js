import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const LOGO_DEV_TOKEN = 'pk_acOeajbNRKGsSDnJvJrcfw';
const BUCKET_NAME = 'onesms';

// Mapping des codes de services vers des domaines connus
const SERVICE_TO_DOMAIN = {
  'whatsapp': 'whatsapp.com',
  'instagram': 'instagram.com',
  'facebook': 'facebook.com',
  'telegram': 'telegram.org',
  'twitter': 'twitter.com',
  'google': 'google.com',
  'microsoft': 'microsoft.com',
  'amazon': 'amazon.com',
  'netflix': 'netflix.com',
  'spotify': 'spotify.com',
  'uber': 'uber.com',
  'airbnb': 'airbnb.com',
  'paypal': 'paypal.com',
  'linkedin': 'linkedin.com',
  'snapchat': 'snapchat.com',
  'tiktok': 'tiktok.com',
  'discord': 'discord.com',
  'reddit': 'reddit.com',
  'pinterest': 'pinterest.com',
  'vk': 'vk.com',
  'viber': 'viber.com',
  'line': 'line.me',
  'wechat': 'wechat.com',
  'kakao': 'kakaocorp.com',
  'tinder': 'tinder.com',
  'bumble': 'bumble.com',
  'okcupid': 'okcupid.com',
  'badoo': 'badoo.com',
  'hinge': 'hinge.co',
  'match': 'match.com',
  'pof': 'pof.com',
  'yahoo': 'yahoo.com',
  'yandex': 'yandex.com',
  'mail': 'mail.ru',
  'outlook': 'outlook.com',
  'gmail': 'gmail.com',
  'protonmail': 'proton.me',
  'steam': 'steampowered.com',
  'twitch': 'twitch.tv',
  'epicgames': 'epicgames.com',
  'origin': 'origin.com',
  'blizzard': 'blizzard.com',
  'ea': 'ea.com',
  'nintendo': 'nintendo.com',
  'playstation': 'playstation.com',
  'xbox': 'xbox.com',
};

// Fonction pour deviner le domaine à partir du nom du service
function guessDomain(code, name) {
  // 1. Chercher dans le mapping
  const lowerCode = code.toLowerCase();
  if (SERVICE_TO_DOMAIN[lowerCode]) {
    return SERVICE_TO_DOMAIN[lowerCode];
  }
  
  // 2. Essayer d'extraire depuis display_name ou name
  const serviceName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (SERVICE_TO_DOMAIN[serviceName]) {
    return SERVICE_TO_DOMAIN[serviceName];
  }
  
  // 3. Construire un domaine basique
  return `${serviceName}.com`;
}

// Télécharger le logo depuis Logo.dev
async function fetchLogoFromLogoDev(domain) {
  try {
    const url = `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&format=png&size=200`;
    console.log(`   📥 Téléchargement: ${url}`);
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      validateStatus: (status) => status === 200
    });
    
    return Buffer.from(response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`   ⚠️  Logo non trouvé sur Logo.dev`);
      return null;
    }
    throw error;
  }
}

// Upload sur S3
async function uploadToS3(buffer, serviceCode, filename) {
  const key = `icons/${serviceCode}/${filename}`;
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: filename.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
    CacheControl: 'public, max-age=31536000, immutable',
  });

  await s3Client.send(command);
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-north-1'}.amazonaws.com/${key}`;
}

// Générer les différentes tailles PNG
async function generatePngSizes(originalBuffer) {
  const sizes = [16, 32, 64, 128, 256];
  const pngs = {};
  
  for (const size of sizes) {
    pngs[`icon-${size}.png`] = await sharp(originalBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  }
  
  return pngs;
}

async function updateServiceLogos(limit = null) {
  console.log('🚀 Mise à jour des logos avec Logo.dev API\n');
  
  // Récupérer les services actifs
  let query = supabase
    .from('services')
    .select('id, code, name, display_name')
    .eq('active', true)
    .order('popularity_score', { ascending: false });
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data: services, error } = await query;
  
  if (error) {
    console.error('❌ Erreur Supabase:', error);
    return;
  }
  
  console.log(`📊 ${services.length} services à mettre à jour\n`);
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const service of services) {
    const displayName = service.display_name || service.name;
    console.log(`\n📱 ${service.code} (${displayName})`);
    
    try {
      // Deviner le domaine
      const domain = guessDomain(service.code, displayName);
      console.log(`   🌐 Domaine: ${domain}`);
      
      // Télécharger depuis Logo.dev
      const logoBuffer = await fetchLogoFromLogoDev(domain);
      
      if (!logoBuffer) {
        console.log(`   ⏭️  Skipping (logo non trouvé)`);
        skipCount++;
        continue;
      }
      
      console.log(`   ✅ Logo téléchargé (${(logoBuffer.length / 1024).toFixed(2)} KB)`);
      
      // Générer les PNG de différentes tailles
      console.log(`   🎨 Génération des tailles PNG...`);
      const pngs = await generatePngSizes(logoBuffer);
      
      // Upload sur S3
      console.log(`   ☁️  Upload sur S3...`);
      
      // Upload le PNG original comme icon.png
      const mainUrl = await uploadToS3(logoBuffer, service.code, 'icon.png');
      
      // Upload les différentes tailles
      for (const [filename, buffer] of Object.entries(pngs)) {
        await uploadToS3(buffer, service.code, filename);
      }
      
      // Créer aussi une version SVG optimisée (on garde le PNG comme base)
      await uploadToS3(logoBuffer, service.code, 'icon.svg');
      
      console.log(`   📦 URL principale: ${mainUrl}`);
      
      // Mettre à jour la base de données
      const { error: updateError } = await supabase
        .from('services')
        .update({ 
          icon_url: mainUrl.replace('.png', '.svg'), // On préfère le SVG dans la DB
          updated_at: new Date().toISOString()
        })
        .eq('id', service.id);
      
      if (updateError) {
        console.log(`   ⚠️  Erreur mise à jour DB:`, updateError.message);
      } else {
        console.log(`   ✅ Base de données mise à jour`);
        successCount++;
      }
      
      // Petite pause pour éviter le rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`   ❌ Erreur:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Succès: ${successCount}`);
  console.log(`⏭️  Skipped: ${skipCount}`);
  console.log(`❌ Erreurs: ${errorCount}`);
  console.log('='.repeat(50));
}

// Parse command line arguments
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

updateServiceLogos(limit).catch(console.error);
