-- Fix contact_messages RLS policy for anonymous users
-- Date: 2025-12-11

-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can submit contact form" ON contact_messages;

-- Recreate policy with correct permissions for anonymous users
CREATE POLICY "Anyone can submit contact form" 
  ON contact_messages 
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- Ensure grants are correct
GRANT INSERT ON contact_messages TO anon;
GRANT INSERT ON contact_messages TO authenticated;
