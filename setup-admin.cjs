#!/usr/bin/env node

const https = require('https');

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';

console.log('🚀 Configuration de la base de données Supabase...\n');

// Étape 1: Créer un utilisateur admin de test
console.log('📝 Création de l\'utilisateur admin...');

const adminData = {
  email: 'admin@onesms.com',
  password: 'Admin123!',
  email_confirm: true,
  user_metadata: {
    name: 'Admin Test',
    role: 'admin'
  }
};

const postData = JSON.stringify(adminData);

const options = {
  hostname: 'htfqmamvmhdoixqcbbbw.supabase.co',
  port: 443,
  path: '/auth/v1/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Length': postData.length
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      const response = JSON.parse(data);
      console.log('✅ Utilisateur admin créé avec succès!');
      console.log(`   Email: admin@onesms.com`);
      console.log(`   Mot de passe: Admin123!`);
      console.log(`   User ID: ${response.user?.id || 'N/A'}`);
      console.log('\n📋 Prochaines étapes:');
      console.log('1. Allez sur http://localhost:3000/login');
      console.log('2. Connectez-vous avec admin@onesms.com / Admin123!');
      console.log('3. Vous devrez exécuter manuellement les migrations SQL dans Supabase:');
      console.log('   - Ouvrez https://supabase.com/dashboard → SQL Editor');
      console.log('   - Exécutez le contenu de: supabase/migrations/001_init_schema.sql');
      console.log('   - Puis exécutez: supabase/migrations/002_system_settings.sql');
      console.log('   - Mettez à jour le rôle: UPDATE users SET role = \'admin\' WHERE email = \'admin@onesms.com\';');
    } else {
      console.log('⚠️  Réponse du serveur:', res.statusCode);
      console.log(data);
      if (data.includes('already registered') || data.includes('User already registered')) {
        console.log('\n✅ L\'utilisateur existe déjà. Vous pouvez vous connecter avec:');
        console.log('   Email: admin@onesms.com');
        console.log('   Mot de passe: Admin123!');
      }
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Erreur:', e.message);
});

req.write(postData);
req.end();
