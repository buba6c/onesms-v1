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

console.log('🔍 ANALYSE SIGNATURES FONCTIONS ATOMIQUES\n');

async function analyzeFunctions() {
  await client.connect();
  
  // Récupérer signatures exactes
  const { rows } = await client.query(`
    SELECT 
      p.proname as function_name,
      pg_get_function_arguments(p.oid) as arguments,
      pg_get_function_result(p.oid) as return_type,
      p.prosrc as source_code
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN ('atomic_freeze', 'atomic_commit', 'atomic_refund')
    ORDER BY p.proname, p.oid;
  `);
  
  for (const func of rows) {
    console.log(`\n📋 ${func.function_name}`);
    console.log('─'.repeat(80));
    console.log(`Arguments: ${func.arguments}`);
    console.log(`Retour: ${func.return_type}`);
    console.log('');
    
    // Trouver appels dans le code source
    const calls = func.source_code.match(/atomic_\w+\([^)]+\)/g);
    if (calls) {
      console.log('Appels internes:');
      calls.forEach(call => console.log(`  - ${call}`));
    }
  }
  
  // Vérifier les appels dans Edge Functions
  console.log('\n\n🔍 VÉRIFICATION APPELS EDGE FUNCTIONS');
  console.log('='.repeat(80));
  
  await client.end();
}

analyzeFunctions().catch(console.error);
