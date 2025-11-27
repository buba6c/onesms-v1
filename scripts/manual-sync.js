#!/usr/bin/env node
/**
 * Script de synchronisation manuelle avec logging conforme
 * 
 * Ce script:
 * 1. Récupère les données de l'API SMS-Activate
 * 2. Met à jour les stocks dans la base
 * 3. Crée des logs conformes dans sync_logs
 * 4. Affiche un rapport détaillé
 * 
 * Usage: node scripts/manual-sync.js
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL || process.env.VITE_SUPABASE_ANON_KEY;
const SMS_ACTIVATE_KEY = process.env.VITE_SMS_ACTIVATE_API_KEY;
const SMS_ACTIVATE_URL = process.env.VITE_SMS_ACTIVATE_API_URL || 'https://api.sms-activate.io/stubs/handler_api.php';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Services prioritaires à synchroniser
const PRIORITY_SERVICES = [
  'wa', 'tg', 'vi', 'ig', 'fb', 'go', 'tw', 'ds', 'vk', 'ok',
  'mm', 'am', 'nf', 'ub', 'ts', 'apple', 'mb', 'spotify', 'tiktok', 'li'
];

async function syncServices() {
  const startTime = new Date();
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     🔄 SYNCHRONISATION MANUELLE SMS-ACTIVATE            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  try {
    // 1. Récupérer les données API
    console.log('📡 Récupération des données SMS-Activate...');
    const response = await axios.get(SMS_ACTIVATE_URL, {
      params: { api_key: SMS_ACTIVATE_KEY, action: 'getNumbersStatus' },
      timeout: 15000
    });
    
    const apiData = response.data;
    const totalServices = Object.keys(apiData).length;
    console.log(`✅ ${totalServices} services récupérés\n`);
    
    // 2. Mettre à jour les services prioritaires
    console.log('💾 Mise à jour des services prioritaires:\n');
    
    let updated = 0;
    let failed = 0;
    const updates = [];
    
    for (const code of PRIORITY_SERVICES) {
      const count = apiData[code] || 0;
      
      // Mise à jour directe via SQL pour bypasser RLS
      const { data, error } = await supabase.rpc('update_service_stock', {
        service_code: code,
        new_stock: count
      });
      
      if (error) {
        // Fallback: essayer avec UPDATE classique
        const { data: updateData, error: updateError } = await supabase
          .from('services')
          .update({ total_available: count })
          .eq('code', code)
          .select('code, name, total_available');
        
        if (updateError || !updateData || updateData.length === 0) {
          console.log(`   ❌ ${code.padEnd(8)} : Échec (${updateError?.message || 'service introuvable'})`);
          failed++;
        } else {
          const icon = count > 0 ? '✅' : '⚠️ ';
          console.log(`   ${icon} ${code.padEnd(8)} : ${String(count).padStart(8)} numéros`);
          updated++;
          updates.push({ code, count, name: updateData[0].name });
        }
      } else {
        const icon = count > 0 ? '✅' : '⚠️ ';
        console.log(`   ${icon} ${code.padEnd(8)} : ${String(count).padStart(8)} numéros`);
        updated++;
        updates.push({ code, count });
      }
    }
    
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    
    // 3. Créer un log de synchronisation conforme
    console.log('\n📝 Création du log de synchronisation...');
    
    const logData = {
      sync_type: 'services',
      provider: 'sms-activate',
      status: failed === 0 ? 'success' : (updated > 0 ? 'partial' : 'error'),
      message: `Synchronisation manuelle: ${updated} services mis à jour${failed > 0 ? `, ${failed} échecs` : ''}`,
      services_synced: updated,
      countries_synced: 0,
      prices_synced: 0,
      started_at: startTime.toISOString(),
      completed_at: endTime.toISOString(),
      triggered_by: 'manual',
      error_message: failed > 0 ? `${failed} services n'ont pas pu être mis à jour` : null
    };
    
    const { error: logError } = await supabase
      .from('sync_logs')
      .insert(logData);
    
    if (logError) {
      console.log(`⚠️  Erreur de logging: ${logError.message}`);
    } else {
      console.log('✅ Log créé avec succès\n');
    }
    
    // 4. Rapport final
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                   📊 RAPPORT FINAL                       ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    console.log(`⏱️  Durée: ${duration.toFixed(2)}s`);
    console.log(`📡 Services API: ${totalServices}`);
    console.log(`✅ Services mis à jour: ${updated}`);
    console.log(`❌ Échecs: ${failed}`);
    console.log(`📈 Taux de réussite: ${((updated / PRIORITY_SERVICES.length) * 100).toFixed(1)}%\n`);
    
    if (updates.length > 0) {
      console.log('🏆 TOP 10 SERVICES MIS À JOUR:\n');
      updates.slice(0, 10).forEach((u, i) => {
        const icon = u.count > 0 ? '✅' : '❌';
        console.log(`${String(i+1).padStart(2)}. ${icon} ${u.code.padEnd(8)} : ${String(u.count).padStart(8)} numéros`);
      });
    }
    
    console.log('\n💡 Rechargez votre Dashboard pour voir les changements!\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    
    // Logger l'erreur
    const endTime = new Date();
    await supabase.from('sync_logs').insert({
      sync_type: 'services',
      provider: 'sms-activate',
      status: 'error',
      message: 'Synchronisation manuelle échouée',
      error_message: error.message,
      services_synced: 0,
      countries_synced: 0,
      prices_synced: 0,
      started_at: startTime.toISOString(),
      completed_at: endTime.toISOString(),
      triggered_by: 'manual'
    });
    
    process.exit(1);
  }
}

// Exécuter
syncServices();
