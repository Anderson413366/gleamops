/**
 * Zod schemas for GleamOps entities.
 * Used for form validation (web) and API input validation (server).
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// CRM
// ---------------------------------------------------------------------------
export const clientSchema = z.object({
  client_code: z.string().regex(/^CLI-\d{4,}$/, 'Must be CLI-XXXX format'),
  name: z.string().min(1, 'Name is required').max(200),
  status: z.string().default('Active'),
  billing_address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).nullable().default(null),
});
export type ClientFormData = z.infer<typeof clientSchema>;

export const siteSchema = z.object({
  site_code: z.string().regex(/^SIT-\d{4,}$/, 'Must be SIT-XXXX format'),
  client_id: z.string().uuid('Client is required'),
  name: z.string().min(1, 'Name is required').max(200),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).nullable().default(null),
  alarm_code: z.string().nullable().default(null),
  access_notes: z.string().nullable().default(null),
  square_footage: z.number().positive().nullable().default(null),
  geofence_center_lat: z.number().min(-90).max(90).nullable().default(null),
  geofence_center_lng: z.number().min(-180).max(180).nullable().default(null),
  geofence_radius_meters: z.number().min(1).default(50),
  notes: z.string().nullable().default(null),
});
export type SiteFormData = z.infer<typeof siteSchema>;

export const contactSchema = z.object({
  contact_code: z.string().regex(/^CON-\d{4,}$/, 'Must be CON-XXXX format'),
  client_id: z.string().uuid().nullable().default(null),
  site_id: z.string().uuid().nullable().default(null),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().nullable().default(null),
  phone: z.string().nullable().default(null),
  role: z.string().nullable().default(null),
  is_primary: z.boolean().default(false),
  timezone: z.string().nullable().default(null),
});
export type ContactFormData = z.infer<typeof contactSchema>;

// ---------------------------------------------------------------------------
// Service DNA
// ---------------------------------------------------------------------------
export const taskSchema = z.object({
  task_code: z.string().regex(/^TSK-\d{3,}$/, 'Must be TSK-XXX format'),
  name: z.string().min(1, 'Name is required'),
  production_rate_sqft_per_hour: z.number().positive().nullable().default(null),
  category: z.string().nullable().default(null),
  unit_code: z.enum(['SQFT_1000', 'EACH']).default('SQFT_1000'),
});
export type TaskFormData = z.infer<typeof taskSchema>;

export const serviceSchema = z.object({
  service_code: z.string().regex(/^SER-\d{4,}$/, 'Must be SER-XXXX format'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().default(null),
});
export type ServiceFormData = z.infer<typeof serviceSchema>;

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------
export const prospectSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  prospect_status_code: z.string().default('NEW'),
  owner_user_id: z.string().uuid().nullable().default(null),
  notes: z.string().nullable().default(null),
  source: z.string().nullable().default(null),
  contacts: z.array(z.object({
    contact_name: z.string().min(1, 'Contact name is required'),
    email: z.string().email().nullable().default(null),
    phone: z.string().nullable().default(null),
    is_primary: z.boolean().default(false),
  })).default([]),
});
export type ProspectFormData = z.infer<typeof prospectSchema>;

export const bidSchema = z.object({
  bid_code: z.string().regex(/^BID-\d{6}$/, 'Must be BID-XXXXXX format'),
  client_id: z.string().uuid('Client is required'),
  service_id: z.string().uuid().nullable().default(null),
  opportunity_id: z.string().uuid().nullable().default(null),
  status: z.string().default('DRAFT'),
  total_sqft: z.number().positive().nullable().default(null),
  target_margin_percent: z.number().min(-50).max(100).nullable().default(null),
});
export type BidFormData = z.infer<typeof bidSchema>;

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------
export const convertBidSchema = z.object({
  bid_version_id: z.string().uuid(),
  conversion_mode: z.enum(['FULL', 'DRY_RUN']).default('FULL'),
});
export type ConvertBidInput = z.infer<typeof convertBidSchema>;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginFormData = z.infer<typeof loginSchema>;
