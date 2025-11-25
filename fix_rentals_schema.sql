-- Fix rentals table schema for SMS-Activate compatibility
-- Run this in Supabase SQL Editor

-- Check if rentals table exists and what columns it has
DO $$
BEGIN
  -- Add duration_hours if it doesn't exist (some deployments might have rent_hours instead)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rentals' 
    AND column_name = 'duration_hours'
  ) THEN
    -- Check if rent_hours exists instead
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'rentals' 
      AND column_name = 'rent_hours'
    ) THEN
      -- Rename rent_hours to duration_hours
      ALTER TABLE public.rentals RENAME COLUMN rent_hours TO duration_hours;
      RAISE NOTICE 'Renamed rent_hours to duration_hours';
    ELSE
      -- Add duration_hours column
      ALTER TABLE public.rentals ADD COLUMN duration_hours INTEGER NOT NULL DEFAULT 4;
      RAISE NOTICE 'Added duration_hours column';
    END IF;
  END IF;

  -- Add expires_at if it doesn't exist (some deployments might have end_date instead)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rentals' 
    AND column_name = 'expires_at'
  ) THEN
    -- Check if end_date exists instead
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'rentals' 
      AND column_name = 'end_date'
    ) THEN
      -- Rename end_date to expires_at
      ALTER TABLE public.rentals RENAME COLUMN end_date TO expires_at;
      RAISE NOTICE 'Renamed end_date to expires_at';
    ELSE
      -- Add expires_at column
      ALTER TABLE public.rentals ADD COLUMN expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '4 hours';
      RAISE NOTICE 'Added expires_at column';
    END IF;
  END IF;

  -- Add rental_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rentals' 
    AND column_name = 'rental_id'
  ) THEN
    ALTER TABLE public.rentals ADD COLUMN rental_id TEXT;
    RAISE NOTICE 'Added rental_id column';
  END IF;

  -- Add provider if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rentals' 
    AND column_name = 'provider'
  ) THEN
    ALTER TABLE public.rentals ADD COLUMN provider TEXT DEFAULT 'sms-activate';
    RAISE NOTICE 'Added provider column';
  END IF;

  -- Add operator if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rentals' 
    AND column_name = 'operator'
  ) THEN
    ALTER TABLE public.rentals ADD COLUMN operator TEXT DEFAULT 'auto';
    RAISE NOTICE 'Added operator column';
  END IF;

  -- Add message_count if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rentals' 
    AND column_name = 'message_count'
  ) THEN
    ALTER TABLE public.rentals ADD COLUMN message_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added message_count column';
  END IF;

END $$;

-- Create index on rental_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_rentals_rental_id ON public.rentals(rental_id);

-- Display final schema
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'rentals'
ORDER BY ordinal_position;
