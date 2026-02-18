import type { CheckwritersCodeMap } from '@gleamops/shared';

export function buildCodeMapIndex(rows: CheckwritersCodeMap[]): Record<string, CheckwritersCodeMap> {
  return rows.reduce<Record<string, CheckwritersCodeMap>>((acc, row) => {
    acc[row.internal_pay_code.toUpperCase()] = row;
    return acc;
  }, {});
}

export function normalizePayCode(code: string | null | undefined): string {
  if (!code) return 'REG';
  return code.trim().toUpperCase();
}
