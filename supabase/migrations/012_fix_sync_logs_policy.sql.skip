-- Fix sync_logs RLS policy to allow Edge Function to insert logs

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can view sync logs" ON sync_logs;

-- Allow service role (Edge Function) to insert and update sync logs
DROP POLICY IF EXISTS "Service role can manage sync logs" ON sync_logs;
CREATE POLICY "Service role can manage sync logs"
  ON sync_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- Admins can view all sync logs
DROP POLICY IF EXISTS "Admins can view all sync logs" ON sync_logs;
CREATE POLICY "Admins can view all sync logs"
  ON sync_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
