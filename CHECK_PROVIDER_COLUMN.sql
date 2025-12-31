DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activations' AND column_name = 'provider') THEN
        ALTER TABLE activations ADD COLUMN provider text DEFAULT 'sms-activate';
    END IF;
END $$;
