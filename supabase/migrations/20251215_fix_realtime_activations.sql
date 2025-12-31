-- Fix Realtime mismatch warning for activations table
-- Set REPLICA IDENTITY FULL to enable proper Realtime subscriptions

ALTER TABLE activations REPLICA IDENTITY FULL;

-- Ensure the table is enabled for Realtime
-- (already done in previous migrations, but confirming)
ALTER PUBLICATION supabase_realtime ADD TABLE activations;

-- Comment for documentation
COMMENT ON TABLE activations IS 'Activations table with REPLICA IDENTITY FULL for Realtime support';
