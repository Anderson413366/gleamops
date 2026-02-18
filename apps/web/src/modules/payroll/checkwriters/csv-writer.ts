import type { CheckwritersExportLine } from '@gleamops/shared';

function sanitizeNumeric(value: string): string {
  return value.replace(/,/g, '').trim();
}

export function toCheckwritersCsv(lines: CheckwritersExportLine[]): string {
  return lines
    .map((line) => [
      line.employee_id,
      line.det,
      line.det_code,
      sanitizeNumeric(line.hours),
      sanitizeNumeric(line.rate),
      sanitizeNumeric(line.amount),
    ].join(','))
    .join('\n');
}
