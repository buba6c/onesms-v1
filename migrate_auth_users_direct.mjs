#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseCloud = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

const supabaseCoolify = createClient(
  'http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.1yLw9EuRiBBqodz_M9XwyQlOzzdSwgjzX-1en5MSnBg'
);

console.log('🔐 MIGRATION AUTH.USERS - MÉTHODE DIRECTE VIA AUTH API\n');
console.log('=' .repeat(80));

async function migrateAuthUsers() {
  try {
    // 1. Récupérer tous les users depuis Cloud
    console.log('\n📥 1. Récupération des users depuis Cloud...');
    const { data: { users: cloudUsers }, error: cloudError } = await supabaseCloud.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    
    if (cloudError) {
      console.error('❌ Erreur Cloud:', cloudError);
      return;
    }
    
    console.log(`   ✅ ${cloudUsers.length} users trouvés sur Cloud`);
    
    // 2. Vérifier combien sur Coolify
    console.log('\n📊 2. Vérification sur Coolify...');
    const { data: { users: coolifyUsers }, error: coolifyError } = await supabaseCoolify.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    
    if (coolifyError) {
      console.error('❌ Erreur Coolify:', coolifyError);
      return;
    }
    
    console.log(`   ℹ️  ${coolifyUsers.length} users déjà sur Coolify`);
    
    // 3. Créer les users manquants
    const coolifyEmails = new Set(coolifyUsers.map(u => u.email));
    const missingUsers = cloudUsers.filter(u => !coolifyEmails.has(u.email));
    
    console.log(`\n📋 3. Analyse:`);
    console.log(`   - Total Cloud: ${cloudUsers.length}`);
    console.log(`   - Déjà sur Coolify: ${cloudUsers.length - missingUsers.length}`);
    console.log(`   - À créer: ${missingUsers.length}`);
    
    if (missingUsers.length === 0) {
      console.log('\n✅ Tous les users existent déjà sur Coolify!');
      return;
    }
    
    // 4. Créer les users via Auth Admin API
    console.log(`\n🔧 4. Création des users sur Coolify...`);
    console.log(`   (Mot de passe temporaire: ChangeMe123!)\n`);
    
    let created = 0;
    let failed = 0;
    const failedUsers = [];
    
    for (const user of missingUsers) {
      try {
        const { data, error } = await supabaseCoolify.auth.admin.createUser({
          email: user.email,
          email_confirm: true,
          password: 'ChangeMe123!',  // Mot de passe temporaire
          user_metadata: {
            ...user.user_metadata,
            migrated_from_cloud: true,
            migration_date: new Date().toISOString(),
            original_id: user.id
          },
          app_metadata: user.app_metadata
        });
        
        if (error) {
          console.error(`   ❌ ${user.email}: ${error.message}`);
          failed++;
          failedUsers.push({ email: user.email, error: error.message });
        } else {
          console.log(`   ✅ ${user.email}`);
          created++;
        }
        
        // Petit délai pour éviter rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.error(`   ❌ ${user.email}: ${err.message}`);
        failed++;
        failedUsers.push({ email: user.email, error: err.message });
      }
    }
    
    // 5. Résumé
    console.log('\n');
    console.log('='.repeat(80));
    console.log('📊 RÉSUMÉ DE LA MIGRATION');
    console.log('='.repeat(80));
    console.log(`
✅ Users créés: ${created}/${missingUsers.length}
❌ Échecs: ${failed}

📧 Users avec auth.users sur Coolify: ${coolifyUsers.length + created}
📧 Target (Cloud): ${cloudUsers.length}

${failed > 0 ? `\n⚠️  Users en échec:\n${failedUsers.map(f => `   - ${f.email}: ${f.error}`).join('\n')}` : ''}

🔑 Mot de passe temporaire: ChangeMe123!

📋 PROCHAINES ÉTAPES:
   1. Informer les users de changer leur mot de passe
   2. Tester la connexion avec un compte
   3. Vérifier que les balances correspondent (table public.users)
`);
    
    // Sauvegarder le rapport
    const report = {
      timestamp: new Date().toISOString(),
      cloud_users: cloudUsers.length,
      coolify_users_before: coolifyUsers.length,
      coolify_users_after: coolifyUsers.length + created,
      created,
      failed,
      failed_users: failedUsers,
      temp_password: 'ChangeMe123!'
    };
    
    fs.writeFileSync('auth_migration_report.json', JSON.stringify(report, null, 2));
    console.log('📄 Rapport sauvegardé: auth_migration_report.json');
    
  } catch (error) {
    console.error('\n❌ ERREUR CRITIQUE:', error);
  }
}

migrateAuthUsers();
