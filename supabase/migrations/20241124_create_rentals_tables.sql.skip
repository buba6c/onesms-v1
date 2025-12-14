-- Create rentals table
CREATE TABLE IF NOT EXISTS public.rentals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rent_id TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  service_code TEXT NOT NULL,
  country_code TEXT NOT NULL,
  operator TEXT DEFAULT 'any',
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  rent_hours INTEGER NOT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL,
  refund_amount DECIMAL(10, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  last_message_date TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create webhook_logs table
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activation_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rentals_user_id ON public.rentals(user_id);
CREATE INDEX IF NOT EXISTS idx_rentals_rent_id ON public.rentals(rent_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON public.rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_created_at ON public.rentals(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_activation_id ON public.webhook_logs(activation_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON public.webhook_logs(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rentals table
CREATE POLICY "Users can view their own rentals"
  ON public.rentals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rentals"
  ON public.rentals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rentals"
  ON public.rentals
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for webhook_logs table (admin only)
CREATE POLICY "Service role can manage webhook logs"
  ON public.webhook_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rentals_updated_at BEFORE UPDATE ON public.rentals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.rentals TO authenticated;
GRANT ALL ON public.webhook_logs TO service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Tables created successfully!';
  RAISE NOTICE '📊 rentals table: Ready for rental management';
  RAISE NOTICE '📊 webhook_logs table: Ready for webhook logging';
  RAISE NOTICE '🔒 RLS policies: Enabled and configured';
END $$;
