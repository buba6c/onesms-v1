-- Add delivery_rate column to pricing_rules table
-- This stores the success rate (delivery percentage) from 5sim API for each country+service combination

ALTER TABLE public.pricing_rules 
ADD COLUMN IF NOT EXISTS delivery_rate DECIMAL(5,2) DEFAULT 0;

COMMENT ON COLUMN public.pricing_rules.delivery_rate IS 'Success rate (%) from 5sim API - varies by country and service';
