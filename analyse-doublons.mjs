import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gqvxrvxmfvlnhukbpdjb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxdnhydnhtZnZsbmh1a2JwZGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1NTk5NDEsImV4cCI6MjA1MzEzNTk0MX0.kCmB5JOmV9yBvKFuCZBp2J_Lbm7ykzGsU9Tz6V5JXvA'
);

console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║  �� ANALYSE APPROFONDIE DES DOUBLONS DE SERVICES                          ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

try {
  // 1. Récupérer tous les services
  const { data: allServices, error } = await supabase
    .from('services')
    .select('*')
    .order('code');

  if (error) throw error;

  console.log(`📊 Total services dans la base: ${allServices.length}\n`);

  // 2. Analyser les doublons par NAME
  console.log('�� ANALYSE DES DOUBLONS PAR NOM');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  
  const nameGroups = {};
  allServices.forEach(service => {
    const name = (service.name || '').toLowerCase().trim();
    if (!nameGroups[name]) {
      nameGroups[name] = [];
    }
    nameGroups[name].push(service);
  });

  const duplicatesByName = Object.entries(nameGroups).filter(([_, services]) => services.length > 1);
  
  if (duplicatesByName.length > 0) {
    console.log(`⚠️  DOUBLONS DÉTECTÉS: ${duplicatesByName.length} noms en doublon\n`);
    
    duplicatesByName.forEach(([name, services]) => {
      console.log(`\n🔴 NOM: "${name}" (${services.length} entrées)`);
      console.log('─────────────────────────────────────────────────────────────────────────────');
      services.forEach((s, i) => {
        console.log(`   ${i + 1}. Code: ${s.code.padEnd(6)} | Display: ${s.display_name || 'NULL'.padEnd(20)} | Active: ${s.active ? '✅' : '❌'} | ID: ${s.id}`);
      });
      
      // Recommandation de suppression
      const inactiveServices = services.filter(s => !s.active);
      const activeServices = services.filter(s => s.active);
      
      if (inactiveServices.length > 0 && activeServices.length > 0) {
        console.log(`\n   💡 RECOMMANDATION: Supprimer les ${inactiveServices.length} service(s) inactif(s):`);
        inactiveServices.forEach(s => {
          console.log(`      DELETE FROM services WHERE id = '${s.id}'; -- Code: ${s.code}`);
        });
      } else if (services.length > 1) {
        // Garder celui avec le code le plus court ou le plus commun
        const sortedByCode = [...services].sort((a, b) => a.code.length - b.code.length || a.code.localeCompare(b.code));
        const toKeep = sortedByCode[0];
        const toDelete = sortedByCode.slice(1);
        
        console.log(`\n   💡 RECOMMANDATION: Garder code "${toKeep.code}", supprimer les autres:`);
        toDelete.forEach(s => {
          console.log(`      DELETE FROM services WHERE id = '${s.id}'; -- Code: ${s.code}`);
        });
      }
    });
  } else {
    console.log('✅ Aucun doublon détecté par nom\n');
  }

  // 3. Analyser les doublons par DISPLAY_NAME
  console.log('\n\n🔍 ANALYSE DES DOUBLONS PAR DISPLAY_NAME');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  
  const displayNameGroups = {};
  allServices.forEach(service => {
    const displayName = (service.display_name || '').toLowerCase().trim();
    if (displayName && displayName !== '') {
      if (!displayNameGroups[displayName]) {
        displayNameGroups[displayName] = [];
      }
      displayNameGroups[displayName].push(service);
    }
  });

  const duplicatesByDisplayName = Object.entries(displayNameGroups).filter(([_, services]) => services.length > 1);
  
  if (duplicatesByDisplayName.length > 0) {
    console.log(`⚠️  DOUBLONS DÉTECTÉS: ${duplicatesByDisplayName.length} display_name en doublon\n`);
    
    duplicatesByDisplayName.forEach(([displayName, services]) => {
      console.log(`\n🔴 DISPLAY_NAME: "${displayName}" (${services.length} entrées)`);
      console.log('─────────────────────────────────────────────────────────────────────────────');
      services.forEach((s, i) => {
        console.log(`   ${i + 1}. Code: ${s.code.padEnd(6)} | Name: ${s.name.padEnd(20)} | Active: ${s.active ? '✅' : '❌'} | ID: ${s.id}`);
      });
      
      // Recommandation
      const inactiveServices = services.filter(s => !s.active);
      const activeServices = services.filter(s => s.active);
      
      if (inactiveServices.length > 0 && activeServices.length > 0) {
        console.log(`\n   💡 RECOMMANDATION: Supprimer les ${inactiveServices.length} service(s) inactif(s):`);
        inactiveServices.forEach(s => {
          console.log(`      DELETE FROM services WHERE id = '${s.id}'; -- Code: ${s.code}`);
        });
      } else if (services.length > 1) {
        const sortedByCode = [...services].sort((a, b) => a.code.length - b.code.length || a.code.localeCompare(b.code));
        const toKeep = sortedByCode[0];
        const toDelete = sortedByCode.slice(1);
        
        console.log(`\n   💡 RECOMMANDATION: Garder code "${toKeep.code}", supprimer les autres:`);
        toDelete.forEach(s => {
          console.log(`      DELETE FROM services WHERE id = '${s.id}'; -- Code: ${s.code}`);
        });
      }
    });
  } else {
    console.log('✅ Aucun doublon détecté par display_name\n');
  }

  // 4. Analyser les doublons par CODE
  console.log('\n\n🔍 ANALYSE DES DOUBLONS PAR CODE');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  
  const codeGroups = {};
  allServices.forEach(service => {
    const code = service.code.toLowerCase().trim();
    if (!codeGroups[code]) {
      codeGroups[code] = [];
    }
    codeGroups[code].push(service);
  });

  const duplicatesByCode = Object.entries(codeGroups).filter(([_, services]) => services.length > 1);
  
  if (duplicatesByCode.length > 0) {
    console.log(`⚠️  DOUBLONS DÉTECTÉS: ${duplicatesByCode.length} codes en doublon\n`);
    
    duplicatesByCode.forEach(([code, services]) => {
      console.log(`\n🔴 CODE: "${code}" (${services.length} entrées)`);
      console.log('─────────────────────────────────────────────────────────────────────────────');
      services.forEach((s, i) => {
        console.log(`   ${i + 1}. Name: ${s.name.padEnd(20)} | Display: ${s.display_name || 'NULL'.padEnd(20)} | Active: ${s.active ? '✅' : '❌'} | ID: ${s.id}`);
      });
    });
  } else {
    console.log('✅ Aucun doublon détecté par code (NORMAL - code est UNIQUE)\n');
  }

  // 5. RÉSUMÉ ET SCRIPT DE NETTOYAGE
  console.log('\n\n📋 RÉSUMÉ ET SCRIPT DE NETTOYAGE');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  
  const allToDelete = new Set();
  
  // Collecter tous les IDs à supprimer
  duplicatesByName.forEach(([name, services]) => {
    const inactiveServices = services.filter(s => !s.active);
    const activeServices = services.filter(s => s.active);
    
    if (inactiveServices.length > 0 && activeServices.length > 0) {
      inactiveServices.forEach(s => allToDelete.add(s.id));
    } else if (services.length > 1) {
      const sortedByCode = [...services].sort((a, b) => a.code.length - b.code.length || a.code.localeCompare(b.code));
      sortedByCode.slice(1).forEach(s => allToDelete.add(s.id));
    }
  });

  duplicatesByDisplayName.forEach(([displayName, services]) => {
    const inactiveServices = services.filter(s => !s.active);
    const activeServices = services.filter(s => s.active);
    
    if (inactiveServices.length > 0 && activeServices.length > 0) {
      inactiveServices.forEach(s => allToDelete.add(s.id));
    } else if (services.length > 1) {
      const sortedByCode = [...services].sort((a, b) => a.code.length - b.code.length || a.code.localeCompare(b.code));
      sortedByCode.slice(1).forEach(s => allToDelete.add(s.id));
    }
  });

  if (allToDelete.size > 0) {
    console.log(`⚠️  TOTAL À SUPPRIMER: ${allToDelete.size} services en doublon\n`);
    console.log('-- ═══════════════════════════════════════════════════════════════════════════');
    console.log('-- SCRIPT SQL DE NETTOYAGE DES DOUBLONS');
    console.log('-- ═══════════════════════════════════════════════════════════════════════════\n');
    console.log('BEGIN;\n');
    
    for (const id of allToDelete) {
      const service = allServices.find(s => s.id === id);
      console.log(`DELETE FROM services WHERE id = '${id}'; -- ${service.code} / ${service.name}`);
    }
    
    console.log('\nCOMMIT;\n');
    console.log('-- ═══════════════════════════════════════════════════════════════════════════');
  } else {
    console.log('✅ Aucune suppression nécessaire - Base de données propre!\n');
  }

  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ ANALYSE TERMINÉE                                                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

} catch (error) {
  console.error('❌ Erreur:', {
    message: error.message,
    details: error.toString()
  });
}
