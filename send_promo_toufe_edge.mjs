import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

async function sendPromoViaEdgeFunction() {
  console.log('🎉 ENVOI CAMPAGNE PROMO TOUFE VIA EDGE FUNCTION\n');
  console.log('='.repeat(60));
  
  // Récupérer le token service_role pour appeler l'edge function
  const supabaseAdmin = createClient(
    'https://htfqmamvmhdoixqcbbbw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
  );

  const emailHtml = `<!DOCTYPE html>
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
      <h1>Code Promo Exclusif!</h1>
    </div>
    
    <p>Salut,</p>
    
    <p>Code promo exclusive pour toi: <strong>TOUFE</strong></p>
    
    <p><strong>+10% de bonus</strong> sur toutes tes recharges (minimum 50 crédits)</p>
    
    <div class="code">TOUFE</div>
    
    <h3>Exemples:</h3>
    <div class="example">
      <p>50 crédits → 55 crédits</p>
      <p>100 crédits → 110 crédits</p>
      <p>500 crédits → 550 crédits</p>
    </div>
    
    <center>
      <a href="https://onesms-sn.com/recharge" class="btn">Recharger avec le code TOUFE</a>
    </center>
    
    <p><strong>Valable jusqu'au 31 décembre 2025.</strong></p>
    
    <p>À bientôt!</p>
    
    <div class="footer">
      <p>L'équipe ONE SMS</p>
    </div>
  </div>
</body>
</html>`;

  console.log('\n1️⃣ Préparation du payload...');
  
  const payload = {
    title: 'Code TOUFE : +10% sur Vos Recharges !',
    message: emailHtml,
    promoCode: 'TOUFE',
    discount: 10,
    emailType: 'promo'
  };

  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  // Appeler l'edge function
  console.log('\n2️⃣ Appel à l\'edge function send-promo-emails...');
  
  try {
    const { data, error } = await supabaseAdmin.functions.invoke('send-promo-emails', {
      body: payload,
    });

    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log('✅ Response:', data);
      
      if (data) {
        console.log('\n📊 RÉSUMÉ');
        console.log('-'.repeat(60));
        console.log('Total envoyés:', data.totalSent || data.sent || 'N/A');
        console.log('Échecs:', data.totalFailed || data.failed || 0);
        console.log('Status:', data.status || 'Completed');
      }
    }
  } catch (err) {
    console.error('❌ Error invoking function:', err);
    
    // Essayer avec fetch direct
    console.log('\n3️⃣ Tentative avec fetch direct...');
    
    try {
      const response = await fetch(
        'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/send-promo-emails',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE`,
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();
      console.log('Response status:', response.status);
      console.log('Response:', JSON.stringify(result, null, 2));
      
      if (response.ok) {
        console.log('\n✅ Campagne envoyée avec succès!');
        console.log('📊 Total:', result.totalSent || result.sent || '?');
      }
    } catch (err2) {
      console.error('Fetch error:', err2.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('💡 Vérifier sur Resend Dashboard: https://resend.com/emails');
}

sendPromoViaEdgeFunction().catch(console.error);
