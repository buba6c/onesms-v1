import express from 'express';
import cors from 'cors';
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
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { serviceCode, countryCode, operator } = req.body;
    console.log('📥 Request:', { serviceCode, countryCode, operator, userId: user.id });

    // Get user balance
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Get price from SMS-Activate
    const priceUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices&service=${serviceCode}&country=${countryCode}`;
    const priceData = await fetchSmsActivate(priceUrl);

    let basePrice = 0;
    if (priceData[countryCode] && priceData[countryCode][serviceCode]) {
      basePrice = parseFloat(priceData[countryCode][serviceCode].cost);
    }

    // Apply margin (50%)
    const margin = 1.5;
    const finalPrice = Math.ceil(basePrice * margin * 100); // In CFA cents

    if (userData.balance < finalPrice) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        required: finalPrice,
        available: userData.balance
      });
    }

    // Buy number from SMS-Activate
    const buyUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getNumber&service=${serviceCode}&country=${countryCode}${operator ? `&operator=${operator}` : ''}`;
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
        activation: {
          id: activation.id,
          phone: phone,
          activationId: activationId,
          cost: finalPrice,
          expiresAt: activation.expires_at
        }
      });
    } else if (buyText === 'NO_NUMBERS') {
      return res.status(400).json({ error: 'No numbers available for this service/country' });
    } else if (buyText === 'NO_BALANCE') {
      return res.status(500).json({ error: 'Provider balance insufficient' });
    } else {
      return res.status(400).json({ error: buyText });
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
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
  console.log('💰 [GET-REAL-TIME-PRICES] Function called');
  
  try {
    const { serviceCode, countries = [] } = req.body;
    
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
  console.log('🌍 [GET-TOP-COUNTRIES] Function called');
  
  try {
    const { serviceCode } = req.body;
    
    if (!serviceCode) {
      return res.status(400).json({ error: 'serviceCode is required' });
    }
    
    const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getTopCountriesByService&service=${serviceCode}`;
    const data = await fetchSmsActivate(url);

    return res.json({ success: true, countries: data });
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
  console.log('💳 [INIT-MONEYFUSION] Function called');
  
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { amount, phoneNumber, provider } = req.body;
    
    // For now, return a placeholder - implement actual MoneyFusion integration
    return res.json({
      success: true,
      message: 'MoneyFusion payment initialized',
      paymentUrl: null,
      instructions: 'Payment integration pending'
    });
  } catch (error) {
    console.error('❌ Error:', error);
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
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log(`🚀 ONE SMS API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
});
