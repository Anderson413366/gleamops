import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const ownerDashboardQuerySchema = z.object({
  date_from: isoDate.optional(),
  date_to: isoDate.optional(),
});

export const supplyCostsQuerySchema = z.object({
  date_from: isoDate.optional(),
  date_to: isoDate.optional(),
  site_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const microfiberEnrollSchema = z.object({
  enrolled_at: isoDate.optional(),
  microfiber_rate_per_set: z.coerce.number().min(0).max(999.99).optional(),
});

export const microfiberExitSchema = z.object({
  exited_at: isoDate.optional(),
});

export const microfiberLogCreateSchema = z.object({
  staff_id: z.string().uuid(),
  site_id: z.string().uuid(),
  wash_date: isoDate,
  sets_washed: z.coerce.number().int().min(0).default(1),
  payroll_period_start: isoDate.optional().nullable(),
  payroll_period_end: isoDate.optional().nullable(),
});

export type OwnerDashboardQuerySchemaInput = z.infer<typeof ownerDashboardQuerySchema>;
export type SupplyCostsQuerySchemaInput = z.infer<typeof supplyCostsQuerySchema>;
export type MicrofiberEnrollSchemaInput = z.infer<typeof microfiberEnrollSchema>;
export type MicrofiberExitSchemaInput = z.infer<typeof microfiberExitSchema>;
export type MicrofiberLogCreateSchemaInput = z.infer<typeof microfiberLogCreateSchema>;
