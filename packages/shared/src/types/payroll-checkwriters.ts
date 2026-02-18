export type CheckwritersDet = 'E' | 'D' | 'T';

export interface CheckwritersImportColumn {
  key: string;
  label: string;
  enabled: boolean;
  order_index: number;
}

export interface CheckwritersCodeMap {
  internal_pay_code: string;
  det: CheckwritersDet;
  det_code: string;
  default_rate: string | null;
}

export interface CheckwritersEmployeeExternalId {
  staff_id: string;
  external_employee_id: string;
}

export interface CheckwritersExportLine {
  employee_id: string;
  det: CheckwritersDet;
  det_code: string;
  hours: string;
  rate: string;
  amount: string;
  cost_center_code?: string;
  job_code?: string;
}

export interface CheckwritersExportBuildInput {
  pay_period_start: string;
  pay_period_end: string;
  pay_date?: string | null;
}

export interface CheckwritersExportResult {
  file_name: string;
  line_count: number;
  totals: {
    hours: number;
    amount: number;
  };
}
