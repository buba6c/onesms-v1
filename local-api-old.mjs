import express from 'express';
import cors from 'cors';
import pg from 'pg';

const app = express();
const { Pool } = pg;

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

// Auth endpoints (mock for local dev)
app.post('/auth/v1/token', async (req, res) => {
  // Always return mock user for local dev
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
  // Always return mock user for local dev
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

// System settings
app.get('/rest/v1/system_settings', async (req, res) => {
  // Return mock settings
  res.json([
    { key: 'app_name', value: 'OneSMS Local' },
    { key: 'app_logo_url', value: '/logo.png' },
    { key: 'app_favicon_url', value: '/favicon.ico' },
    { key: 'app_primary_color', value: '#3B82F6' },
    { key: 'app_secondary_color', value: '#10B981' }
  ]);
});

// Services endpoint
app.get('/rest/v1/services', async (req, res) => {
  // Return mock services for local testing
  res.json([
    {
      code: 'go',
      name: 'WhatsApp',
      display_name: 'WhatsApp',
      icon: '💬',
      total_available: 150,
      category: 'messaging',
      popularity_score: 95
    },
    {
      code: 'oi',
      name: 'Telegram',
      display_name: 'Telegram',
      icon: '✈️',
      total_available: 120,
      category: 'messaging',
      popularity_score: 90
    },
    {
      code: 'ig',
      name: 'Instagram',
      display_name: 'Instagram',
      icon: '📷',
      total_available: 80,
      category: 'social',
      popularity_score: 85
    }
  ]);
});

// Countries endpoint
app.get('/rest/v1/countries', async (req, res) => {
  // Return mock countries
  res.json([
    { id: '1', code: 'sn', name: 'Sénégal', success_rate: 98.5, active: true },
    { id: '2', code: 'us', name: 'United States', success_rate: 99.2, active: true },
    { id: '3', code: 'fr', name: 'France', success_rate: 97.8, active: true },
    { id: '4', code: 'gb', name: 'United Kingdom', success_rate: 98.9, active: true },
    { id: '5', code: 'de', name: 'Germany', success_rate: 98.1, active: true }
  ]);
});

// Edge Functions mock
app.post('/functions/v1/get-rent-services', async (req, res) => {
  res.json([]);
});

app.post('/functions/v1/get-top-countries-by-service', async (req, res) => {
  res.json([
    { code: 'sn', name: 'Sénégal', count: 45 },
    { code: 'us', name: 'United States', count: 38 },
    { code: 'fr', name: 'France', count: 32 }
  ]);
});

app.post('/functions/v1/get-real-time-prices', async (req, res) => {
  const { service, country } = req.body;
  res.json({
    service: service || 'go',
    country: country || 'sn',
    activation_price: 250,
    rent_price: 1500,
    currency: 'XOF',
    available: true
  });
});

// REST API REST-like endpoints (Supabase compatible)
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
    const result = await pool.query('SELECT * FROM activations LIMIT 100');
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

// Atomic functions
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Local API connected to PostgreSQL' });
});

const PORT = 3500;
app.listen(PORT, () => {
  console.log(`✅ Local API running on http://localhost:${PORT}`);
  console.log(`📊 Database: postgresql://postgres:postgres@localhost:54322/postgres`);
  console.log(`🌐 Supabase Mock URL: http://localhost:${PORT}`);
});
