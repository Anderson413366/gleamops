import { z } from 'zod';
import { ROUTE_TASK_TYPES } from './route-template';

export const PERIODIC_FREQUENCIES = ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM'] as const;
export const PERIODIC_STATUSES = ['ACTIVE', 'PAUSED', 'ARCHIVED'] as const;
export const PERIODIC_SCOPE = ['ALL', 'OVERDUE', 'DUE_SOON'] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const periodicBaseSchema = z.object({
  site_job_id: z.string().uuid(),
  task_type: z.enum(ROUTE_TASK_TYPES),
  description_key: z.string().max(200).nullable().optional(),
  description_override: z.string().max(500).nullable().optional(),
  frequency: z.enum(PERIODIC_FREQUENCIES),
  custom_interval_days: z.number().int().positive().nullable().optional(),
  next_due_date: isoDate,
  auto_add_to_route: z.boolean().default(true),
  preferred_staff_id: z.string().uuid().nullable().optional(),
  evidence_required: z.boolean().default(false),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(PERIODIC_STATUSES).optional(),
});

export const periodicTaskCreateSchema = periodicBaseSchema.refine((value) => {
  if (value.frequency === 'CUSTOM') {
    return (value.custom_interval_days ?? 0) > 0;
  }
  return value.custom_interval_days == null;
}, {
  message: 'Custom interval days is required only for CUSTOM frequency.',
  path: ['custom_interval_days'],
});

export const periodicTaskUpdateSchema = periodicBaseSchema
  .partial()
  .extend({
    version_etag: z.string().uuid(),
  })
  .refine((value) => Object.keys(value).some((key) => key !== 'version_etag'), {
    message: 'At least one field is required',
  })
  .refine((value) => {
    if (!value.frequency) return true;
    if (value.frequency === 'CUSTOM') {
      return (value.custom_interval_days ?? 0) > 0;
    }
    return value.custom_interval_days == null;
  }, {
    message: 'Custom interval days is required only for CUSTOM frequency.',
    path: ['custom_interval_days'],
  });

export const periodicTaskCompleteSchema = z.object({
  completed_at: z.string().datetime().nullable().optional(),
  route_id: z.string().uuid().nullable().optional(),
});

export const periodicTaskArchiveSchema = z.object({
  reason: z.string().max(500).nullable().optional(),
});

export const periodicTaskListQuerySchema = z.object({
  status: z.enum(PERIODIC_STATUSES).optional(),
  scope: z.enum(PERIODIC_SCOPE).optional(),
});

export type PeriodicTaskCreateSchemaInput = z.infer<typeof periodicTaskCreateSchema>;
export type PeriodicTaskUpdateSchemaInput = z.infer<typeof periodicTaskUpdateSchema>;
export type PeriodicTaskCompleteSchemaInput = z.infer<typeof periodicTaskCompleteSchema>;
export type PeriodicTaskArchiveSchemaInput = z.infer<typeof periodicTaskArchiveSchema>;
export type PeriodicTaskListQuerySchemaInput = z.infer<typeof periodicTaskListQuerySchema>;

