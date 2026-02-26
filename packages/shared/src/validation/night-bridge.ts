import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const NIGHT_BRIDGE_REVIEW_STATUSES = ['PENDING', 'REVIEWED', 'NEEDS_FOLLOWUP'] as const;
export const NIGHT_BRIDGE_REVIEW_ACTION_STATUSES = ['REVIEWED', 'NEEDS_FOLLOWUP'] as const;

export const nightBridgeListQuerySchema = z.object({
  date: isoDate.optional(),
  status: z.enum(NIGHT_BRIDGE_REVIEW_STATUSES).optional(),
});

export const nightBridgeAddToTomorrowSchema = z.object({
  site_id: z.string().uuid(),
  description: z.string().min(1).max(500),
  evidence_required: z.boolean().default(false),
});

export const nightBridgeReviewSchema = z.object({
  shift_review_status: z.enum(NIGHT_BRIDGE_REVIEW_ACTION_STATUSES),
  reviewer_notes: z.string().max(2000).nullable().optional(),
  add_to_tomorrow: nightBridgeAddToTomorrowSchema.nullable().optional(),
});

export type NightBridgeListQueryInput = z.infer<typeof nightBridgeListQuerySchema>;
export type NightBridgeReviewInputSchema = z.infer<typeof nightBridgeReviewSchema>;
