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

console.log('🚀 Starting Complete Local API with SMS-Activate integration...');

// =============================================================================
// SETUP MISSING TABLES
// =============================================================================

async function setupMissingTables() {
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
          updated_at: user.updated_at,
          balance: parseFloat(user.balance || 0),
          frozen_balance: parseFloat(user.frozen_balance || 0)
        }
      });
    } else {
      res.status(400).json({ error: 'No users found in database' });
    }
  } catch (error) {
    console.error('❌ Auth error:', error);
    res.status(500).json({ error: error.message });
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
        updated_at: user.updated_at,
        balance: parseFloat(user.balance || 0),
        frozen_balance: parseFloat(user.frozen_balance || 0)
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('❌ User fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// SYSTEM SETTINGS ENDPOINT
// =============================================================================

app.get('/rest/v1/system_settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_settings ORDER BY created_at DESC LIMIT 1');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching system settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// SMS-ACTIVATE SYNC ENDPOINTS
// =============================================================================

app.get('/rest/v1/services', async (req, res) => {
  try {
    console.log('📞 Fetching services from SMS-Activate...');
    // Récupérer les services depuis plusieurs pays populaires
    const countries = ['6', '7', '1', '2']; // Indonésie, Russie, USA, Ukraine
    const serviceSet = new Set();
    
    for (const country of countries) {
      try {
        const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices&country=${country}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data && data[country]) {
          Object.keys(data[country]).forEach(serviceCode => {
            serviceSet.add(serviceCode);
          });
        }
      } catch (err) {
        console.log(`⚠️ Error fetching services for country ${country}:`, err.message);
      }
    }
    
    if (serviceSet.size > 0) {
      
      // Mapper vers des noms connus
      const serviceNames = {
        'tg': 'Telegram',
        'wa': 'WhatsApp', 
        'go': 'Google',
        'vi': 'Viber',
        'fb': 'Facebook',
        'tw': 'Twitter',
        'ig': 'Instagram',
        'vk': 'VKontakte',
        'ok': 'Odnoklassniki'
      };
      
      const services = Array.from(serviceSet).map(code => ({
        code,
        name: serviceNames[code] || code.toUpperCase(),
        display_name: serviceNames[code] || code.toUpperCase(),
        icon: code === 'tg' ? '✈️' : code === 'wa' ? '💬' : code === 'go' ? '🔍' : '📱',
        total_available: Math.floor(Math.random() * 200) + 50,
        category: 'messaging',
        popularity_score: Math.floor(Math.random() * 40) + 60,
        active: true
      })).slice(0, 50);
      
      console.log(`✅ Fetched ${services.length} services`);
      res.json(services);
    } else {
      throw new Error(data.error || 'API returned error');
    }
  } catch (error) {
    console.error('❌ SMS-Activate services error:', error.message);
    // Fallback to mock data
    const mockServices = [
      { code: 'go', name: 'WhatsApp', display_name: 'WhatsApp', icon: '💬', total_available: 150, category: 'messaging', popularity_score: 95, active: true },
      { code: 'oi', name: 'Telegram', display_name: 'Telegram', icon: '✈️', total_available: 120, category: 'messaging', popularity_score: 90, active: true },
      { code: 'wa', name: 'WeChat', display_name: 'WeChat', icon: '💬', total_available: 80, category: 'messaging', popularity_score: 75, active: true }
    ];
    res.json(mockServices);
  }
});

app.get('/rest/v1/countries', async (req, res) => {
  try {
    console.log('🌍 Fetching countries from SMS-Activate...');
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getCountries`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (typeof data === 'object' && !data.error) {
      const countries = Object.entries(data).map(([code, info]) => {
        const countryName = typeof info === 'object' ? (info.eng || info.rus || 'Unknown') : String(info);
        return {
          code: parseInt(code),
          name: countryName,
          display_name: countryName.toLowerCase(),
          flag: getCountryFlag(parseInt(code)),
          active: true
        };
      }).slice(0, 50);
      
      console.log(`✅ Fetched ${countries.length} countries`);
      res.json(countries);
    } else {
      throw new Error(data.error || 'API returned error');
    }
  } catch (error) {
    console.error('❌ SMS-Activate countries error:', error.message);
    // Fallback to mock data
    const mockCountries = [
      { code: 187, name: 'Indonesia', display_name: 'indonesia', flag: '🇮🇩', active: true },
      { code: 4, name: 'Kazakhstan', display_name: 'kazakhstan', flag: '🇰🇿', active: true },
      { code: 6, name: 'France', display_name: 'france', flag: '🇫🇷', active: true }
    ];
    res.json(mockCountries);
  }
});

// =============================================================================
// SMS-ACTIVATE FUNCTION ENDPOINTS
// =============================================================================

app.post('/functions/v1/get-top-countries-by-service', async (req, res) => {
  try {
    const { service } = req.body;
    console.log('🏆 [TOP-COUNTRIES] Service:', service);
    
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getTopCountriesByService&service=${service}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('❌ [TOP-COUNTRIES] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/functions/v1/get-real-time-prices', async (req, res) => {
  try {
    const { service, countries = [] } = req.body;
    console.log('💰 [REAL-TIME-PRICES] Service:', service, 'Countries:', countries);
    
    const prices = {};
    for (const country of countries.slice(0, 10)) {
      const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices&service=${service}&country=${country}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data && typeof data === 'object' && data[country]) {
        const info = data[country];
        prices[country] = {
          cost: parseFloat(info.cost || 0),
          count: parseInt(info.count || 0)
        };
      }
    }
    
    res.json({
      success: true,
      prices: prices
    });
  } catch (error) {
    console.error('❌ [REAL-TIME-PRICES] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/functions/v1/get-rent-services', async (req, res) => {
  try {
    console.log('🏠 [GET-RENT-SERVICES] Fetching rental services...');
    
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentServicesAndCountries&rent=true`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data && typeof data === 'object') {
      const services = Object.entries(data).map(([code, countries]) => ({
        code,
        name: getServiceName(code),
        countries: Object.entries(countries).map(([countryCode, info]) => ({
          code: parseInt(countryCode),
          name: String(info.name).toLowerCase(),
          available: parseInt(info.quantity || 0),
          price: parseFloat(info.price || 0)
        }))
      }));
      
      res.json({
        success: true,
        services: services
      });
    } else {
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.error('❌ [GET-RENT-SERVICES] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// SMS-ACTIVATE ACTIONS
// =============================================================================

app.post('/functions/v1/buy-sms-activate-number', async (req, res) => {
  try {
    const { service, country, userId } = req.body;
    console.log('🛒 [BUY-NUMBER] Purchase:', { service, country, userId });
    
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getNumber&service=${service}&country=${country}`;
    const response = await fetch(apiUrl);
    const text = await response.text();
    
    if (text.startsWith('ACCESS_NUMBER:')) {
      const parts = text.split(':');
      const orderId = parts[1];
      const phone = parts[2];
      
      // Store in local database
      await pool.query(`
        INSERT INTO activations (user_id, order_id, phone, service_code, status, frozen_amount, expires_at)
        VALUES ($1, $2, $3, $4, 'waiting', $5, $6)
      `, [userId, orderId, phone, service, 25.0, new Date(Date.now() + 20 * 60 * 1000)]);
      
      // Log the purchase
      await pool.query(`
        INSERT INTO logs_provider (provider, action, request_url, response_status, response_body)
        VALUES ($1, $2, $3, $4, $5)
      `, ['sms-activate', 'getNumber', apiUrl, 200, text]);
      
      res.json({
        success: true,
        data: {
          orderId: parseInt(orderId),
          phone: phone,
          status: 'waiting'
        }
      });
    } else {
      throw new Error(text);
    }
  } catch (error) {
    console.error('❌ [BUY-NUMBER] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/functions/v1/check-sms-activate-status', async (req, res) => {
  try {
    const { orderId } = req.body;
    console.log('🔍 [CHECK-SMS-STATUS] OrderID:', orderId);
    
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getStatus&id=${orderId}`;
    const response = await fetch(apiUrl);
    const text = await response.text();
    
    // Log the check
    await pool.query(`
      INSERT INTO logs_provider (provider, action, activation_id, request_url, response_status, response_body)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['sms-activate', 'getStatus', orderId, apiUrl, 200, text]);
    
    if (text.startsWith('STATUS_OK:')) {
      const smsCode = text.split(':')[1];
      
      // Update activation
      await pool.query(`
        UPDATE activations 
        SET sms_code = $1, sms_received_at = NOW(), status = 'completed'
        WHERE order_id = $2
      `, [smsCode, orderId]);
      
      res.json({
        success: true,
        data: {
          status: 'completed',
          smsCode: smsCode
        }
      });
    } else if (text === 'STATUS_WAIT_CODE') {
      res.json({
        success: true,
        data: { status: 'waiting' }
      });
    } else {
      res.json({
        success: true,
        data: { status: 'waiting', message: text }
      });
    }
  } catch (error) {
    console.error('❌ [CHECK-SMS-STATUS] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/functions/v1/cancel-sms-activate-order', async (req, res) => {
  try {
    const { orderId } = req.body;
    console.log('❌ [CANCEL-ORDER] OrderID:', orderId);
    
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&status=8&id=${orderId}`;
    const response = await fetch(apiUrl);
    const text = await response.text();
    
    if (text === 'ACCESS_CANCEL') {
      // Update local database
      await pool.query(`
        UPDATE activations SET status = 'cancelled' WHERE order_id = $1
      `, [orderId]);
      
      res.json({
        success: true,
        message: 'Order cancelled successfully'
      });
    } else {
      throw new Error(text);
    }
  } catch (error) {
    console.error('❌ [CANCEL-ORDER] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// RENT MANAGEMENT FUNCTIONS
// =============================================================================

app.post('/functions/v1/get-rent-status', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'orderId required' });
    }
    
    console.log('🏠 [GET-RENT-STATUS] Checking rental:', orderId);
    
    // Check local rental status first
    const result = await pool.query(
      'SELECT * FROM rentals WHERE order_id = $1',
      [orderId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rental not found' });
    }
    
    const rental = result.rows[0];
    
    // If still active, check with 5sim API for updates
    if (rental.status === 'waiting' || rental.status === 'active') {
      // Mock response - in real implementation, call 5sim API
      const mockStatus = Math.random() > 0.7 ? 'finished' : rental.status;
      
      if (mockStatus !== rental.status) {
        await pool.query(
          'UPDATE rentals SET status = $1, updated_at = NOW() WHERE order_id = $2',
          [mockStatus, orderId]
        );
        rental.status = mockStatus;
      }
    }
    
    res.json({
      success: true,
      rental: {
        id: rental.id,
        orderId: rental.order_id,
        phone: rental.phone,
        status: rental.status,
        expiresAt: rental.expires_at,
        service: {
          code: rental.service_code,
          name: rental.service_name
        },
        country: {
          code: rental.country_code,
          name: rental.country_name
        }
      }
    });
    
  } catch (error) {
    console.error('❌ [GET-RENT-STATUS] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/functions/v1/get-services-counts', async (req, res) => {
  try {
    const { countries = [187, 4, 6] } = req.body;
    
    console.log('📊 [GET-SERVICES-COUNTS] Scanning countries:', countries);
    
    // Mock response with realistic data
    const mockCounts = {
      go: { total: 150, countries: { 187: 50, 4: 60, 6: 40 } },
      oi: { total: 120, countries: { 187: 40, 4: 45, 6: 35 } },
      wa: { total: 200, countries: { 187: 80, 4: 70, 6: 50 } },
      tg: { total: 180, countries: { 187: 60, 4: 65, 6: 55 } },
      fb: { total: 90, countries: { 187: 30, 4: 35, 6: 25 } }
    };
    
    res.json({
      success: true,
      counts: mockCounts,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [GET-SERVICES-COUNTS] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/functions/v1/get-providers-status', async (req, res) => {
  try {
    console.log('📡 [GET-PROVIDERS-STATUS] Checking providers...');
    
    const providers = [];
    
    // Check SMS-Activate
    try {
      const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getBalance`;
      const response = await fetch(apiUrl);
      const text = await response.text();
      
      if (text.startsWith('ACCESS_BALANCE:')) {
        const balance = parseFloat(text.split(':')[1]);
        providers.push({
          name: 'SMS-Activate',
          status: 'online',
          balance: balance,
          currency: 'RUB',
          apiUrl: 'https://api.sms-activate.io',
          lastCheck: new Date().toISOString()
        });
      } else {
        throw new Error(text);
      }
    } catch (error) {
      providers.push({
        name: 'SMS-Activate',
        status: 'error',
        balance: 0,
        currency: 'RUB',
        apiUrl: 'https://api.sms-activate.io',
        lastCheck: new Date().toISOString(),
        error: error.message
      });
    }
    
    // Mock 5sim provider
    providers.push({
      name: '5sim',
      status: 'online',
      balance: 127.45,
      currency: 'USD',
      apiUrl: 'https://5sim.net',
      lastCheck: new Date().toISOString()
    });
    
    res.json({
      success: true,
      providers: providers
    });
    
  } catch (error) {
    console.error('❌ [GET-PROVIDERS-STATUS] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// DATABASE REST ENDPOINTS
// =============================================================================

// Rentals
app.get('/rest/v1/rentals', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM rentals 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching rentals:', error);
    res.status(500).json({ error: error.message });
  }
});

// Users
app.get('/rest/v1/users', async (req, res) => {
  try {
    console.log('👤 [GET-USERS] Query:', req.query);
    console.log('👤 [GET-USERS] Headers:', req.headers['accept']);

    let query = 'SELECT * FROM users';
    const values = [];
    
    // Simple filter for id=eq.UUID
    if (req.query.id && typeof req.query.id === 'string' && req.query.id.startsWith('eq.')) {
      const id = req.query.id.substring(3);
      query += ' WHERE id = $1';
      values.push(id);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, values);
    // Convertir les décimaux en nombres
    const users = result.rows.map(u => ({
      ...u,
      balance: parseFloat(u.balance || 0),
      frozen_balance: parseFloat(u.frozen_balance || 0)
    }));

    // Handle .single() request from Supabase client
    if (req.headers['accept'] === 'application/vnd.pgrst.object+json') {
      if (users.length > 0) {
        res.json(users[0]);
      } else {
        res.status(406).json({ error: 'The result contains 0 rows' });
      }
    } else {
      res.json(users);
    }
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Activations
app.get('/rest/v1/activations', async (req, res) => {
  try {
    let query = 'SELECT * FROM activations';
    const values = [];
    
    // Simple filter for user_id=eq.UUID
    if (req.query.user_id && typeof req.query.user_id === 'string' && req.query.user_id.startsWith('eq.')) {
      const userId = req.query.user_id.substring(3);
      query += ' WHERE user_id = $1';
      values.push(userId);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, values);
    // Convertir les décimaux en nombres
    const activations = result.rows.map(a => ({
      ...a,
      frozen_amount: parseFloat(a.frozen_amount || 0)
    }));
    res.json(activations);
  } catch (error) {
    console.error('❌ Error fetching activations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Balance operations
app.get('/rest/v1/balance_operations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM balance_operations ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching balance operations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Logs provider
app.get('/rest/v1/logs_provider', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM logs_provider ORDER BY created_at DESC LIMIT 100');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching provider logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// ATOMIC RPC FUNCTIONS
// =============================================================================

app.post('/rest/v1/rpc/atomic_freeze', async (req, res) => {
  try {
    const { p_user_id, p_amount, p_activation_id, p_reason } = req.body;
    
    const result = await pool.query(
      'SELECT atomic_freeze($1, $2, $3, $4) as result',
      [p_user_id, p_amount, p_activation_id, p_reason]
    );
    
    res.json({ success: true, result: result.rows[0].result });
  } catch (error) {
    console.error('❌ Atomic freeze error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/rest/v1/rpc/atomic_commit', async (req, res) => {
  try {
    const { p_user_id, p_amount, p_activation_id, p_reason } = req.body;
    
    const result = await pool.query(
      'SELECT atomic_commit($1, $2, $3, $4) as result',
      [p_user_id, p_amount, p_activation_id, p_reason]
    );
    
    res.json({ success: true, result: result.rows[0].result });
  } catch (error) {
    console.error('❌ Atomic commit error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/rest/v1/rpc/atomic_refund', async (req, res) => {
  try {
    const { p_user_id, p_amount, p_activation_id, p_reason } = req.body;
    
    const result = await pool.query(
      'SELECT atomic_refund($1, $2, $3, $4) as result',
      [p_user_id, p_amount, p_activation_id, p_reason]
    );
    
    res.json({ success: true, result: result.rows[0].result });
  } catch (error) {
    console.error('❌ Atomic refund error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getServiceIcon(code) {
  const icons = {
    'go': '💬', 'wa': '💬', 'oi': '✈️', 'tg': '✈️',
    'fb': '📘', 'ig': '📸', 'tw': '🐦', 'vk': '🎵'
  };
  return icons[code] || '📱';
}

function getCountryFlag(code) {
  const flags = {
    187: '🇮🇩', 4: '🇰🇿', 6: '🇫🇷', 1: '🇷🇺',
    7: '🇺🇸', 44: '🇬🇧', 49: '🇩🇪', 33: '🇫🇷'
  };
  return flags[code] || '🌍';
}

function getServiceName(code) {
  const names = {
    'go': 'Google/WhatsApp', 'wa': 'WeChat', 'oi': 'Telegram',
    'tg': 'Telegram', 'fb': 'Facebook', 'ig': 'Instagram'
  };
  return names[code] || code.toUpperCase();
}

// =============================================================================
// LOCAL CRON SIMULATORS
// =============================================================================

// SMS Polling Simulator
setInterval(async () => {
  try {
    console.log('🔄 [LOCAL-CRON] SMS Polling...');
    
    const result = await pool.query(`
      SELECT * FROM activations 
      WHERE status = 'waiting' 
      AND created_at > NOW() - INTERVAL '1 hour'
      LIMIT 5
    `);
    
    for (const activation of result.rows) {
      // Simulate random SMS arrival (10% chance)
      if (Math.random() < 0.1) {
        const mockSmsCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        await pool.query(`
          UPDATE activations 
          SET sms_code = $1, sms_received_at = NOW(), status = 'completed'
          WHERE id = $2
        `, [mockSmsCode, activation.id]);
        
        console.log(`📨 [LOCAL-CRON] SMS received for ${activation.phone}: ${mockSmsCode}`);
      }
    }
  } catch (error) {
    console.error('❌ [LOCAL-CRON] SMS Polling error:', error.message);
  }
}, 30000); // Every 30 seconds

// Cleanup Expired Activations
setInterval(async () => {
  try {
    console.log('🧹 [LOCAL-CRON] Cleaning expired activations...');
    
    const result = await pool.query(`
      UPDATE activations 
      SET status = 'expired' 
      WHERE status = 'waiting' 
      AND expires_at < NOW() 
      RETURNING id, phone
    `);
    
    if (result.rows.length > 0) {
      console.log(`🧹 [LOCAL-CRON] Expired ${result.rows.length} activations`);
    }
  } catch (error) {
    console.error('❌ [LOCAL-CRON] Cleanup error:', error.message);
  }
}, 60000); // Every minute

// =============================================================================
// START SERVER
// =============================================================================

const PORT = 3500;
app.listen(PORT, () => {
  console.log('============================================================');
  console.log('✅ Local API running on http://localhost:' + PORT);
  console.log('📊 Database: postgresql://postgres:postgres@localhost:54322/postgres');
  console.log('🌐 SMS-Activate: INTEGRATED');
  console.log('⏱️ Local Crons: SMS Polling (30s), Cleanup (60s)');
  console.log('============================================================');
  console.log('📋 Available endpoints:');
  console.log('   🔐 Auth: POST /auth/v1/token, GET /auth/v1/user');
  console.log('   📊 REST: GET /rest/v1/{users,activations,rentals,system_settings}');
  console.log('   📡 SMS: POST /functions/v1/{buy,check,cancel}-sms-activate-*');
  console.log('   🏠 Rent: POST /functions/v1/get-rent-{status,services}');
  console.log('   💰 RPC: POST /rest/v1/rpc/atomic_{freeze,commit,refund}');
  console.log('============================================================');
});