import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/api/service-client';

export function createDb(): SupabaseClient {
  return getServiceClient();
}

export async function findTicketByCode(db: SupabaseClient, ticketCode: string) {
  return db
    .from('work_tickets')
    .select(`
      id,
      tenant_id,
      ticket_code,
      scheduled_date,
      start_time,
      end_time,
      status,
      job:job_id(job_code, job_name),
      site:site_id(name, site_code)
    `)
    .eq('ticket_code', ticketCode)
    .is('archived_at', null)
    .maybeSingle();
}

export async function findTicketChecklist(db: SupabaseClient, ticketId: string) {
  return db
    .from('ticket_checklists')
    .select('id, status')
    .eq('ticket_id', ticketId)
    .is('archived_at', null)
    .maybeSingle();
}

export async function createTicketChecklist(db: SupabaseClient, data: {
  tenant_id: string;
  ticket_id: string;
  status: string;
  completed_at: string | null;
  completed_by: string | null;
}) {
  return db
    .from('ticket_checklists')
    .insert(data)
    .select('id, status')
    .single();
}

export async function updateTicketChecklist(db: SupabaseClient, checklistId: string, data: {
  status: string;
  completed_at: string | null;
  completed_by: string | null;
}) {
  return db
    .from('ticket_checklists')
    .update(data)
    .eq('id', checklistId);
}

export async function findPublicSignoffItem(db: SupabaseClient, checklistId: string) {
  return db
    .from('ticket_checklist_items')
    .select('id')
    .eq('checklist_id', checklistId)
    .eq('section', 'Completion')
    .eq('label', 'Public completion sign-off')
    .is('archived_at', null)
    .maybeSingle();
}

export async function insertPublicSignoffItem(db: SupabaseClient, data: {
  tenant_id: string;
  checklist_id: string;
  notes: string;
  checked_at: string;
  checked_by: string | null;
}) {
  return db
    .from('ticket_checklist_items')
    .insert({
      tenant_id: data.tenant_id,
      checklist_id: data.checklist_id,
      template_item_id: null,
      section: 'Completion',
      label: 'Public completion sign-off',
      sort_order: 999,
      is_required: true,
      requires_photo: false,
      is_checked: true,
      checked_at: data.checked_at,
      checked_by: data.checked_by,
      notes: data.notes,
    });
}

export async function updatePublicSignoffItem(db: SupabaseClient, itemId: string, data: {
  notes: string;
  checked_at: string;
  checked_by: string | null;
}) {
  return db
    .from('ticket_checklist_items')
    .update({
      notes: data.notes,
      is_checked: true,
      checked_at: data.checked_at,
      checked_by: data.checked_by,
    })
    .eq('id', itemId);
}

export async function updateWorkTicketStatus(db: SupabaseClient, ticketId: string, status: string) {
  return db
    .from('work_tickets')
    .update({ status })
    .eq('id', ticketId);
}
