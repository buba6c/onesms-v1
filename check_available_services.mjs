import { createClient } from '@supabase/supabase-js';

console.log('📋 VÉRIFICATION DES SERVICES DISPONIBLES');
console.log('=' + '='.repeat(50));

async function checkServices() {
  const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
  const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';
  
  const client = createClient(supabaseUrl, serviceRoleKey);
  
  try {
    // Récupérer tous les services
    const { data: services, error: servicesError } = await client
      .from('services')
      .select('*')
      .order('code');
      
    if (servicesError) {
      console.error('❌ Erreur récupération services:', servicesError.message);
    } else {
      console.log(`✅ ${services.length} services trouvés:\n`);
      services.forEach(service => {
        console.log(`  ${service.code.padEnd(15)} | ${service.name}`);
      });
      
      // Chercher spécifiquement whatsapp
      const whatsappService = services.find(s => s.code.toLowerCase() === 'whatsapp' || s.name.toLowerCase().includes('whatsapp'));
      
      if (whatsappService) {
        console.log('\n✅ Service WhatsApp trouvé:', whatsappService);
      } else {
        console.log('\n❌ Service WhatsApp NON TROUVÉ');
        
        // Chercher des variantes
        const variants = services.filter(s => 
          s.code.toLowerCase().includes('wa') ||
          s.code.toLowerCase().includes('whats') ||
          s.name.toLowerCase().includes('whats')
        );
        
        if (variants.length > 0) {
          console.log('\n🔍 Variantes possibles:');
          variants.forEach(v => {
            console.log(`  ${v.code} | ${v.name}`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Erreur générale:', error.message);
  }
}

checkServices();