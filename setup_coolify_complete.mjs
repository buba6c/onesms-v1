#!/usr/bin/env node
/**
 * 🚀 SETUP COMPLET COOLIFY - CRÉER TABLES + IMPORTER DONNÉES
 * 
 * Ce script:
 * 1. Crée toutes les tables sur le nouveau Supabase Coolify
 * 2. Importe toutes les données depuis la production
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Production (source)
const PROD = {
  url: 'https://htfqmamvmhdoixqcbbbw.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
};

// Nouveau Coolify (destination)
const COOLIFY = {
  url: 'http://supabasekong-q84gs0csso48co84gw0s0o4g.46.202.171.108.sslip.io',
  key: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTcyODA2MCwiZXhwIjo0OTIxNDAxNjYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.Za3on3nc5rMZ9L4_5v5i8p-ul0a5OC7MExY5kMl_D0Y'
};

const prod = createClient(PROD.url, PROD.key);
const coolify = createClient(COOLIFY.url, COOLIFY.key);

// SQL pour créer les tables
const CREATE_TABLES_SQL = `
-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  balance DECIMAL(10, 2) DEFAULT 0,
  frozen_amount DECIMAL(10, 2) DEFAULT 0,
  language TEXT DEFAULT 'fr',
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  referral_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COUNTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  flag_emoji TEXT,
  flag_url TEXT,
  active BOOLEAN DEFAULT true,
  price_multiplier DECIMAL(5, 2) DEFAULT 1.0,
  available_numbers INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2) DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  popularity_score INTEGER DEFAULT 0,
  provider TEXT DEFAULT 'sms-activate',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SERVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT,
  category TEXT,
  icon TEXT,
  icon_url TEXT,
  active BOOLEAN DEFAULT true,
  popularity_score INTEGER DEFAULT 0,
  total_available INTEGER DEFAULT 0,
  provider TEXT DEFAULT 'sms-activate',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENT_PROVIDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.payment_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider_code TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  min_amount DECIMAL(10, 2) DEFAULT 100,
  max_amount DECIMAL(10, 2) DEFAULT 1000000,
  fee_percentage DECIMAL(5, 2) DEFAULT 0,
  fee_fixed DECIMAL(10, 2) DEFAULT 0,
  supported_countries TEXT[] DEFAULT ARRAY['SN'],
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROMO_CODES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_amount DECIMAL(10, 2) DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EMAIL_CAMPAIGNS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  sent_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- ============================================
-- ACTIVATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  order_id TEXT,
  phone TEXT,
  service_code TEXT,
  service_name TEXT,
  country_code TEXT,
  operator TEXT,
  price DECIMAL(10, 2),
  status TEXT DEFAULT 'pending',
  sms_code TEXT,
  sms_text TEXT,
  sms_received_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  charged BOOLEAN DEFAULT false,
  frozen_amount DECIMAL(10, 2) DEFAULT 0,
  provider TEXT DEFAULT 'sms-activate',
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RENTALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  rent_id TEXT UNIQUE,
  phone TEXT,
  service_code TEXT,
  country_code TEXT,
  operator TEXT DEFAULT 'any',
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  rent_hours INTEGER,
  hourly_rate DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  refund_amount DECIMAL(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  last_message_date TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  frozen_amount DECIMAL(10, 2) DEFAULT 0,
  provider TEXT DEFAULT 'sms-activate',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RENTAL_MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.rental_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id UUID REFERENCES public.rentals(id) ON DELETE CASCADE,
  sender TEXT,
  message TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  balance_before DECIMAL(10, 2),
  balance_after DECIMAL(10, 2),
  status TEXT DEFAULT 'completed',
  description TEXT,
  reference TEXT,
  payment_method TEXT,
  payment_data JSONB,
  virtual_number_id TEXT,
  related_activation_id UUID,
  related_rental_id UUID,
  external_id TEXT,
  provider TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SMS_MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_id UUID REFERENCES public.activations(id) ON DELETE CASCADE,
  sender TEXT,
  message TEXT,
  code TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTACT_MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LOGS_PROVIDER TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.logs_provider (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT,
  action TEXT,
  request JSONB,
  response JSONB,
  status TEXT,
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);
CREATE INDEX IF NOT EXISTS idx_activations_user_id ON public.activations(user_id);
CREATE INDEX IF NOT EXISTS idx_activations_order_id ON public.activations(order_id);
CREATE INDEX IF NOT EXISTS idx_activations_status ON public.activations(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_rentals_user_id ON public.rentals(user_id);
CREATE INDEX IF NOT EXISTS idx_rentals_rent_id ON public.rentals(rent_id);
CREATE INDEX IF NOT EXISTS idx_countries_code ON public.countries(code);
CREATE INDEX IF NOT EXISTS idx_services_code ON public.services(code);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;

-- Allow read access to all for countries and services
CREATE POLICY "Anyone can read countries" ON public.countries FOR SELECT USING (true);
CREATE POLICY "Anyone can read services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Anyone can read payment_providers" ON public.payment_providers FOR SELECT USING (true);

-- Users policies
CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (auth.uid()::text = id::text OR auth.role() = 'service_role');
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid()::text = id::text OR auth.role() = 'service_role');
CREATE POLICY "Service role full access users" ON public.users FOR ALL USING (auth.role() = 'service_role');

-- Activations policies
CREATE POLICY "Users can read own activations" ON public.activations FOR SELECT USING (auth.uid()::text = user_id::text OR auth.role() = 'service_role');
CREATE POLICY "Service role full access activations" ON public.activations FOR ALL USING (auth.role() = 'service_role');

-- Transactions policies
CREATE POLICY "Users can read own transactions" ON public.transactions FOR SELECT USING (auth.uid()::text = user_id::text OR auth.role() = 'service_role');
CREATE POLICY "Service role full access transactions" ON public.transactions FOR ALL USING (auth.role() = 'service_role');

-- Rentals policies
CREATE POLICY "Users can read own rentals" ON public.rentals FOR SELECT USING (auth.uid()::text = user_id::text OR auth.role() = 'service_role');
CREATE POLICY "Service role full access rentals" ON public.rentals FOR ALL USING (auth.role() = 'service_role');
`;

// Tables à importer dans l'ordre
const TABLES_ORDER = [
  'countries',
  'services',
  'payment_providers',
  'promo_codes',
  'email_campaigns',
  'users',
  'activations',
  'rentals',
  'rental_messages',
  'transactions',
  'sms_messages',
  'contact_messages',
  'logs_provider'
];

const backup = {};

async function fetchAll(table) {
  const allData = [];
  let offset = 0;
  
  while (true) {
    const { data, error } = await prod.from(table).select('*').range(offset, offset + 999);
    if (error || !data || data.length === 0) break;
    allData.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  
  return allData;
}

async function insertData(table, data) {
  if (!data || data.length === 0) return { inserted: 0, errors: 0 };
  
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < data.length; i += 20) {
    const batch = data.slice(i, i + 20);
    const { error } = await coolify.from(table).insert(batch);
    
    if (error) {
      for (const row of batch) {
        const { error: e } = await coolify.from(table).insert(row);
        if (e) errors++;
        else inserted++;
      }
    } else {
      inserted += batch.length;
    }
    
    if (data.length > 100 && i % 100 === 0) {
      process.stdout.write(`\r      ${i}/${data.length}`);
    }
  }
  
  return { inserted, errors };
}

async function main() {
  console.log('🚀 SETUP COMPLET COOLIFY');
  console.log('='.repeat(60));
  console.log(`📅 ${new Date().toISOString()}\n`);
  
  const startTime = Date.now();

  // ===== ÉTAPE 1: CRÉER LES TABLES =====
  console.log('📋 ÉTAPE 1: CRÉATION DES TABLES');
  console.log('-'.repeat(50));
  
  // On va utiliser l'API REST pour exécuter le SQL via une fonction RPC
  // Mais d'abord on doit vérifier si les tables existent déjà
  
  console.log('   ⚠️ Les tables doivent être créées via Supabase Studio');
  console.log('   📋 SQL généré dans: coolify_create_tables.sql');
  
  // Sauvegarder le SQL
  fs.writeFileSync('coolify_create_tables.sql', CREATE_TABLES_SQL);
  console.log('   ✅ Fichier SQL créé\n');

  // ===== ÉTAPE 2: BACKUP PRODUCTION =====
  console.log('📦 ÉTAPE 2: BACKUP PRODUCTION');
  console.log('-'.repeat(50));
  
  let totalBackup = 0;
  
  for (const table of TABLES_ORDER) {
    process.stdout.write(`   ${table.padEnd(20)}... `);
    const data = await fetchAll(table);
    backup[table] = data;
    totalBackup += data.length;
    console.log(`${data.length}`);
  }
  
  // Auth users
  const { data: authData } = await prod.auth.admin.listUsers();
  backup.auth_users = authData?.users || [];
  console.log(`   auth.users           ... ${backup.auth_users.length}`);
  console.log(`\n   📊 Total: ${totalBackup} records\n`);

  // Sauvegarder
  fs.writeFileSync('backup_for_coolify.json', JSON.stringify(backup, null, 2));
  console.log('   💾 Sauvegardé: backup_for_coolify.json\n');

  // ===== ÉTAPE 3: VÉRIFIER SI TABLES EXISTENT =====
  console.log('🔍 ÉTAPE 3: VÉRIFICATION TABLES COOLIFY');
  console.log('-'.repeat(50));
  
  let tablesReady = true;
  
  for (const table of TABLES_ORDER) {
    const { error } = await coolify.from(table).select('id').limit(1);
    const exists = !error || !error.message.includes('does not exist');
    console.log(`   ${table.padEnd(20)} ${exists ? '✅' : '❌ MANQUE'}`);
    if (!exists) tablesReady = false;
  }
  
  if (!tablesReady) {
    console.log('\n   ⚠️ TABLES MANQUANTES!');
    console.log('   📋 Exécute le SQL dans Supabase Studio:');
    console.log(`   🔗 ${COOLIFY.url}/project/default/sql`);
    console.log('   📄 Fichier: coolify_create_tables.sql');
    console.log('\n   Puis relance ce script.');
    return;
  }
  
  console.log('\n   ✅ Toutes les tables existent!\n');

  // ===== ÉTAPE 4: IMPORT =====
  console.log('📤 ÉTAPE 4: IMPORT DES DONNÉES');
  console.log('-'.repeat(50));
  
  for (const table of TABLES_ORDER) {
    const data = backup[table];
    process.stdout.write(`   ${table.padEnd(20)} (${data.length})... `);
    
    if (data.length === 0) {
      console.log('vide');
      continue;
    }
    
    const { inserted, errors } = await insertData(table, data);
    console.log(`\r   ${table.padEnd(20)} (${data.length})... ✅ ${inserted} | ❌ ${errors}`);
  }
  console.log();

  // ===== ÉTAPE 5: AUTH USERS =====
  console.log('🔐 ÉTAPE 5: AUTH USERS');
  console.log('-'.repeat(50));
  
  const { data: existingAuth } = await coolify.auth.admin.listUsers();
  const existingEmails = new Set(existingAuth?.users?.map(u => u.email) || []);
  
  let created = 0, skipped = 0;
  
  for (const user of backup.auth_users) {
    if (existingEmails.has(user.email)) {
      skipped++;
      continue;
    }
    
    const { error } = await coolify.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      user_metadata: user.user_metadata || {},
      password: `Mig_${Math.random().toString(36).slice(2, 10)}`
    });
    
    if (!error) created++;
  }
  
  console.log(`   Créés: ${created} | Existants: ${skipped}\n`);

  // ===== ÉTAPE 6: VÉRIFICATION =====
  console.log('🔍 ÉTAPE 6: VÉRIFICATION');
  console.log('-'.repeat(50));
  
  console.log('   ' + 'Table'.padEnd(20) + 'PROD'.padEnd(8) + 'COOL'.padEnd(8) + 'OK?');
  console.log('   ' + '-'.repeat(40));
  
  let allGood = true;
  
  for (const table of TABLES_ORDER) {
    const prodCount = backup[table].length;
    const { count: coolCount } = await coolify.from(table).select('*', { count: 'exact', head: true });
    
    const ok = prodCount === (coolCount || 0);
    if (!ok) allGood = false;
    
    console.log(`   ${table.padEnd(20)} ${String(prodCount).padEnd(8)} ${String(coolCount || 0).padEnd(8)} ${ok ? '✅' : '⚠️'}`);
  }
  
  const { data: finalAuth } = await coolify.auth.admin.listUsers();
  console.log(`\n   Auth: ${finalAuth?.users?.length || 0} / ${backup.auth_users.length}`);

  // Résumé
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log(allGood ? '🎉 MIGRATION RÉUSSIE!' : '⚠️ Quelques différences');
  console.log(`⏱️ Durée: ${duration}s`);
}

main().catch(console.error);
