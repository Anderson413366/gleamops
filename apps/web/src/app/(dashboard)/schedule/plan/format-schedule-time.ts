/** Convert HH:MM(:SS) to 12-hour format (e.g. "9:00 AM"). */
export function formatScheduleTime(value: string | null): string {
  if (!value) return '';
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = Number(hourRaw);
  const minute = minuteRaw ?? '00';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${suffix}`;
}
