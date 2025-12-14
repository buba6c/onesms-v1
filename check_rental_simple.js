const https = require('https');

const url = 'https://htfqmamvmhdoixqcbbbw.supabase.co/rest/v1/rentals?or=(rent_id.eq.30658643,rental_id.eq.30658643)&select=id,rent_id,rental_id,user_id,status,frozen_amount,phone,created_at';

const options = {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const rentals = JSON.parse(data);
    if (rentals.length > 0) {
      console.log('✅ Rental found:');
      console.log(JSON.stringify(rentals[0], null, 2));
    } else {
      console.log('❌ No rental found');
    }
  });
}).on('error', err => console.error('Error:', err));
