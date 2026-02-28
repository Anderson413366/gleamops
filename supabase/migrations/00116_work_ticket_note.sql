-- ============================================================================
-- Migration 00116: Work Ticket Note
-- Purpose: Add note field to work_tickets for shift-level comments/instructions.
-- ============================================================================

ALTER TABLE public.work_tickets
  ADD COLUMN IF NOT EXISTS note TEXT;

COMMENT ON COLUMN public.work_tickets.note IS
  'Optional shift-level note or instruction visible in schedule views.';
