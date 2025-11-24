#!/usr/bin/env node

/**
 * Script pour mettre à jour l'ordre des services dans Supabase
 * Basé sur l'ordre de 5sim.net (homepage)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Utiliser la clé anon mais s'authentifier en tant qu'admin
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// S'authentifier avec les credentials admin
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'admin@onesms.com', // Utiliser le vrai email admin
  password: process.env.ADMIN_PASSWORD || 'admin123' // À ajuster selon votre config
});

if (authError) {
  console.error('❌ Erreur d\'authentification:', authError.message);
  console.log('\n💡 Alternative: Exécuter les requêtes SQL directement dans Supabase Dashboard');
  process.exit(1);
}

// Ordre exact des services sur 5sim.net (homepage)
const SERVICE_ORDER = [
  { code: 'amazon', score: 1000 },
  { code: 'facebook', score: 950 },
  { code: 'telegram', score: 900 },
  { code: 'whatsapp', score: 850 },
  { code: 'google', score: 800 },
  { code: 'microsoft', score: 750 },
  { code: 'twitter', score: 700 },
  { code: 'instagram', score: 650 },
  { code: 'tiktok', score: 600 },
  { code: 'uber', score: 550 },
  { code: 'netflix', score: 500 },
  { code: 'snapchat', score: 450 },
  { code: 'linkedin', score: 400 },
  { code: 'viber', score: 350 },
  { code: 'wechat', score: 300 },
  { code: 'discord', score: 250 },
  { code: 'spotify', score: 200 },
  { code: 'ebay', score: 150 },
  { code: 'paypal', score: 100 },
];

async function updateServicesOrder() {
  console.log('\n🔄 Mise à jour de l\'ordre des services (comme 5sim.net)...\n');

  let updated = 0;
  let notFound = [];

  // D'abord, réinitialiser tous les scores à 0
  console.log('📌 Réinitialisation de tous les popularity_score...\n');
  await supabase
    .from('services')
    .update({ popularity_score: 0 });

  // Mettre à jour les services prioritaires
  for (const service of SERVICE_ORDER) {
    // Vérifier d'abord si le service existe
    const { data: existing } = await supabase
      .from('services')
      .select('code, name')
      .eq('code', service.code)
      .single();

    if (!existing) {
      console.log(`⚠️  ${service.code.padEnd(15)} → Service non trouvé dans la base`);
      notFound.push(service.code);
      continue;
    }

    // Mettre à jour
    const { data, error } = await supabase
      .from('services')
      .update({ popularity_score: service.score })
      .eq('code', service.code)
      .select();

    if (error) {
      console.error(`❌ ${service.code.padEnd(15)} → Erreur:`, error.message);
    } else if (data && data.length > 0) {
      console.log(`✅ ${service.code.padEnd(15)} → popularity_score: ${service.score}`);
      updated++;
    } else {
      console.log(`⚠️  ${service.code.padEnd(15)} → Pas de données retournées`);
      notFound.push(service.code);
    }
  }

  console.log(`\n📊 Résumé:`);
  console.log(`   ✅ Services mis à jour: ${updated}`);
  console.log(`   ⚠️  Services non trouvés: ${notFound.length}`);
  
  if (notFound.length > 0) {
    console.log(`\n⚠️  Services non trouvés dans la base:`);
    notFound.forEach(code => console.log(`   • ${code}`));
  }

  // Afficher l'ordre final
  console.log('\n\n📋 ORDRE FINAL DES SERVICES:\n');
  
  const { data: allServices, error: fetchError } = await supabase
    .from('services')
    .select('code, name, display_name, popularity_score, total_available, active')
    .order('popularity_score', { ascending: false })
    .order('total_available', { ascending: false })
    .limit(30);

  if (fetchError) {
    console.error('❌ Erreur:', fetchError);
    return;
  }

  allServices.forEach((s, i) => {
    const displayName = s.display_name || s.name;
    const status = s.active ? '✅' : '❌';
    console.log(
      `  ${(i + 1).toString().padStart(2)}. ${displayName.padEnd(25)} | ` +
      `Score: ${s.popularity_score.toString().padStart(4)} | ` +
      `Stock: ${s.total_available.toLocaleString().padStart(10)} | ` +
      `${status}`
    );
  });

  console.log('\n✅ Mise à jour terminée!\n');
  console.log('💡 Les services apparaîtront maintenant dans le même ordre que sur 5sim.net\n');
}

updateServicesOrder().catch(console.error);
