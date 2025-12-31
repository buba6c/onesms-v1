import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://api.onesms-sn.com';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhucXd2a29qaWRob2xpemd2cW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3OTg0MDcsImV4cCI6MjA0ODM3NDQwN30.vvWMa0cOxKhibEwYVnjoVBFnS0rpmWfpfHT4ztNfXw4';

const supabase = createClient(supabaseUrl, anonKey);

async function test() {
  // Simuler un appel direct à la fonction
  const { data, error } = await supabase.functions.invoke('get-rent-extension-price', {
    body: {
      rentalId: 'c7b4d5e6-f8a9-4b0c-d1e2-f3a4b5c6d7e8', // Fake ID pour tester le flow
      userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      hours: 4
    }
  });
  
  console.log('Response:', JSON.stringify(data, null, 2));
  if (error) console.log('Error:', error);
}

test();
