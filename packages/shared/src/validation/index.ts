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
// Workforce
// ---------------------------------------------------------------------------
export const staffSchema = z.object({
  staff_code: z.string().regex(/^STF-\d{4,}$/, 'Must be STF-XXXX format'),
  full_name: z.string().min(1, 'Name is required').max(200),
  role: z.string().min(1, 'Role is required'),
  is_subcontractor: z.boolean().default(false),
  pay_rate: z.number().positive().nullable().default(null),
  email: z.string().email().nullable().default(null),
  phone: z.string().nullable().default(null),
});
export type StaffFormData = z.infer<typeof staffSchema>;

// ---------------------------------------------------------------------------
// Inventory & Assets
// ---------------------------------------------------------------------------
export const supplySchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required').max(200),
  category: z.string().nullable().default(null),
  unit: z.string().min(1, 'Unit is required').default('EACH'),
  unit_cost: z.number().positive().nullable().default(null),
  sds_url: z.string().url().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type SupplyFormData = z.infer<typeof supplySchema>;

export const vehicleSchema = z.object({
  vehicle_code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required').max(200),
  make: z.string().nullable().default(null),
  model: z.string().nullable().default(null),
  year: z.number().int().min(1900).max(2100).nullable().default(null),
  license_plate: z.string().nullable().default(null),
  vin: z.string().nullable().default(null),
  color: z.string().nullable().default(null),
  status: z.enum(['ACTIVE', 'IN_SHOP', 'RETIRED']).default('ACTIVE'),
  notes: z.string().nullable().default(null),
});
export type VehicleFormData = z.infer<typeof vehicleSchema>;

export const keySchema = z.object({
  key_code: z.string().min(1, 'Code is required'),
  site_id: z.string().uuid().nullable().default(null),
  key_type: z.enum(['STANDARD', 'FOB', 'CARD', 'CODE', 'OTHER']).default('STANDARD'),
  label: z.string().min(1, 'Label is required'),
  total_count: z.number().int().min(0).default(1),
  status: z.enum(['AVAILABLE', 'ASSIGNED', 'LOST', 'RETURNED']).default('AVAILABLE'),
  notes: z.string().nullable().default(null),
});
export type KeyFormData = z.infer<typeof keySchema>;

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------
export const equipmentSchema = z.object({
  equipment_code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required').max(200),
  equipment_type: z.string().nullable().default(null),
  condition: z.enum(['GOOD', 'FAIR', 'POOR', 'OUT_OF_SERVICE']).default('GOOD'),
  serial_number: z.string().nullable().default(null),
  purchase_date: z.string().nullable().default(null),
  assigned_to: z.string().uuid().nullable().default(null),
  site_id: z.string().uuid().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type EquipmentFormData = z.infer<typeof equipmentSchema>;

export const equipmentAssignmentSchema = z.object({
  equipment_id: z.string().uuid('Equipment is required'),
  staff_id: z.string().uuid().nullable().default(null),
  site_id: z.string().uuid().nullable().default(null),
  assigned_date: z.string().min(1, 'Assigned date is required'),
  returned_date: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type EquipmentAssignmentFormData = z.infer<typeof equipmentAssignmentSchema>;

// ---------------------------------------------------------------------------
// Vehicle Maintenance
// ---------------------------------------------------------------------------
export const vehicleMaintenanceSchema = z.object({
  vehicle_id: z.string().uuid('Vehicle is required'),
  service_date: z.string().min(1, 'Service date is required'),
  service_type: z.string().min(1, 'Service type is required'),
  description: z.string().nullable().default(null),
  cost: z.number().positive().nullable().default(null),
  odometer: z.number().int().positive().nullable().default(null),
  performed_by: z.string().nullable().default(null),
  next_service_date: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type VehicleMaintenanceFormData = z.infer<typeof vehicleMaintenanceSchema>;

// ---------------------------------------------------------------------------
// Supply Orders & Inventory Counts
// ---------------------------------------------------------------------------
export const supplyOrderSchema = z.object({
  order_code: z.string().min(1, 'Code is required'),
  supplier: z.string().nullable().default(null),
  order_date: z.string().min(1, 'Order date is required'),
  expected_delivery: z.string().nullable().default(null),
  status: z.enum(['DRAFT', 'ORDERED', 'SHIPPED', 'RECEIVED', 'CANCELLED']).default('DRAFT'),
  total_amount: z.number().positive().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type SupplyOrderFormData = z.infer<typeof supplyOrderSchema>;

export const inventoryCountSchema = z.object({
  count_code: z.string().min(1, 'Code is required'),
  site_id: z.string().uuid().nullable().default(null),
  counted_by: z.string().uuid().nullable().default(null),
  count_date: z.string().min(1, 'Count date is required'),
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'COMPLETED']).default('DRAFT'),
  notes: z.string().nullable().default(null),
});
export type InventoryCountFormData = z.infer<typeof inventoryCountSchema>;

// ---------------------------------------------------------------------------
// Subcontractors
// ---------------------------------------------------------------------------
export const subcontractorSchema = z.object({
  subcontractor_code: z.string().min(1, 'Code is required'),
  company_name: z.string().min(1, 'Company name is required').max(200),
  contact_name: z.string().nullable().default(null),
  email: z.string().email().nullable().default(null),
  phone: z.string().nullable().default(null),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).default('ACTIVE'),
  services_provided: z.string().nullable().default(null),
  insurance_expiry: z.string().nullable().default(null),
  license_number: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type SubcontractorFormData = z.infer<typeof subcontractorSchema>;

// ---------------------------------------------------------------------------
// Staff Positions
// ---------------------------------------------------------------------------
export const staffPositionSchema = z.object({
  position_code: z.string().min(1, 'Code is required'),
  title: z.string().min(1, 'Title is required').max(200),
  department: z.string().nullable().default(null),
  pay_grade: z.string().nullable().default(null),
  is_active: z.boolean().default(true),
  notes: z.string().nullable().default(null),
});
export type StaffPositionFormData = z.infer<typeof staffPositionSchema>;

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------
export const lookupSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  code: z.string().min(1, 'Code is required'),
  label: z.string().min(1, 'Label is required'),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});
export type LookupFormData = z.infer<typeof lookupSchema>;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginFormData = z.infer<typeof loginSchema>;
