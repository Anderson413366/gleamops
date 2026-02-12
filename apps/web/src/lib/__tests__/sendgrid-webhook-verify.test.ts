/**
 * Tests for SendGrid Signed Event Webhook ECDSA verification.
 *
 * Run with:  npx tsx --test apps/web/src/lib/__tests__/sendgrid-webhook-verify.test.ts
 *
 * Proves that:
 *   1. Raw bytes verify correctly
 *   2. JSON.parse → JSON.stringify breaks the signature (different byte sequence)
 *   3. Missing/empty headers are rejected
 *   4. Wrong key / tampered payload are rejected
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSign, generateKeyPairSync } from 'node:crypto';
import { verifySendGridSignature, derBase64ToPem } from '../sendgrid-webhook-verify';

// ---------------------------------------------------------------------------
// Generate a fresh ECDSA P-256 key pair for testing
// ---------------------------------------------------------------------------
const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });

// Export the public key as base64 DER (SPKI) — same format SendGrid provides
const publicKeyDer = publicKey.export({ type: 'spki', format: 'der' });
const publicKeyBase64 = publicKeyDer.toString('base64');

/**
 * Helper: sign payload exactly like SendGrid does.
 *   signed_data = timestamp_bytes + raw_payload_bytes
 *   signature = ECDSA_sign(SHA256, signed_data)
 */
function signPayload(timestamp: string, rawPayload: Buffer): string {
  const signer = createSign('SHA256');
  signer.update(timestamp, 'utf8');
  signer.update(rawPayload);
  signer.end();

  const signatureDer = signer.sign({ key: privateKey, dsaEncoding: 'der' });
  return signatureDer.toString('base64');
}

// ---------------------------------------------------------------------------
// Test data: a realistic SendGrid event webhook payload
// Note the specific whitespace/formatting — this is what SendGrid actually sends.
// ---------------------------------------------------------------------------
const SAMPLE_PAYLOAD = `[{"email":"test@example.com","event":"delivered","sg_event_id":"ZGVsaXZlcmVk","sg_message_id":"abc123.filter0001","timestamp":1600112502,"smtp-id":"<abc123@example.com>","category":["cat1","cat2"]}]`;

const TIMESTAMP = '1600112502';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('verifySendGridSignature', () => {
  it('passes with raw bytes (correct behavior)', () => {
    const rawPayload = Buffer.from(SAMPLE_PAYLOAD, 'utf8');
    const signature = signPayload(TIMESTAMP, rawPayload);

    const result = verifySendGridSignature(publicKeyBase64, rawPayload, signature, TIMESTAMP);
    assert.equal(result, true, 'Signature should verify against raw bytes');
  });

  it('FAILS when payload goes through JSON.parse → JSON.stringify', () => {
    const rawPayload = Buffer.from(SAMPLE_PAYLOAD, 'utf8');
    const signature = signPayload(TIMESTAMP, rawPayload);

    // Simulate the bug: parse and re-serialize the JSON
    const parsed = JSON.parse(SAMPLE_PAYLOAD);
    const reserialized = Buffer.from(JSON.stringify(parsed), 'utf8');

    // The raw bytes differ (key order, spacing, escaping may change)
    const bytesMatch = rawPayload.equals(reserialized);
    // They might match for this simple case, so let's also test with a payload
    // that has intentional formatting differences
    const spacedPayload = `[ { "email" : "test@example.com" , "event" : "delivered" } ]`;
    const spacedRaw = Buffer.from(spacedPayload, 'utf8');
    const spacedSig = signPayload(TIMESTAMP, spacedRaw);

    const spacedParsed = JSON.parse(spacedPayload);
    const spacedReserialized = Buffer.from(JSON.stringify(spacedParsed), 'utf8');

    // These WILL differ because JSON.stringify removes extra spaces
    assert.notEqual(
      spacedRaw.toString('utf8'),
      spacedReserialized.toString('utf8'),
      'Re-serialized JSON should differ from original (whitespace stripped)',
    );

    // Verification MUST fail with re-serialized bytes
    const result = verifySendGridSignature(
      publicKeyBase64,
      spacedReserialized,
      spacedSig,
      TIMESTAMP,
    );
    assert.equal(result, false, 'Signature must fail after JSON round-trip');
  });

  it('fails with wrong public key', () => {
    const rawPayload = Buffer.from(SAMPLE_PAYLOAD, 'utf8');
    const signature = signPayload(TIMESTAMP, rawPayload);

    // Generate a different key
    const { publicKey: wrongKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const wrongKeyBase64 = wrongKey.export({ type: 'spki', format: 'der' }).toString('base64');

    const result = verifySendGridSignature(wrongKeyBase64, rawPayload, signature, TIMESTAMP);
    assert.equal(result, false, 'Wrong key should fail verification');
  });

  it('fails with tampered payload', () => {
    const rawPayload = Buffer.from(SAMPLE_PAYLOAD, 'utf8');
    const signature = signPayload(TIMESTAMP, rawPayload);

    const tampered = Buffer.from(SAMPLE_PAYLOAD.replace('delivered', 'bounced'), 'utf8');
    const result = verifySendGridSignature(publicKeyBase64, tampered, signature, TIMESTAMP);
    assert.equal(result, false, 'Tampered payload should fail verification');
  });

  it('fails with wrong timestamp', () => {
    const rawPayload = Buffer.from(SAMPLE_PAYLOAD, 'utf8');
    const signature = signPayload(TIMESTAMP, rawPayload);

    const result = verifySendGridSignature(publicKeyBase64, rawPayload, signature, '9999999999');
    assert.equal(result, false, 'Wrong timestamp should fail verification');
  });

  it('fails with empty signature', () => {
    const rawPayload = Buffer.from(SAMPLE_PAYLOAD, 'utf8');
    const result = verifySendGridSignature(publicKeyBase64, rawPayload, '', TIMESTAMP);
    assert.equal(result, false, 'Empty signature should fail');
  });

  it('fails with garbage signature', () => {
    const rawPayload = Buffer.from(SAMPLE_PAYLOAD, 'utf8');
    const result = verifySendGridSignature(publicKeyBase64, rawPayload, 'not-a-real-sig', TIMESTAMP);
    assert.equal(result, false, 'Garbage signature should fail');
  });
});

describe('derBase64ToPem', () => {
  it('wraps base64 key into PEM format', () => {
    const pem = derBase64ToPem(publicKeyBase64);
    assert.ok(pem.startsWith('-----BEGIN PUBLIC KEY-----\n'), 'Should have PEM header');
    assert.ok(pem.endsWith('\n-----END PUBLIC KEY-----'), 'Should have PEM footer');
  });

  it('strips whitespace from env var artifacts', () => {
    const keyWithSpaces = '  ' + publicKeyBase64.slice(0, 20) + '\n' + publicKeyBase64.slice(20) + '  ';
    const pem = derBase64ToPem(keyWithSpaces);
    assert.ok(pem.includes('-----BEGIN PUBLIC KEY-----'), 'Should still produce valid PEM');
    // No whitespace in the body lines except the line breaks
    const body = pem
      .replace('-----BEGIN PUBLIC KEY-----\n', '')
      .replace('\n-----END PUBLIC KEY-----', '');
    for (const line of body.split('\n')) {
      assert.ok(line.length <= 64, `PEM line should be <= 64 chars, got ${line.length}`);
      assert.ok(!/\s/.test(line), 'PEM body lines should have no whitespace');
    }
  });

  it('throws on empty key', () => {
    assert.throws(() => derBase64ToPem(''), /Empty public key/);
    assert.throws(() => derBase64ToPem('   '), /Empty public key/);
  });
});
