import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🔔 Testing Supabase Realtime...\n');

// Subscribe to users table
const channel = supabase
  .channel('test-realtime')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'users',
    },
    (payload) => {
      console.log('📥 Received change:', payload);
    }
  )
  .subscribe((status) => {
    console.log('📡 Subscription status:', status);
    if (status === 'SUBSCRIBED') {
      console.log('✅ Realtime is working! Table users is enabled.');
      console.log('\n⏳ Waiting 5 seconds for any changes...');
      setTimeout(() => {
        console.log('\n👋 Test complete. Unsubscribing...');
        channel.unsubscribe();
        process.exit(0);
      }, 5000);
    }
  });
