import { z } from 'zod';

export const FIELD_REPORT_TYPES = ['SUPPLY_REQUEST', 'MAINTENANCE', 'DAY_OFF', 'INCIDENT', 'GENERAL'] as const;
export const FIELD_REPORT_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export const FIELD_REPORT_STATUSES = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const fieldReportRequestedItemSchema = z.object({
  supply_id: z.string().uuid(),
  qty: z.number().int().min(1),
});

export const fieldReportCreateSchema = z.object({
  report_type: z.enum(FIELD_REPORT_TYPES),
  site_id: z.string().uuid().nullable().optional(),
  description: z.string().min(1).max(4000),
  priority: z.enum(FIELD_REPORT_PRIORITIES).default('NORMAL'),
  photos: z.array(z.string().min(1).max(2000)).nullable().optional(),
  requested_items: z.array(fieldReportRequestedItemSchema).nullable().optional(),
  requested_date: isoDate.nullable().optional(),
});

export const fieldReportUpdateSchema = z.object({
  status: z.enum(FIELD_REPORT_STATUSES).optional(),
  priority: z.enum(FIELD_REPORT_PRIORITIES).optional(),
  resolution_notes: z.string().max(4000).nullable().optional(),
  requested_date: isoDate.nullable().optional(),
  requested_items: z.array(fieldReportRequestedItemSchema).nullable().optional(),
  photos: z.array(z.string().min(1).max(2000)).nullable().optional(),
  version_etag: z.string().uuid(),
}).refine((value) => Object.keys(value).some((key) => key !== 'version_etag'), {
  message: 'At least one field is required',
});

export const fieldReportListQuerySchema = z.object({
  report_type: z.enum(FIELD_REPORT_TYPES).optional(),
  status: z.enum(FIELD_REPORT_STATUSES).optional(),
  site_id: z.string().uuid().optional(),
});

export type FieldReportCreateSchemaInput = z.infer<typeof fieldReportCreateSchema>;
export type FieldReportUpdateSchemaInput = z.infer<typeof fieldReportUpdateSchema>;
export type FieldReportListQuerySchemaInput = z.infer<typeof fieldReportListQuerySchema>;

