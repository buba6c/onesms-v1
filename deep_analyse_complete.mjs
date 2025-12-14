#!/usr/bin/env node

/**
 * ANALYSE ULTRA-DEEP COMPLÈTE DE TOUT CE QUI DOIT ÊTRE MIGRÉ
 * - Users AUTH (auth.users)
 * - Email templates et campaigns
 * - Storage buckets et fichiers
 * - RLS policies détaillées
 * - Triggers et functions SQL
 * - Webhooks et configurations externes
 * - Contact settings et email providers
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Supabase Cloud
const supabaseCloud = createClient(
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Supabase Coolify
const supabaseCoolify = createClient(
  'http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.1yLw9EuRiBBqodz_M9XwyQlOzzdSwgjzX-1en5MSnBg'
);

console.log('🔍 ANALYSE ULTRA-DEEP - MIGRATION COMPLÈTE\n');
console.log('=' .repeat(80));

const report = {
  timestamp: new Date().toISOString(),
  auth: {},
  email: {},
  storage: {},
  database: {},
  security: {},
  external: {},
  critical_missing: [],
  warnings: [],
  actions: []
};

// ============================================================================
// 1. ANALYSE AUTH USERS
// ============================================================================
async function analyzeAuthUsers() {
  console.log('\n📧 1. ANALYSE DES USERS AUTH');
  console.log('-'.repeat(80));
  
  try {
    // Dans Supabase Cloud, auth.users n'est pas accessible via API
    // On va analyser la table public.users qui contient les infos liées
    
    const { data: cloudUsers, error: cloudError } = await supabaseCloud
      .from('users')
      .select('*');
    
    if (cloudError) throw cloudError;
    
    const { data: coolifyUsers, error: coolifyError } = await supabaseCoolify
      .from('users')
      .select('*');
    
    if (coolifyError) throw coolifyError;
    
    console.log(`📊 Cloud users: ${cloudUsers?.length || 0}`);
    console.log(`📊 Coolify users: ${coolifyUsers?.length || 0}`);
    
    // Analyser les détails des users
    const cloudUserDetails = {
      total: cloudUsers?.length || 0,
      with_email: cloudUsers?.filter(u => u.email)?.length || 0,
      with_phone: cloudUsers?.filter(u => u.phone)?.length || 0,
      admins: cloudUsers?.filter(u => u.role === 'admin')?.length || 0,
      active: cloudUsers?.filter(u => !u.suspended)?.length || 0,
      with_balance: cloudUsers?.filter(u => u.balance > 0)?.length || 0,
      total_balance: cloudUsers?.reduce((sum, u) => sum + (u.balance || 0), 0) || 0,
      emails: cloudUsers?.filter(u => u.email).map(u => u.email) || []
    };
    
    const coolifyUserDetails = {
      total: coolifyUsers?.length || 0,
      with_email: coolifyUsers?.filter(u => u.email)?.length || 0,
      with_phone: coolifyUsers?.filter(u => u.phone)?.length || 0,
      admins: coolifyUsers?.filter(u => u.role === 'admin')?.length || 0,
      active: coolifyUsers?.filter(u => !u.suspended)?.length || 0,
      with_balance: coolifyUsers?.filter(u => u.balance > 0)?.length || 0,
      total_balance: coolifyUsers?.reduce((sum, u) => sum + (u.balance || 0), 0) || 0
    };
    
    console.log('\n📋 Détails Cloud:');
    console.log(`   - Users avec email: ${cloudUserDetails.with_email}`);
    console.log(`   - Users avec téléphone: ${cloudUserDetails.with_phone}`);
    console.log(`   - Admins: ${cloudUserDetails.admins}`);
    console.log(`   - Actifs: ${cloudUserDetails.active}`);
    console.log(`   - Avec balance > 0: ${cloudUserDetails.with_balance}`);
    console.log(`   - Balance totale: ${cloudUserDetails.total_balance} FCFA`);
    
    console.log('\n📋 Détails Coolify:');
    console.log(`   - Users avec email: ${coolifyUserDetails.with_email}`);
    console.log(`   - Users avec téléphone: ${coolifyUserDetails.with_phone}`);
    console.log(`   - Admins: ${coolifyUserDetails.admins}`);
    console.log(`   - Actifs: ${coolifyUserDetails.active}`);
    console.log(`   - Avec balance > 0: ${coolifyUserDetails.with_balance}`);
    console.log(`   - Balance totale: ${coolifyUserDetails.total_balance} FCFA`);
    
    // Identifier les users manquants
    const cloudEmails = new Set(cloudUsers?.map(u => u.email) || []);
    const coolifyEmails = new Set(coolifyUsers?.map(u => u.email) || []);
    const missingUsers = Array.from(cloudEmails).filter(email => !coolifyEmails.has(email));
    
    if (missingUsers.length > 0) {
      console.log(`\n⚠️  ${missingUsers.length} users manquants sur Coolify:`);
      missingUsers.slice(0, 10).forEach(email => console.log(`   - ${email}`));
      if (missingUsers.length > 10) {
        console.log(`   ... et ${missingUsers.length - 10} autres`);
      }
      report.critical_missing.push({
        type: 'users',
        count: missingUsers.length,
        items: missingUsers
      });
    }
    
    report.auth = {
      cloud: cloudUserDetails,
      coolify: coolifyUserDetails,
      missing: missingUsers.length,
      status: missingUsers.length === 0 ? 'OK' : 'CRITICAL'
    };
    
    // ⚠️ IMPORTANT: Vérifier auth.users (table système)
    console.log('\n⚠️  ATTENTION: La table auth.users doit être migrée séparément!');
    console.log('   Cette table contient les credentials de connexion.');
    console.log('   Elle n\'est pas accessible via l\'API normale.');
    report.warnings.push('AUTH.USERS table must be migrated via pg_dump');
    report.actions.push({
      priority: 'CRITICAL',
      action: 'Export auth.users via pg_dump --schema=auth',
      command: 'pg_dump -h ... -U postgres --schema=auth --table=users'
    });
    
  } catch (error) {
    console.error('❌ Erreur analyse auth:', error.message);
    report.auth = { error: error.message };
  }
}

// ============================================================================
// 2. ANALYSE EMAIL CAMPAIGNS & TEMPLATES
// ============================================================================
async function analyzeEmailSystem() {
  console.log('\n📨 2. ANALYSE SYSTÈME EMAIL');
  console.log('-'.repeat(80));
  
  try {
    // Email campaigns
    const { data: cloudCampaigns } = await supabaseCloud
      .from('email_campaigns')
      .select('*');
    
    const { data: coolifyCampaigns } = await supabaseCoolify
      .from('email_campaigns')
      .select('*');
    
    console.log(`📊 Email campaigns Cloud: ${cloudCampaigns?.length || 0}`);
    console.log(`📊 Email campaigns Coolify: ${coolifyCampaigns?.length || 0}`);
    
    if (cloudCampaigns && cloudCampaigns.length > 0) {
      console.log('\n📧 Campagnes détectées:');
      cloudCampaigns.forEach(campaign => {
        console.log(`   - ${campaign.name} (${campaign.status})`);
        console.log(`     Subject: ${campaign.subject}`);
        console.log(`     Recipients: ${campaign.recipient_count || 'N/A'}`);
      });
    }
    
    // Contact settings
    const { data: cloudContact } = await supabaseCloud
      .from('contact_settings')
      .select('*');
    
    const { data: coolifyContact } = await supabaseCoolify
      .from('contact_settings')
      .select('*');
    
    console.log(`\n📞 Contact settings Cloud: ${cloudContact?.length || 0}`);
    console.log(`📞 Contact settings Coolify: ${coolifyContact?.length || 0}`);
    
    if (cloudContact && cloudContact.length > 0) {
      console.log('\n📧 Configuration email détectée:');
      cloudContact.forEach(config => {
        console.log(`   - Email support: ${config.support_email || 'N/A'}`);
        console.log(`   - Email contact: ${config.contact_email || 'N/A'}`);
        console.log(`   - Email provider: ${config.email_provider || 'N/A'}`);
        if (config.smtp_config) {
          console.log(`   - SMTP configuré: ✅`);
        }
      });
    }
    
    report.email = {
      campaigns: {
        cloud: cloudCampaigns?.length || 0,
        coolify: coolifyCampaigns?.length || 0
      },
      contact_settings: {
        cloud: cloudContact?.length || 0,
        coolify: coolifyContact?.length || 0
      },
      status: (cloudCampaigns?.length === coolifyCampaigns?.length && 
               cloudContact?.length === coolifyContact?.length) ? 'OK' : 'WARNING'
    };
    
    if (cloudContact && cloudContact.length > 0 && cloudContact[0].smtp_config) {
      report.warnings.push('SMTP configuration must be migrated manually');
      report.actions.push({
        priority: 'HIGH',
        action: 'Configure SMTP in Coolify dashboard',
        details: 'Copy SMTP settings from contact_settings table'
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur analyse email:', error.message);
    report.email = { error: error.message };
  }
}

// ============================================================================
// 3. ANALYSE STORAGE BUCKETS
// ============================================================================
async function analyzeStorage() {
  console.log('\n💾 3. ANALYSE STORAGE');
  console.log('-'.repeat(80));
  
  try {
    const { data: cloudBuckets } = await supabaseCloud.storage.listBuckets();
    const { data: coolifyBuckets } = await supabaseCoolify.storage.listBuckets();
    
    console.log(`📦 Buckets Cloud: ${cloudBuckets?.length || 0}`);
    console.log(`📦 Buckets Coolify: ${coolifyBuckets?.length || 0}`);
    
    if (cloudBuckets && cloudBuckets.length > 0) {
      console.log('\n📁 Buckets détectés:');
      for (const bucket of cloudBuckets) {
        console.log(`\n   Bucket: ${bucket.name}`);
        console.log(`   - Public: ${bucket.public ? '✅' : '❌'}`);
        
        // Lister les fichiers
        const { data: files } = await supabaseCloud.storage
          .from(bucket.name)
          .list();
        
        console.log(`   - Fichiers: ${files?.length || 0}`);
        
        if (files && files.length > 0) {
          const totalSize = files.reduce((sum, f) => sum + (f.metadata?.size || 0), 0);
          console.log(`   - Taille totale: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
          
          report.critical_missing.push({
            type: 'storage_bucket',
            bucket: bucket.name,
            files: files.length,
            size_mb: (totalSize / 1024 / 1024).toFixed(2)
          });
          
          report.actions.push({
            priority: 'HIGH',
            action: `Migrate storage bucket: ${bucket.name}`,
            command: `supabase storage download-all --bucket ${bucket.name}`
          });
        }
      }
    }
    
    report.storage = {
      cloud_buckets: cloudBuckets?.length || 0,
      coolify_buckets: coolifyBuckets?.length || 0,
      status: (cloudBuckets?.length || 0) === (coolifyBuckets?.length || 0) ? 'OK' : 'CRITICAL'
    };
    
  } catch (error) {
    console.error('❌ Erreur analyse storage:', error.message);
    report.storage = { error: error.message };
  }
}

// ============================================================================
// 4. ANALYSE RLS POLICIES DÉTAILLÉE
// ============================================================================
async function analyzeRLSPolicies() {
  console.log('\n🔒 4. ANALYSE RLS POLICIES');
  console.log('-'.repeat(80));
  
  const tables = [
    'users', 'services', 'activations', 'balance_operations',
    'rental_logs', 'transactions', 'payment_providers',
    'system_settings', 'promo_codes', 'email_campaigns'
  ];
  
  const rlsReport = {};
  
  for (const table of tables) {
    try {
      const { data: cloudData } = await supabaseCloud
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      // Les RLS policies sont actives si on ne peut pas accéder sans auth
      const { error: publicError } = await supabaseCloud
        .from(table)
        .select('*')
        .limit(1);
      
      rlsReport[table] = {
        has_data: cloudData !== null,
        rls_active: publicError?.code === 'PGRST301'
      };
      
      console.log(`   ${table}: ${rlsReport[table].rls_active ? '🔒 RLS actif' : '⚠️  RLS inactif'}`);
      
    } catch (error) {
      rlsReport[table] = { error: error.message };
    }
  }
  
  report.security = {
    rls_policies: rlsReport,
    status: 'CHECK_MANUALLY'
  };
  
  report.actions.push({
    priority: 'HIGH',
    action: 'Verify RLS policies on Coolify',
    command: 'SELECT * FROM pg_policies;'
  });
}

// ============================================================================
// 5. ANALYSE WEBHOOKS ET CONFIGURATIONS EXTERNES
// ============================================================================
async function analyzeExternalConfig() {
  console.log('\n🌐 5. ANALYSE CONFIGURATIONS EXTERNES');
  console.log('-'.repeat(80));
  
  const externalSystems = [
    { name: 'PayDunya', env_vars: ['PAYDUNYA_MASTER_KEY', 'PAYDUNYA_PRIVATE_KEY', 'PAYDUNYA_TOKEN'] },
    { name: 'MoneyFusion', env_vars: ['MONEYFUSION_API_URL', 'MONEYFUSION_API_KEY'] },
    { name: 'Moneroo', env_vars: ['MONEROO_API_KEY'] },
    { name: 'PayTech', env_vars: ['PAYTECH_API_KEY', 'PAYTECH_API_SECRET'] },
    { name: 'SMS Activate', env_vars: ['SMS_ACTIVATE_API_KEY'] },
    { name: '5SIM', env_vars: ['FIVESIM_API_KEY'] }
  ];
  
  const configReport = {};
  
  for (const system of externalSystems) {
    const hasConfig = system.env_vars.every(v => process.env[v]);
    console.log(`   ${system.name}: ${hasConfig ? '✅' : '⚠️  Manquant'}`);
    
    configReport[system.name] = {
      configured: hasConfig,
      missing_vars: system.env_vars.filter(v => !process.env[v])
    };
    
    if (!hasConfig) {
      report.warnings.push(`${system.name} configuration incomplete`);
      report.actions.push({
        priority: 'CRITICAL',
        action: `Configure ${system.name} secrets in Coolify`,
        vars: system.env_vars
      });
    }
  }
  
  report.external = {
    systems: configReport,
    webhooks_to_update: [
      'PayDunya → http://supabasekong...sslip.io/functions/v1/paydunya-webhook',
      'MoneyFusion → http://supabasekong...sslip.io/functions/v1/moneyfusion-webhook',
      'Moneroo → http://supabasekong...sslip.io/functions/v1/moneroo-webhook',
      'PayTech → http://supabasekong...sslip.io/functions/v1/paytech-ipn',
      'SMS Activate → http://supabasekong...sslip.io/functions/v1/webhook-sms-activate'
    ]
  };
}

// ============================================================================
// 6. ANALYSE TRIGGERS ET FUNCTIONS SQL
// ============================================================================
async function analyzeSQLFunctions() {
  console.log('\n⚙️  6. ANALYSE FUNCTIONS SQL & TRIGGERS');
  console.log('-'.repeat(80));
  
  // Liste des fichiers SQL de migrations qui contiennent des functions
  const sqlFiles = fs.readdirSync('.')
    .filter(f => f.endsWith('.sql'))
    .filter(f => {
      const content = fs.readFileSync(f, 'utf-8').toLowerCase();
      return content.includes('create function') || 
             content.includes('create trigger') ||
             content.includes('create or replace function');
    });
  
  console.log(`📂 ${sqlFiles.length} fichiers SQL avec functions/triggers détectés`);
  
  const functions = [];
  const triggers = [];
  
  for (const file of sqlFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Extraire les noms de functions
    const funcMatches = content.match(/create\s+(?:or\s+replace\s+)?function\s+(\w+)/gi);
    if (funcMatches) {
      funcMatches.forEach(match => {
        const name = match.split(/\s+/).pop();
        functions.push({ name, file });
      });
    }
    
    // Extraire les triggers
    const triggerMatches = content.match(/create\s+trigger\s+(\w+)/gi);
    if (triggerMatches) {
      triggerMatches.forEach(match => {
        const name = match.split(/\s+/).pop();
        triggers.push({ name, file });
      });
    }
  }
  
  console.log(`\n📋 ${functions.length} functions SQL détectées:`);
  functions.slice(0, 10).forEach(f => console.log(`   - ${f.name} (${f.file})`));
  if (functions.length > 10) {
    console.log(`   ... et ${functions.length - 10} autres`);
  }
  
  console.log(`\n📋 ${triggers.length} triggers détectés:`);
  triggers.forEach(t => console.log(`   - ${t.name} (${t.file})`));
  
  report.database.sql_functions = functions.length;
  report.database.sql_triggers = triggers.length;
  
  report.actions.push({
    priority: 'MEDIUM',
    action: 'Verify SQL functions on Coolify',
    command: 'SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = \'public\');'
  });
}

// ============================================================================
// EXÉCUTION PRINCIPALE
// ============================================================================
async function main() {
  await analyzeAuthUsers();
  await analyzeEmailSystem();
  await analyzeStorage();
  await analyzeRLSPolicies();
  await analyzeExternalConfig();
  await analyzeSQLFunctions();
  
  // ============================================================================
  // RAPPORT FINAL
  // ============================================================================
  console.log('\n');
  console.log('='.repeat(80));
  console.log('📊 RAPPORT FINAL - ANALYSE ULTRA-DEEP');
  console.log('='.repeat(80));
  
  console.log('\n🔴 ÉLÉMENTS CRITIQUES MANQUANTS:');
  if (report.critical_missing.length === 0) {
    console.log('   ✅ Aucun élément critique manquant');
  } else {
    report.critical_missing.forEach(item => {
      if (item.type === 'users') {
        console.log(`   ❌ ${item.count} users manquants`);
      } else if (item.type === 'storage_bucket') {
        console.log(`   ❌ Bucket: ${item.bucket} (${item.files} fichiers, ${item.size_mb} MB)`);
      }
    });
  }
  
  console.log('\n⚠️  AVERTISSEMENTS:');
  if (report.warnings.length === 0) {
    console.log('   ✅ Aucun avertissement');
  } else {
    report.warnings.forEach(w => console.log(`   ⚠️  ${w}`));
  }
  
  console.log('\n📋 ACTIONS REQUISES:');
  const criticalActions = report.actions.filter(a => a.priority === 'CRITICAL');
  const highActions = report.actions.filter(a => a.priority === 'HIGH');
  const mediumActions = report.actions.filter(a => a.priority === 'MEDIUM');
  
  if (criticalActions.length > 0) {
    console.log('\n   🔴 CRITIQUE:');
    criticalActions.forEach(a => {
      console.log(`      - ${a.action}`);
      if (a.command) console.log(`        $ ${a.command}`);
      if (a.vars) console.log(`        Vars: ${a.vars.join(', ')}`);
    });
  }
  
  if (highActions.length > 0) {
    console.log('\n   🟠 HAUTE PRIORITÉ:');
    highActions.forEach(a => {
      console.log(`      - ${a.action}`);
      if (a.command) console.log(`        $ ${a.command}`);
    });
  }
  
  if (mediumActions.length > 0) {
    console.log('\n   🟡 PRIORITÉ MOYENNE:');
    mediumActions.forEach(a => {
      console.log(`      - ${a.action}`);
      if (a.command) console.log(`        $ ${a.command}`);
    });
  }
  
  // Sauvegarder le rapport
  fs.writeFileSync(
    'deep_analyse_complete_report.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n📄 Rapport complet sauvegardé: deep_analyse_complete_report.json');
  
  // ============================================================================
  // SCORE GLOBAL
  // ============================================================================
  let score = 100;
  score -= report.critical_missing.length * 20;
  score -= report.warnings.length * 5;
  score -= criticalActions.length * 10;
  score -= highActions.length * 5;
  score = Math.max(0, score);
  
  console.log('\n');
  console.log('='.repeat(80));
  console.log(`🎯 SCORE MIGRATION DEEP: ${score}%`);
  console.log('='.repeat(80));
  
  if (score >= 90) {
    console.log('✅ Migration quasi-complète, quelques ajustements mineurs');
  } else if (score >= 70) {
    console.log('⚠️  Migration partielle, actions importantes requises');
  } else {
    console.log('❌ Migration incomplète, actions critiques requises');
  }
}

main().catch(console.error);
