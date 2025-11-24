import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
);

const services = ['whatsapp', 'google', 'facebook', 'telegram', 'instagram', 'tiktok', 'twitter', 'discord', 'netflix', 'spotify'];

console.log('🎯 Vérification des logos populaires:\n');

for (const code of services) {
  const { data } = await supabase.from('services').select('code, name, icon_url').eq('code', code).single();
  if (data) {
    console.log('✅', code.padEnd(12), ':', data.icon_url?.substring(0, 70));
  } else {
    console.log('❌', code.padEnd(12), ': Manquant');
  }
}
