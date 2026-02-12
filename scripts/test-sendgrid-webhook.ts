#!/usr/bin/env npx tsx
/**
 * Test script for SendGrid Signed Event Webhook replay.
 *
 * Usage:
 *   npx tsx scripts/test-sendgrid-webhook.ts
 *
 * Requirements:
 *   - SENDGRID_WEBHOOK_VERIFICATION_KEY env var (base64 ECDSA P-256 public key)
 *   - SENDGRID_WEBHOOK_SIGNING_KEY env var (base64 ECDSA P-256 private key — test only)
 *   - Server running at http://localhost:3000
 *
 * This script:
 *   1. Signs a sample webhook payload using the private key
 *   2. Sends it to the local webhook endpoint
 *   3. Verifies the response (200 = valid, 401 = rejected)
 *   4. Sends a tampered payload and verifies rejection (401)
 */

import { createSign, generateKeyPairSync, createPublicKey } from 'crypto';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const WEBHOOK_URL = process.env.WEBHOOK_URL ?? 'http://localhost:3000/api/webhooks/sendgrid';

// Generate an ephemeral ECDSA P-256 key pair for testing
const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
});

// Export public key as base64 DER (SPKI) — this is what SendGrid provides
const pubDer = publicKey.export({ type: 'spki', format: 'der' });
const pubBase64 = pubDer.toString('base64');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sign(timestamp: string, payload: Buffer): string {
  const signer = createSign('SHA256');
  signer.update(timestamp, 'utf8');
  signer.update(payload);
  signer.end();
  return signer.sign({ key: privateKey, dsaEncoding: 'der' }, 'base64');
}

async function sendWebhook(
  payload: Buffer,
  signature: string,
  timestamp: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Twilio-Email-Event-Webhook-Signature': signature,
      'X-Twilio-Email-Event-Webhook-Timestamp': timestamp,
    },
    body: payload,
  });
  const body = await res.json();
  return { status: res.status, body };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== SendGrid Webhook Replay Test ===\n');
  console.log(`Endpoint: ${WEBHOOK_URL}`);
  console.log(`Test public key (base64): ${pubBase64.slice(0, 40)}...`);
  console.log();

  // NOTE: The server uses its own SENDGRID_WEBHOOK_VERIFICATION_KEY.
  // For end-to-end testing, set that env var to the pubBase64 value above.
  console.log('To run end-to-end, set your server env:');
  console.log(`  SENDGRID_WEBHOOK_VERIFICATION_KEY=${pubBase64}\n`);

  const timestamp = String(Math.floor(Date.now() / 1000));

  // Test 1: Valid signed payload
  console.log('--- Test 1: Valid signature ---');
  const events = [
    {
      sg_event_id: `test-${Date.now()}-1`,
      sg_message_id: 'test-message-id-001.filter0001.sendgrid.net',
      event: 'delivered',
      email: 'test@example.com',
      timestamp: parseInt(timestamp),
    },
  ];
  const payload = Buffer.from(JSON.stringify(events), 'utf8');
  const sig = sign(timestamp, payload);

  try {
    const r1 = await sendWebhook(payload, sig, timestamp);
    const pass1 = r1.status === 200;
    console.log(`  Status: ${r1.status} ${pass1 ? 'PASS' : 'FAIL'}`);
    console.log(`  Body: ${JSON.stringify(r1.body)}\n`);
  } catch (err: any) {
    console.log(`  ERROR: ${err.message} (is the server running?)\n`);
  }

  // Test 2: Tampered payload (should be rejected)
  console.log('--- Test 2: Tampered payload (expect 401) ---');
  const tamperedPayload = Buffer.from(JSON.stringify([{ ...events[0], event: 'bounce' }]), 'utf8');

  try {
    const r2 = await sendWebhook(tamperedPayload, sig, timestamp);
    const pass2 = r2.status === 401;
    console.log(`  Status: ${r2.status} ${pass2 ? 'PASS' : 'FAIL'}`);
    console.log(`  Body: ${JSON.stringify(r2.body)}\n`);
  } catch (err: any) {
    console.log(`  ERROR: ${err.message}\n`);
  }

  // Test 3: Missing signature (should be rejected)
  console.log('--- Test 3: Missing signature (expect 401) ---');

  try {
    const r3 = await sendWebhook(payload, '', timestamp);
    const pass3 = r3.status === 401;
    console.log(`  Status: ${r3.status} ${pass3 ? 'PASS' : 'FAIL'}`);
    console.log(`  Body: ${JSON.stringify(r3.body)}\n`);
  } catch (err: any) {
    console.log(`  ERROR: ${err.message}\n`);
  }

  // Test 4: Replay with wrong timestamp (should be rejected)
  console.log('--- Test 4: Wrong timestamp (expect 401) ---');
  const wrongTimestamp = String(parseInt(timestamp) - 100000);

  try {
    const r4 = await sendWebhook(payload, sig, wrongTimestamp);
    const pass4 = r4.status === 401;
    console.log(`  Status: ${r4.status} ${pass4 ? 'PASS' : 'FAIL'}`);
    console.log(`  Body: ${JSON.stringify(r4.body)}\n`);
  } catch (err: any) {
    console.log(`  ERROR: ${err.message}\n`);
  }

  console.log('=== Done ===');
}

main().catch(console.error);
