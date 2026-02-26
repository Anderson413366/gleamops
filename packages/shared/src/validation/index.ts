/**
 * Zod schemas for GleamOps entities.
 * Used for form validation (web) and API input validation (server).
 */
import { z } from 'zod';
export * from './route-template';
export * from './load-sheet';
export * from './night-bridge';
export * from './complaint';
export * from './periodic-task';
export * from './field-report';
export * from './customer-portal';
export * from './owner-dashboard';

// ---------------------------------------------------------------------------
// CRM
// ---------------------------------------------------------------------------
export const clientSchema = z.object({
  client_code: z.string().regex(/^CLI-\d{4,}$/, 'Must be CLI-XXXX format'),
  name: z.string().min(1, 'Name is required').max(200),
  status: z.string().default('PROSPECT'),
  client_type: z.string().nullable().default(null),
  industry: z.string().nullable().default(null),
  website: z.string().nullable().default(null),
  // Billing
  bill_to_name: z.string().nullable().default(null),
  billing_address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).nullable().default(null),
  payment_terms: z.string().nullable().default(null),
  po_required: z.boolean().default(false),
  invoice_frequency: z.string().nullable().default(null),
  credit_limit: z.number().positive().nullable().default(null),
  tax_id: z.string().nullable().default(null),
  // Contract & Insurance
  contract_start_date: z.string().nullable().default(null),
  contract_end_date: z.string().nullable().default(null),
  auto_renewal: z.boolean().default(false),
  insurance_required: z.boolean().default(false),
  insurance_expiry: z.string().nullable().default(null),
  // Notes
  notes: z.string().nullable().default(null),
});
export type ClientFormData = z.infer<typeof clientSchema>;

