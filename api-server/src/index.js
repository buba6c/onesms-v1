import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';

// Load env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMS_ACTIVATE_API_KEY = process.env.SMS_ACTIVATE_API_KEY;
const PORT = process.env.PORT || 3001;

const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.io/stubs/handler_api.php';

// Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper to safely fetch from SMS-Activate (handles text/JSON responses)
async function fetchSmsActivate(url) {
  const response = await fetch(url);
  const text = await response.text();
  
  // Check for error responses (plain text)
  const errorCodes = ['BAD_KEY', 'BAD_SERVICE', 'BAD_ACTION', 'NO_NUMBERS', 'NO_BALANCE', 'WRONG_SERVICE', 'NO_ACTIVATION'];
  if (errorCodes.some(code => text.startsWith(code))) {
    throw new Error(text);
  }
  
  // Try to parse as JSON
  try {
    return JSON.parse(text);
  } catch {
    // Return as-is if not JSON (like ACCESS_BALANCE:123)
    return text;
  }
}

const app = express();
app.use(cors());
app.use(express.json());

// Helper to get user from Authorization header
async function getUser(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return user;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// BUY SMS-ACTIVATE NUMBER
// ============================================================================
app.post('/functions/v1/buy-sms-activate-number', async (req, res) => {
  console.log('🚀 [BUY-SMS-ACTIVATE] Function called');
  
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', success: false });
    }

    // Accept multiple parameter names for compatibility
    const serviceCode = req.body.serviceCode || req.body.product || req.body.service;
    const countryCode = req.body.countryCode || req.body.country;
    const operator = req.body.operator || 'any';
    const expectedPrice = req.body.expectedPrice;
    
    console.log('📥 Request:', { serviceCode, countryCode, operator, expectedPrice, userId: user.id });

    if (!serviceCode || !countryCode) {
      return res.status(400).json({ 
        error: 'serviceCode and countryCode are required',
        success: false 
      });
    }

    // Get user balance
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return res.status(400).json({ error: 'User not found', success: false });
    }

    // Use expectedPrice from frontend if available, otherwise calculate
    let finalPrice = expectedPrice;
    
    if (!finalPrice) {
      // Fallback: Get price from SMS-Activate
      const priceUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices&service=${serviceCode}&country=${countryCode}`;
      const priceData = await fetchSmsActivate(priceUrl);

      let basePrice = 0;
      if (priceData[countryCode] && priceData[countryCode][serviceCode]) {
        basePrice = parseFloat(priceData[countryCode][serviceCode].cost);
      }

      // Apply margin (30%)
      const margin = 1.3;
      finalPrice = Math.ceil(basePrice * margin * 100); // In CFA cents
    }
    
    console.log('💰 Final price:', finalPrice, 'User balance:', userData.balance);

    if (userData.balance < finalPrice) {
      return res.status(400).json({ 
        error: 'Solde insuffisant',
        required: finalPrice,
        available: userData.balance,
        success: false
      });
    }

    // Buy number from SMS-Activate
    const buyUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getNumber&service=${serviceCode}&country=${countryCode}${operator && operator !== 'any' ? `&operator=${operator}` : ''}`;
    console.log('📞 Buying number from SMS-Activate...');
    
    const buyResponse = await fetch(buyUrl);
    const buyText = await buyResponse.text();
    console.log('📞 SMS-Activate response:', buyText);

    if (buyText.startsWith('ACCESS_NUMBER')) {
      const parts = buyText.split(':');
      const activationId = parts[1];
      const phone = parts[2];

      // Freeze funds
      const { error: freezeError } = await supabase
        .from('users')
        .update({
          balance: userData.balance - finalPrice,
          frozen_balance: (userData.frozen_balance || 0) + finalPrice
        })
        .eq('id', user.id);

      if (freezeError) {
        console.error('❌ Failed to freeze funds:', freezeError);
        // Cancel the activation
        await fetch(`${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&status=8&id=${activationId}`);
        return res.status(500).json({ error: 'Failed to freeze funds' });
      }

      // Create activation record
      const { data: activation, error: activationError } = await supabase
        .from('activations')
        .insert({
          user_id: user.id,
          external_id: activationId,
          phone_number: phone,
          service: serviceCode,
          country_code: countryCode,
          status: 'pending',
          cost: finalPrice,
          provider: 'sms-activate',
          operator: operator || null,
          expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (activationError) {
        console.error('❌ Failed to create activation:', activationError);
        return res.status(500).json({ error: 'Failed to create activation record' });
      }

      console.log('✅ Number purchased successfully:', { phone, activationId });
      return res.json({
        success: true,
        data: {
          activation_id: activation.id,
          phone: phone,
          order_id: activationId,
          cost: finalPrice,
          expiresAt: activation.expires_at
        }
      });
    } else if (buyText === 'NO_NUMBERS') {
      return res.status(400).json({ error: 'No numbers available for this service/country', success: false });
    } else if (buyText === 'NO_BALANCE') {
      return res.status(500).json({ error: 'Provider balance insufficient', success: false });
    } else {
      return res.status(400).json({ error: buyText, success: false });
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message, success: false });
  }
});

