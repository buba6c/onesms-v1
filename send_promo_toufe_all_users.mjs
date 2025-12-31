import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

async function sendPromoEmailToAllUsers() {
  console.log('🎉 ENVOI CAMPAGNE PROMO TOUFE À TOUS LES USERS\n');
  console.log('='.repeat(60));
  
  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY manquante dans .env');
    process.exit(1);
  }
  
  // 1. Récupérer tous les users
  console.log('\n1️⃣ Récupération des utilisateurs...');
  const { data: allUsers, error: userError } = await supabase
    .from('users')
    .select('id, email, full_name')
    .order('created_at', { ascending: false });
  
  if (userError) {
    console.error('❌ Erreur:', userError.message);
    return;
  }
  
  if (!allUsers || allUsers.length === 0) {
    console.log('❌ Aucun utilisateur trouvé');
    return;
  }
  
  console.log(`✅ ${allUsers.length} utilisateurs trouvés\n`);
  
  // 2. Filtrer les emails valides
  const validUsers = allUsers.filter(u => u.email && u.email.includes('@'));
  console.log(`📧 ${validUsers.length} emails valides\n`);
  
  // 3. Envoyer par batch (limite Resend: 2 emails/sec)
  console.log('2️⃣ Envoi des emails...');
  console.log('-'.repeat(60));
  
  let sent = 0;
  let failed = 0;
  const batchSize = 2;
  const batchDelay = 1000; // 1 seconde entre les batches
  
  const emailTemplate = (name) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
    .header { text-align: center; margin-bottom: 30px; }
    .code { 
      font-size: 24px; 
      font-weight: bold; 
      color: #007AFF; 
      background: #f0f0f0; 
      padding: 15px; 
      border-radius: 5px;
      text-align: center;
      margin: 20px 0;
      letter-spacing: 2px;
    }
    .example { background: #f9f9f9; padding: 15px; border-left: 4px solid #007AFF; margin: 15px 0; }
    .btn { 
      display: inline-block; 
      background: #007AFF; 
      color: white; 
      padding: 12px 30px; 
      border-radius: 5px; 
      text-decoration: none; 
      margin: 20px 0;
      text-align: center;
    }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Code Promo Exclusif!</h1>
    </div>
    
    <p>Salut${name ? ' ' + name : ''},</p>
    
    <p>Code promo exclusive pour toi: <strong>TOUFE</strong></p>
    
    <p><strong>+10% de bonus</strong> sur toutes tes recharges (minimum 50 crédits) ✨</p>
    
    <div class="code">TOUFE</div>
    
    <h3>Exemples:</h3>
    <div class="example">
      <p>50 Ⓐ → 55 Ⓐ</p>
      <p>100 Ⓐ → 110 Ⓐ</p>
      <p>500 Ⓐ → 550 Ⓐ</p>
    </div>
    
    <center>
      <a href="https://onesms-sn.com/recharge" class="btn">Recharger avec le code TOUFE</a>
    </center>
    
    <p><strong>Valable jusqu'au 31 décembre 2025.</strong></p>
    
    <p>À bientôt ! 🔐</p>
    
    <div class="footer">
      <p>L'équipe ONE SMS</p>
    </div>
  </div>
</body>
</html>`;
  
  for (let i = 0; i < validUsers.length; i += batchSize) {
    const batch = validUsers.slice(i, i + batchSize);
    
    for (const user of batch) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'ONE SMS <noreply@onesms-sn.com>',
            to: user.email,
            subject: '🎉 Code TOUFE : +10% sur Vos Recharges !',
            html: emailTemplate(user.full_name?.split(' ')[0] || ''),
          }),
        });
        
        const result = await response.json();
        
        if (response.ok && result.id) {
          sent++;
          process.stdout.write(`[${sent + failed}/${validUsers.length}] ✅ ${user.email}\n`);
        } else {
          failed++;
          console.error(`[${sent + failed}/${validUsers.length}] ❌ ${user.email} - ${result.message || 'Erreur inconnue'}`);
        }
      } catch (error) {
        failed++;
        console.error(`[${sent + failed}/${validUsers.length}] ❌ ${user.email} - ${error.message}`);
      }
    }
    
    // Délai entre les batches (respecter la limite Resend: 2/sec)
    if (i + batchSize < validUsers.length) {
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }
  }
  
  // 4. Résumé
  console.log('\n' + '='.repeat(60));
  console.log('3️⃣ RÉSUMÉ DE LA CAMPAGNE');
  console.log('-'.repeat(60));
  console.log(`Total users: ${validUsers.length}`);
  console.log(`✅ Envoyés: ${sent}`);
  console.log(`❌ Échoués: ${failed}`);
  console.log(`Taux de succès: ${((sent / validUsers.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
  
  console.log('\n💡 Prochaines étapes:');
  console.log('1. Vérifier sur Resend Dashboard: https://resend.com/emails');
  console.log('2. Monitorer les bounces et spam reports');
  console.log('3. Analyser les taux d\'ouverture et de clic');
}

sendPromoEmailToAllUsers().catch(console.error);
