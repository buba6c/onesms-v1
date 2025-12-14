import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjg2NDE5OCwiZXhwIjoyMDQ4NDQwMTk4fQ.0kxLzR57EH0IXJt0xUuPxr_0aFcAzzgtWrHc7bqVuBs';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824';

console.log('💰 État du compte buba6c@gmail.com\n');

const { data: user } = await sb.from('users').select('balance, frozen_balance').eq('id', userId).single();

console.log(`Balance: ${user.balance} FCFA`);
console.log(`Frozen: ${user.frozen_balance} FCFA`);
console.log(`Disponible: ${user.balance - user.frozen_balance} FCFA\n`);

const { data: pending } = await sb.from('activations')
  .select('id, service, cost, frozen_amount, status')
  .eq('user_id', userId)
  .in('status', ['pending', 'waiting']);

console.log(`📱 Activations en cours: ${pending?.length || 0}`);
pending?.forEach(a => {
  console.log(`   - ${a.service}: ${a.cost} FCFA (frozen: ${a.frozen_amount}) [${a.status}]`);
});

const { data: recent } = await sb.from('balance_operations')
  .select('operation_type, amount, created_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(5);

console.log(`\n📊 Dernières opérations:`);
recent?.forEach(op => {
  const time = new Date(op.created_at).toLocaleTimeString('fr-FR');
  console.log(`   ${time} - ${op.operation_type.toUpperCase()}: ${op.amount} FCFA`);
});
