
import { supabase } from './supabase';

const settingsCache: Record<string, { value: string; timestamp: number }> = {};
const inFlightRequests: Record<string, Promise<string>> = {};
const CACHE_DURATION = 60 * 1000; // 60 seconds (increased to help with stampedes)

/**
 * Get a system setting from database or cache (with in-flight deduplication)
 */
export async function getSetting(key: string): Promise<string> {
  // 1. Check cache first
  const cached = settingsCache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.value;
  }

  // 2. Check if already in flight (DEDUPLICATION)
  if (inFlightRequests[key]) {
    return inFlightRequests[key];
  }

  // 3. Fetch from database with retry logic inside the promise
  const fetchPromise = (async () => {
    try {
      // Small random delay (0-50ms) to stagger simultaneous parallel fetches if they missed the in-flight check
      await new Promise(r => setTimeout(r, Math.random() * 50));
      
      const { data, error } = await (supabase as any)
        .rpc('get_setting', { setting_key: key });

      if (error) throw error;
      
      const value = data || '';
      
      // Update cache
      settingsCache[key] = { value, timestamp: Date.now() };
      return value;
    } catch (error) {
      console.warn(`[SETTINGS] Error fetching ${key}, using env fallback:`, error);
      return import.meta.env[`VITE_${key.toUpperCase()}`] || '';
    } finally {
      // Clean up in-flight request
      delete inFlightRequests[key];
    }
  })();

  inFlightRequests[key] = fetchPromise;
  return fetchPromise;
}

/**
 * Get multiple settings at once
 */
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  for (const key of keys) {
    result[key] = await getSetting(key);
  }

  return result;
}

/**
 * Clear settings cache (useful after updates)
 */
export function clearSettingsCache() {
  Object.keys(settingsCache).forEach(key => delete settingsCache[key]);
}

/**
 * Get Supabase configuration
 */
export async function getSupabaseConfig() {
  return await getSettings(['supabase_url', 'supabase_anon_key']);
}

/**
 * Get 5sim configuration
 */
export async function get5simConfig() {
  return await getSettings(['5sim_api_key', '5sim_api_url']);
}

/**
 * Get PayTech configuration
 */
export async function getPaytechConfig() {
  return await getSettings([
    'paytech_api_key',
    'paytech_api_secret',
    'paytech_api_url',
  ]);
}
/**
 * Update a system setting
 */
export async function updateSetting(key: string, value: string): Promise<boolean> {
  console.log(`[SETTINGS] Updating ${key} to:`, value);

  const { data, error } = await (supabase as any)
    .rpc('update_setting', { setting_key: key, setting_value: value });

  if (error) {
    console.error(`[SETTINGS] Error updating ${key}:`, error);
    return false;
  }

  // Clear cache for this key so next read gets fresh value
  delete settingsCache[key];
  console.log(`[SETTINGS] Cleared cache for ${key}`);

  return true;
}
