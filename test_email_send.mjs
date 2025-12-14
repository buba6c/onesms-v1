import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

async function testEmail() {
  console.log('🧪 Test d\'envoi d\'email promo...\n');

  const testData = {
    title: 'Test Email System',
    message: 'Ceci est un test pour verifier que le systeme d\'envoi fonctionne correctement.',
    emailType: 'operational',
    filter: {
      limit: 1 // Envoyer à 1 seul utilisateur pour tester
    }
  };

  console.log('📤 Envoi de la requête...');
  console.log('Données:', JSON.stringify(testData, null, 2));

  try {
    const response = await fetch(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/send-promo-emails`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL}`,
        },
        body: JSON.stringify(testData),
      }
    );

    console.log('\n📥 Réponse reçue:');
    console.log('Status:', response.status, response.statusText);

    const result = await response.json();
    console.log('\nRésultat:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ Email envoyé avec succès!');
      console.log(`📊 ${result.sent} email(s) envoyé(s) sur ${result.total}`);
      if (result.errors && result.errors.length > 0) {
        console.log('\n⚠️  Erreurs:', result.errors);
      }
    } else {
      console.error('\n❌ Erreur d\'envoi:', result.error || result);
    }
  } catch (error) {
    console.error('\n❌ Erreur réseau:', error.message);
  }
}

testEmail();
