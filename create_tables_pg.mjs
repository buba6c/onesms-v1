#!/usr/bin/env node
/**
 * Créer les tables sur Coolify via connexion PostgreSQL directe
 */

import pg from 'pg';

const { Client } = pg;

// Connexion PostgreSQL Coolify
const client = new Client({
  host: '46.202.171.108',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'XvW3iOhEEsnHDhQdJVkzjYjACggROG20',
  ssl: false
});

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
  role TEXT DEFAULT 'user',
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
  discount_type TEXT DEFAULT 'percentage',
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
`;

const CREATE_INDEXES_SQL = `
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
`;

async function main() {
  console.log('🔌 Connexion à PostgreSQL Coolify...');
  
  try {
    await client.connect();
    console.log('✅ Connecté!\n');
    
    console.log('📋 Création des tables...');
    await client.query(CREATE_TABLES_SQL);
    console.log('✅ Tables créées!\n');
    
    console.log('📋 Création des indexes...');
    await client.query(CREATE_INDEXES_SQL);
    console.log('✅ Indexes créés!\n');
    
    // Vérification
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('📊 Tables existantes:');
    result.rows.forEach(r => console.log(`   ✅ ${r.table_name}`));
    
    console.log('\n🎉 Base de données prête!');
    
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    
    if (err.message.includes('ECONNREFUSED') || err.message.includes('timeout')) {
      console.log('\n💡 Le port 5432 n\'est peut-être pas exposé sur Coolify.');
      console.log('   Tu dois exposer le port PostgreSQL dans Coolify.');
    }
  } finally {
    await client.end();
  }
}

main();
