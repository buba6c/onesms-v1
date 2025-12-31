
import { supabase } from './supabase';

// Cache for settings to avoid too many database calls
const settingsCache: Record<string, { value: string; timestamp: number }> = {};
const CACHE_DURATION = 10 * 1000; // 10 seconds (reduced for faster updates)

/**
 * Get a system setting from database or cache
 */
export async function getSetting(key: string): Promise<string> {
  // Check cache first
  const cached = settingsCache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[SETTINGS] Cache hit for ${key}:`, cached.value);
    return cached.value;
  }

  // Fetch from database
  console.log(`[SETTINGS] Fetching ${key} from database...`);
  const { data, error } = await (supabase as any)
    .rpc('get_setting', { setting_key: key });

  if (error) {
    console.error(`[SETTINGS] Error fetching ${key}:`, error);
    // Fallback to env variable
    return import.meta.env[`VITE_${key.toUpperCase()}`] || '';
  }

  const value = data || '';
  console.log(`[SETTINGS] Got ${key} from DB:`, value);

  // Update cache
  settingsCache[key] = { value, timestamp: Date.now() };

  return value;
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
