/**
 * GleamOps Database Types
 * Canonical types for all Milestone A–G tables.
 * Follows v7.0 schema + standard columns (tenant_id, timestamps, soft delete, etag).
 */

// ---------------------------------------------------------------------------
// Cross-cutting standard columns
// ---------------------------------------------------------------------------
export interface StandardColumns {
  id: string; // UUID
  tenant_id: string; // UUID
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
  version_etag: string; // UUID, optimistic locking
}

// ---------------------------------------------------------------------------
// Platform / System
// ---------------------------------------------------------------------------
export interface Tenant {
  id: string;
  tenant_code: string;
  name: string;
  default_timezone: string;
  created_at: string;
  updated_at: string;
}

export interface TenantMembership extends StandardColumns {
  user_id: string;
  role_code: string; // OWNER_ADMIN | MANAGER | SUPERVISOR | CLEANER | INSPECTOR | SALES
}

export interface UserSiteAssignment extends StandardColumns {
  user_id: string;
  site_id: string;
  role_at_site: string | null;
}

export interface Lookup {
  id: string;
  tenant_id: string;
  category: string;
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface StatusTransition {
  id: string;
  tenant_id: string;
  entity_type: string;
  from_status: string;
  to_status: string;
  allowed_roles: string[]; // role codes
}

export interface SystemSequence {
  id: string;
  tenant_id: string;
  prefix: string;
  current_value: number;
}

export interface AuditEvent {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  entity_code: string | null;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  actor_user_id: string;
  reason: string | null;
  request_path: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_id: string | null;
  geo_lat: number | null;
  geo_long: number | null;
  created_at: string;
}

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface FileRecord extends StandardColumns {
  file_code: string;
  entity_type: string;
  entity_id: string;
  bucket: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
}

// ---------------------------------------------------------------------------
// Module A: CRM
// ---------------------------------------------------------------------------
export interface Client extends StandardColumns {
  client_code: string;
  name: string;
  status: string;
  status_changed_date: string | null;
  client_since: string | null;
  client_type: string | null; // Lookups "Client Type"
  industry: string | null; // Lookups "Industry"
  primary_contact_id: string | null;
  billing_contact_id: string | null;
  bill_to_name: string | null;
  billing_address: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;
  payment_terms: string | null; // Lookups "Payment Terms"
  po_required: boolean;
  insurance_required: boolean;
  insurance_expiry: string | null;
  credit_limit: number | null;
  website: string | null;
  tax_id: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  auto_renewal: boolean;
  invoice_frequency: string | null; // Lookups "Invoice Frequency"
  notes: string | null;
}

export interface Site extends StandardColumns {
  site_code: string;
  client_id: string;
  name: string;
  status: string | null; // Lookups "Site Status"
  status_date: string | null;
  status_reason: string | null;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;
  // Service window
  service_start_date: string | null;
  earliest_start_time: string | null;
  latest_start_time: string | null;
  business_hours_start: string | null;
  business_hours_end: string | null;
  weekend_access: boolean;
  // Access & security
  entry_instructions: string | null;
  parking_instructions: string | null;
  alarm_system: string | null;
  alarm_company: string | null;
  alarm_code: string | null;
  security_protocol: string | null;
  access_notes: string | null;
  // Facility facts
  square_footage: number | null;
  number_of_floors: number | null;
  employees_on_site: number | null;
  janitorial_closet_location: string | null;
  supply_storage_location: string | null;
  water_source_location: string | null;
  dumpster_location: string | null;
  // Contacts & oversight
  primary_contact_id: string | null;
  emergency_contact_id: string | null;
  supervisor_id: string | null;
  risk_level: string | null; // Lookups "Risk Level"
  priority_level: string | null; // Lookups "Priority Level"
  // Compliance
  osha_compliance_required: boolean;
  background_check_required: boolean;
  // Inspections
  last_inspection_date: string | null;
  next_inspection_date: string | null;
  // Geofence
  geofence_center_lat: number | null;
  geofence_center_lng: number | null;
  geofence_radius_meters: number | null;
  photo_url: string | null;
  inventory_frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | null;
  last_count_date: string | null;
  next_count_due: string | null;
  count_status_alert: string | null;
  notes: string | null;
}

export interface Contact extends StandardColumns {
  contact_code: string;
  client_id: string | null;
  site_id: string | null;
  first_name: string;
  last_name: string;
  name: string; // computed: first_name + last_name
  contact_type: string | null; // Lookups "Contact Type"
  role: string | null; // Lookups "Contact Role"
  company_name: string | null;
  role_title: string | null;
  preferred_contact_method: string | null; // Lookups "Contact Method"
  mobile_phone: string | null;
  work_phone: string | null;
  phone: string | null;
  email: string | null;
  preferred_language: string | null; // Lookups "Language"
  is_primary: boolean;
  timezone: string | null;
  photo_url: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Module B: Service DNA
// ---------------------------------------------------------------------------
export interface Task extends StandardColumns {
  code?: string;
  task_code: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  area_type: string | null;
  floor_type: string | null;
  priority?: 'high' | 'medium' | 'low' | null;
  priority_level: string | null; // Lookups "Priority Level"
  default_minutes: number | null;
  production_rate_sqft_per_hour: number | null;
  unit_code: string; // SQFT_1000 | EACH
  production_rate: string | null;
  description: string | null;
  instructions?: string | null;
  status: string | null;
  spec_description: string | null;
  work_description: string | null;
  tools_materials: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface TaskProductionRate extends StandardColumns {
  task_id: string;
  floor_type_code: string | null;
  building_type_code: string | null;
  unit_code: string;
  base_minutes: number;
  default_ml_adjustment: number;
  is_active: boolean;
}

export interface Service extends StandardColumns {
  service_code: string;
  name: string;
  description: string | null;
}

export interface ServiceTask extends StandardColumns {
  service_id: string;
  task_id: string;
  sequence_order: number;
  priority_level: string | null;
  is_required: boolean;
  frequency_default: string;
  estimated_minutes: number | null;
  quality_weight: number;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Module C: Sales / Pipeline
// ---------------------------------------------------------------------------
export interface SalesProspect extends StandardColumns {
  prospect_code: string;
  company_name: string;
  prospect_status_code: string;
  owner_user_id: string | null;
  notes: string | null;
  source: string | null;
}

export interface SalesProspectContact extends StandardColumns {
  prospect_id: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
}

export interface SalesOpportunity extends StandardColumns {
  opportunity_code: string;
  prospect_id: string | null;
  client_id: string | null;
  name: string;
  stage_code: string;
  owner_user_id: string | null;
  estimated_monthly_value: number | null;
  expected_close_date: string | null;
}

export interface SalesBid extends StandardColumns {
  bid_code: string;
  opportunity_id: string | null;
  client_id: string;
  service_id: string | null;
  status: string;
  total_sqft: number | null;
  bid_monthly_price: number | null;
  target_margin_percent: number | null;
}

export interface SalesBidVersion extends StandardColumns {
  bid_id: string;
  version_number: number;
  is_sent_snapshot: boolean;
  snapshot_data: Record<string, unknown> | null;
}

export interface SalesBidArea extends StandardColumns {
  bid_version_id: string;
  name: string;
  area_type_code: string | null;
  floor_type_code: string | null;
  building_type_code: string | null;
  difficulty_code: string; // EASY | STANDARD | DIFFICULT
  square_footage: number;
  quantity: number;
  fixtures: Record<string, number> | null;
}

export interface SalesBidAreaTask extends StandardColumns {
  bid_area_id: string;
  task_id: string;
  task_code: string;
  frequency_code: string;
  use_ai: boolean;
  custom_minutes: number | null;
}

export interface SalesBidSchedule extends StandardColumns {
  bid_version_id: string;
  days_per_week: number;
  visits_per_day: number;
  hours_per_shift: number;
  lead_required: boolean;
  supervisor_hours_week: number;
}

export interface SalesBidLaborRate extends StandardColumns {
  bid_version_id: string;
  cleaner_rate: number;
  lead_rate: number;
  supervisor_rate: number;
}

export interface SalesBidBurden extends StandardColumns {
  bid_version_id: string;
  employer_tax_pct: number;
  workers_comp_pct: number;
  insurance_pct: number;
  other_pct: number;
}

export interface SalesBidWorkloadResult extends StandardColumns {
  bid_version_id: string;
  total_minutes_per_visit: number;
  weekly_minutes: number;
  monthly_minutes: number;
  monthly_hours: number;
  hours_per_visit: number;
  cleaners_needed: number;
  lead_needed: boolean;
}

export interface SalesBidPricingResult extends StandardColumns {
  bid_version_id: string;
  pricing_method: string;
  total_monthly_cost: number;
  burdened_labor_cost: number;
  supplies_cost: number;
  equipment_cost: number;
  overhead_cost: number;
  recommended_price: number;
  effective_margin_pct: number;
}

// ---------------------------------------------------------------------------
// Module C: Proposals + Email + Follow-ups
// ---------------------------------------------------------------------------
export interface ProposalLayoutSection {
  id: 'header' | 'companyInfo' | 'metadata' | 'scope' | 'pricing' | 'terms' | 'signatures' | 'attachments';
  enabled: boolean;
  order: number;
  pageBreakBefore: boolean;
}

export interface ProposalLayoutConfig {
  sections: ProposalLayoutSection[];
  signaturePlacement: 'cover' | 'agreement' | 'disclaimer';
  attachmentMode: 'append' | 'list_only';
}

export interface SalesProposal extends StandardColumns {
  proposal_code: string;
  bid_version_id: string;
  status: string; // DRAFT | GENERATED | SENT | DELIVERED | OPENED | WON | LOST | EXPIRED
  pdf_file_id: string | null;
  pdf_generated_at: string | null;
  page_count: number | null;
  valid_until: string | null;
  notes: string | null;
  layout_config: ProposalLayoutConfig | null;
}

export interface SalesProposalPricingOption extends StandardColumns {
  proposal_id: string;
  label: string; // Good | Better | Best
  monthly_price: number;
  description: string | null;
  is_recommended: boolean;
  sort_order: number;
}

export interface SalesProposalSend extends StandardColumns {
  proposal_id: string;
  recipient_email: string;
  recipient_name: string | null;
  status: string; // SENDING | SENT | DELIVERED | OPENED | BOUNCED | FAILED
  provider_message_id: string | null;
  sent_at: string | null;
  idempotency_key: string;
}

export interface SalesEmailEvent {
  id: string;
  tenant_id: string;
  proposal_send_id: string;
  provider_event_id: string;
  event_type: string; // delivered | open | click | bounce | spam
  raw_payload: Record<string, unknown>;
  created_at: string;
}

export interface SalesFollowupSequence extends StandardColumns {
  proposal_id: string;
  status: string; // ACTIVE | STOPPED | COMPLETED
  stop_reason: string | null;
}

export interface SalesFollowupSend extends StandardColumns {
  sequence_id: string;
  step_number: number;
  status: string; // SCHEDULED | SENDING | SENT | FAILED | SKIPPED
  scheduled_at: string;
  sent_at: string | null;
}

// ---------------------------------------------------------------------------
// Module C: Conversion
// ---------------------------------------------------------------------------
export interface SalesBidConversion extends StandardColumns {
  bid_version_id: string;
  site_job_id: string;
  conversion_mode: string; // FULL | DRY_RUN
  is_dry_run: boolean;
  converted_by: string;
  converted_at: string;
}

export interface SalesConversionEvent {
  id: string;
  tenant_id: string;
  conversion_id: string;
  step: string;
  status: string; // SUCCESS | FAILED
  entity_type: string | null;
  entity_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Module D: Operations
// ---------------------------------------------------------------------------
export interface SiteJob extends StandardColumns {
  job_code: string;
  job_name: string | null;
  site_id: string;
  service_id: string | null;
  source_bid_id: string | null;
  source_conversion_id: string | null;
  // Operations
  job_type: string | null; // Lookups "Job Type"
  priority_level: string | null; // Lookups "Priority Level"
  frequency: string; // Lookups "Service Frequency"
  schedule_days: string | null;
  staff_needed: number | null;
  start_time: string | null;
  end_time: string | null;
  estimated_hours_per_service: number | null;
  estimated_hours_per_month: number | null;
  last_service_date: string | null;
  next_service_date: string | null;
  quality_score: number | null;
  // Billing
  billing_uom: string | null; // per month, each visit, each project, hourly
  billing_amount: number | null;
  // Assignment
  job_assigned_to: string | null; // Internal / Subcontractor
  subcontractor_id: string | null;
  // Contract / scope
  start_date: string | null;
  end_date: string | null;
  invoice_description: string | null;
  specifications: string | null;
  special_requirements: string | null;
  status: string; // Lookups "Job Status"
  notes: string | null;
}

export interface RecurrenceRule extends StandardColumns {
  site_job_id: string;
  days_of_week: number[]; // 0=Sun..6=Sat
  start_time: string | null;
  end_time: string | null;
  start_date: string;
  end_date: string | null;
  exceptions: string[]; // dates to skip
}

export interface WorkTicket extends StandardColumns {
  ticket_code: string;
  job_id: string;
  site_id: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string; // SCHEDULED | IN_PROGRESS | COMPLETED | VERIFIED | CANCELED
}

export interface TicketAssignment extends StandardColumns {
  ticket_id: string;
  staff_id: string;
  role: string | null; // LEAD | CLEANER
}

// ---------------------------------------------------------------------------
// Module D: Checklists + Photos
// ---------------------------------------------------------------------------
export interface ChecklistTemplate extends StandardColumns {
  template_code: string;
  name: string;
  description: string | null;
  service_id: string | null;
  is_active: boolean;
}

export interface ChecklistTemplateItem extends StandardColumns {
  template_id: string;
  section: string | null;
  label: string;
  sort_order: number;
  is_required: boolean;
  requires_photo: boolean;
}

export interface TicketChecklist extends StandardColumns {
  ticket_id: string;
  template_id: string | null;
  status: string; // PENDING | IN_PROGRESS | COMPLETED
  completed_at: string | null;
  completed_by: string | null;
}

export interface TicketChecklistItem extends StandardColumns {
  checklist_id: string;
  template_item_id: string | null;
  section: string | null;
  label: string;
  sort_order: number;
  is_required: boolean;
  requires_photo: boolean;
  is_checked: boolean;
  checked_at: string | null;
  checked_by: string | null;
  notes: string | null;
}

export interface TicketPhoto extends StandardColumns {
  ticket_id: string;
  checklist_item_id: string | null;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number | null;
  caption: string | null;
  uploaded_by: string | null;
}

// ---------------------------------------------------------------------------
// Module D: Inspections (Quality)
// ---------------------------------------------------------------------------
export interface InspectionTemplate extends StandardColumns {
  template_code: string;
  name: string;
  description: string | null;
  service_id: string | null;
  scoring_scale: number;
  pass_threshold: number;
  is_active: boolean;
}

export interface InspectionTemplateItem extends StandardColumns {
  template_id: string;
  section: string | null;
  label: string;
  sort_order: number;
  requires_photo: boolean;
  weight: number;
}

export interface Inspection extends StandardColumns {
  inspection_code: string;
  template_id: string | null;
  site_id: string | null;
  ticket_id: string | null;
  inspector_id: string | null;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'SUBMITTED';
  started_at: string | null;
  completed_at: string | null;
  total_score: number | null;
  max_score: number | null;
  score_pct: number | null;
  passed: boolean | null;
  notes: string | null;
  client_version: number;
}

export interface InspectionItem extends StandardColumns {
  inspection_id: string;
  template_item_id: string | null;
  section: string | null;
  label: string;
  sort_order: number;
  score: number | null;
  requires_photo: boolean;
  photo_taken: boolean;
  notes: string | null;
}

export interface InspectionIssue extends StandardColumns {
  inspection_id: string;
  inspection_item_id: string | null;
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  description: string;
  followup_ticket_id: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
}

// ---------------------------------------------------------------------------
// Module E: Workforce
// ---------------------------------------------------------------------------
export interface Staff extends StandardColumns {
  staff_code: string;
  user_id: string | null;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  role: string; // Lookups "Staff Role"
  staff_status: string | null; // Lookups "Staff Status"
  staff_type: string | null; // Lookups "Staff Type"
  employment_type: string | null; // Lookups "Employment Type"
  is_subcontractor: boolean;
  hire_date: string | null;
  termination_date: string | null;
  pay_rate: number | null;
  pay_type: string | null; // Lookups "Pay Type"
  schedule_type: string | null; // Lookups "Schedule Type"
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  supervisor_id: string | null;
  certifications: string | null;
  background_check_date: string | null;
  performance_rating: number | null;
  photo_url: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Module E: Timekeeping
// ---------------------------------------------------------------------------
export interface Geofence extends StandardColumns {
  site_id: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  is_active: boolean;
}

export interface TimeEvent extends StandardColumns {
  staff_id: string;
  ticket_id: string | null;
  site_id: string | null;
  event_type: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END' | 'MANUAL_ADJUSTMENT';
  recorded_at: string;
  lat: number | null;
  lng: number | null;
  accuracy_meters: number | null;
  is_within_geofence: boolean | null;
  pin_used: boolean;
  notes: string | null;
}

export interface TimeEntry extends StandardColumns {
  staff_id: string;
  ticket_id: string | null;
  site_id: string | null;
  check_in_event_id: string | null;
  check_out_event_id: string | null;
  start_at: string;
  end_at: string | null;
  break_minutes: number;
  duration_minutes: number | null;
  status: 'OPEN' | 'CLOSED' | 'ADJUSTED';
  approved_by: string | null;
  approved_at: string | null;
}

export interface TimeException extends StandardColumns {
  time_entry_id: string | null;
  time_event_id: string | null;
  staff_id: string;
  exception_type: 'OUT_OF_GEOFENCE' | 'LATE_ARRIVAL' | 'EARLY_DEPARTURE' | 'MISSING_CHECKOUT' | 'MANUAL_OVERRIDE';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  description: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
}

export interface Alert {
  id: string;
  tenant_id: string;
  alert_type: string;
  severity: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  target_user_id: string | null;
  read_at: string | null;
  dismissed_at: string | null;
  created_at: string;
}

export interface Timesheet extends StandardColumns {
  staff_id: string;
  week_start: string;
  week_end: string;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  break_hours: number;
  exception_count: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  notes: string | null;
}

export interface TimesheetApproval {
  id: string;
  tenant_id: string;
  timesheet_id: string;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'UNAPPROVED';
  actor_user_id: string;
  notes: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Module F: Inventory & Assets
// ---------------------------------------------------------------------------
export interface SupplyCatalog extends StandardColumns {
  code: string;
  name: string;
  description: string | null;
  category: string | null; // Lookups "Supply Category"
  supply_status: string | null; // Lookups "Supply Status"
  unit: string;
  pack_size: string | null;
  unit_cost: number | null;
  markup_percentage: number | null;
  billing_rate: number | null;
  min_stock_level: number | null;
  brand: string | null;
  manufacturer: string | null;
  model_number: string | null;
  preferred_vendor: string | null;
  vendor_sku: string | null;
  sds_url: string | null;
  eco_rating: string | null;
  ppe_required: boolean;
  image_url: string | null;
  notes: string | null;
}

export interface SupplyKit extends StandardColumns {
  code: string;
  name: string;
  description: string | null;
}

export interface SupplyKitItem extends StandardColumns {
  kit_id: string;
  supply_id: string;
  quantity: number;
}

export interface Vehicle extends StandardColumns {
  vehicle_code: string;
  name: string;
  make: string | null;
  model: string | null;
  year: number | null;
  license_plate: string | null;
  vin: string | null;
  color: string | null;
  status: 'ACTIVE' | 'IN_SHOP' | 'RETIRED';
  assigned_to: string | null;
  photo_url: string | null;
  notes: string | null;
}

export interface KeyInventory extends StandardColumns {
  key_code: string;
  site_id: string | null;
  key_type: 'STANDARD' | 'FOB' | 'CARD' | 'CODE' | 'OTHER';
  label: string;
  total_count: number;
  assigned_to: string | null;
  status: 'AVAILABLE' | 'ASSIGNED' | 'LOST' | 'RETURNED';
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Module F: Equipment
// ---------------------------------------------------------------------------
export interface Equipment extends StandardColumns {
  equipment_code: string;
  name: string;
  paired_with: string | null; // equipment_id
  equipment_type: string | null; // Lookups "Equipment Type"
  equipment_category: string | null; // Lookups "Equipment Category"
  manufacturer: string | null;
  brand: string | null;
  model_number: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  condition: string | null; // Lookups "Condition"
  maintenance_specs: string | null;
  maintenance_schedule: string | null; // Lookups "Maintenance Schedule"
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  assigned_to: string | null; // staff_id
  site_id: string | null;
  photo_url: string | null;
  notes: string | null;
}

export interface EquipmentAssignment extends StandardColumns {
  equipment_id: string;
  staff_id: string | null;
  site_id: string | null;
  assigned_date: string;
  returned_date: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Module F: Vehicle Maintenance
// ---------------------------------------------------------------------------
export interface VehicleMaintenance extends StandardColumns {
  vehicle_id: string;
  service_date: string;
  service_type: string;
  description: string | null;
  cost: number | null;
  odometer: number | null;
  performed_by: string | null;
  next_service_date: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Module F: Supply Orders & Inventory Counts
// ---------------------------------------------------------------------------
export interface SupplyOrder extends StandardColumns {
  order_code: string;
  site_id: string | null;
  supplier: string | null;
  vendor_id: string | null;
  order_date: string;
  expected_delivery: string | null;
  delivery_date_est: string | null;
  delivered_at: string | null;
  status: string; // DRAFT | ORDERED | SHIPPED | RECEIVED | CANCELED
  total_amount: number | null;
  delivery_instructions: string | null;
  submitted_at: string | null;
  notes: string | null;
}

export interface SupplyOrderItem extends StandardColumns {
  order_id: string;
  supply_id: string;
  quantity_ordered: number;
  unit_price: number;
  line_total: number;
  notes: string | null;
}

export interface SupplyOrderDelivery extends StandardColumns {
  order_id: string;
  delivered_at: string;
  recipient_name: string;
  recipient_title: string | null;
  notes: string | null;
  signature_file_id: string | null;
  photo_file_id: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_accuracy_meters: number | null;
  ip_address: string | null;
  user_agent: string | null;
  device_info: Record<string, unknown> | null;
  captured_by_user_id: string | null;
}

export interface InventoryCount extends StandardColumns {
  count_code: string;
  site_id: string | null;
  counted_by: string | null; // staff_id
  counted_by_name: string | null;
  public_token: string | null;
  count_date: string;
  status: string; // DRAFT | IN_PROGRESS | SUBMITTED | COMPLETED | CANCELLED
  submitted_at: string | null;
  notes: string | null;
}

export interface InventoryCountDetail extends StandardColumns {
  count_id: string;
  supply_id: string;
  expected_qty: number | null;
  actual_qty: number | null;
  variance: number | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Module G: Subcontractors
// ---------------------------------------------------------------------------
export interface Subcontractor extends StandardColumns {
  subcontractor_code: string;
  company_name: string;
  contact_name: string | null;
  contact_title: string | null;
  business_phone: string | null;
  mobile_phone: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  license_number: string | null;
  license_expiry: string | null;
  insurance_company: string | null;
  insurance_policy_number: string | null;
  insurance_expiry: string | null;
  services_provided: string | null;
  hourly_rate: number | null;
  payment_terms: string | null;
  tax_id: string | null;
  w9_on_file: boolean;
  status: string;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Module G: Staff Positions
// ---------------------------------------------------------------------------
export interface StaffPosition extends StandardColumns {
  position_code: string;
  title: string;
  department: string | null;
  pay_grade: string | null;
  is_active: boolean;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Module D: Job Logs & Job Tasks
// ---------------------------------------------------------------------------
export interface JobLog extends StandardColumns {
  site_id: string;
  job_id: string | null;
  log_date: string;
  event_type: string; // Lookups "Log Event Type"
  message: string | null;
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  description: string | null;
  photos_link: string | null;
  corrective_action: string | null;
  closed_at: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  notes: string | null;
}

export interface JobTask extends StandardColumns {
  job_id: string;
  task_id: string | null;
  task_code: string | null;
  task_name: string | null;
  sequence_order?: number | null;
  wait_after?: boolean;
  estimated_minutes?: number | null;
  custom_minutes?: number | null;
  planned_minutes: number | null;
  qc_weight: number | null;
  is_required: boolean;
  status: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Job Staff Assignments
// ---------------------------------------------------------------------------
export interface JobStaffAssignment extends StandardColumns {
  job_id: string;
  staff_id: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// RBAC: User Profiles & Client Access
// ---------------------------------------------------------------------------
export interface UserProfile {
  id: string;
  tenant_id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserClientAccess {
  id: string;
  tenant_id: string;
  user_id: string;
  client_id: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Module F: Site Supplies & Asset Gating
// ---------------------------------------------------------------------------
export interface SiteSupply extends StandardColumns {
  site_id: string;
  supply_id: string | null;
  name: string;
  category: string | null;
  par_level: number | null;
  sds_url: string | null;
  notes: string | null;
}

export interface SiteAssetRequirement extends StandardColumns {
  site_id: string;
  asset_type: 'KEY' | 'VEHICLE' | 'EQUIPMENT';
  description: string;
  is_required: boolean;
}

export interface TicketAssetCheckout extends StandardColumns {
  ticket_id: string;
  requirement_id: string;
  staff_id: string;
  checked_out_at: string;
  returned_at: string | null;
}

// ---------------------------------------------------------------------------
// Materialized Views (read-only)
// ---------------------------------------------------------------------------
export interface MvJobFinancials {
  job_id: string;
  tenant_id: string;
  job_code: string;
  job_name: string | null;
  status: string;
  frequency: string;
  billing_amount: number | null;
  billing_uom: string | null;
  site_id: string;
  site_code: string;
  site_name: string;
  client_id: string;
  client_code: string;
  client_name: string;
  actual_hours_30d: number;
  time_entries_30d: number;
}

export interface MvClientSummary {
  client_id: string;
  tenant_id: string;
  client_code: string;
  client_name: string;
  status: string;
  site_count: number;
  job_count: number;
  total_monthly_revenue: number;
}

export interface MvStaffPerformance {
  staff_id: string;
  tenant_id: string;
  staff_code: string;
  full_name: string;
  role: string;
  staff_status: string | null;
  hours_last_30d: number;
  entries_last_30d: number;
  exceptions_last_30d: number;
}

// ---------------------------------------------------------------------------
// Module B+: Sales Expansion Tables (Milestone 9)
// ---------------------------------------------------------------------------
export interface SalesBidSite extends StandardColumns {
  bid_version_id: string;
  site_name: string;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  building_type_code: string | null;
  total_square_footage: number | null;
  building_occupancy: number | null;
  public_traffic_code: string | null;
  security_clearance_required: boolean;
  union_required: boolean;
  sustainability_required: boolean;
  walkthrough_date: string | null;
  notes: string | null;
}

export interface SalesBidGeneralTask extends StandardColumns {
  bid_version_id: string;
  task_name: string;
  category_code: string; // QUALITY | CLOSING | SETUP | TRAVEL | BREAK | MANAGEMENT | OTHER
  time_minutes: number;
  enabled: boolean;
}

export interface SalesProductionRate extends StandardColumns {
  rate_code: string;
  task_name: string;
  unit_code: string; // SQFT_1000 | EACH
  base_minutes: number;
  default_ml_adjustment: number;
  floor_type_code: string | null;
  building_type_code: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface SalesBidConsumables extends StandardColumns {
  bid_version_id: string;
  include_consumables: boolean;
  toilet_paper_case_cost: number;
  toilet_paper_usage_per_person_month: number;
  paper_towel_case_cost: number;
  paper_towel_usage_per_person_month: number;
  soap_case_cost: number;
  soap_usage_per_person_month: number;
  liner_case_cost: number;
  liner_usage_per_person_month: number;
  seat_cover_case_cost: number;
  seat_cover_usage_per_person_month: number;
  markup_pct: number;
  monthly_consumables_cost: number; // computed
}

export interface SalesBidSupplyAllowance extends StandardColumns {
  bid_version_id: string;
  allowance_per_sqft: number;
  monthly_supply_allowance: number;
}

export interface SalesBidSupplyKit extends StandardColumns {
  bid_version_id: string;
  kit_id: string;
  quantity_multiplier: number;
  include_in_conversion: boolean;
}

export interface SalesBidEquipmentPlanItem extends StandardColumns {
  bid_version_id: string;
  equipment_type_code: string | null;
  cost: number;
  life_years: number;
  quantity_needed: number;
  condition_code: string; // NEW | GOOD | FAIR | POOR
  monthly_depreciation: number; // computed
}

export interface SalesBidOverhead extends StandardColumns {
  bid_version_id: string;
  office_rent: number;
  utilities: number;
  phones_internet: number;
  marketing: number;
  insurance: number;
  vehicle: number;
  misc: number;
  allocation_percentage: number;
  industry_benchmark_percentage: number;
  overhead_total: number; // computed
  overhead_allocated: number; // computed
}

export interface SalesBidPricingStrategy extends StandardColumns {
  bid_version_id: string;
  method_code: string; // COST_PLUS | TARGET_MARGIN | MARKET_RATE | HYBRID
  cost_plus_markup_pct: number;
  target_margin_pct: number;
  market_rate_low: number | null;
  market_rate_high: number | null;
  minimum_monthly: number | null;
  include_initial_clean: boolean;
  initial_clean_multiplier: number;
  annual_increase_pct: number;
  final_price_override: number | null;
  price_elasticity_code: string; // LOW | MEDIUM | HIGH
}

export interface SalesProposalAttachment extends StandardColumns {
  proposal_id: string;
  file_id: string;
  sort_order: number;
  one_page_confirmed: boolean;
}

export interface SalesMarketingInsert extends StandardColumns {
  insert_code: string;
  title: string;
  file_id: string;
  is_active: boolean;
}

export interface SalesProposalMarketingInsert extends StandardColumns {
  proposal_id: string;
  insert_code: string;
  sort_order: number;
}

export interface SalesProposalSignature extends StandardColumns {
  proposal_id: string;
  signer_name: string;
  signer_email: string;
  signature_type_code: string; // DRAWN | TYPED | UPLOADED
  signature_file_id: string | null;
  signature_font_name: string | null;
  signed_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface SalesFollowupTemplate extends StandardColumns {
  template_code: string;
  name: string;
  step_number: number;
  subject_template: string;
  body_template_markdown: string;
  delay_days: number;
  is_active: boolean;
}

// =====================================================================
// Module H: Safety, Compliance & Access Control
// =====================================================================

export interface StaffCertification extends StandardColumns {
  staff_id: string;
  certification_name: string;
  issuing_authority: string | null;
  certification_number: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'PENDING';
  document_file_id: string | null;
  notes: string | null;
}

export interface PayRateHistory extends StandardColumns {
  staff_id: string;
  effective_date: string;
  previous_rate: number | null;
  new_rate: number;
  previous_pay_type: string | null;
  new_pay_type: string | null;
  change_reason: string | null;
  changed_by: string | null;
}

export interface VehicleCheckout extends StandardColumns {
  vehicle_id: string;
  ticket_id: string | null;
  staff_id: string | null;
  checked_out_at: string;
  returned_at: string | null;
  checkout_odometer: number | null;
  return_odometer: number | null;
  fuel_level_out: string | null;
  fuel_level_in: string | null;
  condition_notes: string | null;
  status: 'OUT' | 'RETURNED' | 'OVERDUE';
}

export interface KeyEventLog extends StandardColumns {
  key_id: string;
  event_type: 'ASSIGNED' | 'RETURNED' | 'LOST' | 'REPLACED' | 'DEACTIVATED';
  staff_id: string | null;
  event_date: string;
  quantity: number;
  notes: string | null;
}

export interface SafetyDocument extends StandardColumns {
  document_code: string;
  title: string;
  document_type: 'SDS' | 'SAFETY_PLAN' | 'PROCEDURE' | 'REGULATION' | 'TRAINING_MATERIAL' | 'OTHER';
  category: string | null;
  file_id: string | null;
  effective_date: string | null;
  review_date: string | null;
  expiry_date: string | null;
  status: 'ACTIVE' | 'UNDER_REVIEW' | 'EXPIRED' | 'SUPERSEDED' | 'DRAFT';
  applies_to_sites: boolean;
  site_ids: string[] | null;
  notes: string | null;
}

export interface TrainingCourse extends StandardColumns {
  course_code: string;
  name: string;
  description: string | null;
  category: string | null;
  is_required: boolean;
  recurrence_months: number | null;
  duration_hours: number | null;
  provider: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface TrainingCompletion extends StandardColumns {
  course_id: string;
  staff_id: string;
  completed_date: string;
  expiry_date: string | null;
  score: number | null;
  passed: boolean | null;
  certificate_file_id: string | null;
  instructor: string | null;
  notes: string | null;
}

export interface UserTeamMembership extends StandardColumns {
  team_name: string;
  user_id: string;
  role_in_team: 'LEAD' | 'MEMBER';
  joined_at: string;
  left_at: string | null;
}

export interface UserAccessGrant extends StandardColumns {
  user_id: string;
  entity_type: 'client' | 'site' | 'job' | 'team';
  entity_id: string;
  permission: 'READ' | 'WRITE' | 'ADMIN';
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
}

// ---------------------------------------------------------------------------
// Module G: Subcontractor Jobs
// ---------------------------------------------------------------------------
export interface SubcontractorJob extends StandardColumns {
  subcontractor_id: string;
  site_job_id: string;
  site_id: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELED' | 'SUSPENDED';
  start_date: string | null;
  end_date: string | null;
  billing_rate: number | null;
  billing_type: 'HOURLY' | 'PER_SERVICE' | 'FLAT_MONTHLY' | 'PER_SQFT' | null;
  scope_description: string | null;
  contract_ref: string | null;
  performance_score: number | null;
  last_service_date: string | null;
  notes: string | null;
}

export interface SubcontractorJobAssignment {
  id: string;
  tenant_id: string;
  subcontractor_id: string;
  subcontractor_code: string;
  subcontractor_name: string;
  site_job_id: string;
  job_code: string;
  job_name: string | null;
  site_id: string;
  site_code: string;
  site_name: string;
  client_id: string;
  client_code: string;
  client_name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  billing_rate: number | null;
  billing_type: string | null;
  scope_description: string | null;
  performance_score: number | null;
  last_service_date: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Module E: Site PIN Codes
// ---------------------------------------------------------------------------
export interface SitePinCode extends StandardColumns {
  site_id: string;
  pin_hash: string;
  label: string | null;
  is_active: boolean;
  expires_at: string | null;
}

// ---------------------------------------------------------------------------
// Module E: Messaging
// ---------------------------------------------------------------------------
export interface MessageThread {
  id: string;
  tenant_id: string;
  subject: string;
  thread_type: 'DIRECT' | 'GROUP' | 'TICKET_CONTEXT';
  ticket_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface MessageThreadMember {
  id: string;
  tenant_id: string;
  thread_id: string;
  user_id: string;
  role: 'MEMBER' | 'ADMIN';
  last_read_at: string | null;
  joined_at: string;
}

export interface Message {
  id: string;
  tenant_id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  archived_at: string | null;
}

// ---------------------------------------------------------------------------
// Enterprise parity additions
// ---------------------------------------------------------------------------
export interface OrganizationSetting extends StandardColumns {
  default_invoice_terms: string;
  default_tax_rate: number | null;
  default_invoice_delivery: string;
  default_quote_valid_days: number;
  default_pay_period: string;
  default_language: string;
  enable_staging_mode: boolean;
}

export interface UserSession extends StandardColumns {
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
  revoked_at: string | null;
}

export interface Role extends StandardColumns {
  role_name: string;
  role_kind: 'SYSTEM' | 'CUSTOM';
  description: string | null;
  is_default: boolean;
}

export interface Permission extends StandardColumns {
  permission_code: string;
  module: string;
  description: string | null;
}

export interface RolePermission extends StandardColumns {
  role_id: string;
  permission_id: string;
  access_level: 'NONE' | 'READ' | 'WRITE' | 'ADMIN';
  is_enabled: boolean;
}

export interface UserRoleAssignment extends StandardColumns {
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by_user_id: string | null;
}

export interface Contract extends StandardColumns {
  client_id: string;
  contract_number: string;
  contract_name: string;
  start_date: string;
  end_date: string | null;
  billing_cycle: string;
  contract_value_mrr: number | null;
  contract_value_arr: number | null;
  price_type: string;
  auto_renew: boolean;
  renewal_term_months: number | null;
  status: string;
  client_signed_at: string | null;
  company_signed_at: string | null;
  scope_of_work: string | null;
  exclusions: string | null;
}

export interface Issue extends StandardColumns {
  client_id: string | null;
  site_id: string;
  site_job_id: string | null;
  inspection_id: string | null;
  issue_type: string;
  priority: string;
  status: string;
  title: string;
  description: string;
  client_visible: boolean;
  reported_by_user_id: string | null;
  assigned_to_staff_id: string | null;
  reported_at: string;
  due_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  attachments: Record<string, unknown> | null;
}

export interface Vendor extends StandardColumns {
  vendor_name: string;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  payment_terms: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  notes: string | null;
}

export interface InventoryLocation extends StandardColumns {
  location_type: 'WAREHOUSE' | 'OFFICE' | 'CLIENT_SITE' | 'VEHICLE' | 'OTHER';
  site_id: string | null;
  name: string;
  address_note: string | null;
  is_active: boolean;
}

export interface Item extends StandardColumns {
  supply_catalog_id: string | null;
  vendor_id: string | null;
  sku: string | null;
  item_name: string;
  item_category: 'CHEMICAL' | 'CONSUMABLE' | 'PPE' | 'TOOL' | 'EQUIPMENT_PART' | 'OTHER';
  uom: 'EACH' | 'BOTTLE' | 'GALLON' | 'BOX' | 'CASE' | 'ROLL';
  unit_cost: number | null;
  unit_price: number | null;
  reorder_point: number | null;
  reorder_qty: number | null;
  is_hazardous: boolean;
  sds_url: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface StockLevel extends StandardColumns {
  inventory_location_id: string;
  item_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
}

export interface StockMovement extends StandardColumns {
  item_id: string;
  from_inventory_location_id: string | null;
  to_inventory_location_id: string | null;
  movement_type: 'RECEIVE' | 'TRANSFER' | 'CONSUME' | 'ADJUST' | 'RETURN';
  quantity: number;
  unit_cost: number | null;
  site_job_id: string | null;
  performed_by_user_id: string | null;
  notes: string | null;
  moved_at: string;
}

export interface PurchaseOrder extends StandardColumns {
  vendor_id: string;
  po_number: string;
  po_date: string;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  ship_to_inventory_location_id: string;
  subtotal: number;
  tax: number | null;
  total: number;
  notes: string | null;
}

export interface PurchaseOrderLine extends StandardColumns {
  purchase_order_id: string;
  item_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  line_total: number;
}

export interface SupplyRequest extends StandardColumns {
  site_id: string | null;
  inventory_location_id: string | null;
  requested_by_staff_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED';
  notes: string | null;
  requested_at: string;
}

export interface SupplyRequestLine extends StandardColumns {
  supply_request_id: string;
  item_id: string;
  quantity_requested: number;
  quantity_fulfilled: number | null;
  line_notes: string | null;
}

export interface AssetTransfer extends StandardColumns {
  equipment_id: string;
  from_inventory_location_id: string | null;
  to_inventory_location_id: string | null;
  from_site_id: string | null;
  to_site_id: string | null;
  performed_by_user_id: string | null;
  notes: string | null;
  transferred_at: string;
}

export interface AssetMaintenanceLog extends StandardColumns {
  equipment_id: string;
  maintenance_type: 'PREVENTIVE' | 'REPAIR' | 'INSPECTION' | 'OTHER';
  performed_on: string;
  cost: number | null;
  details: string | null;
  performed_by_staff_id: string | null;
}

export interface Invoice extends StandardColumns {
  client_id: string;
  contract_id: string | null;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  terms: string;
  status: string;
  subtotal: number;
  tax_amount: number | null;
  discount_amount: number | null;
  total: number;
  balance_due: number;
  pdf_url: string | null;
  notes: string | null;
  sent_at: string | null;
}

export interface InvoiceLineItem extends StandardColumns {
  invoice_id: string;
  line_type: string;
  description: string;
  quantity: number;
  uom: string;
  unit_price: number;
  line_total: number;
  sort_order: number;
}

export interface InvoiceJob extends StandardColumns {
  invoice_id: string;
  site_job_id: string;
  is_consolidated: boolean;
}

export interface Payment extends StandardColumns {
  invoice_id: string;
  payment_date: string;
  payment_method: string;
  amount: number;
  transaction_id: string | null;
  status: string;
  processed_by_user_id: string | null;
  notes: string | null;
}

export interface PayPeriod extends StandardColumns {
  period_start: string;
  period_end: string;
  pay_date: string;
  status: string;
}

export interface PayrollRun extends StandardColumns {
  pay_period_id: string;
  run_type: string;
  status: string;
  approved_by_user_id: string | null;
  approved_at: string | null;
}

export interface EarningCode extends StandardColumns {
  code: string;
  name: string;
  type: string;
  is_active: boolean;
}

export interface PayrollLineItem extends StandardColumns {
  payroll_run_id: string;
  staff_id: string;
  earning_code_id: string;
  hours: number | null;
  rate: number | null;
  amount: number;
  notes: string | null;
}

export interface Conversation extends StandardColumns {
  conversation_type: string;
  site_job_id: string | null;
  site_id: string | null;
  issue_id: string | null;
  title: string | null;
}

export interface ConversationParticipant extends StandardColumns {
  conversation_id: string;
  user_id: string;
  participant_role: 'MEMBER' | 'MODERATOR' | 'OWNER';
  is_muted: boolean;
  joined_at: string;
}

export interface NotificationPreference extends StandardColumns {
  user_id: string;
  default_channel: 'IN_APP' | 'SMS' | 'EMAIL' | 'PUSH';
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

export interface FileLink extends StandardColumns {
  file_id: string;
  entity_type: string;
  entity_id: string;
  label: string | null;
  linked_at: string;
}

export interface Tag extends StandardColumns {
  tag_name: string;
  color_hex: string | null;
}

export interface TagAssignment extends StandardColumns {
  tag_id: string;
  entity_type: string;
  entity_id: string;
  assigned_at: string;
}

export interface CustomField extends StandardColumns {
  entity_type: string;
  field_key: string;
  field_label: string;
  field_type: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'DROPDOWN' | 'MULTI_SELECT';
  is_required: boolean;
  is_active: boolean;
}

export interface CustomFieldOption extends StandardColumns {
  custom_field_id: string;
  option_label: string;
  option_value: string;
  sort_order: number;
}

export interface CustomFieldValue extends StandardColumns {
  custom_field_id: string;
  entity_id: string;
  value_text: string | null;
  value_number: number | null;
  value_date: string | null;
  value_bool: boolean | null;
  value_json: Record<string, unknown> | null;
}

export interface IntegrationConnection extends StandardColumns {
  integration_type: string;
  provider_name: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED';
  api_key_encrypted: string | null;
  oauth_json: Record<string, unknown> | null;
  last_sync_at: string | null;
}

export interface IntegrationSyncLog extends StandardColumns {
  integration_connection_id: string;
  sync_direction: 'PUSH' | 'PULL' | 'BI_DIRECTIONAL';
  status: 'STARTED' | 'SUCCEEDED' | 'FAILED';
  summary: string | null;
  details_json: Record<string, unknown> | null;
  started_at: string;
}

export interface Webhook extends StandardColumns {
  target_url: string;
  event_type: string;
  secret_token: string | null;
  is_active: boolean;
}

export interface ExternalIdMap extends StandardColumns {
  integration_connection_id: string;
  entity_type: string;
  internal_entity_id: string;
  external_entity_id: string;
}
