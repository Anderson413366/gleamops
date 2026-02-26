import { z } from 'zod';

export const ROUTE_TASK_TYPES = [
  'DELIVER_PICKUP',
  'FULL_CLEAN',
  'LIGHT_CLEAN',
  'VACUUM_MOP_TRASH',
  'INSPECTION',
  'INVENTORY',
  'SUPPLY_REFILL',
  'RESTROOM_CLEAN',
  'FLOOR_SCRUB',
  'TRAINING',
  'CUSTOM',
] as const;

export const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
export const STOP_STATUSES = ['PENDING', 'ARRIVED', 'COMPLETED', 'SKIPPED'] as const;
export const SKIP_REASONS = ['SITE_CLOSED', 'ACCESS_ISSUE', 'TIME_CONSTRAINT', 'OTHER'] as const;
export const SHIFT_REVIEW_STATUSES = ['PENDING', 'REVIEWED', 'NEEDS_FOLLOWUP'] as const;

const uuidOrNull = z.union([z.string().uuid(), z.null()]);
const hhMmOrNull = z.union([z.string().regex(/^\d{2}:\d{2}$/), z.null()]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const routeTemplateSchema = z.object({
  label: z.string().min(1).max(200),
  weekday: z.enum(WEEKDAYS),
  assigned_staff_id: uuidOrNull,
  default_vehicle_id: uuidOrNull,
  default_key_box: z.string().max(20).nullable(),
  is_active: z.boolean().default(true),
  notes: z.string().max(2000).nullable(),
});

export const routeTemplatePatchSchema = routeTemplateSchema
  .partial()
  .extend({ version_etag: z.string().uuid() })
  .refine((value) => Object.keys(value).some((key) => key !== 'version_etag'), {
    message: 'At least one field is required',
  });

export const routeTemplateStopSchema = z.object({
  template_id: z.string().uuid(),
  site_job_id: z.string().uuid(),
  stop_order: z.number().int().min(1),
  access_window_start: hhMmOrNull,
  access_window_end: hhMmOrNull,
  notes: z.string().max(2000).nullable(),
});

export const routeTemplateStopPatchSchema = routeTemplateStopSchema
  .omit({ template_id: true })
  .partial()
  .extend({ version_etag: z.string().uuid() })
  .refine((value) => Object.keys(value).some((key) => key !== 'version_etag'), {
    message: 'At least one field is required',
  });

export const deliveryItemSchema = z.object({
  supply_id: z.string().uuid(),
  quantity: z.number().int().min(1),
  direction: z.enum(['deliver', 'pickup']),
});

export const routeTemplateTaskSchema = z.object({
  template_stop_id: z.string().uuid(),
  task_type: z.enum(ROUTE_TASK_TYPES),
  description_key: z.string().nullable(),
  description_override: z.string().max(500).nullable(),
  task_order: z.number().int().min(1),
  evidence_required: z.boolean().default(false),
  delivery_items: z.array(deliveryItemSchema).nullable(),
});

export const routeTemplateTaskPatchSchema = routeTemplateTaskSchema
  .omit({ template_stop_id: true })
  .partial()
  .extend({ version_etag: z.string().uuid() })
  .refine((value) => Object.keys(value).some((key) => key !== 'version_etag'), {
    message: 'At least one field is required',
  });

export const generateRoutesSchema = z.object({
  target_date: isoDate,
});

export const startShiftSchema = z.object({
  mileage_start: z.number().int().min(0),
  vehicle_id: z.string().uuid(),
  key_box_number: z.string().max(20).nullable(),
});

export const endShiftSchema = z.object({
  mileage_end: z.number().int().min(0),
  vehicle_cleaned: z.boolean(),
  personal_items_removed: z.boolean(),
  floater_notes: z.string().max(2000).nullable(),
});

export const skipStopSchema = z.object({
  skip_reason: z.enum(SKIP_REASONS),
  skip_notes: z.string().max(500).nullable(),
});

export const completeTaskSchema = z.object({
  notes: z.string().max(2000).nullable().optional(),
});

export const uploadTaskPhotoSchema = z.object({
  photo_url: z.string().min(1).max(2000),
});

export const routeTaskDescriptionSchema = z.object({
  description: z.string().min(1).max(500),
  evidence_required: z.boolean().default(false),
  task_order: z.number().int().min(1).optional(),
});

export type RouteTemplateInput = z.infer<typeof routeTemplateSchema>;
export type RouteTemplatePatchInput = z.infer<typeof routeTemplatePatchSchema>;
export type RouteTemplateStopInput = z.infer<typeof routeTemplateStopSchema>;
export type RouteTemplateStopPatchInput = z.infer<typeof routeTemplateStopPatchSchema>;
export type RouteTemplateTaskInput = z.infer<typeof routeTemplateTaskSchema>;
export type RouteTemplateTaskPatchInput = z.infer<typeof routeTemplateTaskPatchSchema>;
export type GenerateRoutesInput = z.infer<typeof generateRoutesSchema>;
export type StartShiftInput = z.infer<typeof startShiftSchema>;
export type EndShiftInput = z.infer<typeof endShiftSchema>;
export type SkipStopInput = z.infer<typeof skipStopSchema>;
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;
export type UploadTaskPhotoInput = z.infer<typeof uploadTaskPhotoSchema>;
export type RouteTaskDescriptionInput = z.infer<typeof routeTaskDescriptionSchema>;
