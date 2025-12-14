// ONE SMS API Server - Node.js/Express version of Supabase Edge Functions
// Based exactly on the original Edge Functions that work on Supabase Cloud

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMS_ACTIVATE_API_KEY = process.env.SMS_ACTIVATE_API_KEY;
const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.io/stubs/handler_api.php';
const MONEYFUSION_API_URL = process.env.MONEYFUSION_API_URL;

// Supabase admin client (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ============================================================================
// SERVICE CODE MAPPING (from original Edge Functions)
// ============================================================================
const SERVICE_CODE_MAP = {
  'google': 'go', 'whatsapp': 'wa', 'telegram': 'tg', 'facebook': 'fb',
  'instagram': 'ig', 'twitter': 'tw', 'discord': 'ds', 'microsoft': 'mm',
  'yahoo': 'mb', 'amazon': 'am', 'netflix': 'nf', 'uber': 'ub',
  'tiktok': 'tk', 'snapchat': 'sn', 'linkedin': 'ld', 'viber': 'vi',
  'paypal': 'ts', 'steam': 'st', 'alipay': 'hw', 'alibaba': 'hw', 'huawei': 'hw',
  'wechat': 'wb', 'line': 'la', 'kakao': 'kt', 'apple': 'wx', 'samsung': 'qi',
  'shopee': 'jt', 'grab': 'hx', 'lazada': 'lz', 'tinder': 'oi',
  'bumble': 'fr', 'badoo': 'qq', 'olx': 'qe', 'avito': 'av', 'didi': 'dd',
  'bolt': 'bz', 'yandex': 'ya', 'mailru': 'ml', 'vk': 'vk', 'odnoklassniki': 'ok',
  'weibo': 'wb', 'baidu': 'bd', 'jd': 'jd', 'taobao': 'tb', 'pinduoduo': 'pd'
};

// COUNTRY CODE MAPPING (from original Edge Functions)
const COUNTRY_CODE_MAP = {
  'russia': 0, 'ukraine': 1, 'kazakhstan': 2, 'china': 3, 'philippines': 4,
  'myanmar': 5, 'indonesia': 6, 'malaysia': 7, 'kenya': 8, 'tanzania': 9,
  'vietnam': 10, 'kyrgyzstan': 11, 'england': 12, 'israel': 13, 'hongkong': 14,
  'poland': 15, 'egypt': 16, 'nigeria': 17, 'morocco': 19, 'ghana': 20,
  'argentina': 21, 'india': 22, 'uzbekistan': 23, 'cambodia': 24, 'germany': 27,
  'romania': 32, 'colombia': 33, 'canada': 36, 'mexico': 38, 'spain': 40,
  'thailand': 52, 'portugal': 56, 'italy': 58, 'brazil': 45, 'france': 78,
  'australia': 175, 'usa': 187,
  // ISO 2-letter codes
  'ru': 0, 'ua': 1, 'kz': 2, 'cn': 3, 'ph': 4, 'mm': 5, 'id': 6, 'my': 7,
  'ke': 8, 'tz': 9, 'vn': 10, 'kg': 11, 'gb': 12, 'uk': 12, 'il': 13, 'hk': 14,
  'pl': 15, 'eg': 16, 'ng': 17, 'mo': 18, 'ma': 19, 'gh': 20, 'ar': 21,
  'in': 22, 'uz': 23, 'kh': 24, 'cm': 25, 'td': 26, 'de': 27, 'lt': 28,
  'hr': 29, 'se': 30, 'iq': 31, 'ro': 32, 'co': 33, 'at': 34, 'by': 35,
  'ca': 36, 'sa': 37, 'mx': 38, 'za': 39, 'es': 40, 'ir': 41, 'dz': 42,
  'nl': 43, 'bd': 44, 'br': 45, 'tr': 46, 'jp': 47, 'kr': 48, 'tw': 49,
  'sg': 50, 'ae': 51, 'th': 52, 'pk': 53, 'np': 54, 'lk': 55, 'pt': 56,
  'nz': 57, 'it': 58, 'be': 59, 'ch': 60, 'gr': 61, 'cz': 62, 'hu': 63,
  'dk': 64, 'no': 65, 'fi': 66, 'ie': 67, 'sk': 68, 'bg': 69, 'rs': 70,
  'si': 71, 'mk': 72, 'pe': 73, 'cl': 74, 'ec': 75, 've': 76, 'bo': 77,
  'fr': 78, 'py': 79, 'uy': 80, 'cr': 81, 'pa': 82, 'do': 83, 'sv': 84,
  'gt': 85, 'hn': 86, 'ni': 87, 'cu': 88, 'ht': 89, 'jm': 90, 'tt': 91,
  'pr': 92, 'bb': 93, 'bs': 94, 'af': 108, 'la': 117, 'sd': 129, 'jo': 141,
  'ps': 163, 'bh': 165, 'et': 172, 'au': 175, 'us': 187
};

