import type { CheckwritersCodeMap, CheckwritersExportLine } from '@gleamops/shared';

export interface PayrollLineInput {
  staff_id: string;
  earning_code: string;
  hours: number | null;
  rate: number | null;
  amount: number;
  cost_center_code?: string | null;
  job_code?: string | null;
}

export interface BuildCheckwritersLinesInput {
  lines: PayrollLineInput[];
  employeeMap: Record<string, string>;
  codeMap: Record<string, CheckwritersCodeMap>;
}

export interface BuildCheckwritersLinesOutput {
  lines: CheckwritersExportLine[];
  totals: {
    hours: number;
    amount: number;
  };
}
