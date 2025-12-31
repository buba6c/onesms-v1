
const fs = require('fs');
const path = require('path');

// Read .env and .env.local
const envFiles = ['.env', '.env.local'];
const envVars = {};

envFiles.forEach(file => {
  const envPath = path.join(__dirname, '../' + file);
  if (fs.existsSync(envPath)) {
    console.log(`Reading ${file}...`);
    const envText = fs.readFileSync(envPath, 'utf8');
    envText.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2 && !line.trim().startsWith('#')) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/["']/g, "");
        envVars[key] = val;
      }
    });
  }
});

const SUPABASE_URL = envVars['SUPABASE_URL'] || process.env.SUPABASE_URL;
const SERVICE_KEY = envVars['SUPABASE_SERVICE_ROLE_KEY'] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Could not find SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const sql = `
select
  cron.schedule(
    'cleanup-pending-activations-12h',
    '0 */12 * * *',
    $$
    select
      net.http_post(
          url:='${SUPABASE_URL}/functions/v1/cleanup-pending-activations',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${SERVICE_KEY}"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
  );
`;

const outputPath = path.join(__dirname, '../READY_TO_RUN_CRON.sql');
fs.writeFileSync(outputPath, sql);
console.log('✅ Generated SQL with your secret key.');
console.log('📄 Saved to READY_TO_RUN_CRON.sql');
