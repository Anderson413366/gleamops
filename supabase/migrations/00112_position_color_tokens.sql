-- ============================================================================
-- Migration 00112: Position Color Tokens
-- Purpose: Add color_token column to staff_positions for schedule grid theming.
-- Allows admin-configurable position colors instead of hardcoded POSITION_THEME.
-- ============================================================================

-- Add color_token column (default 'slate' for uncolored positions)
ALTER TABLE public.staff_positions
  ADD COLUMN IF NOT EXISTS color_token TEXT NOT NULL DEFAULT 'slate';

-- Seed default color tokens for common cleaning position types.
-- Only updates rows where color_token is still the default 'slate' and
-- position_code matches known cleaning types.
UPDATE public.staff_positions SET color_token = 'green'
  WHERE UPPER(position_code) LIKE '%FLOOR%' AND color_token = 'slate';

UPDATE public.staff_positions SET color_token = 'red'
  WHERE UPPER(position_code) LIKE '%RESTROOM%' AND color_token = 'slate';

UPDATE public.staff_positions SET color_token = 'blue'
  WHERE UPPER(position_code) LIKE '%VACUUM%' AND color_token = 'slate';

UPDATE public.staff_positions SET color_token = 'yellow'
  WHERE UPPER(position_code) LIKE '%UTILITY%' AND color_token = 'slate';

UPDATE public.staff_positions SET color_token = 'pink'
  WHERE UPPER(position_code) LIKE '%FULL_CLEANING%' AND color_token = 'slate';

UPDATE public.staff_positions SET color_token = 'purple'
  WHERE UPPER(position_code) LIKE '%OPERATIONS%' AND color_token = 'slate';

UPDATE public.staff_positions SET color_token = 'indigo'
  WHERE UPPER(position_code) LIKE '%OFFICE%' AND color_token = 'slate';

UPDATE public.staff_positions SET color_token = 'orange'
  WHERE UPPER(position_code) LIKE '%SUPERVISOR%' AND color_token = 'slate';

UPDATE public.staff_positions SET color_token = 'gray'
  WHERE UPPER(position_code) LIKE '%PORTER%' AND color_token = 'slate';

COMMENT ON COLUMN public.staff_positions.color_token IS
  'Color token for schedule grid theming. Valid tokens: green, red, blue, yellow, pink, purple, indigo, orange, slate, teal, emerald, amber, cyan, gray';
