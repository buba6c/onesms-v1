import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: 'aws-1-eu-central-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.htfqmamvmhdoixqcbbbw',
  password: 'Workeverytime@4##',
  ssl: { rejectUnauthorized: false }
});

console.log('🔧 FIX WEBHOOK IP FILTERING\n');

async function checkAndFix() {
  await client.connect();
  console.log('✅ Connecté à PostgreSQL\n');
  
  // 1. Vérifier les webhooks reçus
  console.log('📊 Vérification webhook_logs...');
  const { rows: logs } = await client.query(`
    SELECT COUNT(*) as total FROM webhook_logs
  `);
  console.log(`Total webhooks reçus: ${logs[0].total}\n`);
  
  // 2. Vérifier si table existe
  const { rows: tableCheck } = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'webhook_logs'
    );
  `);
  
  if (!tableCheck[0].exists) {
    console.log('⚠️  Table webhook_logs n\'existe pas. Création...\n');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.webhook_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        activation_id TEXT NOT NULL,
        payload JSONB NOT NULL,
        received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ip_address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_webhook_logs_activation_id 
        ON public.webhook_logs(activation_id);
      
      CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at 
        ON public.webhook_logs(created_at);
    `);
    
    console.log('✅ Table webhook_logs créée\n');
  }
  
  // 3. Solutions proposées
  console.log('🎯 SOLUTIONS:\n');
  console.log('1. Désactiver IP filtering (recommandé pour debug):');
  console.log('   npx supabase secrets set ENVIRONMENT=development\n');
  
  console.log('2. OU ajouter toutes les IPs SMS-Activate à la whitelist');
  console.log('   (modifier supabase/functions/webhook-sms-activate/index.ts)\n');
  
  console.log('3. OU enlever complètement l\'IP check');
  console.log('   (modifier le code pour accepter toutes les IPs)\n');
  
  console.log('📋 IPs SMS-Activate connues:');
  console.log('   - 188.42.218.183');
  console.log('   - 142.91.156.119');
  console.log('   - Possiblement d\'autres IPs dynamiques\n');
  
  await client.end();
}

checkAndFix().catch(console.error);
