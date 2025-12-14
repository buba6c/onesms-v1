#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const { data, error } = await supabase
  .from('payment_providers')
  .select('*')
  .eq('provider_code', 'paydunya')
  .single();

console.log('PayDunya config:', JSON.stringify(data, null, 2));
