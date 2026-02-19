/**
 * Messages data access layer.
 * Extracted from api/messages/route.ts
 */
import { createClient } from '@supabase/supabase-js';

export function createDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function insertThread(
  db: ReturnType<typeof createDb>,
  tenantId: string,
  userId: string,
  subject: string,
  threadType: string,
  ticketId: string | null,
) {
  return db
    .from('message_threads')
    .insert({
      tenant_id: tenantId,
      subject,
      thread_type: threadType,
      ticket_id: ticketId,
      created_by: userId,
    })
    .select('id')
    .single();
}

export async function insertMembers(
  db: ReturnType<typeof createDb>,
  rows: Array<{
    tenant_id: string;
    thread_id: string;
    user_id: string;
    role: string;
    joined_at: string;
  }>,
) {
  return db.from('message_thread_members').insert(rows);
}

export async function deleteThread(db: ReturnType<typeof createDb>, threadId: string) {
  return db.from('message_threads').delete().eq('id', threadId);
}

export async function insertMessage(
  db: ReturnType<typeof createDb>,
  tenantId: string,
  threadId: string,
  senderId: string,
  body: string,
) {
  return db
    .from('messages')
    .insert({
      tenant_id: tenantId,
      thread_id: threadId,
      sender_id: senderId,
      body,
    })
    .select('id')
    .single();
}