export const siteSchema = z.object({
  site_code: z.string().regex(/^SIT-\d{4,}$/, 'Must be SIT-XXXX format'),
  client_id: z.string().uuid('Client is required'),
  name: z.string().min(1, 'Name is required').max(200),
  status: z.string().default('ACTIVE'),
  // Address & Facility
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).nullable().default(null),
  square_footage: z.number().positive().nullable().default(null),
  number_of_floors: z.number().int().positive().nullable().default(null),
  employees_on_site: z.number().int().positive().nullable().default(null),
  // Access & Security
  alarm_code: z.string().nullable().default(null),
  alarm_system: z.string().nullable().default(null),
  security_protocol: z.string().nullable().default(null),
  entry_instructions: z.string().nullable().default(null),
  parking_instructions: z.string().nullable().default(null),
  access_notes: z.string().nullable().default(null),
  // Service Window & Compliance
  earliest_start_time: z.string().nullable().default(null),
  latest_start_time: z.string().nullable().default(null),
  weekend_access: z.boolean().default(false),
  osha_compliance_required: z.boolean().default(false),
  background_check_required: z.boolean().default(false),
  // Facility Details
  janitorial_closet_location: z.string().nullable().default(null),
  supply_storage_location: z.string().nullable().default(null),
  water_source_location: z.string().nullable().default(null),
  dumpster_location: z.string().nullable().default(null),
  risk_level: z.string().nullable().default(null),
  priority_level: z.string().nullable().default(null),
  // Geofence
  geofence_center_lat: z.number().min(-90).max(90).nullable().default(null),
  geofence_center_lng: z.number().min(-180).max(180).nullable().default(null),
  geofence_radius_meters: z.number().min(1).default(50),
  photo_url: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type SiteFormData = z.infer<typeof siteSchema>;

export const contactSchema = z.object({
  contact_code: z.string().regex(/^CON-\d{4,}$/, 'Must be CON-XXXX format'),
  client_id: z.string().uuid().nullable().default(null),
  site_id: z.string().uuid().nullable().default(null),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  name: z.string().optional(), // Computed: first_name + last_name
  contact_type: z.string().nullable().default(null),
  company_name: z.string().nullable().default(null),
  role_title: z.string().nullable().default(null),
  email: z.string().email().nullable().default(null),
  phone: z.string().nullable().default(null),
  mobile_phone: z.string().nullable().default(null),
  work_phone: z.string().nullable().default(null),
  role: z.string().nullable().default(null),
  preferred_contact_method: z.string().nullable().default(null),
  preferred_language: z.string().nullable().default(null),
  is_primary: z.boolean().default(false),
  timezone: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type ContactFormData = z.infer<typeof contactSchema>;

// ---------------------------------------------------------------------------
// Service DNA
// ---------------------------------------------------------------------------
export const taskSchema = z.object({
  task_code: z.string().regex(/^[A-Z0-9-]{3,20}$/, 'Use 3-20 uppercase letters, numbers, or hyphen'),
  code: z.string().nullable().optional(),
  name: z.string().min(1, 'Name is required'),
  production_rate_sqft_per_hour: z.number().positive().nullable().default(null),
  production_rate: z.string().nullable().default(null),
  category: z.string().nullable().default(null),
  subcategory: z.string().nullable().default(null),
  area_type: z.string().nullable().default(null),
  floor_type: z.string().nullable().default(null),
  priority: z.enum(['high', 'medium', 'low']).nullable().optional(),
  priority_level: z.string().nullable().default(null),
  default_minutes: z.number().positive().nullable().default(null),
  unit_code: z.enum(['SQFT_1000', 'EACH']).default('SQFT_1000'),
  description: z.string().nullable().default(null),
  instructions: z.string().nullable().default(null),
  spec_description: z.string().nullable().default(null),
  work_description: z.string().nullable().default(null),
  tools_materials: z.string().nullable().default(null),
  is_active: z.boolean().default(true),
  notes: z.string().nullable().default(null),
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
  industry_type: z.string().nullable().default(null),
  website: z.string().url().nullable().default(null),
  facility_type: z.string().nullable().default(null),
  estimated_square_footage: z.number().positive().nullable().default(null),
  primary_contact_name: z.string().nullable().default(null),
  primary_contact_phone: z.string().nullable().default(null),
  primary_contact_email: z.string().email().nullable().default(null),
  primary_contact_role_title: z.string().nullable().default(null),
  best_time_to_call: z.string().nullable().default(null),
  preferred_contact_method: z.string().nullable().default(null),
  estimated_monthly_value: z.number().positive().nullable().default(null),
  target_follow_up_date: z.string().nullable().default(null),
  priority_level: z.string().nullable().default(null),
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
  first_name: z.string().nullable().default(null),
  last_name: z.string().nullable().default(null),
  preferred_name: z.string().nullable().default(null),
  date_of_birth: z.string().nullable().default(null),
  role: z.string().min(1, 'Role is required'),
  staff_status: z.string().default('ACTIVE'),
  // Employment
  employment_type: z.string().nullable().default(null),
  is_subcontractor: z.boolean().default(false),
  hire_date: z.string().nullable().default(null),
  pay_rate: z.number().positive().nullable().default(null),
  pay_type: z.string().nullable().default(null),
  schedule_type: z.string().nullable().default(null),
  supervisor_id: z.string().uuid().nullable().default(null),
  // Contact
  email: z.string().email().nullable().default(null),
  phone: z.string().nullable().default(null),
  mobile_phone: z.string().nullable().default(null),
  // Emergency
  emergency_contact_name: z.string().nullable().default(null),
  emergency_contact_phone: z.string().nullable().default(null),
  emergency_contact_relationship: z.string().nullable().default(null),
  // Address
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  }).nullable().default(null),
  // HR
  certifications: z.string().nullable().default(null),
  background_check_date: z.string().nullable().default(null),
  photo_url: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type StaffFormData = z.infer<typeof staffSchema>;

export const hrPtoRequestSchema = z.object({
  staff_id: z.string().uuid('Staff is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  hours_requested: z.number().min(0),
  reason: z.string().nullable().default(null),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELED']).default('PENDING'),
  notes: z.string().nullable().default(null),
}).refine((value) => new Date(value.end_date).getTime() >= new Date(value.start_date).getTime(), {
  message: 'End date must be on or after start date',
  path: ['end_date'],
});
export type HrPtoRequestFormData = z.infer<typeof hrPtoRequestSchema>;

export const hrPerformanceReviewSchema = z.object({
  staff_id: z.string().uuid('Staff is required'),
  reviewer_staff_id: z.string().uuid().nullable().default(null),
  review_period_start: z.string().nullable().default(null),
  review_period_end: z.string().nullable().default(null),
  overall_score: z.number().min(0).max(5).nullable().default(null),
  summary: z.string().nullable().default(null),
  strengths: z.string().nullable().default(null),
  development_areas: z.string().nullable().default(null),
  status: z.enum(['DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'CLOSED']).default('DRAFT'),
  reviewed_at: z.string().nullable().default(null),
  acknowledged_at: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type HrPerformanceReviewFormData = z.infer<typeof hrPerformanceReviewSchema>;

export const hrGoalSchema = z.object({
  staff_id: z.string().uuid('Staff is required'),
  title: z.string().min(1, 'Title is required').max(240),
  description: z.string().nullable().default(null),
  target_date: z.string().nullable().default(null),
  status: z.enum(['ACTIVE', 'ON_TRACK', 'AT_RISK', 'COMPLETED', 'CANCELED']).default('ACTIVE'),
  progress_pct: z.number().min(0).max(100).default(0),
  notes: z.string().nullable().default(null),
});
export type HrGoalFormData = z.infer<typeof hrGoalSchema>;

export const hrBadgeSchema = z.object({
  badge_code: z.string().max(60).nullable().default(null),
  name: z.string().min(1, 'Badge name is required').max(160),
  description: z.string().nullable().default(null),
  color: z.string().max(32).nullable().default(null),
  is_active: z.boolean().default(true),
});
export type HrBadgeFormData = z.infer<typeof hrBadgeSchema>;

export const hrStaffBadgeSchema = z.object({
  staff_id: z.string().uuid('Staff is required'),
  badge_id: z.string().uuid('Badge is required'),
  awarded_at: z.string().datetime().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type HrStaffBadgeFormData = z.infer<typeof hrStaffBadgeSchema>;

export const hrStaffDocumentSchema = z.object({
  staff_id: z.string().uuid('Staff is required'),
  file_id: z.string().uuid('File is required'),
  document_type: z.string().min(1, 'Document type is required').max(160),
  expires_on: z.string().nullable().default(null),
  status: z.enum(['ACTIVE', 'EXPIRING', 'EXPIRED', 'REVOKED']).default('ACTIVE'),
  notes: z.string().nullable().default(null),
});
export type HrStaffDocumentFormData = z.infer<typeof hrStaffDocumentSchema>;

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------
export const schedulePeriodSchema = z.object({
  site_id: z.string().uuid().nullable().default(null),
  period_name: z.string().max(200).nullable().default(null),
  period_start: z.string().min(1, 'Period start is required'),
  period_end: z.string().min(1, 'Period end is required'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'LOCKED', 'ARCHIVED']).default('DRAFT'),
}).refine((value) => new Date(value.period_end).getTime() >= new Date(value.period_start).getTime(), {
  message: 'Period end must be on or after period start',
  path: ['period_end'],
});
export type SchedulePeriodFormData = z.infer<typeof schedulePeriodSchema>;

export const staffAvailabilityRuleSchema = z.object({
  staff_id: z.string().uuid('Staff is required'),
  rule_type: z.enum(['WEEKLY_RECURRING', 'ONE_OFF']),
  availability_type: z.enum(['AVAILABLE', 'UNAVAILABLE', 'PREFERRED']),
  weekday: z.number().int().min(0).max(6).nullable().default(null),
  start_time: z.string().nullable().default(null),
  end_time: z.string().nullable().default(null),
  one_off_start: z.string().nullable().default(null),
  one_off_end: z.string().nullable().default(null),
  valid_from: z.string().nullable().default(null),
  valid_to: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
}).superRefine((value, ctx) => {
  if (value.rule_type === 'WEEKLY_RECURRING') {
    if (value.weekday === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Weekday is required for recurring rules', path: ['weekday'] });
    }
    if (!value.start_time || !value.end_time) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Start and end times are required for recurring rules', path: ['start_time'] });
    }
  }
  if (value.rule_type === 'ONE_OFF') {
    if (!value.one_off_start || !value.one_off_end) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'One-off start and end are required', path: ['one_off_start'] });
    }
  }
});
export type StaffAvailabilityRuleFormData = z.infer<typeof staffAvailabilityRuleSchema>;

export const shiftTradeRequestSchema = z.object({
  ticket_id: z.string().uuid('Ticket is required'),
  request_type: z.enum(['SWAP', 'RELEASE']).default('SWAP'),
  target_staff_id: z.string().uuid().nullable().default(null),
  initiator_note: z.string().nullable().default(null),
});
export type ShiftTradeRequestFormData = z.infer<typeof shiftTradeRequestSchema>;

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
  photo_url: z.string().nullable().default(null),
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
  equipment_category: z.string().nullable().default(null),
  manufacturer: z.string().nullable().default(null),
  brand: z.string().nullable().default(null),
  model_number: z.string().nullable().default(null),
  condition: z.enum(['GOOD', 'FAIR', 'POOR', 'OUT_OF_SERVICE']).default('GOOD'),
  serial_number: z.string().nullable().default(null),
  purchase_date: z.string().nullable().default(null),
  purchase_price: z.number().nullable().default(null),
  assigned_to: z.string().uuid().nullable().default(null),
  site_id: z.string().uuid().nullable().default(null),
  maintenance_schedule: z.string().nullable().default(null),
  last_maintenance_date: z.string().nullable().default(null),
  next_maintenance_date: z.string().nullable().default(null),
  maintenance_specs: z.string().nullable().default(null),
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
  site_id: z.string().uuid().nullable().default(null),
  supplier: z.string().nullable().default(null),
  vendor_id: z.string().nullable().default(null),
  order_date: z.string().min(1, 'Order date is required'),
  expected_delivery: z.string().nullable().default(null),
  delivery_date_est: z.string().nullable().default(null),
  status: z.enum(['DRAFT', 'SUBMITTED', 'ORDERED', 'SHIPPED', 'DELIVERED', 'RECEIVED', 'CANCELED']).default('DRAFT'),
  total_amount: z.number().positive().nullable().default(null),
  delivery_instructions: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type SupplyOrderFormData = z.infer<typeof supplyOrderSchema>;

export const inventoryCountSchema = z.object({
  count_code: z.string().min(1, 'Code is required'),
  site_id: z.string().uuid().nullable().default(null),
  counted_by: z.string().uuid().nullable().default(null),
  count_date: z.string().min(1, 'Count date is required'),
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED']).default('DRAFT'),
  notes: z.string().nullable().default(null),
});
export type InventoryCountFormData = z.infer<typeof inventoryCountSchema>;

// ---------------------------------------------------------------------------
// Supply Vendors
// ---------------------------------------------------------------------------
export const supplyVendorSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(200),
  account_number: z.string().max(120).nullable().default(null),
  contact_person: z.string().max(200).nullable().default(null),
  phone: z.string().max(50).nullable().default(null),
  email: z.string().email().nullable().default(null),
  website: z.string().max(255).nullable().default(null),
  payment_terms: z.string().max(120).nullable().default(null),
  order_minimum: z.number().nonnegative().nullable().default(null),
  delivery_schedule: z.string().max(255).nullable().default(null),
  categories_supplied: z.array(z.string().min(1).max(120)).default([]),
  account_status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  notes: z.string().nullable().default(null),
});
export type SupplyVendorFormData = z.infer<typeof supplyVendorSchema>;

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
// Site Jobs (Operations)
// ---------------------------------------------------------------------------
export const siteJobSchema = z.object({
  job_code: z.string().min(1, 'Code is required'),
  job_name: z.string().min(1, 'Name is required').max(200),
  site_id: z.string().uuid('Site is required'),
  service_id: z.string().uuid().nullable().default(null),
  status: z.string().default('ACTIVE'),
  // Schedule
  frequency: z.string().default('WEEKLY'),
  schedule_days: z.string().nullable().default(null),
  start_time: z.string().nullable().default(null),
  end_time: z.string().nullable().default(null),
  staff_needed: z.number().int().positive().nullable().default(null),
  start_date: z.string().nullable().default(null),
  end_date: z.string().nullable().default(null),
  // Billing
  billing_uom: z.string().nullable().default(null),
  billing_amount: z.number().positive().nullable().default(null),
  job_assigned_to: z.string().nullable().default(null),
  subcontractor_id: z.string().uuid().nullable().default(null),
  invoice_description: z.string().nullable().default(null),
  // Specs
  job_type: z.string().nullable().default(null),
  priority_level: z.string().nullable().default(null),
  estimated_hours_per_service: z.number().positive().nullable().default(null),
  specifications: z.string().nullable().default(null),
  special_requirements: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type SiteJobFormData = z.infer<typeof siteJobSchema>;

// ---------------------------------------------------------------------------
// Job Logs
// ---------------------------------------------------------------------------
export const jobLogSchema = z.object({
  site_id: z.string().uuid('Site is required'),
  job_id: z.string().uuid().nullable().default(null),
  log_date: z.string().min(1, 'Date is required'),
  event_type: z.string().min(1, 'Event type is required'),
  severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL']).default('MINOR'),
  message: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  corrective_action: z.string().nullable().default(null),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).default('OPEN'),
  photos_link: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type JobLogFormData = z.infer<typeof jobLogSchema>;

// ---------------------------------------------------------------------------
// Job Staff Assignments
// ---------------------------------------------------------------------------
export const jobStaffAssignmentSchema = z.object({
  job_id: z.string().uuid('Job is required'),
  staff_id: z.string().uuid('Staff is required'),
  role: z.string().nullable().default(null),
  start_date: z.string().nullable().default(null),
  end_date: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type JobStaffAssignmentFormData = z.infer<typeof jobStaffAssignmentSchema>;

// ---------------------------------------------------------------------------
// Opportunities (Pipeline)
// ---------------------------------------------------------------------------
export const opportunitySchema = z.object({
  opportunity_code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required').max(200),
  prospect_id: z.string().uuid('Prospect is required'),
  stage_code: z.string().default('QUALIFIED'),
  estimated_monthly_value: z.number().positive().nullable().default(null),
  probability_pct: z.number().min(0).max(100).nullable().default(null),
  close_date_target: z.string().nullable().default(null),
  competitor_notes: z.string().nullable().default(null),
  owner_user_id: z.string().uuid().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type OpportunityFormData = z.infer<typeof opportunitySchema>;

// ---------------------------------------------------------------------------
// Sales Bid Config Schemas
// ---------------------------------------------------------------------------
export const bidSiteSchema = z.object({
  bid_version_id: z.string().uuid(),
  site_name: z.string().min(1, 'Site name is required'),
  street_address: z.string().nullable().default(null),
  city: z.string().nullable().default(null),
  state: z.string().nullable().default(null),
  zip: z.string().nullable().default(null),
  building_type_code: z.string().nullable().default(null),
  total_square_footage: z.number().positive().nullable().default(null),
  building_occupancy: z.number().int().positive().nullable().default(null),
  public_traffic_code: z.string().nullable().default(null),
  security_clearance_required: z.boolean().default(false),
  union_required: z.boolean().default(false),
  sustainability_required: z.boolean().default(false),
  walkthrough_date: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type BidSiteFormData = z.infer<typeof bidSiteSchema>;

export const generalTaskSchema = z.object({
  bid_version_id: z.string().uuid(),
  task_name: z.string().min(1, 'Task name is required'),
  category_code: z.string().min(1, 'Category is required'),
  time_minutes: z.number().min(0).default(0),
  enabled: z.boolean().default(true),
});
export type GeneralTaskFormData = z.infer<typeof generalTaskSchema>;

export const productionRateSchema = z.object({
  rate_code: z.string().min(1, 'Rate code is required'),
  task_name: z.string().min(1, 'Task name is required'),
  unit_code: z.enum(['SQFT_1000', 'EACH']).default('SQFT_1000'),
  base_minutes: z.number().min(0).default(0),
  default_ml_adjustment: z.number().min(0).default(1.0),
  floor_type_code: z.string().nullable().default(null),
  building_type_code: z.string().nullable().default(null),
  is_active: z.boolean().default(true),
  notes: z.string().nullable().default(null),
});
export type ProductionRateFormData = z.infer<typeof productionRateSchema>;

export const consumablesSchema = z.object({
  bid_version_id: z.string().uuid(),
  include_consumables: z.boolean().default(false),
  toilet_paper_case_cost: z.number().min(0).default(0),
  toilet_paper_usage_per_person_month: z.number().min(0).default(0),
  paper_towel_case_cost: z.number().min(0).default(0),
  paper_towel_usage_per_person_month: z.number().min(0).default(0),
  soap_case_cost: z.number().min(0).default(0),
  soap_usage_per_person_month: z.number().min(0).default(0),
  liner_case_cost: z.number().min(0).default(0),
  liner_usage_per_person_month: z.number().min(0).default(0),
  seat_cover_case_cost: z.number().min(0).default(0),
  seat_cover_usage_per_person_month: z.number().min(0).default(0),
  markup_pct: z.number().min(0).default(0),
});
export type ConsumablesFormData = z.infer<typeof consumablesSchema>;

export const equipmentPlanSchema = z.object({
  bid_version_id: z.string().uuid(),
  equipment_type_code: z.string().nullable().default(null),
  cost: z.number().min(0).default(0),
  life_years: z.number().min(0.1).default(5),
  quantity_needed: z.number().int().min(1).default(1),
  condition_code: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR']).default('NEW'),
});
export type EquipmentPlanFormData = z.infer<typeof equipmentPlanSchema>;

export const overheadSchema = z.object({
  bid_version_id: z.string().uuid(),
  office_rent: z.number().min(0).default(0),
  utilities: z.number().min(0).default(0),
  phones_internet: z.number().min(0).default(0),
  marketing: z.number().min(0).default(0),
  insurance: z.number().min(0).default(0),
  vehicle: z.number().min(0).default(0),
  misc: z.number().min(0).default(0),
  allocation_percentage: z.number().min(0).max(100).default(0),
  industry_benchmark_percentage: z.number().min(0).default(10),
});
export type OverheadFormData = z.infer<typeof overheadSchema>;

export const pricingStrategySchema = z.object({
  bid_version_id: z.string().uuid(),
  method_code: z.enum(['COST_PLUS', 'TARGET_MARGIN', 'MARKET_RATE', 'HYBRID']).default('COST_PLUS'),
  cost_plus_markup_pct: z.number().min(0).default(15),
  target_margin_pct: z.number().min(0).max(100).default(40),
  market_rate_low: z.number().positive().nullable().default(null),
  market_rate_high: z.number().positive().nullable().default(null),
  minimum_monthly: z.number().positive().nullable().default(null),
  include_initial_clean: z.boolean().default(false),
  initial_clean_multiplier: z.number().min(1).default(2.0),
  annual_increase_pct: z.number().min(0).default(3),
  final_price_override: z.number().positive().nullable().default(null),
  price_elasticity_code: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
});
export type PricingStrategyFormData = z.infer<typeof pricingStrategySchema>;

// ---------------------------------------------------------------------------
// Safety & Compliance
// ---------------------------------------------------------------------------
export const certificationSchema = z.object({
  staff_id: z.string().uuid(),
  certification_name: z.string().min(1, 'Certification name is required'),
  issuing_authority: z.string().nullable().default(null),
  certification_number: z.string().nullable().default(null),
  issued_date: z.string().nullable().default(null),
  expiry_date: z.string().nullable().default(null),
  status: z.enum(['ACTIVE', 'EXPIRED', 'REVOKED', 'PENDING']).default('ACTIVE'),
  notes: z.string().nullable().default(null),
});
export type CertificationFormData = z.infer<typeof certificationSchema>;

export const trainingCourseSchema = z.object({
  course_code: z.string().min(1, 'Course code is required'),
  name: z.string().min(1, 'Course name is required'),
  description: z.string().nullable().default(null),
  category: z.string().nullable().default(null),
  is_required: z.boolean().default(false),
  recurrence_months: z.number().int().positive().nullable().default(null),
  duration_hours: z.number().positive().nullable().default(null),
  provider: z.string().nullable().default(null),
  is_active: z.boolean().default(true),
  notes: z.string().nullable().default(null),
});
export type TrainingCourseFormData = z.infer<typeof trainingCourseSchema>;

export const trainingCompletionSchema = z.object({
  course_id: z.string().uuid(),
  staff_id: z.string().uuid(),
  completed_date: z.string().min(1, 'Completion date is required'),
  expiry_date: z.string().nullable().default(null),
  score: z.number().min(0).max(100).nullable().default(null),
  passed: z.boolean().nullable().default(null),
  instructor: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type TrainingCompletionFormData = z.infer<typeof trainingCompletionSchema>;

export const safetyDocumentSchema = z.object({
  document_code: z.string().min(1, 'Document code is required'),
  title: z.string().min(1, 'Title is required'),
  document_type: z.enum(['SDS', 'SAFETY_PLAN', 'PROCEDURE', 'REGULATION', 'TRAINING_MATERIAL', 'OTHER']),
  category: z.string().nullable().default(null),
  effective_date: z.string().nullable().default(null),
  review_date: z.string().nullable().default(null),
  expiry_date: z.string().nullable().default(null),
  status: z.enum(['ACTIVE', 'UNDER_REVIEW', 'EXPIRED', 'SUPERSEDED', 'DRAFT']).default('DRAFT'),
  applies_to_sites: z.boolean().default(false),
  notes: z.string().nullable().default(null),
});
export type SafetyDocumentFormData = z.infer<typeof safetyDocumentSchema>;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginFormData = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// API Request Schemas
// ---------------------------------------------------------------------------
export const proposalSendSchema = z.object({
  proposalId: z.string().uuid('Proposal ID is required'),
  recipientEmail: z.string().email('Valid recipient email required'),
  recipientName: z.string().min(1, 'Recipient name is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().nullable().default(null),
  enableFollowups: z.boolean().default(false),
  followupTemplateId: z.string().uuid().nullable().default(null),
});
export type ProposalSendData = z.infer<typeof proposalSendSchema>;

export const pinCheckinSchema = z.object({
  siteId: z.string().uuid('Site ID is required'),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
  staffCode: z.string().min(1, 'Staff code is required'),
  eventType: z.enum(['CHECK_IN', 'CHECK_OUT', 'BREAK_START', 'BREAK_END']),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  accuracyMeters: z.number().positive().optional(),
});
export type PinCheckinData = z.infer<typeof pinCheckinSchema>;

export const signatureSchema = z.object({
  signerName: z.string().min(1, 'Signer name is required'),
  signerEmail: z.string().email('Valid signer email required'),
  signatureTypeCode: z.string().min(1, 'Signature type is required'),
  signatureFileId: z.string().uuid().nullable().default(null),
  signatureFontName: z.string().nullable().default(null),
});
export type SignatureData = z.infer<typeof signatureSchema>;

export const supplyOrderPodSchema = z.object({
  recipientName: z.string().min(1, 'Recipient name is required').max(160),
  recipientTitle: z.string().max(160).nullable().default(null),
  deliveredAt: z.string().datetime().nullable().default(null),
  notes: z.string().max(2000).nullable().default(null),
  signatureFileId: z.string().uuid('Signature file is required'),
  photoFileId: z.string().uuid('Delivery photo is required'),
  gpsLat: z.number().min(-90).max(90).nullable().default(null),
  gpsLng: z.number().min(-180).max(180).nullable().default(null),
  gpsAccuracyMeters: z.number().min(0).nullable().default(null),
  deviceInfo: z.record(z.unknown()).nullable().default(null),
});
export type SupplyOrderPodData = z.infer<typeof supplyOrderPodSchema>;

export const procurementApprovalActionSchema = z.object({
  entityType: z.enum(['purchase_order', 'supply_request']),
  entityId: z.string().uuid('Entity ID is required'),
  action: z.enum(['submit', 'approve', 'reject']),
  notes: z.string().max(2000).nullable().default(null),
});
export type ProcurementApprovalActionData = z.infer<typeof procurementApprovalActionSchema>;

export const fleetWorkflowSchema = z.object({
  mode: z.enum(['checkout', 'return']),
  vehicleId: z.string().uuid('Vehicle is required'),
  checkoutId: z.string().uuid().nullable().default(null),
  routeId: z.string().uuid().nullable().default(null),
  staffId: z.string().uuid('Staff is required'),
  odometer: z.number().min(0),
  fuelLevel: z.enum(['EMPTY', 'QUARTER', 'HALF', 'THREE_QUARTER', 'FULL']),
  notes: z.string().max(4000).nullable().default(null),
  checklist: z.record(z.boolean()).default({}),
  fuelGallons: z.number().min(0).nullable().default(null),
  fuelCost: z.number().min(0).nullable().default(null),
  stationName: z.string().max(240).nullable().default(null),
});
export type FleetWorkflowData = z.infer<typeof fleetWorkflowSchema>;

export const messageThreadSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200),
  thread_type: z.enum(['DIRECT', 'GROUP', 'TICKET_CONTEXT']),
  member_ids: z.array(z.string().uuid()).min(1, 'At least one member is required'),
  ticket_id: z.string().uuid().nullable().default(null),
  initial_message: z.string().min(1, 'Initial message is required'),
});
export type MessageThreadFormData = z.infer<typeof messageThreadSchema>;

export const sitePinCodeSchema = z.object({
  site_id: z.string().uuid('Site is required'),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
  label: z.string().min(1, 'Label is required').max(100),
  is_active: z.boolean().default(true),
  expires_at: z.string().nullable().default(null),
});
export type SitePinCodeFormData = z.infer<typeof sitePinCodeSchema>;

export const geofenceSchema = z.object({
  site_id: z.string().uuid('Site is required'),
  center_lat: z.number().min(-90).max(90),
  center_lng: z.number().min(-180).max(180),
  radius_meters: z.number().positive('Radius must be positive').max(5000, 'Radius cannot exceed 5000m'),
  is_active: z.boolean().default(true),
});
export type GeofenceFormData = z.infer<typeof geofenceSchema>;

// ---------------------------------------------------------------------------
// Enterprise parity schemas
// ---------------------------------------------------------------------------
export const contractSchema = z.object({
  client_id: z.string().uuid('Client is required'),
  contract_number: z.string().min(1, 'Contract number is required').max(30),
  contract_name: z.string().min(1, 'Contract name is required').max(200),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().nullable().default(null),
  billing_cycle: z.enum(['PER_VISIT', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY']),
  price_type: z.enum(['FIXED', 'TIME_MATERIALS', 'UNIT_RATE', 'MIXED']),
  contract_value_mrr: z.number().min(0).nullable().default(null),
  contract_value_arr: z.number().min(0).nullable().default(null),
  auto_renew: z.boolean().default(false),
  renewal_term_months: z.number().int().min(1).max(120).nullable().default(null),
  status: z.enum(['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED']).default('ACTIVE'),
  scope_of_work: z.string().nullable().default(null),
  exclusions: z.string().nullable().default(null),
});
export type ContractFormData = z.infer<typeof contractSchema>;

export const issueSchema = z.object({
  site_id: z.string().uuid('Site is required'),
  client_id: z.string().uuid().nullable().default(null),
  site_job_id: z.string().uuid().nullable().default(null),
  inspection_id: z.string().uuid().nullable().default(null),
  issue_type: z.enum([
    'CLEANING_DEFECT',
    'CLIENT_SERVICE_REQUEST',
    'SUPPLY_SHORTAGE',
    'MAINTENANCE_REPAIR',
    'SAFETY_ISSUE',
    'ACCESS_PROBLEM',
    'OTHER',
  ]),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'AWAITING_CLIENT', 'RESOLVED', 'CLOSED']).default('OPEN'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  client_visible: z.boolean().default(true),
  assigned_to_staff_id: z.string().uuid().nullable().default(null),
  due_at: z.string().nullable().default(null),
  resolution_notes: z.string().nullable().default(null),
});
export type IssueFormData = z.infer<typeof issueSchema>;

export const vendorSchema = z.object({
  vendor_name: z.string().min(1, 'Vendor name is required').max(160),
  phone: z.string().nullable().default(null),
  email: z.string().email().nullable().default(null),
  website_url: z.string().url().nullable().default(null),
  payment_terms: z.string().nullable().default(null),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  notes: z.string().nullable().default(null),
});
export type VendorFormData = z.infer<typeof vendorSchema>;

export const itemSchema = z.object({
  vendor_id: z.string().uuid().nullable().default(null),
  supply_catalog_id: z.string().uuid().nullable().default(null),
  sku: z.string().max(60).nullable().default(null),
  item_name: z.string().min(1, 'Item name is required').max(200),
  item_category: z.enum(['CHEMICAL', 'CONSUMABLE', 'PPE', 'TOOL', 'EQUIPMENT_PART', 'OTHER']),
  uom: z.enum(['EACH', 'BOTTLE', 'GALLON', 'BOX', 'CASE', 'ROLL']),
  unit_cost: z.number().min(0).nullable().default(null),
  unit_price: z.number().min(0).nullable().default(null),
  reorder_point: z.number().int().min(0).nullable().default(null),
  reorder_qty: z.number().int().min(0).nullable().default(null),
  is_hazardous: z.boolean().default(false),
  sds_url: z.string().url().nullable().default(null),
  is_active: z.boolean().default(true),
  notes: z.string().nullable().default(null),
});
export type ItemFormData = z.infer<typeof itemSchema>;

export const purchaseOrderSchema = z.object({
  vendor_id: z.string().uuid('Vendor is required'),
  po_number: z.string().min(1, 'PO number is required').max(30),
  po_date: z.string().min(1, 'PO date is required'),
  status: z.enum(['DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED']).default('DRAFT'),
  ship_to_inventory_location_id: z.string().uuid('Ship-to inventory location is required'),
  subtotal: z.number().min(0).default(0),
  tax: z.number().min(0).nullable().default(null),
  total: z.number().min(0).default(0),
  notes: z.string().nullable().default(null),
});
export type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

export const invoiceSchema = z.object({
  client_id: z.string().uuid('Client is required'),
  contract_id: z.string().uuid().nullable().default(null),
  invoice_number: z.string().min(1, 'Invoice number is required').max(30),
  issue_date: z.string().min(1, 'Issue date is required'),
  due_date: z.string().min(1, 'Due date is required'),
  terms: z.enum(['DUE_ON_RECEIPT', 'NET_7', 'NET_15', 'NET_30', 'NET_45', 'NET_60', 'CUSTOM']),
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID']).default('DRAFT'),
  subtotal: z.number().min(0).default(0),
  tax_amount: z.number().min(0).nullable().default(null),
  discount_amount: z.number().min(0).nullable().default(null),
  total: z.number().min(0).default(0),
  balance_due: z.number().min(0).default(0),
  pdf_url: z.string().url().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type InvoiceFormData = z.infer<typeof invoiceSchema>;

export const payrollRunSchema = z.object({
  pay_period_id: z.string().uuid('Pay period is required'),
  run_type: z.enum(['REGULAR', 'OFF_CYCLE', 'CORRECTION']),
  status: z.enum(['DRAFT', 'CALCULATED', 'APPROVED', 'EXPORTED']).default('DRAFT'),
  approved_by_user_id: z.string().uuid().nullable().default(null),
});
export type PayrollRunFormData = z.infer<typeof payrollRunSchema>;

export const integrationConnectionSchema = z.object({
  integration_type: z.enum(['ACCOUNTING', 'PAYROLL', 'PAYMENT_GATEWAY', 'CRM', 'MESSAGING', 'OTHER']),
  provider_name: z.string().min(1, 'Provider name is required').max(120),
  status: z.enum(['CONNECTED', 'DISCONNECTED', 'EXPIRED']).default('CONNECTED'),
  api_key_encrypted: z.string().nullable().default(null),
  oauth_json: z.record(z.unknown()).nullable().default(null),
});
export type IntegrationConnectionFormData = z.infer<typeof integrationConnectionSchema>;

export const customFieldSchema = z.object({
  entity_type: z.enum(['CUSTOMER', 'LOCATION', 'JOB', 'ISSUE', 'ASSET']),
  field_key: z.string().min(1, 'Field key is required').max(80),
  field_label: z.string().min(1, 'Field label is required').max(120),
  field_type: z.enum(['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'DROPDOWN', 'MULTI_SELECT']),
  is_required: z.boolean().default(false),
  is_active: z.boolean().default(true),
});
export type CustomFieldFormData = z.infer<typeof customFieldSchema>;

// ---------------------------------------------------------------------------
// Ticket Supply Usage
// ---------------------------------------------------------------------------
export const ticketSupplyUsageSchema = z.object({
  ticket_id: z.string().uuid('Ticket is required'),
  supply_id: z.string().uuid('Supply is required'),
  quantity_used: z.number().positive('Quantity must be positive').default(1),
  unit: z.string().min(1, 'Unit is required').default('EACH'),
  notes: z.string().nullable().default(null),
});
export type TicketSupplyUsageFormData = z.infer<typeof ticketSupplyUsageSchema>;
