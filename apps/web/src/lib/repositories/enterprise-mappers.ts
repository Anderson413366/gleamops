import type {
  Client,
  Site,
  SiteJob,
  Staff,
  SupplyCatalog,
  Equipment,
} from '@gleamops/shared';

export type CustomerCompatRow = {
  customer_id: string;
  org_id: string;
  customer_number: string;
  customer_name: string;
  industry: string | null;
  billing_terms: string | null;
  status: string;
};

export type LocationCompatRow = {
  location_id: string;
  org_id: string;
  customer_id: string;
  location_number: string;
  location_name: string;
  facility_type: string | null;
  status: string | null;
};

export type JobCompatRow = {
  job_id: string;
  org_id: string;
  customer_id: string;
  location_id: string;
  job_number: string;
  job_type: string | null;
  priority: string;
  status: string;
};

export type ItemCompatRow = {
  item_id: string;
  org_id: string;
  item_name: string;
  item_category: string | null;
  uom: string | null;
  unit_cost: number | null;
  is_active: boolean;
};

export type AssetCompatRow = {
  asset_id: string;
  org_id: string;
  asset_name: string;
  asset_type: string | null;
  status: string;
  current_location_id: string | null;
};

export type EmployeeCompatRow = {
  employee_id: string;
  org_id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  status: string;
  employment_type: string | null;
  pay_rate: number | null;
};

function mapCustomerStatus(status: string): string {
  switch (status) {
    case 'PROSPECT':
      return 'PROSPECTIVE';
    case 'ON_HOLD':
      return 'PAUSED';
    case 'INACTIVE':
    case 'CANCELED':
      return 'TERMINATED';
    default:
      return 'ACTIVE';
  }
}

function mapJobStatus(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'SCHEDULED';
    case 'ON_HOLD':
      return 'BLOCKED';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'COMPLETED':
      return 'COMPLETED';
    default:
      return 'DRAFT';
  }
}

function mapJobPriority(priorityLevel: string | null): string {
  if (!priorityLevel) return 'NORMAL';
  if (priorityLevel === 'CRITICAL') return 'URGENT';
  return priorityLevel;
}

export function mapClientToCustomerRow(client: Client): CustomerCompatRow {
  return {
    customer_id: client.id,
    org_id: client.tenant_id,
    customer_number: client.client_code,
    customer_name: client.name,
    industry: client.industry,
    billing_terms: client.payment_terms,
    status: mapCustomerStatus(client.status),
  };
}

export function mapSiteToLocationRow(site: Site): LocationCompatRow {
  return {
    location_id: site.id,
    org_id: site.tenant_id,
    customer_id: site.client_id,
    location_number: site.site_code,
    location_name: site.name,
    facility_type: null,
    status: site.status,
  };
}

export function mapSiteJobToJobRow(job: SiteJob, customerId: string): JobCompatRow {
  return {
    job_id: job.id,
    org_id: job.tenant_id,
    customer_id: customerId,
    location_id: job.site_id,
    job_number: job.job_code,
    job_type: job.job_type,
    priority: mapJobPriority(job.priority_level),
    status: mapJobStatus(job.status),
  };
}

export function mapSupplyToItemRow(supply: SupplyCatalog): ItemCompatRow {
  return {
    item_id: supply.id,
    org_id: supply.tenant_id,
    item_name: supply.name,
    item_category: supply.category,
    uom: supply.unit,
    unit_cost: supply.unit_cost,
    is_active: supply.supply_status !== 'INACTIVE',
  };
}

export function mapEquipmentToAssetRow(equipment: Equipment): AssetCompatRow {
  return {
    asset_id: equipment.id,
    org_id: equipment.tenant_id,
    asset_name: equipment.name,
    asset_type: equipment.equipment_type,
    status: equipment.archived_at ? 'RETIRED' : 'IN_SERVICE',
    current_location_id: equipment.site_id,
  };
}

export function mapStaffToEmployeeRow(staff: Staff): EmployeeCompatRow {
  return {
    employee_id: staff.id,
    org_id: staff.tenant_id,
    first_name: staff.first_name,
    last_name: staff.last_name,
    full_name: staff.full_name,
    status: staff.staff_status ?? 'ACTIVE',
    employment_type: staff.employment_type,
    pay_rate: staff.pay_rate,
  };
}
