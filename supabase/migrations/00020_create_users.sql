-- Drop the auto-assign trigger so user creation doesn't fail
DROP TRIGGER IF EXISTS trg_auto_assign_dev_tenant ON auth.users;
DROP FUNCTION IF EXISTS auto_assign_dev_tenant();
