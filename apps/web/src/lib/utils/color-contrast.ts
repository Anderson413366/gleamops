/**
 * Returns a Tailwind text-color class that ensures WCAG AA contrast
 * against the given hex background color.
 *
 * Uses the W3C relative luminance formula to decide between
 * dark text (for light backgrounds) and white text (for dark backgrounds).
 */
export function getContrastTextColor(hexColor: string): 'text-white' | 'text-gray-900' {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'text-gray-900' : 'text-white';
}

/**
 * Returns a raw hex color string suitable for SVG `fill` attributes.
 * Same luminance logic as getContrastTextColor.
 */
export function getContrastFillColor(hexColor: string): '#ffffff' | '#111827' {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#111827' : '#ffffff';
}
