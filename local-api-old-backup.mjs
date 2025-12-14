import express from 'express';
import cors from 'cors';
import pg from 'pg';

const app = express();
const { Pool } = pg;

// Configuration
const SMS_ACTIVATE_API_KEY = 'd29edd5e1d04c3127d5253d5eAe70de8'; // Production key
const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.io/stubs/handler_api.php';

// PostgreSQL local
const pool = new Pool({
  user: 'postgres',
  password: 'postgres',
  host: '127.0.0.1',
  port: 54322,
  database: 'postgres'
});

app.use(cors());
app.use(express.json());

console.log('🚀 Starting Local API with SMS-Activate integration...');

// =============================================================================
// SETUP MISSING TABLES
// =============================================================================

// Create missing tables on startup
Async function setupMissingTables() {
  try {
    // Create system_settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        brand_name TEXT DEFAULT 'One SMS',
        brand_tagline TEXT DEFAULT 'Votre solution SMS fiable',
        primary_color TEXT DEFAULT '#3B82F6',
        secondary_color TEXT DEFAULT '#10B981',
        logo_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Insert default settings if none exist
    await pool.query(`
      INSERT INTO system_settings (brand_name, brand_tagline, primary_color, secondary_color)
      SELECT 'One SMS', 'Votre solution SMS fiable', '#3B82F6', '#10B981'
      WHERE NOT EXISTS (SELECT 1 FROM system_settings)
    `);
    
    // Create rentals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rentals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        order_id BIGINT NOT NULL UNIQUE,
        phone TEXT NOT NULL,
        service_code TEXT NOT NULL,
        service_name TEXT NOT NULL,
        country_code TEXT NOT NULL,
        country_name TEXT NOT NULL,
        status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished', 'cancelled')),
        price DECIMAL(10,2) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    console.log('✅ Missing tables created/verified');
  } catch (error) {
    console.error('❌ Error setting up tables:', error.message);
  }
}

setupMissingTables();

// =============================================================================
// AUTH ENDPOINTS
// =============================================================================

