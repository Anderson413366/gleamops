import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  createProblemDetails,
  messageThreadSchema,
} from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { validateBody } from '@/lib/api/validate-request';

const CONTENT_TYPE_PROBLEM = 'application/problem+json';
const INSTANCE = '/api/messages';

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * POST /api/messages
 *
 * Atomically creates a message thread, adds members, and inserts the initial message.
 */
export async function POST(request: NextRequest) {
  try {
    // ----- Auth -----
    const auth = await extractAuth(request, INSTANCE);
    if (isAuthError(auth)) return auth;
    const { userId, tenantId } = auth;

    // ----- Body -----
    const validation = await validateBody(request, messageThreadSchema, INSTANCE);
    if (validation.error) return validation.error;
    const { subject, thread_type, member_ids, ticket_id, initial_message } = validation.data;

    const db = getServiceClient();

    // ----- Create thread -----
    const { data: thread, error: threadErr } = await db
      .from('message_threads')
      .insert({
        tenant_id: tenantId,
        subject,
        thread_type,
        ticket_id: ticket_id ?? null,
        created_by: userId,
      })
      .select('id')
      .single();

    if (threadErr || !thread) {
      return problemResponse(
        createProblemDetails(
          'MSG_001',
          'Thread creation failed',
          500,
          threadErr?.message ?? 'Failed to create message thread',
          INSTANCE,
        ),
      );
    }

    // ----- Add members (creator as ADMIN + others as MEMBER) -----
    const uniqueMemberIds = Array.from(new Set([userId, ...member_ids]));
    const memberRows = uniqueMemberIds.map((uid) => ({
      tenant_id: tenantId,
      thread_id: thread.id,
      user_id: uid,
      role: uid === userId ? 'ADMIN' : 'MEMBER',
      joined_at: new Date().toISOString(),
    }));

    const { error: membersErr } = await db
      .from('message_thread_members')
      .insert(memberRows);

    if (membersErr) {
      // Attempt cleanup: delete the thread we just created
      await db.from('message_threads').delete().eq('id', thread.id);
      return problemResponse(
        createProblemDetails(
          'MSG_002',
          'Member enrollment failed',
          500,
          membersErr.message,
          INSTANCE,
        ),
      );
    }

    // ----- Insert initial message -----
    const { data: message, error: msgErr } = await db
      .from('messages')
      .insert({
        tenant_id: tenantId,
        thread_id: thread.id,
        sender_id: userId,
        body: initial_message,
      })
      .select('id')
      .single();

    if (msgErr) {
      return problemResponse(
        createProblemDetails(
          'MSG_003',
          'Message insert failed',
          500,
          msgErr.message,
          INSTANCE,
        ),
      );
    }

    return NextResponse.json({
      success: true,
      threadId: thread.id,
      messageId: message?.id ?? null,
    });
  } catch (err: unknown) {
    console.error('[messages] Unexpected error:', err);
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return problemResponse(
      createProblemDetails('SYS_002', 'Internal server error', 500, message, INSTANCE),
    );
  }
}
