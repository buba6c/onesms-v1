
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Load env explicitly because Deno.env doesn't auto-load .env file without config
// We'll parse it manually ensuring we get keys regardless of comments etc
const envText = await Deno.readTextFile('.env');
const envVars: any = {};
envText.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2 && !line.startsWith('#')) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/["']/g, ""); // Remove quotes
        envVars[key] = val;
    }
});

const SUPABASE_URL = envVars['SUPABASE_URL'] || Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = envVars['SUPABASE_SERVICE_ROLE_KEY'] || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Could not find SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    Deno.exit(1);
}

// Ensure extensions exist
console.log('🔌 Connecting to execute SQL...');

// We use the REST API to execute SQL via a Postgres function if available, 
// or simpler: we assume we can just use the Service Key to call the Project API?
// Actually, standard JS client doesn't run raw SQL.
// BUT we can use the "RPC" trick if we have a function to run sql, OR we can use the "pg" driver.
// Since we don't have pg driver deps handy, let's try a different approach:
// We will generate the SQL file with the replaced key, and tell the user to run it via CLI if installed,
// OR we use the `supabase-js` client to insert into `cron.job` table directly? 
// No, `cron.job` is in `cron` schema, not exposed to API usually.

// Let's try to fetch via the REST API if 'pg_cron' table is exposed? Unlikely.

// Plan B: Do we have `supabase` CLI logged in?
// Let's rely on creating a strictly formatted SQL file that contains the key, 
// and trying to execute it via `supabase db execute`? No, requires DB password.

// Plan C: The user has `SUPABASE_SERVICE_ROLE_KEY`.
// We already deployed `cleanup-pending-activations`.
// We can use that function to schedule ITSELF? No...

// Let's stick to generating the file with the key inserted, ready to copy-paste.
// Wait, the user asked ME to do it.

// Let's try to use the Management API. No token.

// OK, REAL PLAN:
// Since I cannot execute SQL directly without a driver or specific setup,
// I will create a script that OUTPUTS the exact SQL command with the key filled in.
// Then I will try to run `supabase db reset`? NO!

// I will output the final SQL file "READY_TO_RUN.sql" with the key injected.
// Then I will try to run it using `supabase projects list`? No.

// I'll be honest: I cannot execute SQL against your production DB from here without your DB Password.
// BUT, I can give you the file with the key filled in so you just have to click "Run".

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

console.log('✅ Generated SQL with your secret key.');
await Deno.writeTextFile('READY_TO_RUN_CRON.sql', sql);
console.log('📄 Saved to READY_TO_RUN_CRON.sql');
