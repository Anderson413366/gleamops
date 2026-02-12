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
  billing_address: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;
  notes: string | null;
}

export interface Site extends StandardColumns {
  site_code: string;
  client_id: string;
  name: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;
  alarm_code: string | null;
  access_notes: string | null;
  square_footage: number | null;
  geofence_center_lat: number | null;
  geofence_center_lng: number | null;
  geofence_radius_meters: number | null;
  notes: string | null;
}

export interface Contact extends StandardColumns {
  contact_code: string;
  client_id: string | null;
  site_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_primary: boolean;
  timezone: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Module B: Service DNA
// ---------------------------------------------------------------------------
export interface Task extends StandardColumns {
  task_code: string;
  name: string;
  production_rate_sqft_per_hour: number | null;
  category: string | null;
  unit_code: string; // SQFT_1000 | EACH
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
  frequency_default: string;
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
export interface SalesProposal extends StandardColumns {
  proposal_code: string;
  bid_version_id: string;
  status: string; // DRAFT | GENERATED | SENT | DELIVERED | OPENED | WON | LOST | EXPIRED
  pdf_file_id: string | null;
  pdf_generated_at: string | null;
  page_count: number | null;
  valid_until: string | null;
  notes: string | null;
}

export interface SalesProposalPricingOption extends StandardColumns {
  proposal_id: string;
  label: string; // Good | Better | Best
  monthly_price: number;
  is_recommended: boolean;
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
  site_id: string;
  source_bid_id: string | null;
  source_conversion_id: string | null;
  billing_amount: number | null;
  frequency: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
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
  status: string; // SCHEDULED | IN_PROGRESS | COMPLETED | VERIFIED | CANCELLED
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
  role: string;
  is_subcontractor: boolean;
  pay_rate: number | null;
  email: string | null;
  phone: string | null;
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
  category: string | null;
  unit: string;
  unit_cost: number | null;
  sds_url: string | null;
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
// Module F: Site Supplies & Asset Gating
// ---------------------------------------------------------------------------
export interface SiteSupply extends StandardColumns {
  site_id: string;
  name: string;
  category: string | null;
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