app.post('/auth/v1/token', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users LIMIT 1');
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      res.json({
        access_token: 'mock-local-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'mock-refresh-token',
        user: {
          id: user.id,
          aud: 'authenticated',
          role: 'authenticated',
          email: user.email,
          email_confirmed_at: new Date().toISOString(),
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      });
    } else {
      res.status(400).json({ error: 'No users in database' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/auth/v1/user', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users LIMIT 1');
    if (result.rows.length > 0) {
      const user = result.rows[0];
      res.json({
        id: user.id,
        aud: 'authenticated',
        role: 'authenticated',
        email: user.email,
        email_confirmed_at: new Date().toISOString(),
        created_at: user.created_at,
        updated_at: user.updated_at
      });
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// SYSTEM SETTINGS
// =============================================================================

app.get('/rest/v1/system_settings', async (req, res) => {
  res.json([
    { key: 'app_name', value: 'OneSMS Local' },
    { key: 'app_logo_url', value: '/logo.png' },
    { key: 'app_favicon_url', value: '/favicon.ico' },
    { key: 'app_primary_color', value: '#3B82F6' },
    { key: 'app_secondary_color', value: '#10B981' }
  ]);
});

// =============================================================================
// SERVICES - SYNC WITH SMS-ACTIVATE
// =============================================================================

app.get('/rest/v1/services', async (req, res) => {
  try {
    console.log('📞 Fetching services from SMS-Activate...');
    
    // Call SMS-Activate API
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getServices`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    // Map to our format
    const services = Object.entries(data).map(([code, name]) => ({
      code,
      name: String(name),
      display_name: String(name),
      icon: '📱',
      total_available: 100,
      category: 'messaging',
      popularity_score: 80,
      active: true
    })).slice(0, 50); // Top 50 services
    
    console.log(`✅ Fetched ${services.length} services`);
    res.json(services);
  } catch (err) {
    console.error('❌ Error fetching services:', err);
    // Fallback to mock data
    res.json([
      { code: 'go', name: 'WhatsApp', display_name: 'WhatsApp', icon: '💬', total_available: 150, category: 'messaging', popularity_score: 95, active: true },
      { code: 'oi', name: 'Telegram', display_name: 'Telegram', icon: '✈️', total_available: 120, category: 'messaging', popularity_score: 90, active: true },
      { code: 'ig', name: 'Instagram', display_name: 'Instagram', icon: '📷', total_available: 80, category: 'social', popularity_score: 85, active: true }
    ]);
  }
});

// =============================================================================
// COUNTRIES - SYNC WITH SMS-ACTIVATE
// =============================================================================

app.get('/rest/v1/countries', async (req, res) => {
  try {
    console.log('📞 Fetching countries from SMS-Activate...');
    
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getCountries`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    // Map to our format
    const countries = Object.entries(data).map(([id, name]) => ({
      id,
      code: String(name).toLowerCase().replace(/\s+/g, '_'),
      name: String(name),
      success_rate: 85,
      active: true
    }));
    
    console.log(`✅ Fetched ${countries.length} countries`);
    res.json(countries);
  } catch (err) {
    console.error('❌ Error fetching countries:', err);
    res.json([
      { id: '187', code: 'usa', name: 'USA', success_rate: 95, active: true },
      { id: '6', code: 'indonesia', name: 'Indonesia', success_rate: 90, active: true },
      { id: '0', code: 'russia', name: 'Russia', success_rate: 85, active: true }
    ]);
  }
});

// =============================================================================
// EDGE FUNCTIONS - SMS-ACTIVATE INTEGRATION
// =============================================================================

// Get top countries by service
app.post('/functions/v1/get-top-countries-by-service', async (req, res) => {
  try {
    const { service } = req.body;
    console.log(`📞 Getting top countries for service: ${service}`);
    
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getTopCountriesByService&service=${service}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    // Format response
    const countries = Object.entries(data).map(([id, info]) => ({
      id,
      name: info.name || info.country,
      countryCode: info.code || id,
      count: info.count || info.quantity || 0,
      price: info.cost || info.price || 5,
      successRate: 85
    }));
    
    res.json({ countries });
  } catch (err) {
    console.error('❌ Error:', err);
    res.json({ countries: [] });
  }
});

// Get real-time prices
app.post('/functions/v1/get-real-time-prices', async (req, res) => {
  try {
    const { service, type = 'activation' } = req.body;
    console.log(`📞 Getting prices for: ${service} (${type})`);
    
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices&service=${service}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    // Parse and format
    const pricesArray = [];
    for (const [countryId, prices] of Object.entries(data)) {
      if (typeof prices === 'object' && prices !== null) {
        for (const [serviceCode, info] of Object.entries(prices)) {
          if (typeof info === 'object' && info !== null) {
            pricesArray.push({
              countryId,
              countryCode: countryId,
              service: serviceCode,
              price: info.cost || 5,
              count: info.count || 0
            });
          }
        }
      }
    }
    
    res.json({ data: pricesArray });
  } catch (err) {
    console.error('❌ Error:', err);
    res.json({ data: [] });
  }
});

// Get rent services
app.post('/functions/v1/get-rent-services', async (req, res) => {
  try {
    const { rentTime = '4', serviceCode, getCountries = false } = req.body;
    console.log(`📞 Getting rent services: rentTime=${rentTime}, service=${serviceCode}`);
    
    let apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentServicesAndCountries&rent_time=${rentTime}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (getCountries && serviceCode) {
      // Return countries for this service
      const countries = [];
      if (data.countries) {
        for (const [id, name] of Object.entries(data.countries)) {
          countries.push({
            id,
            name: String(name),
            code: String(name).toLowerCase().replace(/\s+/g, '_'),
            quantity: Math.floor(Math.random() * 20),
            cost: 10 + Math.floor(Math.random() * 20),
            sellingPrice: 15 + Math.floor(Math.random() * 25)
          });
        }
      }
      res.json({ countries });
    } else {
      // Return services
      res.json(data);
    }
  } catch (err) {
    console.error('❌ Error:', err);
    res.json({ countries: [], services: {} });
  }
});

// Get providers status
app.post('/functions/v1/get-providers-status', async (req, res) => {
  res.json({
    providers: [
      { name: 'SMS-Activate', status: 'operational', uptime: 99.9 },
      { name: '5sim', status: 'operational', uptime: 99.5 }
    ]
  });
});

// Buy SMS-Activate number
app.post('/functions/v1/buy-sms-activate-number', async (req, res) => {
  try {
    const { country, product, userId, expectedPrice } = req.body;
    console.log(`📞 Buying number: country=${country}, service=${product}`);
    
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getNumber&service=${product}&country=${country}`;
    const response = await fetch(apiUrl);
    const text = await response.text();
    
    console.log('SMS-Activate response:', text);
    
    if (text.startsWith('ACCESS_NUMBER:')) {
      const [orderId, phone] = text.split(':')[1].split(':');
      
      // Insert activation in DB
      const result = await pool.query(`
        INSERT INTO activations (user_id, order_id, phone, service_code, country_code, status, frozen_amount, expires_at)
        VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW() + INTERVAL '20 minutes')
        RETURNING *
      `, [userId, orderId, phone, product, country, expectedPrice]);
      
      res.json({
        success: true,
        activation: result.rows[0]
      });
    } else {
      res.status(400).json({ error: text });
    }
  } catch (err) {
    console.error('❌ Error buying number:', err);
    res.status(500).json({ error: err.message });
  }
});

// Check SMS status
app.post('/functions/v1/check-sms-activate-status', async (req, res) => {
  try {
    const { orderId } = req.body;
    console.log(`📞 Checking status for order: ${orderId}`);
    
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getStatus&id=${orderId}`;
    const response = await fetch(apiUrl);
    const text = await response.text();
    
    console.log('Status response:', text);
    
    if (text.startsWith('STATUS_OK:')) {
      const smsCode = text.split(':')[1];
      
      // Update activation in DB
      await pool.query(`
        UPDATE activations 
        SET sms_code = $1, sms_text = $2, status = 'completed', sms_received_at = NOW()
        WHERE order_id = $3
      `, [smsCode, text, orderId]);
      
      res.json({ success: true, code: smsCode });
    } else {
      res.json({ success: false, status: text });
    }
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Cancel order
app.post('/functions/v1/cancel-sms-activate-order', async (req, res) => {
  try {
    const { orderId } = req.body;
    console.log(`📞 Cancelling order: ${orderId}`);
    
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&status=8&id=${orderId}`;
    const response = await fetch(apiUrl);
    const text = await response.text();
    
    if (text === 'ACCESS_CANCEL') {
      await pool.query(`
        UPDATE activations 
        SET status = 'cancelled'
        WHERE order_id = $1
      `, [orderId]);
      
      res.json({ success: true });
    } else {
      res.status(400).json({ error: text });
    }
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// DATABASE ENDPOINTS
// =============================================================================

app.get('/rest/v1/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users LIMIT 100');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/rest/v1/activations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM activations ORDER BY created_at DESC LIMIT 100');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/rest/v1/balance_operations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM balance_operations ORDER BY created_at DESC LIMIT 100');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/rest/v1/logs_provider', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM logs_provider ORDER BY created_at DESC LIMIT 100');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// ATOMIC FUNCTIONS RPC
// =============================================================================

app.post('/rest/v1/rpc/atomic_freeze', async (req, res) => {
  try {
    const { p_user_id, p_amount, p_activation_id, p_reason } = req.body;
    const result = await pool.query(
      'SELECT atomic_freeze($1::uuid, $2::decimal, $3::uuid, $4::text) as result',
      [p_user_id, p_amount, p_activation_id, p_reason || 'freeze']
    );
    res.json(result.rows[0].result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/rest/v1/rpc/atomic_commit', async (req, res) => {
  try {
    const { p_user_id, p_amount, p_activation_id, p_reason } = req.body;
    const result = await pool.query(
      'SELECT atomic_commit($1::uuid, $2::decimal, $3::uuid, $4::text) as result',
      [p_user_id, p_amount, p_activation_id, p_reason || 'commit']
    );
    res.json(result.rows[0].result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/rest/v1/rpc/atomic_refund', async (req, res) => {
  try {
    const { p_user_id, p_amount, p_activation_id, p_reason } = req.body;
    const result = await pool.query(
      'SELECT atomic_refund($1::uuid, $2::decimal, $3::uuid, $4::text) as result',
      [p_user_id, p_amount, p_activation_id, p_reason || 'refund']
    );
    res.json(result.rows[0].result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Local API with SMS-Activate integration',
    features: [
      'Auth mock',
      'Real-time SMS-Activate sync',
      'Services & Countries',
      'Number purchasing',
      'SMS status checking',
      'Atomic balance operations'
    ]
  });
});

// Start server
const PORT = 3500;
app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('✅ Local API running on http://localhost:' + PORT);
  console.log('📊 Database: postgresql://postgres:postgres@localhost:54322/postgres');
  console.log('🌐 SMS-Activate: INTEGRATED');
  console.log('='.repeat(60));
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('  - POST /auth/v1/token');
  console.log('  - GET  /rest/v1/services (SMS-Activate sync)');
  console.log('  - GET  /rest/v1/countries (SMS-Activate sync)');
  console.log('  - POST /functions/v1/buy-sms-activate-number');
  console.log('  - POST /functions/v1/check-sms-activate-status');
  console.log('  - POST /functions/v1/get-top-countries-by-service');
  console.log('  - POST /functions/v1/get-real-time-prices');
  console.log('  - POST /functions/v1/get-rent-services');
  console.log('');
});
