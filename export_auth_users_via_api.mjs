#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

console.log('🔐 Export auth.users via Admin API...\n');

async function exportAuthUsers() {
  try {
    // Utiliser l'API Admin pour lister tous les users
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    
    if (error) {
      console.error('❌ Erreur:', error);
      return;
    }
    
    console.log(`✅ ${users.length} users trouvés\n`);
    
    // Générer le script SQL
    let sql = `-- Script d'import auth.users
-- Généré le: ${new Date().toISOString()}
-- Total users: ${users.length}

BEGIN;

-- Désactiver temporairement les contraintes
ALTER TABLE auth.users DISABLE TRIGGER ALL;

`;
    
    for (const user of users) {
      const escapeSql = (str) => {
        if (str === null || str === undefined) return 'NULL';
        return `'${String(str).replace(/'/g, "''")}'`;
      };
      
      const jsonToSql = (obj) => {
        if (!obj) return 'NULL';
        return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
      };
      
      sql += `
-- User: ${user.email}
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
) VALUES (
  ${escapeSql(user.id)},
  '00000000-0000-0000-0000-000000000000',
  ${escapeSql(user.aud || 'authenticated')},
  ${escapeSql(user.role || 'authenticated')},
  ${escapeSql(user.email)},
  '',  -- Password sera vide, users devront reset
  ${user.email_confirmed_at ? escapeSql(user.email_confirmed_at) : 'NULL'},
  ${user.invited_at ? escapeSql(user.invited_at) : 'NULL'},
  ${escapeSql(user.confirmation_token || '')},
  ${user.confirmation_sent_at ? escapeSql(user.confirmation_sent_at) : 'NULL'},
  ${escapeSql(user.recovery_token || '')},
  ${user.recovery_sent_at ? escapeSql(user.recovery_sent_at) : 'NULL'},
  '',
  '',
  NULL,
  ${user.last_sign_in_at ? escapeSql(user.last_sign_in_at) : 'NULL'},
  ${jsonToSql(user.app_metadata)},
  ${jsonToSql(user.user_metadata)},
  false,
  ${escapeSql(user.created_at)},
  ${escapeSql(user.updated_at)},
  ${escapeSql(user.phone || null)},
  ${user.phone_confirmed_at ? escapeSql(user.phone_confirmed_at) : 'NULL'},
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  false,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  last_sign_in_at = EXCLUDED.last_sign_in_at,
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = EXCLUDED.updated_at;
`;
    }
    
    sql += `
-- Réactiver les contraintes
ALTER TABLE auth.users ENABLE TRIGGER ALL;

COMMIT;

-- Vérifier
SELECT 'Total users importés:' as info, COUNT(*) FROM auth.users;
`;
    
    const filename = 'import_auth_users_to_coolify.sql';
    fs.writeFileSync(filename, sql);
    
    console.log(`✅ Script SQL généré: ${filename}`);
    console.log(`\n📋 Prochaines étapes:`);
    console.log(`\n1. Vérifier le fichier: cat ${filename} | head -50`);
    console.log(`\n2. Importer sur Coolify:`);
    console.log(`   sshpass -p 'Bouba@2307##' ssh root@46.202.171.108 \\`);
    console.log(`     "docker exec -i supabase-db-h888cc0ck4w4o0kgw4kg84ks psql -U postgres -d postgres" \\`);
    console.log(`     < ${filename}`);
    console.log(`\n⚠️  NOTE: Les passwords sont vides, users devront reset via "Forgot password"`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

exportAuthUsers();