// ============================================================================
// CHECK SMS-ACTIVATE STATUS
// ============================================================================
app.post('/functions/v1/check-sms-activate-status', async (req, res) => {
  console.log('🔍 [CHECK-STATUS] Function called');
  
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { activationId } = req.body;
    
    // Get activation from DB
    const { data: activation, error: activationError } = await supabase
      .from('activations')
      .select('*')
      .eq('id', activationId)
      .eq('user_id', user.id)
      .single();

    if (activationError || !activation) {
      return res.status(404).json({ error: 'Activation not found' });
    }

    // Check status at SMS-Activate
    const statusUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getStatus&id=${activation.external_id}`;
    const statusResponse = await fetch(statusUrl);
    const statusText = await statusResponse.text();
    
    console.log('📞 SMS-Activate status:', statusText);

    let smsCode = null;
    let newStatus = activation.status;

    if (statusText.startsWith('STATUS_OK')) {
      // SMS received!
      smsCode = statusText.split(':')[1];
      newStatus = 'completed';
      
      // Update activation
      await supabase
        .from('activations')
        .update({ 
          status: 'completed', 
          sms_code: smsCode,
          completed_at: new Date().toISOString()
        })
        .eq('id', activationId);

      // Deduct from frozen, add to transaction
      const { data: userData } = await supabase
        .from('users')
        .select('frozen_balance')
        .eq('id', user.id)
        .single();

      await supabase
        .from('users')
        .update({
          frozen_balance: Math.max(0, (userData?.frozen_balance || 0) - activation.cost)
        })
        .eq('id', user.id);

      // Create transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'activation',
          amount: -activation.cost,
          description: `SMS activation - ${activation.service}`,
          status: 'completed',
          reference: activation.id
        });

    } else if (statusText === 'STATUS_WAIT_CODE') {
      newStatus = 'pending';
    } else if (statusText === 'STATUS_CANCEL') {
      newStatus = 'cancelled';
      
      // Refund frozen funds
      const { data: userData } = await supabase
        .from('users')
        .select('balance, frozen_balance')
        .eq('id', user.id)
        .single();

      await supabase
        .from('users')
        .update({
          balance: userData.balance + activation.cost,
          frozen_balance: Math.max(0, (userData?.frozen_balance || 0) - activation.cost)
        })
        .eq('id', user.id);

      await supabase
        .from('activations')
        .update({ status: 'cancelled' })
        .eq('id', activationId);
    }

    return res.json({
      success: true,
      status: newStatus,
      smsCode: smsCode,
      activation: activation
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CANCEL SMS-ACTIVATE ORDER
// ============================================================================
app.post('/functions/v1/cancel-sms-activate-order', async (req, res) => {
  console.log('❌ [CANCEL-ORDER] Function called');
  
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { activationId } = req.body;
    
    // Get activation
    const { data: activation, error } = await supabase
      .from('activations')
      .select('*')
      .eq('id', activationId)
      .eq('user_id', user.id)
      .single();

    if (error || !activation) {
      return res.status(404).json({ error: 'Activation not found' });
    }

    if (activation.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot cancel non-pending activation' });
    }

    // Cancel at SMS-Activate (status=8 = cancel)
    const cancelUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&status=8&id=${activation.external_id}`;
    await fetch(cancelUrl);

    // Refund frozen funds
    const { data: userData } = await supabase
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', user.id)
      .single();

    await supabase
      .from('users')
      .update({
        balance: userData.balance + activation.cost,
        frozen_balance: Math.max(0, (userData?.frozen_balance || 0) - activation.cost)
      })
      .eq('id', user.id);

    // Update activation status
    await supabase
      .from('activations')
      .update({ status: 'cancelled' })
      .eq('id', activationId);

    console.log('✅ Activation cancelled and refunded');
    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET RENT SERVICES
// ============================================================================
app.post('/functions/v1/get-rent-services', async (req, res) => {
  console.log('📋 [GET-RENT-SERVICES] Function called');
  
  try {
    const { countryId = 2, rentTime = 4 } = req.body;
    
    const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentServicesAndCountries&country=${countryId}&rent_time=${rentTime}`;
    const data = await fetchSmsActivate(url);

    if (data.services) {
      // Apply margin
      const margin = 1.5;
      const services = {};
      
      for (const [code, service] of Object.entries(data.services)) {
        services[code] = {
          ...service,
          code: code,
          retailCost: service.cost * margin,
          sellingPrice: Math.ceil(service.cost * margin * 100)
        };
      }

      return res.json({
        success: true,
        countryId,
        rentTime,
        operators: data.operators || {},
        services
      });
    }

    return res.json({ success: true, services: {} });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET RENT STATUS
// ============================================================================
app.post('/functions/v1/get-rent-status', async (req, res) => {
  console.log('🔍 [GET-RENT-STATUS] Function called');
  
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { rentalId } = req.body;
    
    const { data: rental, error } = await supabase
      .from('rentals')
      .select('*')
      .eq('id', rentalId)
      .eq('user_id', user.id)
      .single();

    if (error || !rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    // Check status at SMS-Activate
    const statusUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentStatus&id=${rental.external_id}`;
    const data = await fetchSmsActivate(statusUrl);

    return res.json({
      success: true,
      rental,
      smsActivateStatus: data
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SET RENT STATUS
// ============================================================================
app.post('/functions/v1/set-rent-status', async (req, res) => {
  console.log('⚙️ [SET-RENT-STATUS] Function called');
  
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { rentalId, status } = req.body;
    
    const { data: rental, error } = await supabase
      .from('rentals')
      .select('*')
      .eq('id', rentalId)
      .eq('user_id', user.id)
      .single();

    if (error || !rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    // Update at SMS-Activate
    const statusUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setRentStatus&id=${rental.external_id}&status=${status}`;
    const response = await fetch(statusUrl);
    const data = await response.text();

    // Update in DB
    await supabase
      .from('rentals')
      .update({ status: status === 2 ? 'cancelled' : status === 1 ? 'completed' : rental.status })
      .eq('id', rentalId);

    return res.json({ success: true, result: data });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET REAL-TIME PRICES
// ============================================================================
app.post('/functions/v1/get-real-time-prices', async (req, res) => {
  console.log('💰 [GET-REAL-TIME-PRICES] Function called', req.body);
  
  try {
    // Accept both 'service' and 'serviceCode' for compatibility
    const serviceCode = req.body.serviceCode || req.body.service;
    const { countries = [] } = req.body;
    
    if (!serviceCode) {
      return res.status(400).json({ error: 'serviceCode is required' });
    }
    
    const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices&service=${serviceCode}`;
    const data = await fetchSmsActivate(url);

    const margin = 1.5;
    const prices = {};

    for (const [countryId, services] of Object.entries(data)) {
      if (services[serviceCode]) {
        prices[countryId] = {
          cost: services[serviceCode].cost,
          retailCost: services[serviceCode].cost * margin,
          count: services[serviceCode].count,
          sellingPrice: Math.ceil(services[serviceCode].cost * margin * 100)
        };
      }
    }

    return res.json({ success: true, prices });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET TOP COUNTRIES BY SERVICE
// ============================================================================
app.post('/functions/v1/get-top-countries-by-service', async (req, res) => {
  console.log('🌍 [GET-TOP-COUNTRIES] Function called', req.body);
  
  try {
    // Accept both 'service' and 'serviceCode' for compatibility
    const serviceCode = req.body.serviceCode || req.body.service;
    
    if (!serviceCode) {
      return res.status(400).json({ error: 'serviceCode is required' });
    }
    
    // Get margin from system_settings
    const { data: marginSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'pricing_margin_percentage')
      .single();
    
    const marginPercentage = marginSetting?.value ? parseFloat(marginSetting.value) : 30;
    console.log(`💰 [GET-TOP-COUNTRIES] Margin: ${marginPercentage}%`);
    
    // 1️⃣ Get ranked countries with prices from SMS-Activate
    const rankUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getTopCountriesByServiceRank&service=${serviceCode}&freePrice=true`;
    const rankData = await fetchSmsActivate(rankUrl);
    
    if (!rankData || Object.keys(rankData).length === 0) {
      return res.json({ success: true, service: serviceCode, countries: [] });
    }
    
    console.log(`✅ [GET-TOP-COUNTRIES] Found ${Object.keys(rankData).length} ranked countries`);
    
    // 2️⃣ Get country names mapping
    const countriesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getCountries`;
    const allCountriesData = await fetchSmsActivate(countriesUrl);
    
    const countryMap = {};
    Object.entries(allCountriesData).forEach(([id, country]) => {
      countryMap[parseInt(id)] = {
        code: country.eng.toLowerCase().replace(/\s+/g, '_'),
        name: country.eng
      };
    });
    
    // 3️⃣ Transform data with price conversion
    const MIN_PRICE_COINS = 5;
    const USD_TO_FCFA = 600;
    const FCFA_TO_COINS = 100;
    const marginMultiplier = 1 + marginPercentage / 100;
    
    const topCountries = [];
    
    Object.entries(rankData).forEach(([index, countryData]) => {
      const countryId = countryData.country;
      const countryInfo = countryMap[countryId];
      
      if (!countryInfo) return;
      
      const rank = parseInt(index) + 1;
      const count = countryData.count || 0;
      const priceUSD = countryData.price || 0;
      
      // Price conversion: USD → FCFA → Coins (Ⓐ)
      const priceFCFA = priceUSD * USD_TO_FCFA;
      const priceCoins = (priceFCFA / FCFA_TO_COINS) * marginMultiplier;
      const price = Math.max(MIN_PRICE_COINS, Math.ceil(priceCoins));
      
      // Composite score calculation
      const rankingScore = Math.max(0, 100 - rank);
      const availabilityBonus = count > 1000 ? 20 : count > 100 ? 10 : count > 0 ? 5 : 0;
      const priceBonus = price > 0 ? Math.max(0, 10 - (price * 2)) : 0;
      const compositeScore = rankingScore + availabilityBonus + priceBonus;
      
      topCountries.push({
        countryId,
        countryCode: countryInfo.code,
        countryName: countryInfo.name,
        count,
        price,
        retailPrice: price,
        share: 0,
        successRate: null,
        rank,
        compositeScore
      });
    });
    
    // Sort by composite score
    topCountries.sort((a, b) => b.compositeScore - a.compositeScore);
    
    console.log(`🏆 [GET-TOP-COUNTRIES] Returning ${topCountries.length} countries`);
    
    return res.json({ 
      success: true, 
      service: serviceCode,
      countries: topCountries,
      stats: {
        totalCountries: topCountries.length,
        totalAvailable: topCountries.reduce((sum, c) => sum + c.count, 0)
      }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET SERVICES COUNTS
// ============================================================================
app.post('/functions/v1/get-services-counts', async (req, res) => {
  console.log('📊 [GET-SERVICES-COUNTS] Function called');
  
  try {
    const { countryCode = 0 } = req.body;
    
    const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getNumbersStatus&country=${countryCode}`;
    const data = await fetchSmsActivate(url);

    return res.json({ success: true, services: data });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET PROVIDERS STATUS
// ============================================================================
app.post('/functions/v1/get-providers-status', async (req, res) => {
  console.log('🔌 [GET-PROVIDERS-STATUS] Function called');
  
  try {
    // Check SMS-Activate balance
    const balanceUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getBalance`;
    const response = await fetch(balanceUrl);
    const balanceText = await response.text();
    
    let balance = 0;
    if (balanceText.startsWith('ACCESS_BALANCE')) {
      balance = parseFloat(balanceText.split(':')[1]);
    }

    return res.json({
      success: true,
      providers: {
        'sms-activate': {
          status: balance > 0 ? 'active' : 'low_balance',
          balance: balance
        }
      }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// LINK REFERRAL
// ============================================================================
app.post('/functions/v1/link-referral', async (req, res) => {
  console.log('🔗 [LINK-REFERRAL] Function called');
  
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { referralCode } = req.body;
    
    // Find referrer
    const { data: referrer, error: referrerError } = await supabase
      .from('users')
      .select('id, referral_code')
      .eq('referral_code', referralCode)
      .single();

    if (referrerError || !referrer) {
      return res.status(404).json({ error: 'Referral code not found' });
    }

    if (referrer.id === user.id) {
      return res.status(400).json({ error: 'Cannot refer yourself' });
    }

    // Update user's referred_by
    const { error: updateError } = await supabase
      .from('users')
      .update({ referred_by: referrer.id })
      .eq('id', user.id);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to link referral' });
    }

    // Create referral record
    await supabase
      .from('referrals')
      .insert({
        referrer_id: referrer.id,
        referred_id: user.id,
        status: 'pending'
      });

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// INIT MONEYFUSION PAYMENT
// ============================================================================
app.post('/functions/v1/init-moneyfusion-payment', async (req, res) => {
  console.log('💳 [INIT-MONEYFUSION] Function called', req.body);
  
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { amount, currency, description, return_url, customer = {}, metadata = {} } = req.body;
    
    // Validate required fields
    if (!amount) {
      return res.status(400).json({ error: 'Missing required field: amount' });
    }

    // Get MoneyFusion URL from env
    const MONEYFUSION_API_URL = process.env.MONEYFUSION_API_URL;
    if (!MONEYFUSION_API_URL) {
      console.error('❌ [MONEYFUSION] MONEYFUSION_API_URL not configured');
      return res.status(500).json({ error: 'MoneyFusion non configuré' });
    }

    // Check if MoneyFusion is active
    const { data: moneyfusionConfig, error: configError } = await supabase
      .from('payment_providers')
      .select('is_active')
      .eq('provider_code', 'moneyfusion')
      .single();

    if (configError || !moneyfusionConfig) {
      console.log('⚠️ [MONEYFUSION] Config not found, proceeding anyway');
    } else if (!moneyfusionConfig.is_active) {
      return res.status(403).json({ error: 'MoneyFusion est désactivé' });
    }

    // Extract customer info
    const phone = customer.phone || '00000000';
    const clientName = `${customer.first_name || 'Client'} ${customer.last_name || 'ONESMS'}`;

    // Generate unique reference
    const paymentRef = `ONESMS_${user.id.substring(0, 8)}_${Date.now()}`;

    // Webhook URL
    const webhookUrl = `${SUPABASE_URL}/functions/v1/moneyfusion-webhook`;

    // Prepare MoneyFusion payload
    const moneyfusionPayload = {
      totalPrice: Math.round(amount),
      article: [{ "Rechargement ONE SMS": Math.round(amount) }],
      numeroSend: phone.replace(/\s/g, ''),
      nomclient: clientName || user.email?.split('@')[0] || 'Client',
      personal_Info: [{
        userId: user.id,
        paymentRef: paymentRef,
        activations: metadata.activations || 0,
        type: 'recharge',
        source: 'onesms'
      }],
      return_url: return_url || 'http://onesms.46.202.171.108.sslip.io/dashboard?payment=success',
      webhook_url: webhookUrl
    };

    console.log('📤 [MONEYFUSION] Sending request to:', MONEYFUSION_API_URL);

    // Call MoneyFusion API
    const mfResponse = await fetch(MONEYFUSION_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(moneyfusionPayload)
    });

    const mfData = await mfResponse.json();

    console.log('📥 [MONEYFUSION] Response:', {
      statut: mfData.statut,
      token: mfData.token,
      message: mfData.message
    });

    if (!mfData.statut || !mfData.url) {
      console.error('❌ [MONEYFUSION] API Error:', mfData);
      return res.status(400).json({ 
        error: mfData.message || 'Failed to initialize payment'
      });
    }

    // Get current user balance
    const { data: userProfile } = await supabase
      .from('users')
      .select('balance')
      .eq('id', user.id)
      .single();

    const currentBalance = userProfile?.balance || 0;
    const activationsToAdd = metadata.activations || 0;

    // Create pending transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'deposit',
        amount: activationsToAdd,
        balance_before: currentBalance,
        balance_after: currentBalance + activationsToAdd,
        status: 'pending',
        reference: paymentRef,
        external_id: mfData.token,
        description: description || `Rechargement via MoneyFusion`,
        metadata: {
          moneyfusion_token: mfData.token,
          checkout_url: mfData.url,
          phone: phone,
          amount_xof: amount,
          payment_provider: 'moneyfusion',
          ...metadata
        }
      });

    if (txError) {
      console.error('❌ [MONEYFUSION] Failed to create transaction:', txError);
    }

    console.log('✅ [MONEYFUSION] Payment initialized:', mfData.token);

    return res.json({
      success: true,
      message: mfData.message,
      data: {
        token: mfData.token,
        checkout_url: mfData.url,
        payment_ref: paymentRef
      }
    });
  } catch (error) {
    console.error('❌ [MONEYFUSION] Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RENT SMS-ACTIVATE NUMBER
// ============================================================================
app.post('/functions/v1/rent-sms-activate-number', async (req, res) => {
  console.log('📱 [RENT-NUMBER] Function called');
  
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { serviceCode, countryId, rentTime = 4, operator } = req.body;

    // Get user balance
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Get rent price
    const priceUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentServicesAndCountries&country=${countryId}&rent_time=${rentTime}`;
    const priceData = await fetchSmsActivate(priceUrl);

    let basePrice = 0;
    if (priceData.services && priceData.services[serviceCode]) {
      basePrice = parseFloat(priceData.services[serviceCode].cost);
    }

    const margin = 1.5;
    const finalPrice = Math.ceil(basePrice * margin * 100);

    if (userData.balance < finalPrice) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        required: finalPrice,
        available: userData.balance
      });
    }

    // Rent number
    const rentUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentNumber&service=${serviceCode}&country=${countryId}&rent_time=${rentTime}${operator ? `&operator=${operator}` : ''}`;
    const rentData = await fetchSmsActivate(rentUrl);

    if (rentData.status === 'success' && rentData.phone) {
      // Deduct balance
      await supabase
        .from('users')
        .update({
          balance: userData.balance - finalPrice
        })
        .eq('id', user.id);

      // Create rental record
      const { data: rental, error: rentalError } = await supabase
        .from('rentals')
        .insert({
          user_id: user.id,
          external_id: rentData.phone.id,
          phone_number: rentData.phone.number,
          service: serviceCode,
          country_code: countryId.toString(),
          status: 'active',
          cost: finalPrice,
          provider: 'sms-activate',
          rent_time: rentTime,
          expires_at: new Date(Date.now() + rentTime * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (rentalError) {
        return res.status(500).json({ error: 'Failed to create rental record' });
      }

      // Create transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'rental',
          amount: -finalPrice,
          description: `Rent number - ${serviceCode}`,
          status: 'completed',
          reference: rental.id
        });

      return res.json({
        success: true,
        rental: {
          id: rental.id,
          phone: rentData.phone.number,
          externalId: rentData.phone.id,
          cost: finalPrice,
          expiresAt: rental.expires_at
        }
      });
    } else {
      return res.status(400).json({ error: rentData.message || 'Failed to rent number' });
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CONTINUE SMS-ACTIVATE RENT
// ============================================================================
app.post('/functions/v1/continue-sms-activate-rent', async (req, res) => {
  console.log('🔄 [CONTINUE-RENT] Function called');
  
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { rentalId } = req.body;
    
    const { data: rental, error } = await supabase
      .from('rentals')
      .select('*')
      .eq('id', rentalId)
      .eq('user_id', user.id)
      .single();

    if (error || !rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    // Continue at SMS-Activate
    const continueUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=continueRentNumber&id=${rental.external_id}&rent_time=1`;
    const data = await fetchSmsActivate(continueUrl);

    if (data.status === 'success') {
      // Extend expiration
      const newExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('rentals')
        .update({ expires_at: newExpiry })
        .eq('id', rentalId);

      return res.json({ success: true, newExpiresAt: newExpiry });
    } else {
      return res.status(400).json({ error: data.message || 'Failed to continue rent' });
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET SMS-ACTIVATE INBOX
// ============================================================================
app.post('/functions/v1/get-sms-activate-inbox', async (req, res) => {
  console.log('📬 [GET-INBOX] Function called');
  
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { rentalId } = req.body;
    
    const { data: rental, error } = await supabase
      .from('rentals')
      .select('*')
      .eq('id', rentalId)
      .eq('user_id', user.id)
      .single();

    if (error || !rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    // Get SMS from SMS-Activate
    const inboxUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentStatus&id=${rental.external_id}`;
    const data = await fetchSmsActivate(inboxUrl);

    return res.json({
      success: true,
      messages: data.values || [],
      status: data.status
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SYNC SMS-ACTIVATE (Countries + Services + Prices)
// ============================================================================
app.post('/functions/v1/sync-sms-activate', async (req, res) => {
  console.log('🔄 [SYNC-SMS-ACTIVATE] Starting synchronization...');
  
  try {
    const startTime = Date.now();
    const results = { countries: 0, services: 0, prices: 0, errors: [] };

    // 1. Get margin from system_settings
    const { data: marginSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'pricing_margin_percentage')
      .single();
    
    const marginPercentage = marginSetting?.value ? parseFloat(marginSetting.value) : 30;
    console.log(`💰 System margin: ${marginPercentage}%`);

    // 2. Fetch countries from SMS-Activate
    console.log('🌍 Fetching countries...');
    const countriesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getCountries`;
    const countriesData = await fetchSmsActivate(countriesUrl);
    
    // Country ID to code mapping for SMS-Activate
    const countryMapping = {
      0: 'russia', 1: 'ukraine', 2: 'kazakhstan', 3: 'china', 4: 'philippines',
      5: 'myanmar', 6: 'indonesia', 7: 'malaysia', 8: 'kenya', 9: 'tanzania',
      10: 'vietnam', 11: 'kyrgyzstan', 12: 'england', 13: 'china', 14: 'israel',
      15: 'poland', 16: 'hk', 17: 'morocco', 18: 'egypt', 19: 'nigeria',
      20: 'macao', 21: 'india', 22: 'ireland', 32: 'romania', 33: 'colombia',
      36: 'canada', 39: 'argentina', 43: 'germany', 52: 'thailand', 56: 'spain',
      58: 'italy', 62: 'southafrica', 73: 'brazil', 78: 'france', 79: 'netherlands',
      80: 'ghana', 82: 'mexico', 88: 'bangladesh', 90: 'pakistan', 94: 'turkey',
      108: 'philippines', 109: 'nigeria', 115: 'egypt', 132: 'uae', 135: 'iraq',
      168: 'chile', 174: 'singapore', 175: 'australia', 177: 'newzealand', 187: 'usa'
    };

    // 3. Fetch prices for top countries
    const topCountryIds = [187, 0, 6, 21, 73, 82, 4, 3, 22, 12, 175, 78, 43];
    let allPrices = {};
    
    for (const countryId of topCountryIds) {
      try {
        const pricesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices&country=${countryId}`;
        const priceData = await fetchSmsActivate(pricesUrl);
        if (priceData && priceData[countryId]) {
          allPrices[countryId] = priceData[countryId];
          
          // Update country available_numbers
          const countryCode = countryMapping[countryId];
          if (countryCode) {
            let totalNumbers = 0;
            for (const svc of Object.values(priceData[countryId])) {
              totalNumbers += (svc.count || 0);
            }
            
            await supabase
              .from('countries')
              .update({ available_numbers: totalNumbers, updated_at: new Date().toISOString() })
              .eq('code', countryCode);
            
            results.countries++;
          }
        }
      } catch (err) {
        results.errors.push(`Country ${countryId}: ${err.message}`);
      }
    }
    
    console.log(`📊 Fetched prices for ${Object.keys(allPrices).length} countries`);

    // 4. Update services with prices
    const { data: services } = await supabase.from('services').select('id, code');
    
    for (const [countryId, servicesPrices] of Object.entries(allPrices)) {
      for (const [serviceCode, priceInfo] of Object.entries(servicesPrices)) {
        const service = services?.find(s => s.code === serviceCode);
        if (service && priceInfo.cost) {
          const basePrice = parseFloat(priceInfo.cost);
          const ourPrice = Math.ceil(basePrice * (1 + marginPercentage / 100) * 100); // CFA
          
          // Update pricing_rules
          await supabase
            .from('pricing_rules')
            .upsert({
              service_id: service.id,
              country_code: countryMapping[countryId] || `country_${countryId}`,
              base_price: basePrice,
              our_price: ourPrice,
              margin_percentage: marginPercentage,
              available_count: priceInfo.count || 0,
              updated_at: new Date().toISOString()
            }, { onConflict: 'service_id,country_code' });
          
          results.prices++;
        }
      }
    }

    // 5. Fetch service list
    console.log('📋 Fetching service list...');
    const servicesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getServicesList`;
    const servicesData = await fetchSmsActivate(servicesUrl);
    
    if (servicesData?.status === 'success' && Array.isArray(servicesData.services)) {
      for (const [index, svc] of servicesData.services.entries()) {
        await supabase
          .from('services')
          .upsert({
            code: svc.code,
            name: svc.name,
            popularity_score: 1000 - index,
            is_active: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'code' });
        
        results.services++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Sync complete in ${duration}s: ${results.countries} countries, ${results.services} services, ${results.prices} prices`);

    // Log sync
    await supabase.from('sync_logs').insert({
      sync_type: 'full',
      provider: 'sms-activate',
      services_synced: results.services,
      countries_synced: results.countries,
      pricing_rules_synced: results.prices,
      duration_seconds: parseFloat(duration),
      status: 'success'
    });

    return res.json({
      success: true,
      results,
      duration: `${duration}s`
    });
  } catch (error) {
    console.error('❌ Sync error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// MONEYFUSION WEBHOOK
// ============================================================================
app.post('/functions/v1/moneyfusion-webhook', async (req, res) => {
  console.log('📥 [MONEYFUSION-WEBHOOK] Received:', JSON.stringify(req.body).substring(0, 500));
  
  try {
    const { event, tokenPay, personal_Info, Montant, statut, numeroTransaction } = req.body;
    
    if (!tokenPay) {
      return res.status(400).json({ error: 'Missing tokenPay' });
    }

    // Find transaction by token
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('external_id', tokenPay)
      .single();

    if (txError || !transaction) {
      console.log('⚠️ Transaction not found for token:', tokenPay);
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Determine status based on event
    let newStatus = transaction.status;
    if (event === 'payin.session.completed' || statut === 'paid') {
      newStatus = 'completed';
    } else if (event === 'payin.session.cancelled' || statut === 'failure' || statut === 'no paid') {
      newStatus = 'failed';
    }

    // Only process if status changed
    if (newStatus !== transaction.status) {
      console.log(`📊 Updating transaction ${transaction.id}: ${transaction.status} → ${newStatus}`);
      
      if (newStatus === 'completed' && transaction.status === 'pending') {
        // Credit user balance
        const activations = transaction.metadata?.activations || transaction.amount || 0;
        
        const { data: user } = await supabase
          .from('users')
          .select('balance')
          .eq('id', transaction.user_id)
          .single();

        const newBalance = (user?.balance || 0) + activations;

        await supabase
          .from('users')
          .update({ balance: newBalance })
          .eq('id', transaction.user_id);

        await supabase
          .from('transactions')
          .update({
            status: 'completed',
            balance_after: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.id);

        console.log(`✅ User ${transaction.user_id} credited ${activations} activations`);
      } else {
        await supabase
          .from('transactions')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', transaction.id);
      }
    }

    return res.json({ success: true, status: newStatus });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CLEANUP EXPIRED ACTIVATIONS
// ============================================================================
async function cleanupExpiredActivations() {
  console.log('🧹 [CLEANUP-ACTIVATIONS] Starting cleanup...');
  
  try {
    // Find expired pending activations
    const { data: expiredActivations, error: fetchError } = await supabase
      .from('activations')
      .select('*')
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('❌ [CLEANUP-ACTIVATIONS] Fetch error:', fetchError.message);
      return { success: false, error: fetchError.message };
    }

    console.log(`📊 [CLEANUP-ACTIVATIONS] Found ${expiredActivations?.length || 0} expired activations`);

    const results = [];
    for (const activation of (expiredActivations || [])) {
      try {
        // Cancel on SMS-Activate
        const cancelUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&id=${activation.order_id}&status=8`;
        let apiResult = 'N/A';
        try {
          const response = await fetch(cancelUrl);
          apiResult = await response.text();
        } catch (e) {
          console.log('⚠️ SMS-Activate cancel error (continuing):', e.message);
        }

        // Update status
        await supabase
          .from('activations')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', activation.id);

        // Call atomic_refund (use 4-param version with explicit nulls)
        const { data: refundResult, error: refundError } = await supabase
          .rpc('atomic_refund', {
            p_user_id: activation.user_id,
            p_activation_id: activation.id,
            p_rental_id: null,
            p_transaction_id: null,
            p_reason: 'Cron cleanup expired'
          });

        if (refundError) {
          console.error(`⚠️ Refund error for ${activation.id}:`, refundError.message);
        } else {
          console.log(`✅ Refunded ${refundResult?.refunded || activation.price}Ⓐ for ${activation.user_id}`);
        }

        results.push({ id: activation.id, status: 'cleaned', refunded: refundResult?.refunded || 0 });
      } catch (err) {
        results.push({ id: activation.id, status: 'error', error: err.message });
      }
    }

    console.log(`✅ [CLEANUP-ACTIVATIONS] Completed: ${results.length} processed`);
    return { success: true, processed: results.length, results };
  } catch (error) {
    console.error('❌ [CLEANUP-ACTIVATIONS] Error:', error.message);
    return { success: false, error: error.message };
  }
}

app.post('/functions/v1/cleanup-expired-activations', async (req, res) => {
  const result = await cleanupExpiredActivations();
  return res.json(result);
});

// ============================================================================
// CLEANUP EXPIRED RENTALS
// ============================================================================
async function cleanupExpiredRentals() {
  console.log('🧹 [CLEANUP-RENTALS] Starting cleanup...');
  
  try {
    // Find expired active rentals
    const { data: expiredRentals, error: fetchError } = await supabase
      .from('rentals')
      .select('*')
      .eq('status', 'active')
      .lt('end_date', new Date().toISOString());

    if (fetchError) {
      console.error('❌ [CLEANUP-RENTALS] Fetch error:', fetchError.message);
      return { success: false, error: fetchError.message };
    }

    console.log(`📊 [CLEANUP-RENTALS] Found ${expiredRentals?.length || 0} expired rentals`);

    const results = [];
    for (const rental of (expiredRentals || [])) {
      try {
        // Finish on SMS-Activate
        const finishUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setRentStatus&id=${rental.rent_id}&status=1`;
        try {
          await fetch(finishUrl);
        } catch (e) {
          console.log('⚠️ SMS-Activate finish error (continuing):', e.message);
        }

        // Unfreeze balance (consume, no refund for rentals)
        if (rental.frozen_amount > 0) {
          const { error: unfreezeError } = await supabase.rpc('secure_unfreeze_balance', {
            p_user_id: rental.user_id,
            p_rental_id: rental.id,
            p_refund_to_balance: false,
            p_refund_reason: 'Rental expired - consumed'
          });
          if (unfreezeError) {
            console.error(`⚠️ Unfreeze error for ${rental.id}:`, unfreezeError.message);
          }
        }

        // Update status
        await supabase
          .from('rentals')
          .update({ status: 'expired', frozen_amount: 0, updated_at: new Date().toISOString() })
          .eq('id', rental.id)
          .eq('status', 'active');

        results.push({ id: rental.id, status: 'cleaned' });
      } catch (err) {
        results.push({ id: rental.id, status: 'error', error: err.message });
      }
    }

    console.log(`✅ [CLEANUP-RENTALS] Completed: ${results.length} processed`);
    return { success: true, processed: results.length, results };
  } catch (error) {
    console.error('❌ [CLEANUP-RENTALS] Error:', error.message);
    return { success: false, error: error.message };
  }
}

app.post('/functions/v1/cleanup-expired-rentals', async (req, res) => {
  const result = await cleanupExpiredRentals();
  return res.json(result);
});

// ============================================================================
// CRON CHECK PENDING SMS
// ============================================================================
async function cronCheckPendingSms() {
  console.log('🔄 [CRON-CHECK-SMS] Starting periodic SMS check...');
  
  try {
    // Find pending activations
    const { data: activations, error } = await supabase
      .from('activations')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20);

    if (error) {
      console.error('❌ [CRON-CHECK-SMS] Fetch error:', error.message);
      return { success: false, error: error.message };
    }

    console.log(`📊 [CRON-CHECK-SMS] Found ${activations?.length || 0} pending activations`);

    const results = { checked: 0, sms_received: 0, expired: 0, cancelled: 0 };
    
    for (const activation of (activations || [])) {
      results.checked++;
      
      // Check if expired
      if (new Date(activation.expires_at) < new Date()) {
        results.expired++;
        continue; // Let cleanup handle it
      }

      // Check SMS status on SMS-Activate
      const statusUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getStatus&id=${activation.order_id}`;
      try {
        const response = await fetch(statusUrl);
        const v1Text = await response.text();
        console.log(`📥 [CRON-CHECK-SMS] ${activation.order_id}: ${v1Text}`);

        if (v1Text.startsWith('STATUS_OK:')) {
          // SMS received!
          const smsCode = v1Text.split(':')[1];
          results.sms_received++;
          
          // Process via RPC
          await supabase.rpc('process_sms_received', {
            p_activation_id: activation.id,
            p_sms_code: smsCode,
            p_full_sms: smsCode,
            p_source: 'cron'
          });
          
          console.log(`✅ [CRON-CHECK-SMS] SMS received for ${activation.order_id}: ${smsCode}`);
        } else if (v1Text === 'STATUS_CANCEL') {
          results.cancelled++;
          
          // Refund (use 4-param version)
          await supabase.rpc('atomic_refund', {
            p_user_id: activation.user_id,
            p_activation_id: activation.id,
            p_rental_id: null,
            p_transaction_id: null,
            p_reason: 'Cron cancelled (STATUS_CANCEL)'
          });
          
          console.log(`⚠️ [CRON-CHECK-SMS] Cancelled ${activation.order_id}`);
        }
      } catch (err) {
        console.error(`⚠️ [CRON-CHECK-SMS] Error checking ${activation.order_id}:`, err.message);
      }
    }

    console.log(`✅ [CRON-CHECK-SMS] Completed:`, results);
    return { success: true, ...results };
  } catch (error) {
    console.error('❌ [CRON-CHECK-SMS] Error:', error.message);
    return { success: false, error: error.message };
  }
}

app.post('/functions/v1/cron-check-pending-sms', async (req, res) => {
  const result = await cronCheckPendingSms();
  return res.json(result);
});

// ============================================================================
// SETUP CRON JOBS
// ============================================================================
function setupCronJobs() {
  console.log('⏰ Setting up cron jobs...');

  // Cron 1: Cleanup expired activations - every 3 minutes
  cron.schedule('*/3 * * * *', async () => {
    console.log('⏰ [CRON] Running cleanup-expired-activations...');
    await cleanupExpiredActivations();
  });

  // Cron 2: Cleanup expired rentals - every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('⏰ [CRON] Running cleanup-expired-rentals...');
    await cleanupExpiredRentals();
  });

  // Cron 3: Check pending SMS - every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    console.log('⏰ [CRON] Running cron-check-pending-sms...');
    await cronCheckPendingSms();
  });

  // Cron 4: Sync SMS-Activate data - every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('⏰ [CRON] Running sync-sms-activate...');
    try {
      // Call our own sync endpoint
      const response = await fetch(`http://localhost:${PORT}/functions/v1/sync-sms-activate`, {
        method: 'POST'
      });
      const result = await response.json();
      console.log('✅ [CRON] Sync completed:', result);
    } catch (err) {
      console.error('❌ [CRON] Sync error:', err.message);
    }
  });

  console.log('✅ Cron jobs configured:');
  console.log('   - cleanup-expired-activations: */3 * * * *');
  console.log('   - cleanup-expired-rentals: */5 * * * *');
  console.log('   - cron-check-pending-sms: */2 * * * *');
  console.log('   - sync-sms-activate: */30 * * * *');
}

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log(`🚀 ONE SMS API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
  
  // Start cron jobs
  setupCronJobs();
});
