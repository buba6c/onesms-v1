-- =============================================
-- SMSPVA + OnlineSIM Provider Settings
-- Run this SQL in Supabase SQL Editor to add provider settings
-- =============================================

-- Add SMSPVA API key setting
INSERT INTO system_settings (key, value, description, created_at, updated_at)
VALUES 
  ('smspva_api_key', '', 'SMSPVA API Key - Get from https://smspva.com/profile', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- Add OnlineSIM API key setting
INSERT INTO system_settings (key, value, description, created_at, updated_at)
VALUES 
  ('onlinesim_api_key', '', 'OnlineSIM API Key - Get from https://onlinesim.io/profile', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- Add provider enable/disable settings
INSERT INTO system_settings (key, value, description, created_at, updated_at)
VALUES 
  ('smspva_enabled', 'false', 'Enable SMSPVA provider in intelligent fallback', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value, description, created_at, updated_at)
VALUES 
  ('onlinesim_enabled', 'false', 'Enable OnlineSIM provider in intelligent fallback', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- Add provider priority setting (JSON array)
INSERT INTO system_settings (key, value, description, created_at, updated_at)
VALUES 
  ('provider_priority', '["herosms","5sim","smspva","onlinesim"]', 'Provider fallback priority order (JSON array)', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- Verify settings were added
-- =============================================
SELECT key, value, description 
FROM system_settings 
WHERE key IN (
  'smspva_api_key', 
  'onlinesim_api_key', 
  'smspva_enabled', 
  'onlinesim_enabled', 
  'provider_priority'
)
ORDER BY key;
