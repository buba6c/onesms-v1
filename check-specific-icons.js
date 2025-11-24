#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const { data } = await supabase
  .from('services')
  .select('code, name, icon, icon_url')
  .in('code', ['gg', 'adverts', 'whatsapp', 'instagram', 'telegram', '1kkirana', 'magicpin'])
  .order('code');

console.log('Services et leurs icons:\n');
data?.forEach(s => {
  console.log(`📱 ${s.code} (${s.name})`);
  console.log(`   icon (emoji): ${s.icon}`);
  console.log(`   icon_url: ${s.icon_url || '❌ NULL'}`);
  console.log('');
});
