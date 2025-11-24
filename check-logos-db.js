import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
);

async function checkLogos() {
  const { data: all } = await supabase.from('services').select('id');
  const { data: withIcon } = await supabase.from('services').select('id, code, icon_url').not('icon_url', 'is', null);
  
  console.log('📊 Total services:', all?.length || 0);
  console.log('✅ Services avec icon_url:', withIcon?.length || 0);
  console.log('📈 Progression:', Math.round(((withIcon?.length || 0) / (all?.length || 1)) * 100) + '%');
  
  if (withIcon && withIcon.length > 0) {
    console.log('\n🎯 Exemples de services avec logos:');
    withIcon.slice(0, 10).forEach(s => {
      console.log('  -', s.code.padEnd(15), ':', s.icon_url?.substring(0, 80));
    });
  }
}

checkLogos();
