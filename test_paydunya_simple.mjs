#!/usr/bin/env node
/**
 * Test simple pour voir l'erreur exacte
 */

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5NDQzODQsImV4cCI6MjA0NzUyMDM4NH0.LGEBnZAYH56hOTgbYX1S0Y97W3lzbJt2hfhZBjmG-lc';

async function testPayDunya() {
  console.log('🧪 Test PayDunya avec fetch direct...\n');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/paydunya-create-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      amount: 1000,
      userId: '589c44ab-20aa-4e0c-b7a1-d5f4dda78137',
      email: 'test@onesms.com',
      phone: '+221771234567'
    })
  });

  console.log('Status:', response.status);
  console.log('Status Text:', response.statusText);
  
  const text = await response.text();
  console.log('\nResponse body:');
  console.log(text);

  try {
    const json = JSON.parse(text);
    console.log('\nJSON parsed:');
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.log('(Not JSON)');
  }
}

testPayDunya().catch(console.error);
