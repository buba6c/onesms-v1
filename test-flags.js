import { getCountryFlag, getFlagEmoji } from './src/lib/logo-service.ts';

// Test des drapeaux avec les codes de la DB
const testCountries = [
  'algeria', 'armenia', 'belarus', 'belgium', 'france', 
  'germany', 'russia', 'usa', 'morocco', 'canada'
];

console.log('🧪 Test des drapeaux:\n');

for (const country of testCountries) {
  const flagUrl = getCountryFlag(country);
  const emoji = getFlagEmoji(country);
  console.log(`${country.padEnd(15)} → ${flagUrl} ${emoji}`);
}
