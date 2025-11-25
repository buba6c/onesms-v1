-- Create system_logs table for admin monitoring
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'success')),
  category TEXT NOT NULL CHECK (category IN ('api', 'payment', 'user', 'sync', 'system', 'sms', 'rent')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_category ON system_logs(category);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_metadata ON system_logs USING gin(metadata);

-- RLS Policies (admin only)
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all logs"
  ON system_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "System can insert logs"
  ON system_logs FOR INSERT
  WITH CHECK (true);

-- Function to log events
CREATE OR REPLACE FUNCTION log_event(
  p_level TEXT,
  p_category TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO system_logs (level, category, message, metadata, user_id)
  VALUES (p_level, p_category, p_message, p_metadata, p_user_id)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean old logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM system_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE system_logs IS 'System logs for admin monitoring and debugging';
COMMENT ON FUNCTION log_event IS 'Helper function to insert logs with validation';
COMMENT ON FUNCTION cleanup_old_logs IS 'Cleanup logs older than 30 days (run via cron)';
