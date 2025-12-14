#!/usr/bin/env node

/**
 * SCRIPT D'IMPORT DES AUTH.USERS DEPUIS CLOUD VERS COOLIFY
 * 
 * Ce script:
 * 1. Exporte tous les users depuis Supabase Cloud (table public.users + auth via admin API)
 * 2. Crée les users sur Coolify avec les mêmes identifiants
 * 3. Préserve les balances, roles et metadata
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Supabase Cloud (source)
const supabaseCloud = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Supabase Coolify (destination)
const supabaseCoolify = createClient(
  'http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.1yLw9EuRiBBqodz_M9XwyQlOzzdSwgjzX-1en5MSnBg',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

console.log('🔐 MIGRATION AUTH.USERS - CLOUD → COOLIFY\n');
console.log('=' .repeat(80));

async function migrateAuthUsers() {
  try {
    // ========================================================================
    // 1. RÉCUPÉRER LES USERS DEPUIS CLOUD
    // ========================================================================
    console.log('\n📥 1. Récupération des users depuis Cloud...');
    
    const { data: cloudUsers, error: cloudError } = await supabaseCloud
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (cloudError) {
      console.error('❌ Erreur lecture Cloud:', cloudError);
      throw cloudError;
    }
    
    console.log(`   ✅ ${cloudUsers.length} users trouvés sur Cloud`);
    
    // ========================================================================
    // 2. RÉCUPÉRER LES USERS ACTUELS SUR COOLIFY
    // ========================================================================
    console.log('\n📊 2. Vérification des users sur Coolify...');
    
    const { data: coolifyUsers, error: coolifyError } = await supabaseCoolify
      .from('users')
      .select('email');
    
    if (coolifyError) {
      console.error('❌ Erreur lecture Coolify:', coolifyError);
      throw coolifyError;
    }
    
    const coolifyEmails = new Set(coolifyUsers?.map(u => u.email) || []);
    console.log(`   ℹ️  ${coolifyUsers.length} users déjà sur Coolify`);
    
    // ========================================================================
    // 3. IDENTIFIER LES USERS MANQUANTS
    // ========================================================================
    const missingUsers = cloudUsers.filter(u => !coolifyEmails.has(u.email));
    
    console.log(`\n📋 3. Analyse des users:`);
    console.log(`   - Total Cloud: ${cloudUsers.length}`);
    console.log(`   - Déjà sur Coolify: ${cloudUsers.length - missingUsers.length}`);
    console.log(`   - À migrer: ${missingUsers.length}`);
    
    if (missingUsers.length === 0) {
      console.log('\n✅ Tous les users sont déjà sur Coolify!');
      return;
    }
    
    // ========================================================================
    // 4. PRÉPARER LES DONNÉES D'EXPORT
    // ========================================================================
    console.log(`\n📝 4. Préparation des données...`);
    
    const exportData = {
      timestamp: new Date().toISOString(),
      total_users: missingUsers.length,
      users: missingUsers.map(user => ({
        // Données publiques (table public.users)
        id: user.id,
        email: user.email,
        phone: user.phone,
        balance: user.balance || 0,
        frozen_balance: user.frozen_balance || 0,
        role: user.role || 'user',
        suspended: user.suspended || false,
        created_at: user.created_at,
        updated_at: user.updated_at,
        referral_code: user.referral_code,
        referred_by: user.referred_by,
        
        // Note: Le password hashé n'est PAS dans public.users
        // Il faut utiliser Supabase Auth Admin API pour créer les users
        // avec la possibilité de définir un mot de passe temporaire
      }))
    };
    
    // Sauvegarder l'export
    const exportFile = 'auth_users_export.json';
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
    console.log(`   ✅ Export sauvegardé: ${exportFile}`);
    
    // ========================================================================
    // 5. GÉNÉRER LE SCRIPT SQL POUR IMPORT MANUEL
    // ========================================================================
    console.log(`\n📜 5. Génération du script SQL...`);
    
    let sqlScript = `-- Script d'import des users manquants
-- Généré le: ${new Date().toISOString()}
-- Total users: ${missingUsers.length}

BEGIN;

-- Désactiver temporairement les triggers
SET session_replication_role = replica;

`;
    
    for (const user of missingUsers) {
      sqlScript += `
-- User: ${user.email}
INSERT INTO public.users (
  id, email, phone, balance, frozen_balance, role, suspended, created_at, updated_at, referral_code, referred_by
) VALUES (
  '${user.id}',
  ${user.email ? `'${user.email.replace(/'/g, "''")}'` : 'NULL'},
  ${user.phone ? `'${user.phone}'` : 'NULL'},
  ${user.balance || 0},
  ${user.frozen_balance || 0},
  '${user.role || 'user'}',
  ${user.suspended || false},
  '${user.created_at}',
  '${user.updated_at}',
  ${user.referral_code ? `'${user.referral_code}'` : 'NULL'},
  ${user.referred_by ? `'${user.referred_by}'` : 'NULL'}
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  balance = EXCLUDED.balance,
  frozen_balance = EXCLUDED.frozen_balance,
  role = EXCLUDED.role,
  updated_at = EXCLUDED.updated_at;

`;
    }
    
    sqlScript += `
-- Réactiver les triggers
SET session_replication_role = DEFAULT;

COMMIT;

-- Vérifier l'import
SELECT 'Total users après import:' as info, COUNT(*) as count FROM public.users;
`;
    
    const sqlFile = 'import_users_manual.sql';
    fs.writeFileSync(sqlFile, sqlScript);
    console.log(`   ✅ Script SQL généré: ${sqlFile}`);
    
    // ========================================================================
    // 6. INSTRUCTIONS POUR CRÉER LES AUTH.USERS
    // ========================================================================
    console.log(`\n📋 6. Génération des instructions auth...`);
    
    let authInstructions = `# Instructions pour créer les users auth sur Coolify

Total users à créer: ${missingUsers.length}

## Option A: Via Supabase Auth Admin API (recommandé)

Pour chaque user, exécuter:

\`\`\`javascript
// Dans la console Coolify ou via script Node.js
const { data, error } = await supabase.auth.admin.createUser({
  email: 'user@example.com',
  email_confirm: true,
  password: 'TEMPORARY_PASSWORD_123',  // User devra changer
  user_metadata: {
    migrated_from_cloud: true,
    migration_date: '${new Date().toISOString()}'
  }
});
\`\`\`

## Option B: Inviter les users à se réinscrire

Envoyer un email à chaque user avec:
- Lien d'inscription: http://supabasekong...sslip.io
- Expliquer la migration
- Offrir un bonus de bienvenue (optionnel)

## Liste des users à créer:

`;
    
    missingUsers.forEach((user, index) => {
      authInstructions += `${index + 1}. ${user.email} (${user.role}, balance: ${user.balance} FCFA)\n`;
    });
    
    authInstructions += `
## Script automatique (à adapter)

\`\`\`javascript
const usersToCreate = ${JSON.stringify(missingUsers.slice(0, 5), null, 2)};

for (const user of usersToCreate) {
  const { data, error } = await supabaseCoolify.auth.admin.createUser({
    email: user.email,
    email_confirm: true,
    password: 'ChangeMe123!',  // Temporary password
    user_metadata: {
      original_id: user.id,
      migrated: true,
      balance: user.balance
    }
  });
  
  if (error) {
    console.error(\`Error creating \${user.email}:\`, error);
  } else {
    console.log(\`✅ Created \${user.email}\`);
  }
}
\`\`\`
`;
    
    const instructionsFile = 'auth_users_instructions.md';
    fs.writeFileSync(instructionsFile, authInstructions);
    console.log(`   ✅ Instructions générées: ${instructionsFile}`);
    
    // ========================================================================
    // RÉSUMÉ
    // ========================================================================
    console.log('\n');
    console.log('='.repeat(80));
    console.log('📊 RÉSUMÉ DE LA MIGRATION AUTH.USERS');
    console.log('='.repeat(80));
    console.log(`
✅ Fichiers générés:
   - ${exportFile} (données JSON)
   - ${sqlFile} (script SQL pour public.users)
   - ${instructionsFile} (instructions auth)

📋 Users à migrer: ${missingUsers.length}
   - Admins: ${missingUsers.filter(u => u.role === 'admin').length}
   - Users normaux: ${missingUsers.filter(u => u.role !== 'admin').length}
   - Avec balance > 0: ${missingUsers.filter(u => u.balance > 0).length}
   - Balance totale: ${missingUsers.reduce((sum, u) => sum + (u.balance || 0), 0)} FCFA

⚠️  IMPORTANT:
   1. Exécuter ${sqlFile} sur Coolify pour créer les entrées public.users
   2. Créer les auth.users via Auth Admin API ou invitations
   3. Les users devront se reconnecter avec leurs nouveaux credentials

🔧 Pour exécuter le SQL:
   $ sshpass -p 'Bouba@2307##' ssh root@46.202.171.108 \\
     "docker exec -i supabase-db-h888cc0ck4w4o0kgw4kg84ks psql -U postgres -d postgres" \\
     < ${sqlFile}
`);
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    process.exit(1);
  }
}

// Exécuter
migrateAuthUsers();
