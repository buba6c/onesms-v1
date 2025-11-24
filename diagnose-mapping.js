#!/usr/bin/env node

/**
 * Diagnostic: Vérifier le mapping des pays entre 5sim et notre DB
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const SERVICE = 'google';

async function diagnoseMapping() {
  console.log('🔍 DIAGNOSTIC: Mapping 5sim vs DB pour', SERVICE);
  console.log('');

  // 1. Récupérer données 5sim
  const response = await fetch(`https://5sim.net/v1/guest/prices?product=${SERVICE}`);
  const data = await response.json();
  const serviceData = data[SERVICE];

  const countries5sim = [];
  for (const [countryName, operators] of Object.entries(serviceData)) {
    let totalCount = 0;
    let maxRate = 0;

    for (const [opName, opData] of Object.entries(operators)) {
      totalCount += opData.count || 0;
      const rate = opData.rate || 0;
      if (rate > maxRate) maxRate = rate;
    }

    countries5sim.push({
      code: countryName,
      maxRate,
      totalCount
    });
  }

  // Tri comme dans le code
  countries5sim.sort((a, b) => {
    if (b.maxRate !== a.maxRate) return b.maxRate - a.maxRate;
    return b.totalCount - a.totalCount;
  });

  console.log('📊 Top 10 selon 5sim (brut):');
  countries5sim.slice(0, 10).forEach((c, i) => {
    console.log(`  ${(i+1).toString().padStart(2)}. ${c.code.padEnd(20)} ${c.maxRate}% (${c.totalCount} nums)`);
  });
  console.log('');

  // 2. Vérifier le mapping avec notre DB
  const countryCodes = countries5sim.map(c => c.code);
  const { data: dbCountries } = await supabase
    .from('countries')
    .select('code, name, flag_emoji')
    .in('code', countryCodes);

  console.log('🗄️  Pays trouvés dans notre DB:', dbCountries?.length, '/', countryCodes.length);
  console.log('');

  // 3. Identifier les pays manquants
  const dbMap = new Map(dbCountries?.map(c => [c.code.toLowerCase(), c]) || []);
  const missing = countries5sim.filter(c => !dbMap.has(c.code.toLowerCase()));

  if (missing.length > 0) {
    console.log('⚠️  PAYS MANQUANTS DANS DB (ils ne s\'afficheront PAS):');
    missing.slice(0, 15).forEach((c, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. ${c.code.padEnd(20)} ${c.maxRate}% (${c.totalCount} nums)`);
    });
    console.log('');
  }

  // 4. Simuler le mapping final (comme dans DashboardPage)
  const mapped = countries5sim
    .filter(c => c.totalCount > 0)
    .map(live => {
      const dbCountry = dbMap.get(live.code.toLowerCase());
      return {
        code: live.code,
        name: dbCountry?.name || live.code,
        maxRate: live.maxRate,
        totalCount: live.totalCount,
        inDB: !!dbCountry
      };
    });

  console.log('✅ Top 10 APRÈS mapping (ce que l\'utilisateur voit):');
  mapped.slice(0, 10).forEach((c, i) => {
    const status = c.inDB ? '✓' : '✗';
    console.log(`  ${(i+1).toString().padStart(2)}. [${status}] ${c.name.padEnd(20)} ${c.maxRate}% (${c.totalCount} nums)`);
  });
  console.log('');

  // 5. Vérifier pricing_rules
  const { data: pricingData } = await supabase
    .from('pricing_rules')
    .select('country_code, activation_price, available_count')
    .eq('service_code', SERVICE)
    .eq('active', true);

  console.log('💰 Pricing rules trouvés:', pricingData?.length || 0);
  
  if (pricingData && pricingData.length > 0) {
    const priceMap = new Map(pricingData.map(p => [p.country_code.toLowerCase(), p]));
    const top5 = mapped.slice(0, 5);
    
    console.log('');
    console.log('💵 Prix des 5 meilleurs pays:');
    top5.forEach((c, i) => {
      const pricing = priceMap.get(c.code.toLowerCase());
      if (pricing) {
        console.log(`  ${(i+1).toString().padStart(2)}. ${c.name.padEnd(20)} ${pricing.activation_price}Ⓐ`);
      } else {
        console.log(`  ${(i+1).toString().padStart(2)}. ${c.name.padEnd(20)} ⚠️  PAS DE PRIX`);
      }
    });
  }

  console.log('');
  console.log('📋 RÉSUMÉ:');
  console.log(`  - Pays 5sim: ${countries5sim.length}`);
  console.log(`  - Pays DB: ${dbCountries?.length || 0}`);
  console.log(`  - Pays manquants: ${missing.length}`);
  console.log(`  - Pricing rules: ${pricingData?.length || 0}`);
}

diagnoseMapping().catch(console.error);
