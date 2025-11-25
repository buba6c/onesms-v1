#!/usr/bin/env node

/**
 * Test direct de get-rent-status pour voir l'erreur exacte
 */

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';

console.log('🧪 Test get-rent-status\n');

// Simuler l'appel du hook useRentPolling
const response = await fetch(`${SUPABASE_URL}/functions/v1/get-rent-status`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
    'apikey': ANON_KEY
  },
  body: JSON.stringify({
    rentId: '30390231'
  })
});

console.log('📡 Status:', response.status, response.statusText);
console.log('📡 Headers:', Object.fromEntries(response.headers.entries()));

const text = await response.text();
console.log('📡 Response body:', text);

try {
  const json = JSON.parse(text);
  console.log('\n📋 Parsed JSON:', JSON.stringify(json, null, 2));
} catch (e) {
  console.log('\n⚠️ Not JSON, raw text above');
}
