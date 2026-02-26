import { z } from 'zod';

export const COMPLAINT_REPORTED_BY_TYPES = ['CUSTOMER', 'SPECIALIST', 'FLOATER', 'MANAGER', 'SYSTEM'] as const;
export const COMPLAINT_SOURCES = ['EMAIL', 'PHONE', 'APP', 'PORTAL', 'IN_PERSON'] as const;
export const COMPLAINT_CATEGORIES = [
  'CLEANING_QUALITY',
  'MISSED_SERVICE',
  'SUPPLY_ISSUE',
  'DAMAGE',
  'BEHAVIOR',
  'SAFETY',
  'OTHER',
] as const;
export const COMPLAINT_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT_SAME_NIGHT'] as const;
export const COMPLAINT_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED', 'CLOSED'] as const;

export const complaintCreateSchema = z.object({
  site_id: z.string().uuid(),
  reported_by_type: z.enum(COMPLAINT_REPORTED_BY_TYPES),
  reported_by_staff_id: z.string().uuid().nullable().optional(),
  reported_by_name: z.string().max(200).nullable().optional(),
  source: z.enum(COMPLAINT_SOURCES),
  customer_original_message: z.string().max(4000).nullable().optional(),
  category: z.enum(COMPLAINT_CATEGORIES),
  priority: z.enum(COMPLAINT_PRIORITIES),
  assigned_to_staff_id: z.string().uuid().nullable().optional(),
});

export const complaintUpdateSchema = z.object({
  status: z.enum(COMPLAINT_STATUSES).optional(),
  priority: z.enum(COMPLAINT_PRIORITIES).optional(),
  category: z.enum(COMPLAINT_CATEGORIES).optional(),
  assigned_to_staff_id: z.string().uuid().nullable().optional(),
  customer_original_message: z.string().max(4000).nullable().optional(),
  version_etag: z.string().uuid(),
}).refine((value) => Object.keys(value).some((key) => key !== 'version_etag'), {
  message: 'At least one field is required',
});

export const complaintResolveSchema = z.object({
  resolution_description: z.string().min(1).max(4000),
  reviewer_notes: z.string().max(2000).nullable().optional(),
});

export const complaintInjectRouteSchema = z.object({
  description: z.string().min(1).max(500),
  evidence_required: z.boolean().default(true),
});

export const complaintSendResolutionSchema = z.object({
  subject: z.string().max(250).nullable().optional(),
  message: z.string().max(8000).nullable().optional(),
});

export const complaintPhotoSchema = z.object({
  photo_url: z.string().min(1).max(2000),
});

export const complaintListQuerySchema = z.object({
  status: z.enum(COMPLAINT_STATUSES).optional(),
  priority: z.enum(COMPLAINT_PRIORITIES).optional(),
  site_id: z.string().uuid().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type ComplaintCreateSchemaInput = z.infer<typeof complaintCreateSchema>;
export type ComplaintUpdateSchemaInput = z.infer<typeof complaintUpdateSchema>;
export type ComplaintResolveSchemaInput = z.infer<typeof complaintResolveSchema>;
export type ComplaintInjectRouteSchemaInput = z.infer<typeof complaintInjectRouteSchema>;
export type ComplaintSendResolutionSchemaInput = z.infer<typeof complaintSendResolutionSchema>;
export type ComplaintPhotoSchemaInput = z.infer<typeof complaintPhotoSchema>;
export type ComplaintListQuerySchemaInput = z.infer<typeof complaintListQuerySchema>;
