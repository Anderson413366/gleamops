export const CHECKWRITERS_DEFAULT_COLUMNS = [
  'employee_id',
  'det',
  'det_code',
  'hours',
  'rate',
  'amount',
] as const;

export const CHECKWRITERS_DEFAULT_DET = 'E';

export function isValidCheckwritersFileName(fileName: string): boolean {
  return fileName.length < 15 && /\.(csv|txt)$/i.test(fileName);
}
