import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails } from '@gleamops/shared';
import { verifySendGridSignature } from '@/lib/sendgrid-webhook-verify';
import { processEvents, type SendGridEvent } from '@/modules/webhooks';

const CONTENT_TYPE_PROBLEM = 'application/problem+json';

function problemResponse(code: string, title: string, status: number, detail: string) {
  const pd = createProblemDetails(code, title, status, detail, '/webhooks/sendgrid');
  return NextResponse.json(pd, {
    status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

export async function POST(request: NextRequest) {
  // 1. Read raw body as bytes — MUST happen before any parsing
  const rawBytes = Buffer.from(await request.arrayBuffer());

  // 2. Signature verification (mandatory — reject if key not configured)
  const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;

  if (!verificationKey) {
    console.error('[webhook] SENDGRID_WEBHOOK_VERIFICATION_KEY not configured');
    return problemResponse('SYS_002', 'Webhook not configured', 500, 'Server is missing the SendGrid webhook verification key');
  }

  const signature = request.headers.get('x-twilio-email-event-webhook-signature') ?? '';
  const timestamp = request.headers.get('x-twilio-email-event-webhook-timestamp') ?? '';

  if (!signature || !timestamp) {
    return problemResponse('AUTH_001', 'Missing signature', 401, 'Missing X-Twilio-Email-Event-Webhook-Signature or Timestamp headers');
  }

  if (!verifySendGridSignature(verificationKey, rawBytes, signature, timestamp)) {
    console.warn('[webhook] invalid ECDSA signature — rejecting');
    return problemResponse('AUTH_001', 'Invalid signature', 401, 'ECDSA signature verification failed against raw request bytes');
  }

  // 3. Parse body only AFTER signature is verified
  let events: SendGridEvent[];
  try {
    events = JSON.parse(rawBytes.toString('utf8'));
  } catch {
    return problemResponse('SYS_001', 'Invalid JSON', 400, 'Request body is not valid JSON');
  }

  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, skipped: 0 });
  }

  // 4. Delegate event processing to service
  const result = await processEvents(events);

  return NextResponse.json({ ok: true, ...result });
}
