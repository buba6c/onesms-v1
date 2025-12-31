-- Fix update_setting to use UPSERT logic
-- This ensures settings that don't exist are created

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
  
  -- UPSERT: Insert or update setting
  INSERT INTO system_settings (key, value, updated_at)
  VALUES (setting_key, setting_value, NOW())
  ON CONFLICT (key) 
  DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
