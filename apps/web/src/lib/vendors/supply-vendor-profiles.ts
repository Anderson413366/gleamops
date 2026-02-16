'use client';

export type SupplyVendorAccountStatus = 'ACTIVE' | 'INACTIVE';

export interface SupplyVendorProfile {
  id: string;
  company_name: string;
  account_number: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  payment_terms: string | null;
  order_minimum: number | null;
  delivery_schedule: string | null;
  categories_supplied: string[];
  account_status: SupplyVendorAccountStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'gleamops-supply-vendor-profiles-v1';

export function slugifyVendorName(name: string): string {
  const fallback = `vendor-${Date.now()}`;
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return fallback;
  const slug = trimmed
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

function parseProfiles(raw: string | null): SupplyVendorProfile[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row && typeof row === 'object' && typeof row.id === 'string')
      .map((row) => ({
        id: String(row.id),
        company_name: String(row.company_name ?? ''),
        account_number: row.account_number ? String(row.account_number) : null,
        contact_person: row.contact_person ? String(row.contact_person) : null,
        phone: row.phone ? String(row.phone) : null,
        email: row.email ? String(row.email) : null,
        website: row.website ? String(row.website) : null,
        payment_terms: row.payment_terms ? String(row.payment_terms) : null,
        order_minimum: typeof row.order_minimum === 'number' ? row.order_minimum : null,
        delivery_schedule: row.delivery_schedule ? String(row.delivery_schedule) : null,
        categories_supplied: Array.isArray(row.categories_supplied)
          ? row.categories_supplied.map((v: unknown) => String(v)).filter(Boolean)
          : [],
        account_status: row.account_status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        notes: row.notes ? String(row.notes) : null,
        created_at: row.created_at ? String(row.created_at) : new Date().toISOString(),
        updated_at: row.updated_at ? String(row.updated_at) : new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

export function getSupplyVendorProfiles(): SupplyVendorProfile[] {
  if (typeof window === 'undefined') return [];
  return parseProfiles(window.localStorage.getItem(STORAGE_KEY));
}

function saveSupplyVendorProfiles(profiles: SupplyVendorProfile[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function findVendorProfileBySlug(slug: string): SupplyVendorProfile | null {
  const rows = getSupplyVendorProfiles();
  return rows.find((row) => row.id === slug) ?? null;
}

export function findVendorProfileByName(name: string): SupplyVendorProfile | null {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  const rows = getSupplyVendorProfiles();
  return rows.find((row) => row.company_name.trim().toLowerCase() === normalized) ?? null;
}

export function upsertSupplyVendorProfile(
  input: Omit<SupplyVendorProfile, 'id' | 'created_at' | 'updated_at'> & { id?: string | null },
): SupplyVendorProfile {
  const rows = getSupplyVendorProfiles();
  const now = new Date().toISOString();
  const id = input.id && input.id.trim() ? input.id : slugifyVendorName(input.company_name);
  const existing = rows.find((row) => row.id === id);
  const next: SupplyVendorProfile = {
    id,
    company_name: input.company_name.trim(),
    account_number: input.account_number?.trim() || null,
    contact_person: input.contact_person?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    website: input.website?.trim() || null,
    payment_terms: input.payment_terms?.trim() || null,
    order_minimum: input.order_minimum ?? null,
    delivery_schedule: input.delivery_schedule?.trim() || null,
    categories_supplied: input.categories_supplied
      .map((value) => value.trim())
      .filter(Boolean),
    account_status: input.account_status,
    notes: input.notes?.trim() || null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  const filtered = rows.filter((row) => row.id !== id);
  filtered.push(next);
  saveSupplyVendorProfiles(filtered.sort((a, b) => a.company_name.localeCompare(b.company_name)));
  return next;
}
