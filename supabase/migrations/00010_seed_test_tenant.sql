-- =================================================================
-- Seed: Test tenant for development
-- After running this migration, create users via Supabase Auth UI
-- or API, then insert tenant_memberships to link them.
-- =================================================================

-- Create test tenant
INSERT INTO tenants (id, tenant_code, name, default_timezone)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'TNT-0001',
  'Anderson Cleaning Services',
  'America/New_York'
);

-- Seed initial sequences for the test tenant
INSERT INTO system_sequences (tenant_id, prefix, current_value) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'CLI', 1000),
  ('a0000000-0000-0000-0000-000000000001', 'SIT', 2000),
  ('a0000000-0000-0000-0000-000000000001', 'TSK', 0),
  ('a0000000-0000-0000-0000-000000000001', 'SER', 0),
  ('a0000000-0000-0000-0000-000000000001', 'PRO', 0),
  ('a0000000-0000-0000-0000-000000000001', 'OPP', 0),
  ('a0000000-0000-0000-0000-000000000001', 'BID', 0),
  ('a0000000-0000-0000-0000-000000000001', 'PRP', 0),
  ('a0000000-0000-0000-0000-000000000001', 'JOB', 0),
  ('a0000000-0000-0000-0000-000000000001', 'TKT', 0),
  ('a0000000-0000-0000-0000-000000000001', 'STF', 0),
  ('a0000000-0000-0000-0000-000000000001', 'CON', 0),
  ('a0000000-0000-0000-0000-000000000001', 'FIL', 0);

-- =================================================================
-- Helper: auto-assign new users to test tenant as OWNER_ADMIN
-- In production, this would be a proper onboarding flow.
-- For dev, this trigger auto-creates a membership on signup.
-- =================================================================
CREATE OR REPLACE FUNCTION auto_assign_dev_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Only in dev: auto-assign every new user to the test tenant
  INSERT INTO tenant_memberships (tenant_id, user_id, role_code)
  VALUES (
    'a0000000-0000-0000-0000-000000000001',
    NEW.id,
    'OWNER_ADMIN'
  )
  ON CONFLICT (tenant_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Fire on new user creation in auth.users
CREATE TRIGGER trg_auto_assign_dev_tenant
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_dev_tenant();

-- =================================================================
-- SECOND TEST TENANT (for proving isolation)
-- =================================================================
INSERT INTO tenants (id, tenant_code, name, default_timezone)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'TNT-0002',
  'Other Cleaning Co (isolation test)',
  'America/Chicago'
);
