import { z } from 'zod';
import { COMPLAINT_CATEGORIES, COMPLAINT_PRIORITIES } from './complaint';

export const CUSTOMER_PORTAL_FEEDBACK_TYPES = ['COMPLAINT', 'KUDOS', 'SUGGESTION', 'QUESTION'] as const;
export const CUSTOMER_PORTAL_FEEDBACK_STATUSES = ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export const CUSTOMER_PORTAL_SUBMITTED_VIA = ['PORTAL', 'EMAIL', 'PHONE', 'IN_PERSON'] as const;

export const customerPortalAuthSchema = z.object({
  token: z.string().min(12).max(200),
});

export const customerPortalSessionCreateSchema = z.object({
  client_id: z.string().uuid(),
  expires_in_days: z.number().int().min(1).max(90).default(30),
});

export const customerPortalFeedbackSchema = z.object({
  feedback_type: z.enum(CUSTOMER_PORTAL_FEEDBACK_TYPES),
  site_id: z.string().uuid().nullable().optional(),
  category: z.enum(COMPLAINT_CATEGORIES).nullable().optional(),
  priority: z.enum(COMPLAINT_PRIORITIES).nullable().optional(),
  contact_name: z.string().max(200).nullable().optional(),
  contact_email: z.string().email().max(320).nullable().optional(),
  message: z.string().min(1).max(4000),
  photos: z.array(z.string().url().max(2000)).max(10).nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.feedback_type === 'COMPLAINT') {
    if (!value.site_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['site_id'],
        message: 'site_id is required for complaint feedback.',
      });
    }
    if (!value.category) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['category'],
        message: 'category is required for complaint feedback.',
      });
    }
  }
});

export const customerPortalSessionsQuerySchema = z.object({
  client_id: z.string().uuid().optional(),
  include_inactive: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((value) => (typeof value === 'string' ? value === 'true' : value ?? false)),
});

export type CustomerPortalAuthSchemaInput = z.infer<typeof customerPortalAuthSchema>;
export type CustomerPortalSessionCreateSchemaInput = z.infer<typeof customerPortalSessionCreateSchema>;
export type CustomerPortalFeedbackSchemaInput = z.infer<typeof customerPortalFeedbackSchema>;
export type CustomerPortalSessionsQuerySchemaInput = z.infer<typeof customerPortalSessionsQuerySchema>;
