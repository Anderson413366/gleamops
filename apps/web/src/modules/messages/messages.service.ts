/**
 * Messages service.
 * Thread creation orchestration.
 * Extracted verbatim from api/messages/route.ts
 */
import { createProblemDetails } from '@gleamops/shared';
import {
  createDb,
  insertThread,
  insertMembers,
  deleteThread,
  insertMessage,
} from './messages.repository';

interface CreateThreadInput {
  subject: string;
  thread_type: string;
  member_ids: string[];
  ticket_id?: string | null;
  initial_message: string;
}

type ServiceResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: ReturnType<typeof createProblemDetails> };

const INSTANCE = '/api/messages';

export async function createThread(
  tenantId: string,
  userId: string,
  input: CreateThreadInput,
): Promise<ServiceResult> {
  const { subject, thread_type, member_ids, ticket_id, initial_message } = input;
  const db = createDb();

  // Create thread
  const { data: thread, error: threadErr } = await insertThread(
    db, tenantId, userId, subject, thread_type, ticket_id ?? null,
  );

  if (threadErr || !thread) {
    return {
      success: false,
      error: createProblemDetails('MSG_001', 'Thread creation failed', 500, threadErr?.message ?? 'Failed to create message thread', INSTANCE),
    };
  }

  // Add members (creator as ADMIN + others as MEMBER)
  const uniqueMemberIds = Array.from(new Set([userId, ...member_ids]));
  const memberRows = uniqueMemberIds.map((uid) => ({
    tenant_id: tenantId,
    thread_id: thread.id,
    user_id: uid,
    role: uid === userId ? 'ADMIN' : 'MEMBER',
    joined_at: new Date().toISOString(),
  }));

  const { error: membersErr } = await insertMembers(db, memberRows);
  if (membersErr) {
    // Attempt cleanup: delete the thread we just created
    await deleteThread(db, thread.id);
    return {
      success: false,
      error: createProblemDetails('MSG_002', 'Member enrollment failed', 500, membersErr.message, INSTANCE),
    };
  }

  // Insert initial message
  const { data: message, error: msgErr } = await insertMessage(
    db, tenantId, thread.id, userId, initial_message,
  );

  if (msgErr) {
    return {
      success: false,
      error: createProblemDetails('MSG_003', 'Message insert failed', 500, msgErr.message, INSTANCE),
    };
  }

  return {
    success: true,
    data: {
      success: true,
      threadId: thread.id,
      messageId: message?.id ?? null,
    },
  };
}
