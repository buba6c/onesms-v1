/**
 * 🧹 NETTOYAGE INTELLIGENT DES SERVICES DUPLIQUÉS
 * 
 * Ce script supprime les services obsolètes créés lors de l'ancienne synchronisation:
 * - Services avec codes longs (>3 chars) qui sont des doublons des codes courts
 * - Services inactifs avec stock=0
 * - Services créés avant la nouvelle synchronisation (21/11/2025)
 * 
 * STRATÉGIE:
 * 1. Garder TOUS les codes courts (API standard: wa, tg, ig, etc.)
 * 2. Supprimer les codes longs inactifs (netflix, uber, wechat, etc.)
 * 3. Garder les codes longs ACTIFS avec stock>0 (cas rares)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.env.DRY_RUN === 'true';

async function cleanupDuplicateServices() {
  console.log('\n🧹 NETTOYAGE INTELLIGENT DES SERVICES DUPLIQUÉS\n');
  console.log('='.repeat(80));
  
  if (DRY_RUN) {
    console.log('\n⚠️  MODE TEST (DRY_RUN=true) - Aucune suppression réelle\n');
  }
  
  try {
    // 1. Charger tous les services
    console.log('\n📊 Chargement des services...\n');
    
    const { data: allServices, error } = await supabase
      .from('services')
      .select('id, code, name, display_name, active, total_available, created_at, updated_at')
      .order('code', { ascending: true });
    
    if (error) throw error;
    
    console.log(`   Total services:             ${allServices.length}`);
    console.log(`   Services actifs:            ${allServices.filter(s => s.active).length}`);
    console.log(`   Services inactifs:          ${allServices.filter(s => !s.active).length}`);
    
    // 2. Identifier les services à supprimer
    console.log('\n\n🔍 Identification des doublons...\n');
    
    const toDelete = [];
    const servicesByName = {};
    
    // Grouper par nom
    allServices.forEach(s => {
      const name = (s.display_name || s.name || '').trim().toLowerCase();
      if (!servicesByName[name]) {
        servicesByName[name] = [];
      }
      servicesByName[name].push(s);
    });
    
    // Trouver les doublons problématiques
    Object.entries(servicesByName).forEach(([name, services]) => {
      if (services.length > 1) {
        // Vérifier si on a code court ET code long
        const shortCodes = services.filter(s => s.code.length <= 3);
        const longCodes = services.filter(s => s.code.length > 3);
        
        if (shortCodes.length > 0 && longCodes.length > 0) {
          // Règle: Garder les codes courts, supprimer les codes longs INACTIFS avec stock=0
          longCodes.forEach(s => {
            if (!s.active && s.total_available === 0) {
              toDelete.push({
                ...s,
                reason: `Doublon de code court (${shortCodes[0].code})`
              });
            }
          });
        }
      }
    });
    
    // 3. Ajouter TOUS les autres codes longs inactifs obsolètes
    const otherLongInactive = allServices.filter(s => 
      s.code.length > 3 && 
      !s.active && 
      s.total_available === 0 &&
      !toDelete.find(d => d.id === s.id)
    );
    
    otherLongInactive.forEach(s => {
      toDelete.push({
        ...s,
        reason: 'Code long inactif obsolète'
      });
    });
    
    console.log(`   Doublons identifiés:        ${toDelete.length}`);
    console.log(`   - Doublons de codes courts: ${toDelete.filter(s => s.reason.includes('Doublon')).length}`);
    console.log(`   - Autres obsolètes:         ${toDelete.filter(s => s.reason.includes('obsolète')).length}`);
    
    // 4. Validation finale
    console.log('\n\n✅ VALIDATION:\n');
    
    const activeToDelete = toDelete.filter(s => s.active);
    const withStockToDelete = toDelete.filter(s => s.total_available > 0);
    const shortCodeToDelete = toDelete.filter(s => s.code.length <= 3);
    
    console.log(`   Services actifs à supprimer:    ${activeToDelete.length} ${activeToDelete.length === 0 ? '✅' : '❌ ATTENTION!'}`);
    console.log(`   Services avec stock à supprimer: ${withStockToDelete.length} ${withStockToDelete.length === 0 ? '✅' : '❌ ATTENTION!'}`);
    console.log(`   Codes courts à supprimer:       ${shortCodeToDelete.length} ${shortCodeToDelete.length === 0 ? '✅' : '❌ ATTENTION!'}`);
    
    if (activeToDelete.length > 0 || withStockToDelete.length > 0 || shortCodeToDelete.length > 0) {
      console.log('\n❌ ERREUR: La validation a échoué! Vérifiez les règles de suppression.\n');
      return;
    }
    
    // 5. Afficher échantillon
    console.log('\n\n📋 ÉCHANTILLON DES SERVICES À SUPPRIMER (20 premiers):\n');
    
    toDelete.slice(0, 20).forEach((s, i) => {
      const created = new Date(s.created_at).toLocaleDateString();
      console.log(`   ${String(i+1).padStart(2)}. ${s.code.padEnd(15)} "${(s.display_name || s.name).substring(0, 20).padEnd(20)}" - ${s.reason}`);
    });
    
    // 6. Confirmer et supprimer
    if (toDelete.length === 0) {
      console.log('\n✅ Aucun service à supprimer!\n');
      return;
    }
    
    console.log('\n\n' + '='.repeat(80));
    console.log('\n🗑️  SUPPRESSION EN COURS...\n');
    
    if (DRY_RUN) {
      console.log('   ⚠️  MODE TEST - Simulation uniquement\n');
    } else {
      const batchSize = 100;
      let deleted = 0;
      
      for (let i = 0; i < toDelete.length; i += batchSize) {
        const batch = toDelete.slice(i, i + batchSize);
        const ids = batch.map(s => s.id);
        
        const { error: deleteError } = await supabase
          .from('services')
          .delete()
          .in('id', ids);
        
        if (deleteError) {
          console.error(`   ❌ Erreur batch ${Math.floor(i/batchSize) + 1}: ${deleteError.message}`);
        } else {
          deleted += ids.length;
          console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(toDelete.length/batchSize)} supprimé (${ids.length} services)`);
        }
      }
      
      console.log(`\n   Total supprimé:             ${deleted}/${toDelete.length}`);
    }
    
    // 7. Vérification POST-nettoyage
    console.log('\n\n📊 VÉRIFICATION POST-NETTOYAGE...\n');
    
    const { data: afterServices } = await supabase
      .from('services')
      .select('code, active')
      .order('code');
    
    // Vérifier les doublons restants
    const codeCount = {};
    afterServices.forEach(s => {
      codeCount[s.code] = (codeCount[s.code] || 0) + 1;
    });
    
    const remainingDuplicates = Object.entries(codeCount).filter(([code, count]) => count > 1);
    
    console.log(`   Services restants:          ${afterServices.length}`);
    console.log(`   Services actifs:            ${afterServices.filter(s => s.active).length}`);
    console.log(`   Doublons restants:          ${remainingDuplicates.length} ${remainingDuplicates.length === 0 ? '✅' : '⚠️'}`);
    
    if (remainingDuplicates.length > 0) {
      console.log('\n   ⚠️  Doublons restants:\n');
      remainingDuplicates.slice(0, 10).forEach(([code, count]) => {
        console.log(`      ${code.padEnd(15)} - ${count} fois`);
      });
    }
    
    // 8. Résumé final
    console.log('\n\n' + '='.repeat(80));
    console.log('\n📊 RÉSUMÉ FINAL:\n');
    console.log(`   Services supprimés:         ${toDelete.length}`);
    console.log(`   Services restants:          ${afterServices.length}`);
    console.log(`   Réduction:                  -${((toDelete.length / allServices.length) * 100).toFixed(1)}%`);
    console.log(`   \n   État:                       ${remainingDuplicates.length === 0 ? '✅ PROPRE' : '⚠️  DOUBLONS RESTANTS'}`);
    
    if (!DRY_RUN) {
      console.log('\n\n💡 PROCHAINES ÉTAPES:\n');
      console.log('   1. Vérifier l\'interface admin');
      console.log('   2. Relancer la synchronisation complète');
      console.log('   3. Vérifier que les logos s\'affichent correctement\n');
    } else {
      console.log('\n\n💡 POUR EXÉCUTER RÉELLEMENT:\n');
      console.log('   Relancer sans DRY_RUN=true\n');
    }
    
    console.log('='.repeat(80));
    console.log('\n✅ NETTOYAGE TERMINÉ\n');
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Exécution
cleanupDuplicateServices().then(() => process.exit(0));
