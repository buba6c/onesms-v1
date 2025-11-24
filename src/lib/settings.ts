// @ts-nocheck
import { supabase } from './supabase';

// Cache for settings to avoid too many database calls
const settingsCache: Record<string, { value: string; timestamp: number }> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get a system setting from database or cache
 */
export async function getSetting(key: string): Promise<string> {
  // Check cache first
  const cached = settingsCache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.value;
  }

  // Fetch from database
  const { data, error } = await supabase
    .rpc('get_setting', { setting_key: key });

  if (error) {
    console.error(`Error fetching setting ${key}:`, error);
    // Fallback to env variable
    return import.meta.env[`VITE_${key.toUpperCase()}`] || '';
  }

  const value = data || '';
  
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
