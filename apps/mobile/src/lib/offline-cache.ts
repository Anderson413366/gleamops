/**
 * Offline cache using AsyncStorage.
 *
 * Stores ticket lists (Today + This Week) and individual ticket details
 * so the app remains usable without network connectivity.
 *
 * Cache keys:
 *   @gleamops:tickets:today       — Today's ticket list
 *   @gleamops:tickets:week        — This week's ticket list
 *   @gleamops:ticket:{id}         — Individual ticket detail
 *   @gleamops:checklist:{id}      — Checklist items for a ticket
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@gleamops:';

// ---------------------------------------------------------------------------
// Generic get/set with JSON serialization
// ---------------------------------------------------------------------------
async function getJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function setJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or other error — non-fatal
  }
}

// ---------------------------------------------------------------------------
// Ticket list caching
// ---------------------------------------------------------------------------
export async function cacheTodayTickets(tickets: unknown[]): Promise<void> {
  await setJSON('tickets:today', tickets);
}

export async function getCachedTodayTickets<T>(): Promise<T[] | null> {
  return getJSON<T[]>('tickets:today');
}

export async function cacheWeekTickets(tickets: unknown[]): Promise<void> {
  await setJSON('tickets:week', tickets);
}

export async function getCachedWeekTickets<T>(): Promise<T[] | null> {
  return getJSON<T[]>('tickets:week');
}

// ---------------------------------------------------------------------------
// Individual ticket detail caching
// ---------------------------------------------------------------------------
export async function cacheTicketDetail(ticketId: string, ticket: unknown): Promise<void> {
  await setJSON(`ticket:${ticketId}`, ticket);
}

export async function getCachedTicketDetail<T>(ticketId: string): Promise<T | null> {
  return getJSON<T>(`ticket:${ticketId}`);
}

// ---------------------------------------------------------------------------
// Checklist items caching
// ---------------------------------------------------------------------------
export async function cacheChecklistItems(ticketId: string, items: unknown[]): Promise<void> {
  await setJSON(`checklist:${ticketId}`, items);
}

export async function getCachedChecklistItems<T>(ticketId: string): Promise<T[] | null> {
  return getJSON<T[]>(`checklist:${ticketId}`);
}
