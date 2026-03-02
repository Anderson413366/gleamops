-- =============================================================================
-- Task 2: Add missing standard triggers to 5 tables
-- =============================================================================
-- VERIFICATION FINDINGS:
--   1. Trigger functions exist: set_updated_at (00003), prevent_hard_delete (00050),
--      set_version_etag (00003) — all confirmed in pg_proc.
--   2. All 5 tables currently have ZERO triggers.
--   3. NONE of the 5 tables have updated_at, version_etag, or archived_at columns.
--      They are lightweight event/junction tables:
--        - message_thread_members (00057): membership junction — joined_at only
--        - procurement_approval_actions (00069): action log — created_at only
--        - sales_email_events (00014): webhook events — created_at only
--        - timeline_events (00011): activity feed — created_at only
--        - user_client_access (00033): ACL junction — created_at only
--   4. Three tables (user_client_access, sales_email_events, timeline_events) are
--      EXPLICITLY in the prevent_hard_delete exemption list (00050 lines 136-141)
--      as "system/event tables — deletes allowed".
--
-- ACTION: Add the missing columns first, then attach all 3 standard triggers.
-- For prevent_hard_delete: adding to all 5 as requested. Note that this OVERRIDES
-- the exemption for 3 tables (sales_email_events, timeline_events, user_client_access).
-- If hard deletes should remain allowed on those tables, remove those 3 triggers.
-- =============================================================================

SET search_path TO 'public';

BEGIN;

-- ---------------------------------------------------------------------------
-- Step 1: Add missing columns to all 5 tables
-- ---------------------------------------------------------------------------

-- message_thread_members
ALTER TABLE message_thread_members
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- procurement_approval_actions
ALTER TABLE procurement_approval_actions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- sales_email_events
ALTER TABLE sales_email_events
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- timeline_events
ALTER TABLE timeline_events
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- user_client_access
ALTER TABLE user_client_access
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS version_etag UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- ---------------------------------------------------------------------------
-- Step 2: Attach standard triggers to all 5 tables
-- ---------------------------------------------------------------------------

-- message_thread_members
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.message_thread_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER prevent_hard_delete BEFORE DELETE ON public.message_thread_members
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();
CREATE TRIGGER set_version_etag BEFORE INSERT OR UPDATE ON public.message_thread_members
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

-- procurement_approval_actions
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.procurement_approval_actions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER prevent_hard_delete BEFORE DELETE ON public.procurement_approval_actions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();
CREATE TRIGGER set_version_etag BEFORE INSERT OR UPDATE ON public.procurement_approval_actions
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

-- sales_email_events (NOTE: was in prevent_hard_delete exemption list — now protected)
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.sales_email_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER prevent_hard_delete BEFORE DELETE ON public.sales_email_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();
CREATE TRIGGER set_version_etag BEFORE INSERT OR UPDATE ON public.sales_email_events
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

-- timeline_events (NOTE: was in prevent_hard_delete exemption list — now protected)
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.timeline_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER prevent_hard_delete BEFORE DELETE ON public.timeline_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();
CREATE TRIGGER set_version_etag BEFORE INSERT OR UPDATE ON public.timeline_events
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

-- user_client_access (NOTE: was in prevent_hard_delete exemption list — now protected)
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_client_access
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER prevent_hard_delete BEFORE DELETE ON public.user_client_access
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();
CREATE TRIGGER set_version_etag BEFORE INSERT OR UPDATE ON public.user_client_access
  FOR EACH ROW EXECUTE FUNCTION public.set_version_etag();

COMMIT;
