import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cucrlkaoegsibwtcckry.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1Y3Jsa2FvZWdzaWJ3dGNja3J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTkzNjU1MCwiZXhwIjoyMDQ1NTEyNTUwfQ.I7X7KkPYX1lqNiSMaRt0C5VbMAqvK5iZJBlwU-2LEvE'
);

// Check recent deposit transactions
const { data: deposits, error: depError } = await supabase
  .from('transactions')
  .select('*')
  .eq('type', 'deposit')
  .order('created_at', { ascending: false })
  .limit(10);

console.log('\n=== 💰 RECENT DEPOSIT TRANSACTIONS ===\n');
if (depError) {
  console.log('Error:', depError.message);
} else if (deposits.length === 0) {
  console.log('No deposit transactions found');
} else {
  deposits.forEach((t, i) => {
    console.log(`[${i+1}] ${t.reference || 'N/A'}`);
    console.log(`    Status: ${t.status}`);
    console.log(`    Amount: ${t.amount} activations`);
    console.log(`    Date: ${new Date(t.created_at).toLocaleString()}`);
    console.log(`    Provider: ${t.metadata?.payment_provider || t.metadata?.provider || 'N/A'}`);
    console.log(`    Token: ${t.metadata?.moneyfusion_token || 'N/A'}`);
    console.log('');
  });
}

// Check activation packages
const { data: packages, error: pkgError } = await supabase
  .from('activation_packages')
  .select('*')
  .eq('is_active', true)
  .order('activations', { ascending: true });

console.log('\n=== 📦 ACTIVATION PACKAGES ===\n');
if (pkgError) {
  console.log('Error:', pkgError.message);
} else if (packages.length === 0) {
  console.log('No active packages found!');
} else {
  packages.forEach(pkg => {
    console.log(`${pkg.activations} Activations - ${pkg.price_xof} FCFA (${pkg.is_popular ? '⭐ Popular' : ''})`);
  });
}

// Check if MoneyFusion webhook was called recently
const { data: recentCompleted, error: recError } = await supabase
  .from('transactions')
  .select('*')
  .eq('type', 'deposit')
  .eq('status', 'completed')
  .order('updated_at', { ascending: false })
  .limit(5);

console.log('\n=== ✅ RECENT COMPLETED DEPOSITS ===\n');
if (recError) {
  console.log('Error:', recError.message);
} else if (recentCompleted.length === 0) {
  console.log('No completed deposit transactions found');
} else {
  recentCompleted.forEach((t, i) => {
    console.log(`[${i+1}] ${t.reference}`);
    console.log(`    Completed: ${t.updated_at}`);
    console.log(`    Activations Added: ${t.amount}`);
    console.log(`    Method: ${t.metadata?.moneyfusion_method || 'N/A'}`);
    console.log('');
  });
}

// Check users balance
const { data: users, error: usersError } = await supabase
  .from('users')
  .select('id, email, balance')
  .order('balance', { ascending: false })
  .limit(5);

console.log('\n=== 👤 TOP USER BALANCES ===\n');
if (usersError) {
  console.log('Error:', usersError.message);
} else {
  users.forEach(u => {
    console.log(`${u.email}: ${u.balance || 0} activations`);
  });
}

console.log('\n=== 🔍 ANALYSIS COMPLETE ===');
