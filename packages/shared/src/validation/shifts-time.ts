import { z } from 'zod';

const uuidOrNull = z.union([z.string().uuid(), z.null()]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const routeStopActionSchema = z.object({
  note: z.string().max(2000).nullable().optional(),
});

export const captureTravelSegmentSchema = z.object({
  route_id: z.string().uuid(),
  from_stop_id: z.string().uuid(),
  to_stop_id: z.string().uuid(),
  travel_end_at: z.string().datetime({ offset: true }).optional(),
});

export const CALLOUT_REASONS = [
  'SICK',
  'PERSONAL',
  'EMERGENCY',
  'NO_SHOW',
  'WEATHER',
  'TRANSPORT',
  'OTHER',
] as const;

export const reportCalloutSchema = z.object({
  affected_staff_id: z.string().uuid(),
  reason: z.enum(CALLOUT_REASONS),
  route_id: uuidOrNull.optional(),
  route_stop_id: uuidOrNull.optional(),
  work_ticket_id: uuidOrNull.optional(),
  site_id: uuidOrNull.optional(),
  resolution_note: z.string().max(2000).nullable().optional(),
});

export const offerCoverageSchema = z.object({
  callout_event_id: z.string().uuid(),
  candidate_staff_id: z.string().uuid(),
  expires_in_minutes: z.number().int().min(1).max(1440).default(30),
});

export const acceptCoverageSchema = z.object({
  response_note: z.string().max(2000).nullable().optional(),
});

/** Allowed source_field values for payroll export mapping fields. */
export const PAYROLL_SOURCE_FIELDS = [
  'staff_code',
  'full_name',
  'employee_id',
  'regular_hours',
  'overtime_hours',
  'double_time_hours',
  'total_hours',
  'pto_hours',
  'sick_hours',
  'vacation_hours',
  'holiday_hours',
  'on_call_hours',
  'travel_hours',
  'break_hours',
  'pay_rate',
  'gross_pay',
  'shift_date',
  'period_start',
  'period_end',
  'site_code',
  'site_name',
  'job_code',
  'position_code',
  'department',
  'clock_in_time',
  'clock_out_time',
] as const;

export type PayrollSourceField = (typeof PAYROLL_SOURCE_FIELDS)[number];

export const payrollExportPreviewSchema = z.object({
  mapping_id: z.string().uuid(),
  period_start: isoDate,
  period_end: isoDate,
}).refine((value) => value.period_start <= value.period_end, {
  message: 'period_start must be before or equal to period_end',
  path: ['period_start'],
});

export const payrollExportFinalizeSchema = z.object({
  run_id: z.string().uuid(),
  exported_file_path: z.string().max(2000).nullable().optional(),
  exported_file_checksum: z.string().max(512).nullable().optional(),
});

export type RouteStopActionInput = z.infer<typeof routeStopActionSchema>;
export type CaptureTravelSegmentInput = z.infer<typeof captureTravelSegmentSchema>;
export type ReportCalloutInput = z.infer<typeof reportCalloutSchema>;
export type OfferCoverageInput = z.infer<typeof offerCoverageSchema>;
export type AcceptCoverageInput = z.infer<typeof acceptCoverageSchema>;
export type PayrollExportPreviewInput = z.infer<typeof payrollExportPreviewSchema>;
export type PayrollExportFinalizeInput = z.infer<typeof payrollExportFinalizeSchema>;
