import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzM5NzY5NywiZXhwIjoyMDYyOTczNjk3fQ.m5gMeLLNyEfJIrSKJwBrMXbznzeVbgbm3i-VnP-QHXE';
const SMS_API_KEY = '93b8A0d90d8A72f27f5ce65A9d5e60f7';

const supabase = createClient(supabaseUrl, serviceKey);

// Le rental SMS-Activate ID connu
const RENT_ID = '30918188';

async function syncRental() {
  console.log('🔄 Synchronisation du rental avec SMS-Activate...\n');
  
  // 1. Get rental status from SMS-Activate
  console.log('📡 Appel API SMS-Activate...');
  const statusUrl = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=getRentStatus&id=${RENT_ID}`;
  
  const res = await fetch(statusUrl);
  const text = await res.text();
  console.log('Response:', text);
  
  if (!text || text.trim() === '') {
    console.log('❌ API vide, impossible de synchroniser');
    return;
  }
  
  try {
    const data = JSON.parse(text);
    if (data.status?.end) {
      const apiEndDate = new Date(data.status.end);
      console.log(`\n✅ End date API: ${apiEndDate.toISOString()}`);
      
      // 2. Find rental in DB
      const { data: rentals, error } = await supabase
        .from('rentals')
        .select('*')
        .or(`rent_id.eq.${RENT_ID},rental_id.eq.${RENT_ID},order_id.eq.${RENT_ID}`)
        .limit(1);
      
      if (error || !rentals?.length) {
        console.log('❌ Rental non trouvé en DB:', error);
        return;
      }
      
      const rental = rentals[0];
      console.log(`\n📋 Rental trouvé: ${rental.phone}`);
      console.log(`   end_date actuel: ${rental.end_date}`);
      console.log(`   expires_at actuel: ${rental.expires_at}`);
      
      // 3. Comparer
      const dbEndDate = new Date(rental.end_date);
      const diff = Math.abs(apiEndDate.getTime() - dbEndDate.getTime());
      console.log(`\n⏱️ Différence: ${Math.floor(diff / (1000 * 60 * 60))} heures`);
      
      if (diff > 60000) { // Plus de 1 minute de différence
        console.log('\n🔧 Mise à jour nécessaire...');
        
        const { error: updateError } = await supabase
          .from('rentals')
          .update({
            end_date: apiEndDate.toISOString(),
            expires_at: apiEndDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', rental.id);
        
        if (updateError) {
          console.log('❌ Erreur mise à jour:', updateError);
        } else {
          console.log('✅ Rental synchronisé avec succès!');
          console.log(`   Nouvelle end_date: ${apiEndDate.toISOString()}`);
          
          // Calcul temps restant
          const now = new Date();
          const diffMs = apiEndDate.getTime() - now.getTime();
          const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
          const days = Math.floor(totalHours / 24);
          const hours = totalHours % 24;
          console.log(`   Temps restant: ${days}j ${hours}h`);
        }
      } else {
        console.log('✅ Déjà synchronisé');
      }
    } else {
      console.log('❌ Pas de end date dans la réponse API');
    }
  } catch (e) {
    console.log('❌ Parse error:', e.message);
  }
}

syncRental().catch(console.error);