// RENT DURATIONS
const RENT_DURATIONS = {
  '4hours': 4, '1day': 24, '1week': 168, '1month': 720
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const mapServiceCode = (code) => {
  if (!code) return code;
  return SERVICE_CODE_MAP[code.toLowerCase()] || code;
};

const mapCountryCode = (country) => {
  if (typeof country === 'number') return country;
  const trimmed = (country || '').toString().trim().toLowerCase();
  if (!trimmed) return 0;
  const maybeNum = Number(trimmed);
  if (!Number.isNaN(maybeNum)) return maybeNum;
  return COUNTRY_CODE_MAP[trimmed] ?? 0;
};

async function fetchSmsActivate(url) {
  try {
    const response = await fetch(url);
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  } catch (error) {
    console.error('❌ SMS-Activate API error:', error);
    throw error;
  }
}

async function getUser(authHeader) {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// BUY SMS-ACTIVATE NUMBER (from original Edge Function)
// ============================================================================
app.post('/functions/v1/buy-sms-activate-number', async (req, res) => {
  console.log('🚀 [BUY-SMS-ACTIVATE] Function called');
  
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { country, operator, product, userId, expectedPrice } = req.body;
    console.log('📞 [BUY-SMS-ACTIVATE] Request:', { country, operator, product, userId, expectedPrice });

    // Map service and country codes
    const smsActivateService = mapServiceCode(product);
    const smsActivateCountry = mapCountryCode(country);
    
    console.log('📍 [BUY-SMS-ACTIVATE] Mapped:', { smsActivateService, smsActivateCountry });

    // Get real-time price from SMS-Activate
    let price = 0.5; // Fallback
    const priceUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices&service=${smsActivateService}&country=${smsActivateCountry}`;
    
    try {
      const priceData = await fetchSmsActivate(priceUrl);
      if (priceData && priceData[smsActivateCountry.toString()]) {
        const countryData = priceData[smsActivateCountry.toString()];
        if (countryData[smsActivateService]?.cost) {
          price = parseFloat(countryData[smsActivateService].cost);
        } else if (countryData.cost) {
          price = parseFloat(countryData.cost);
        }
      }
    } catch (e) {
      console.error('⚠️ [BUY-SMS-ACTIVATE] Price fetch failed:', e);
    }

    // Use expectedPrice from frontend if provided
    if (expectedPrice && expectedPrice > 0) {
      console.log(`💰 Using expectedPrice: ${expectedPrice} (API was: ${price})`);
      price = expectedPrice;
    }

    // Check user balance
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', userId || user.id)
      .single();

    if (profileError || !userProfile) {
      return res.status(400).json({ success: false, error: 'User profile not found' });
    }

    const frozenBalance = userProfile.frozen_balance || 0;
    const availableBalance = userProfile.balance - frozenBalance;

    if (availableBalance < price) {
      return res.status(400).json({ 
        success: false, 
        error: `Insufficient balance. Required: ${price}, Available: ${availableBalance}` 
      });
    }

    // Create pending transaction BEFORE API call
    const { data: pendingTransaction, error: txnError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId || user.id,
        type: 'purchase',
        amount: -price,
        balance_before: userProfile.balance,
        balance_after: userProfile.balance,
        status: 'pending',
        description: `Purchase SMS activation for ${product} (${country})`
      })
      .select()
      .single();

    if (txnError) {
      return res.status(500).json({ success: false, error: 'Failed to create transaction' });
    }

    // FREEZE credits BEFORE API call
    const { error: freezeError } = await supabase
      .from('users')
      .update({ frozen_balance: frozenBalance + price })
      .eq('id', userId || user.id);

    if (freezeError) {
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', pendingTransaction.id);
      return res.status(500).json({ success: false, error: 'Failed to freeze balance' });
    }

    console.log('🔒 [BUY-SMS-ACTIVATE] Credits frozen:', price);

    // Buy number from SMS-Activate using getNumberV2
    const orderId = `${userId || user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const params = new URLSearchParams({
      api_key: SMS_ACTIVATE_API_KEY,
      action: 'getNumberV2',
      service: smsActivateService,
      country: smsActivateCountry.toString(),
      orderId: orderId
    });
    if (operator && operator !== 'any') {
      params.append('operator', operator);
    }

    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?${params.toString()}`;
    console.log('🌐 [BUY-SMS-ACTIVATE] API Call:', apiUrl.replace(SMS_ACTIVATE_API_KEY, 'KEY_HIDDEN'));

    const response = await fetch(apiUrl);
    const responseText = await response.text();
    console.log('📥 [BUY-SMS-ACTIVATE] Response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      // Fallback for text format ACCESS_NUMBER:id:phone
      if (responseText.startsWith('ACCESS_NUMBER:')) {
        const [, activationId, phone] = responseText.split(':');
        data = { activationId, phoneNumber: phone };
      } else {
        // ROLLBACK
        await supabase.from('users').update({ frozen_balance: frozenBalance }).eq('id', userId || user.id);
        await supabase.from('transactions').update({ status: 'failed' }).eq('id', pendingTransaction.id);
        return res.status(400).json({ success: false, error: `SMS-Activate error: ${responseText}` });
      }
    }

    if (data.status === 'error' || data.error) {
      // ROLLBACK
      await supabase.from('users').update({ frozen_balance: frozenBalance }).eq('id', userId || user.id);
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', pendingTransaction.id);
      return res.status(400).json({ success: false, error: data.message || data.error });
    }

    const { activationId, phoneNumber: phone } = data;
    if (!activationId || !phone) {
      return res.status(400).json({ success: false, error: 'Invalid response from SMS-Activate' });
    }

    console.log('📞 [BUY-SMS-ACTIVATE] Number purchased:', { activationId, phone, price });

    // Create activation record
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
    const { data: activation, error: activationError } = await supabase
      .from('activations')
      .insert({
        user_id: userId || user.id,
        order_id: activationId,
        phone: phone,
        service_code: product,
        country_code: country,
        operator: operator || 'any',
        price: price,
        frozen_amount: price,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        provider: 'sms-activate'
      })
      .select()
      .single();

    if (activationError) {
      console.error('❌ [BUY-SMS-ACTIVATE] Failed to create activation:', activationError);
      // ROLLBACK
      await supabase.from('users').update({ frozen_balance: frozenBalance }).eq('id', userId || user.id);
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', pendingTransaction.id);
      await fetch(`${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&id=${activationId}&status=8`);
      return res.status(500).json({ success: false, error: 'Failed to create activation record' });
    }

    // Link transaction to activation
    await supabase.from('transactions').update({ related_activation_id: activation.id }).eq('id', pendingTransaction.id);

    console.log('✅ [BUY-SMS-ACTIVATE] Success:', { id: activation.id, phone, price });

    return res.json({
      success: true,
      data: {
        id: activation.id,
        activation_id: activationId,
        phone: phone,
        service: product,
        country: country,
        operator: operator || 'any',
        price: price,
        status: 'pending',
        expires: expiresAt.toISOString()
      }
    });
  } catch (error) {
    console.error('❌ [BUY-SMS-ACTIVATE] Error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CHECK SMS-ACTIVATE STATUS (from original Edge Function)
// ============================================================================
app.post('/functions/v1/check-sms-activate-status', async (req, res) => {
  console.log('🔍 [CHECK-STATUS] Function called');
  
  try {
    const { activationId } = req.body;
    if (!activationId) {
      return res.status(400).json({ success: false, error: 'Missing activationId' });
    }

    // Get activation from database
    const { data: activation, error: activationError } = await supabase
      .from('activations')
      .select('*')
      .eq('id', activationId)
      .single();

    if (activationError || !activation) {
      return res.status(404).json({ success: false, error: 'Activation not found' });
    }

    console.log('📋 [CHECK-STATUS] Activation:', { id: activation.id, order_id: activation.order_id, status: activation.status });

    // If already charged and received, return cached
    if (activation.charged && activation.status === 'received') {
      return res.json({
        success: true,
        data: {
          status: 'received',
          sms_code: activation.sms_code,
          sms_text: activation.sms_text,
          charged: true
        }
      });
    }

    // Check SMS-Activate API
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getStatusV2&id=${activation.order_id}`;
    console.log('🌐 [CHECK-STATUS] API Call:', apiUrl.replace(SMS_ACTIVATE_API_KEY, 'KEY_HIDDEN'));

    const response = await fetch(apiUrl);
    const responseText = await response.text();
    console.log('📥 [CHECK-STATUS] Response:', responseText);

    let smsCode = null;
    let smsText = null;
    let newStatus = activation.status;

    // Parse response
    try {
      const jsonResponse = JSON.parse(responseText);
      if (jsonResponse.sms && jsonResponse.sms.code) {
        smsCode = jsonResponse.sms.code;
        smsText = jsonResponse.sms.text || `Your verification code is: ${smsCode}`;
        newStatus = 'received';
      }
    } catch (e) {
      if (responseText.startsWith('STATUS_OK:')) {
        smsCode = responseText.split(':')[1]?.trim();
        smsText = `Your verification code is: ${smsCode}`;
        newStatus = 'received';
      } else if (responseText === 'STATUS_CANCEL') {
        newStatus = 'cancelled';
      } else if (responseText === 'STATUS_WAIT_CODE') {
        newStatus = 'pending';
      }
    }

    // If SMS received, update and charge
    if (smsCode && smsText) {
      await supabase
        .from('activations')
        .update({
          status: 'received',
          sms_code: smsCode,
          sms_text: smsText,
          sms_received_at: new Date().toISOString()
        })
        .eq('id', activationId);

      // Commit via atomic_commit RPC
      const { data: commitResult, error: commitError } = await supabase.rpc('atomic_commit', {
        p_user_id: activation.user_id,
        p_activation_id: activationId,
        p_rental_id: null,
        p_transaction_id: null,
        p_reason: 'SMS received'
      });

      if (commitError) {
        console.error('❌ [CHECK-STATUS] atomic_commit failed:', commitError);
      } else {
        console.log('✅ [CHECK-STATUS] atomic_commit success:', commitResult);
      }

      // Mark complete on provider
      await fetch(`${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&id=${activation.order_id}&status=6`);
    }

    return res.json({
      success: true,
      data: {
        status: newStatus,
        sms_code: smsCode,
        sms_text: smsText,
        charged: smsCode ? true : false
      }
    });
  } catch (error) {
    console.error('❌ [CHECK-STATUS] Error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CANCEL SMS-ACTIVATE ORDER (from original Edge Function)
// ============================================================================
app.post('/functions/v1/cancel-sms-activate-order', async (req, res) => {
  console.log('❌ [CANCEL] Function called');
  
  try {
    const { orderId, activationId, userId } = req.body;

    // Find activation
    let activation = null;
    if (orderId) {
      const { data } = await supabase.from('activations').select('*').eq('order_id', orderId.toString()).single();
      if (data) activation = data;
    }
    if (!activation && activationId) {
      const { data } = await supabase.from('activations').select('*').eq('id', activationId).single();
      if (data) activation = data;
    }

    if (!activation) {
      return res.status(404).json({ success: false, error: 'Activation not found' });
    }

    console.log('📋 [CANCEL] Activation:', { id: activation.id, status: activation.status });

    if (!['pending', 'waiting', 'active'].includes(activation.status)) {
      return res.json({ success: true, message: 'Already processed', alreadyProcessed: true });
    }

    // Lock activation
    const { data: lockedActivation, error: lockError } = await supabase
      .from('activations')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', activation.id)
      .in('status', ['pending', 'waiting', 'active'])
      .select()
      .single();

    if (lockError || !lockedActivation) {
      return res.json({ success: true, message: 'Already processed', alreadyProcessed: true });
    }

    // Cancel on SMS-Activate
    await fetch(`${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&id=${activation.order_id}&status=8`);

    // Find related transaction
    const { data: txn } = await supabase.from('transactions').select('id').eq('related_activation_id', activation.id).single();

    // ATOMIC REFUND via RPC
    const { data: refundResult, error: refundError } = await supabase.rpc('atomic_refund', {
      p_user_id: activation.user_id,
      p_activation_id: activation.id,
      p_transaction_id: txn?.id || null,
      p_reason: 'Cancelled by user'
    });

    if (refundError) {
      console.error('❌ [CANCEL] atomic_refund failed:', refundError);
      return res.status(400).json({ success: false, error: 'Refund failed' });
    }

    console.log('✅ [CANCEL] Success:', refundResult);

    return res.json({
      success: true,
      message: 'Activation cancelled and refunded',
      refunded: refundResult?.refunded || activation.frozen_amount || 0,
      newBalance: refundResult?.balance_after || 0
    });
  } catch (error) {
    console.error('❌ [CANCEL] Error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// BUY SMS-ACTIVATE RENT (from original Edge Function)
// ============================================================================
app.post('/functions/v1/buy-sms-activate-rent', async (req, res) => {
  console.log('🚀 [BUY-RENT] Function called');
  
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { country, product, userId, duration = '4hours', expectedPrice } = req.body;
    console.log('📞 [BUY-RENT] Request:', { country, product, userId, duration, expectedPrice });

    const smsActivateService = product === 'full' ? product : mapServiceCode(product);
    const smsActivateCountry = mapCountryCode(country);
    const rentTime = RENT_DURATIONS[duration] || 4;

    console.log('📍 [BUY-RENT] Mapped:', { smsActivateService, smsActivateCountry, rentTime });

    // Get rent price
    const servicesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentServicesAndCountries&country=${smsActivateCountry}&rent_time=${rentTime}`;
    const servicesData = await fetchSmsActivate(servicesUrl);

    let price = 0;
    let actualService = smsActivateService;

    if (servicesData.services && servicesData.services[smsActivateService]) {
      price = servicesData.services[smsActivateService].cost || 0;
    } else if (servicesData.services && servicesData.services['full']) {
      price = servicesData.services['full'].cost || 0;
      actualService = 'full';
    }

    if (expectedPrice && expectedPrice > 0) {
      price = expectedPrice;
    }

    if (!price || price <= 0) {
      return res.status(400).json({ success: false, error: `Rent not available for ${product} in ${country}` });
    }

    // Check user balance
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', userId || user.id)
      .single();

    if (profileError || !userProfile) {
      return res.status(400).json({ success: false, error: 'User profile not found' });
    }

    if (userProfile.balance < price) {
      return res.status(400).json({ success: false, error: `Insufficient balance. Required: ${price}, Available: ${userProfile.balance}` });
    }

    // Rent number
    const rentUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentNumber&service=${actualService}&country=${smsActivateCountry}&rent_time=${rentTime}`;
    console.log('🌐 [BUY-RENT] API Call:', rentUrl.replace(SMS_ACTIVATE_API_KEY, 'KEY_HIDDEN'));

    const rentData = await fetchSmsActivate(rentUrl);
    console.log('📥 [BUY-RENT] Response:', rentData);

    if (rentData.status !== 'success' || !rentData.phone) {
      return res.status(400).json({ success: false, error: rentData.message || 'Failed to rent number' });
    }

    const { id: rentId, number: phone, endDate } = rentData.phone;
    const expiresAt = new Date(Date.now() + rentTime * 60 * 60 * 1000).toISOString();

    // Create rental record
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .insert({
        user_id: userId || user.id,
        rent_id: rentId.toString(),
        rental_id: rentId.toString(),
        phone: phone,
        service_code: product,
        country_code: country.toString(),
        operator: 'auto',
        total_cost: price,
        hourly_rate: price / rentTime,
        status: 'active',
        end_date: expiresAt,
        expires_at: expiresAt,
        rent_hours: rentTime,
        duration_hours: rentTime,
        provider: 'sms-activate',
        message_count: 0,
        frozen_amount: price
      })
      .select()
      .single();

    if (rentalError) {
      console.error('❌ [BUY-RENT] Failed to create rental:', rentalError);
      await fetchSmsActivate(`${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setRentStatus&id=${rentId}&status=2`);
      return res.status(500).json({ success: false, error: 'Failed to create rental' });
    }

    // Freeze balance
    const { error: freezeError } = await supabase.rpc('secure_freeze_balance', {
      p_user_id: userId || user.id,
      p_amount: price,
      p_rental_id: rental.id,
      p_reason: `Rent ${product} ${country} (${duration})`
    });

    if (freezeError) {
      // Fallback
      await supabase.from('users').update({
        balance: userProfile.balance - price,
        frozen_balance: (userProfile.frozen_balance || 0) + price
      }).eq('id', userId || user.id);
    }

    console.log('✅ [BUY-RENT] Success:', { id: rental.id, phone, price });

    return res.json({
      success: true,
      data: {
        id: rental.id,
        rental_id: rentId,
        phone: phone,
        service: product,
        country: country,
        price: price,
        status: 'active',
        expires: expiresAt,
        duration_hours: rentTime
      }
    });
  } catch (error) {
    console.error('❌ [BUY-RENT] Error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET RENT SERVICES
// ============================================================================
app.post('/functions/v1/get-rent-services', async (req, res) => {
  console.log('📋 [RENT-SERVICES] Function called');
  try {
    const { countryId = 0, rentTime = 4 } = req.body;
    const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentServicesAndCountries&country=${countryId}&rent_time=${rentTime}`;
    const data = await fetchSmsActivate(url);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET RENT STATUS
// ============================================================================
app.post('/functions/v1/get-rent-status', async (req, res) => {
  console.log('🔍 [RENT-STATUS] Function called');
  try {
    const { rentId } = req.body;
    const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentStatus&id=${rentId}`;
    const data = await fetchSmsActivate(url);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// SET RENT STATUS
// ============================================================================
app.post('/functions/v1/set-rent-status', async (req, res) => {
  console.log('⚙️ [SET-RENT-STATUS] Function called');
  try {
    const { rentId, status } = req.body;
    const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setRentStatus&id=${rentId}&status=${status}`;
    const data = await fetchSmsActivate(url);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET REAL-TIME PRICES
// ============================================================================
app.post('/functions/v1/get-real-time-prices', async (req, res) => {
  console.log('💰 [REAL-TIME-PRICES] Function called');
  try {
    const { service, country } = req.body;
    const smsService = mapServiceCode(service);
    const smsCountry = mapCountryCode(country);
    const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices&service=${smsService}&country=${smsCountry}`;
    const data = await fetchSmsActivate(url);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET TOP COUNTRIES BY SERVICE (with proper country name mapping)
// ============================================================================
const COUNTRY_ID_TO_INFO = {
  0: { code: 'RU', name: 'Russia' }, 1: { code: 'UA', name: 'Ukraine' },
  2: { code: 'KZ', name: 'Kazakhstan' }, 3: { code: 'CN', name: 'China' },
  4: { code: 'PH', name: 'Philippines' }, 5: { code: 'MM', name: 'Myanmar' },
  6: { code: 'ID', name: 'Indonesia' }, 7: { code: 'MY', name: 'Malaysia' },
  8: { code: 'KE', name: 'Kenya' }, 9: { code: 'TZ', name: 'Tanzania' },
  10: { code: 'VN', name: 'Vietnam' }, 11: { code: 'KG', name: 'Kyrgyzstan' },
  12: { code: 'GB', name: 'United Kingdom' }, 13: { code: 'IL', name: 'Israel' },
  14: { code: 'HK', name: 'Hong Kong' }, 15: { code: 'PL', name: 'Poland' },
  16: { code: 'EG', name: 'Egypt' }, 17: { code: 'NG', name: 'Nigeria' },
  19: { code: 'MA', name: 'Morocco' }, 20: { code: 'GH', name: 'Ghana' },
  21: { code: 'AR', name: 'Argentina' }, 22: { code: 'IN', name: 'India' },
  23: { code: 'UZ', name: 'Uzbekistan' }, 24: { code: 'KH', name: 'Cambodia' },
  27: { code: 'DE', name: 'Germany' }, 32: { code: 'RO', name: 'Romania' },
  33: { code: 'CO', name: 'Colombia' }, 36: { code: 'CA', name: 'Canada' },
  38: { code: 'MX', name: 'Mexico' }, 40: { code: 'ES', name: 'Spain' },
  45: { code: 'BR', name: 'Brazil' }, 46: { code: 'TR', name: 'Turkey' },
  52: { code: 'TH', name: 'Thailand' }, 56: { code: 'PT', name: 'Portugal' },
  58: { code: 'IT', name: 'Italy' }, 78: { code: 'FR', name: 'France' },
  175: { code: 'AU', name: 'Australia' }, 187: { code: 'US', name: 'United States' }
};

app.post('/functions/v1/get-top-countries-by-service', async (req, res) => {
  console.log('🌍 [TOP-COUNTRIES] Function called');
  try {
    const { service } = req.body;
    const smsService = mapServiceCode(service);
    const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getTopCountriesByService&service=${smsService}`;
    const data = await fetchSmsActivate(url);
    
    // Transform to proper format with country names
    let countries = [];
    if (Array.isArray(data)) {
      countries = data.map(item => {
        const countryId = parseInt(item.country);
        const info = COUNTRY_ID_TO_INFO[countryId] || { code: String(countryId), name: `Country ${countryId}` };
        return {
          countryId,
          countryCode: info.code,
          countryName: info.name,
          count: parseInt(item.count) || 0,
          price: parseFloat(item.price) || 0,
          retail_price: parseFloat(item.retail_price) || parseFloat(item.price) || 0
        };
      });
    }
    
    return res.json({ success: true, data: countries });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET SERVICES COUNTS
// ============================================================================
app.post('/functions/v1/get-services-counts', async (req, res) => {
  console.log('📊 [SERVICES-COUNTS] Function called');
  try {
    const { country } = req.body;
    const smsCountry = mapCountryCode(country);
    const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getNumbersStatus&country=${smsCountry}`;
    const data = await fetchSmsActivate(url);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET PROVIDERS STATUS
// ============================================================================
app.post('/functions/v1/get-providers-status', async (req, res) => {
  console.log('🔌 [PROVIDERS-STATUS] Function called');
  try {
    const balanceUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getBalance`;
    const balanceData = await fetchSmsActivate(balanceUrl);
    
    let balance = 0;
    if (balanceData.raw && balanceData.raw.startsWith('ACCESS_BALANCE:')) {
      balance = parseFloat(balanceData.raw.split(':')[1]);
    } else if (balanceData.balance) {
      balance = parseFloat(balanceData.balance);
    }
    
    return res.json({
      success: true,
      data: {
        'sms-activate': {
          status: balance > 0 ? 'active' : 'low_balance',
          balance: balance
        }
      }
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
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
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const { referralCode } = req.body;
    
    // Find referrer
    const { data: referrer } = await supabase
      .from('users')
      .select('id')
      .eq('referral_code', referralCode)
      .single();

    if (!referrer) {
      return res.status(404).json({ success: false, error: 'Referral code not found' });
    }

    // Update user
    await supabase.from('users').update({ referred_by: referrer.id }).eq('id', user.id);
    
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// INIT MONEYFUSION PAYMENT
// ============================================================================
app.post('/functions/v1/init-moneyfusion-payment', async (req, res) => {
  console.log('💳 [MONEYFUSION] Function called');
  try {
    const user = await getUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!MONEYFUSION_API_URL) {
      return res.status(500).json({ success: false, error: 'MoneyFusion non configuré' });
    }

    const { amount, phone, description, metadata } = req.body;
    const paymentRef = `ONESMS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const webhookUrl = `${process.env.API_URL || SUPABASE_URL}/functions/v1/moneyfusion-webhook`;

    const payload = {
      amount,
      phone,
      description: description || 'Rechargement ONE SMS',
      reference: paymentRef,
      callback_url: webhookUrl,
      metadata: { ...metadata, user_id: user.id }
    };

    const response = await fetch(MONEYFUSION_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const mfData = await response.json();

    if (!mfData.success && !mfData.token) {
      return res.status(400).json({ success: false, error: mfData.message || 'Payment init failed' });
    }

    // Create pending transaction
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'deposit',
      amount: metadata?.activations || 0,
      status: 'pending',
      reference: paymentRef,
      external_id: mfData.token,
      description: description || 'Rechargement via MoneyFusion',
      metadata: { moneyfusion_token: mfData.token, phone, amount_xof: amount }
    });

    return res.json({
      success: true,
      data: { token: mfData.token, checkout_url: mfData.url, payment_ref: paymentRef }
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// MONEYFUSION WEBHOOK
// ============================================================================
app.post('/functions/v1/moneyfusion-webhook', async (req, res) => {
  console.log('🔔 [MONEYFUSION-WEBHOOK] Received');
  try {
    const { token, status, reference } = req.body;
    console.log('📥 Webhook data:', { token, status, reference });

    // Find transaction
    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .or(`external_id.eq.${token},reference.eq.${reference}`)
      .single();

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    if (transaction.status === 'completed') {
      return res.json({ success: true, message: 'Already processed' });
    }

    if (status === 'success' || status === 'completed') {
      // Credit user
      const { data: userData } = await supabase.from('users').select('balance').eq('id', transaction.user_id).single();
      const newBalance = (userData?.balance || 0) + transaction.amount;
      
      await supabase.from('users').update({ balance: newBalance }).eq('id', transaction.user_id);
      await supabase.from('transactions').update({
        status: 'completed',
        balance_after: newBalance
      }).eq('id', transaction.id);
    } else {
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', transaction.id);
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET SMS-ACTIVATE INBOX
// ============================================================================
app.post('/functions/v1/get-sms-activate-inbox', async (req, res) => {
  console.log('📬 [INBOX] Function called');
  try {
    const { rentId } = req.body;
    const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentStatus&id=${rentId}`;
    const data = await fetchSmsActivate(url);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
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
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { rentalId, rentId } = req.body;
    const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=continueRentNumber&id=${rentId}&rent_time=1`;
    const data = await fetchSmsActivate(url);

    if (data.status === 'success') {
      const newExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();
      await supabase.from('rentals').update({ expires_at: newExpiry }).eq('id', rentalId);
    }

    return res.json({ success: data.status === 'success', data });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// SYNC SMS-ACTIVATE (countries and services)
// ============================================================================
app.post('/functions/v1/sync-sms-activate', async (req, res) => {
  console.log('🔄 [SYNC] Starting sync...');
  try {
    // Get countries
    const countriesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getCountries`;
    const countriesData = await fetchSmsActivate(countriesUrl);

    // Get number status for all countries
    const statusUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getNumbersStatus&country=-1`;
    const statusData = await fetchSmsActivate(statusUrl);

    let syncedCount = 0;
    const countries = Object.entries(countriesData).filter(([key]) => !isNaN(parseInt(key)));

    for (const [id, info] of countries) {
      const countryId = parseInt(id);
      const countryName = info.eng || info.rus || `Country ${id}`;
      const countryCode = info.iso || id;
      const visible = info.visible === 1 || info.visible === true;
      
      // Get available numbers for this country
      const numbers = statusData[countryId] || {};
      const totalNumbers = Object.values(numbers).reduce((sum, n) => sum + (parseInt(n) || 0), 0);

      await supabase.from('countries').upsert({
        id: countryId,
        name: countryName,
        code: countryCode.toUpperCase(),
        is_active: visible && totalNumbers > 0,
        available_numbers: totalNumbers,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      syncedCount++;
    }

    console.log(`✅ [SYNC] Synced ${syncedCount} countries`);
    return res.json({ success: true, synced: syncedCount });
  } catch (error) {
    console.error('❌ [SYNC] Error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CLEANUP EXPIRED ACTIVATIONS
// ============================================================================
app.post('/functions/v1/cleanup-expired-activations', async (req, res) => {
  console.log('🧹 [CLEANUP-ACTIVATIONS] Starting...');
  try {
    const now = new Date().toISOString();
    const { data: expiredActivations } = await supabase
      .from('activations')
      .select('*')
      .in('status', ['pending', 'waiting'])
      .lt('expires_at', now)
      .limit(50);

    let cleaned = 0;
    for (const activation of (expiredActivations || [])) {
      // Cancel on provider
      await fetch(`${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&id=${activation.order_id}&status=8`);

      // Refund via RPC
      await supabase.rpc('atomic_refund', {
        p_user_id: activation.user_id,
        p_activation_id: activation.id,
        p_transaction_id: null,
        p_reason: 'Expired - auto cleanup'
      });

      await supabase.from('activations').update({ status: 'expired' }).eq('id', activation.id);
      cleaned++;
    }

    console.log(`✅ [CLEANUP-ACTIVATIONS] Cleaned ${cleaned} expired activations`);
    return res.json({ success: true, cleaned });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CLEANUP EXPIRED RENTALS
// ============================================================================
app.post('/functions/v1/cleanup-expired-rentals', async (req, res) => {
  console.log('🧹 [CLEANUP-RENTALS] Starting...');
  try {
    const now = new Date().toISOString();
    const { data: expiredRentals } = await supabase
      .from('rentals')
      .select('*')
      .eq('status', 'active')
      .lt('expires_at', now)
      .limit(50);

    let cleaned = 0;
    for (const rental of (expiredRentals || [])) {
      await supabase.from('rentals').update({ status: 'expired' }).eq('id', rental.id);
      cleaned++;
    }

    console.log(`✅ [CLEANUP-RENTALS] Cleaned ${cleaned} expired rentals`);
    return res.json({ success: true, cleaned });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CRON CHECK PENDING SMS
// ============================================================================
app.post('/functions/v1/cron-check-pending-sms', async (req, res) => {
  console.log('⏰ [CRON-CHECK-SMS] Starting...');
  try {
    const { data: pendingActivations } = await supabase
      .from('activations')
      .select('*')
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .limit(20);

    let checked = 0;
    for (const activation of (pendingActivations || [])) {
      const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getStatus&id=${activation.order_id}`;
      const response = await fetch(apiUrl);
      const text = await response.text();

      if (text.startsWith('STATUS_OK:')) {
        const smsCode = text.split(':')[1]?.trim();
        await supabase.from('activations').update({
          status: 'received',
          sms_code: smsCode,
          sms_text: `Code: ${smsCode}`,
          sms_received_at: new Date().toISOString()
        }).eq('id', activation.id);

        await supabase.rpc('atomic_commit', {
          p_user_id: activation.user_id,
          p_activation_id: activation.id,
          p_rental_id: null,
          p_transaction_id: null,
          p_reason: 'SMS received via cron'
        });
      }
      checked++;
    }

    console.log(`✅ [CRON-CHECK-SMS] Checked ${checked} activations`);
    return res.json({ success: true, checked });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// SETUP CRON JOBS
// ============================================================================
function setupCronJobs() {
  console.log('⏰ Setting up cron jobs...');

  cron.schedule('*/3 * * * *', async () => {
    console.log('⏰ [CRON] cleanup-expired-activations');
    try { await fetch(`http://localhost:${PORT}/functions/v1/cleanup-expired-activations`, { method: 'POST' }); } catch (e) {}
  });

  cron.schedule('*/5 * * * *', async () => {
    console.log('⏰ [CRON] cleanup-expired-rentals');
    try { await fetch(`http://localhost:${PORT}/functions/v1/cleanup-expired-rentals`, { method: 'POST' }); } catch (e) {}
  });

  cron.schedule('*/2 * * * *', async () => {
    console.log('⏰ [CRON] cron-check-pending-sms');
    try { await fetch(`http://localhost:${PORT}/functions/v1/cron-check-pending-sms`, { method: 'POST' }); } catch (e) {}
  });

  cron.schedule('*/30 * * * *', async () => {
    console.log('⏰ [CRON] sync-sms-activate');
    try { await fetch(`http://localhost:${PORT}/functions/v1/sync-sms-activate`, { method: 'POST' }); } catch (e) {}
  });

  console.log('✅ Cron jobs configured');
}

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log(`🚀 ONE SMS API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
  setupCronJobs();
});
