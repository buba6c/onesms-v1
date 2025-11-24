-- Add system_settings table for storing API keys and configuration
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  category VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write system settings
CREATE POLICY "Admin full access to system_settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Insert default settings
INSERT INTO system_settings (key, value, category, description) VALUES
  ('supabase_url', '', 'supabase', 'Supabase Project URL'),
  ('supabase_anon_key', '', 'supabase', 'Supabase Anonymous Key'),
  ('5sim_api_key', '', '5sim', '5sim.net API Key'),
  ('5sim_api_url', 'https://5sim.net/v1', '5sim', '5sim.net API Base URL'),
  ('paytech_api_key', '', 'paytech', 'PayTech API Key'),
  ('paytech_api_secret', '', 'paytech', 'PayTech API Secret'),
  ('paytech_api_url', 'https://paytech.sn/api/payment', 'paytech', 'PayTech API Base URL'),
  ('app_name', 'One SMS', 'general', 'Application Name'),
  ('app_url', 'http://localhost:3000', 'general', 'Application URL'),
  ('enable_registration', 'true', 'general', 'Allow new user registration'),
  ('default_credits', '0', 'general', 'Default credits for new users'),
  ('min_recharge_amount', '500', 'pricing', 'Minimum recharge amount in XOF'),
  ('max_recharge_amount', '1000000', 'pricing', 'Maximum recharge amount in XOF')
ON CONFLICT (key) DO NOTHING;

-- Function to get setting value
CREATE OR REPLACE FUNCTION get_setting(setting_key VARCHAR)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT value FROM system_settings WHERE key = setting_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update setting (admin only)
CREATE OR REPLACE FUNCTION update_setting(setting_key VARCHAR, setting_value TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR;
BEGIN
  -- Check if user is admin
  SELECT role INTO user_role FROM users WHERE id = auth.uid();
  
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can update settings';
  END IF;
  
  -- Update setting
  UPDATE system_settings 
  SET value = setting_value, updated_at = NOW()
  WHERE key = setting_key;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
