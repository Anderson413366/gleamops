/**
 * Formats a ZIP/postal code value for display.
 * Handles cases where ZIP was stored as a number in JSONB (losing leading zeros).
 * US ZIP codes (all digits, 4-5 chars) are padded to 5 digits.
 */
export function formatZip(value: string | number | null | undefined): string {
  if (value == null || value === '') return '';
  const raw = String(value).trim();
  if (!raw) return '';
  // If it's all digits and 4 characters, pad to 5 (US ZIP with lost leading zero)
  if (/^\d{4}$/.test(raw)) return raw.padStart(5, '0');
  return raw;
}
