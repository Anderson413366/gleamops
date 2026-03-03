-- Add phone and email columns to tenants table for company profile
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email TEXT;

-- Seed Anderson Cleaning company profile
UPDATE tenants
SET
  name = 'Anderson Cleaning Services',
  phone = '(413) 555-0100',
  email = 'info@andersoncleaning.com'
WHERE id = 'a0000000-0000-0000-0000-000000000001';
