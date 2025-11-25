import https from 'https'

const LOGO_DEV_TOKEN = 'pk_acOeajbNRKGsSDnJvJrcfw'

console.log('🔍 TEST: Logo Binance\n')

const tests = [
  { name: 'binance.com', url: `https://img.logo.dev/binance.com?token=${LOGO_DEV_TOKEN}&size=200` },
  { name: 'binance.us', url: `https://img.logo.dev/binance.us?token=${LOGO_DEV_TOKEN}&size=200` },
  { name: 'binance.org', url: `https://img.logo.dev/binance.org?token=${LOGO_DEV_TOKEN}&size=200` },
]

const testUrl = (url) => {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          contentType: res.headers['content-type'],
          size: Buffer.byteLength(data),
          hasLogo: res.statusCode === 200 && res.headers['content-type']?.includes('image')
        })
      })
    }).on('error', (err) => {
      resolve({ status: 0, error: err.message })
    })
  })
}

for (const test of tests) {
  console.log(`Test: ${test.name}`)
  console.log(`URL: ${test.url}`)
  const result = await testUrl(test.url)
  console.log(`Status: ${result.status}`)
  console.log(`Type: ${result.contentType}`)
  console.log(`Size: ${result.size} bytes`)
  console.log(`✅ Logo: ${result.hasLogo ? 'OUI' : 'NON'}`)
  console.log()
}

console.log('\n💡 Visite ces URLs dans ton navigateur pour voir les logos:')
tests.forEach(t => console.log(`  ${t.name}: ${t.url}`))
