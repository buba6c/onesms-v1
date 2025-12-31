import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

async function createPromoCode() {
  console.log('🎁 CRÉATION DU CODE PROMO: TOUFE\n');
  
  // 1. Vérifier quelle table existe
  console.log('1️⃣ Vérifier les tables existantes...\n');
  
  let tableExists = null;
  
  // Essayer promo_codes
  const { error: e1 } = await supabase
    .from('promo_codes')
    .select('*')
    .limit(1);
  
  if (!e1) {
    tableExists = 'promo_codes';
    console.log('✅ Table promo_codes trouvée');
  } else {
    console.log('❌ Table promo_codes:', e1.message);
  }
  
  // Essayer promotion_codes
  if (!tableExists) {
    const { error: e2 } = await supabase
      .from('promotion_codes')
      .select('*')
      .limit(1);
    
    if (!e2) {
      tableExists = 'promotion_codes';
      console.log('✅ Table promotion_codes trouvée');
    } else {
      console.log('❌ Table promotion_codes:', e2.message);
    }
  }
  
  // Essayer coupon_codes
  if (!tableExists) {
    const { error: e3 } = await supabase
      .from('coupon_codes')
      .select('*')
      .limit(1);
    
    if (!e3) {
      tableExists = 'coupon_codes';
      console.log('✅ Table coupon_codes trouvée');
    } else {
      console.log('❌ Table coupon_codes:', e3.message);
    }
  }
  
  if (!tableExists) {
    console.log('\n❌ Aucune table de promo codes trouvée!');
    console.log('Tables disponibles à vérifier: promo_codes, promotion_codes, coupon_codes');
    return;
  }
  
  console.log(`\nUtilisation de la table: ${tableExists}\n`);
  
  // 2. Voir la structure
  console.log('2️⃣ Voir les codes existants...\n');
  const { data: existing } = await supabase
    .from(tableExists)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (existing && existing.length > 0) {
    console.log('Codes existants:');
    existing.forEach(code => {
      console.log(`  - ${code.code || code.promo_code || 'N/A'} | ${code.discount_percent || code.discount || 'N/A'}% | Min: ${code.min_amount || code.minimum_amount || 'N/A'} | Active: ${code.is_active !== false}`);
    });
  } else {
    console.log('Pas de codes existants');
  }
  
  // 3. Créer le code TOUFE
  console.log('\n3️⃣ Création du code TOUFE...\n');
  
  const newCode = {
    code: 'TOUFE',
    discount_percent: 10,
    discount: 10,
    min_amount: 50,
    minimum_amount: 50,
    description: '+10% sur toutes recharges à partir de 50 crédits',
    is_active: true,
    max_uses: null,
    current_uses: 0,
    expires_at: new Date(new Date().getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 jours
    created_at: new Date().toISOString(),
  };
  
  const { data, error } = await supabase
    .from(tableExists)
    .insert([newCode])
    .select();
  
  if (error) {
    console.log('❌ Erreur:', error.message);
    console.log('Code:", JSON.stringify(newCode, null, 2));
  } else {
    console.log('✅ Code TOUFE créé avec succès!');
    console.log('Détails:');
    console.log('  Code: TOUFE');
    console.log('  Réduction: +10%');
    console.log('  Montant minimum: 50 crédits');
    console.log('  Description: +10% sur toutes recharges à partir de 50 crédits');
    console.log('  Actif: Oui');
    console.log('  Expire: ' + newCode.expires_at.substring(0, 10));
    console.log('\n' + JSON.stringify(data, null, 2));
  }
}

createPromoCode().catch(console.error);
