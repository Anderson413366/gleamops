import type { CheckwritersCodeMap, CheckwritersExportBuildInput } from '@gleamops/shared';
import type { BuildCheckwritersLinesInput, BuildCheckwritersLinesOutput } from './types';
import { normalizePayCode } from './mapping';

function asDecimal(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return value.toFixed(2);
}

export function defaultCheckwritersFileName(input: CheckwritersExportBuildInput): string {
  const date = input.pay_date ?? input.pay_period_end;
  const normalized = date.replace(/-/g, '').slice(2);
  const fileName = `cw${normalized}.csv`;
  if (fileName.length < 15) return fileName;
  return `cw${normalized.slice(0, 8)}.csv`;
}

function resolveCode(codeMap: Record<string, CheckwritersCodeMap>, earningCode: string): CheckwritersCodeMap {
  const mapped = codeMap[normalizePayCode(earningCode)];
  if (mapped) return mapped;
  return {
    internal_pay_code: 'REG',
    det: 'E',
    det_code: 'REG',
    default_rate: null,
  };
}

export function buildCheckwritersLines(input: BuildCheckwritersLinesInput): BuildCheckwritersLinesOutput {
  let totalHours = 0;
  let totalAmount = 0;

  const lines = input.lines.map((row) => {
    const employeeId = input.employeeMap[row.staff_id] ?? '';
    const mapRow = resolveCode(input.codeMap, row.earning_code);
    const hours = row.hours ?? 0;
    const rate = row.rate ?? (mapRow.default_rate ? Number(mapRow.default_rate) : null);
    const amount = row.amount ?? 0;

    totalHours += hours;
    totalAmount += amount;

    return {
      employee_id: employeeId,
      det: mapRow.det,
      det_code: mapRow.det_code,
      hours: asDecimal(hours),
      rate: rate == null ? '' : asDecimal(rate),
      amount: asDecimal(amount),
      cost_center_code: row.cost_center_code ?? undefined,
      job_code: row.job_code ?? undefined,
    };
  });

  return {
    lines,
    totals: {
      hours: Number(totalHours.toFixed(2)),
      amount: Number(totalAmount.toFixed(2)),
    },
  };
}
