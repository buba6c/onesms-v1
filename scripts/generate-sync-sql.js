#!/usr/bin/env node
/**
 * Génère un script SQL de synchronisation avec les données en temps réel de l'API
 * 
 * Usage: node scripts/generate-sync-sql.js > scripts/sync-now.sql
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const SMS_ACTIVATE_KEY = process.env.VITE_SMS_ACTIVATE_API_KEY;
const SMS_ACTIVATE_URL = process.env.VITE_SMS_ACTIVATE_API_URL || 'https://api.sms-activate.io/stubs/handler_api.php';

// Services prioritaires
const PRIORITY_SERVICES = [
  { code: 'wa', name: 'WhatsApp' },
  { code: 'tg', name: 'Telegram' },
  { code: 'vi', name: 'Viber' },
  { code: 'ig', name: 'Instagram' },
  { code: 'fb', name: 'Facebook' },
  { code: 'go', name: 'Google' },
  { code: 'tw', name: 'Twitter' },
  { code: 'ds', name: 'Discord' },
  { code: 'vk', name: 'VKontakte' },
  { code: 'ok', name: 'Odnoklassniki' },
  { code: 'mm', name: 'Microsoft' },
  { code: 'am', name: 'Amazon' },
  { code: 'nf', name: 'Netflix' },
  { code: 'ub', name: 'Uber' },
  { code: 'ts', name: 'PayPal' },
  { code: 'apple', name: 'Apple' },
  { code: 'mb', name: 'MB' },
  { code: 'spotify', name: 'Spotify' },
  { code: 'tiktok', name: 'TikTok' },
  { code: 'li', name: 'LinkedIn' }
];

async function generateSyncSQL() {
  try {
    console.error('🔄 Récupération des données SMS-Activate...\n');
    
    const response = await axios.get(SMS_ACTIVATE_URL, {
      params: { api_key: SMS_ACTIVATE_KEY, action: 'getNumbersStatus' },
      timeout: 15000
    });
    
    const apiData = response.data;
    console.error(`✅ ${Object.keys(apiData).length} services récupérés\n`);
    
    // Générer le SQL
    console.log('-- ============================================================================');
    console.log('-- SYNCHRONISATION SMS-ACTIVATE');
    console.log(`-- Généré le: ${new Date().toLocaleString('fr-FR')}`);
    console.log('-- ============================================================================\n');
    console.log('BEGIN;\n');
    console.log('-- Mise à jour des stocks\n');
    
    let updated = 0;
    let notFound = 0;
    
    for (const { code, name } of PRIORITY_SERVICES) {
      const count = apiData[code];
      
      if (count !== undefined) {
        console.log(`UPDATE services SET total_available = ${count} WHERE code = '${code}'; -- ${name}: ${count} numéros`);
        updated++;
      } else {
        console.log(`-- ⚠️  ${code} (${name}): Non disponible dans l'API`);
        notFound++;
      }
    }
    
    console.log('\n-- Créer un log de synchronisation\n');
    console.log(`INSERT INTO sync_logs (
  sync_type,
  provider,
  status,
  message,
  services_synced,
  countries_synced,
  prices_synced,
  started_at,
  completed_at,
  triggered_by
) VALUES (
  'services',
  'sms-activate',
  'success',
  'Synchronisation automatique: ${updated} services mis à jour',
  ${updated},
  0,
  0,
  NOW(),
  NOW(),
  'script'
);\n`);
    
    console.log('COMMIT;\n');
    console.log('-- ============================================================================');
    console.log(`-- ✅ ${updated} services à mettre à jour`);
    console.log(`-- ⚠️  ${notFound} services non trouvés dans l'API`);
    console.log('-- ============================================================================');
    
    console.error(`\n✅ Script SQL généré!`);
    console.error(`   ${updated} services à mettre à jour`);
    console.error(`   ${notFound} services non trouvés`);
    console.error(`\n💡 Pour exécuter:`);
    console.error(`   1. Copier le SQL ci-dessus`);
    console.error(`   2. Ouvrir Supabase SQL Editor`);
    console.error(`   3. Coller et exécuter\n`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

generateSyncSQL();
