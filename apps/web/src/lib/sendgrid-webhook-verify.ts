/**
 * SendGrid Signed Event Webhook — ECDSA P-256 / SHA-256 verification
 *
 * Spec:
 *   The signed payload is: timestamp_string_bytes + raw_request_body_bytes
 *   (no separator, concatenated directly).
 *
 *   Headers:
 *     X-Twilio-Email-Event-Webhook-Signature  — base64-encoded ECDSA DER signature
 *     X-Twilio-Email-Event-Webhook-Timestamp  — unix timestamp string
 *
 *   The verification key from the SendGrid dashboard is a base64-encoded
 *   ECDSA P-256 public key in SPKI/DER format.
 *
 * CRITICAL: the payload MUST be the raw HTTP request body bytes — never
 * JSON.parse then JSON.stringify, because that changes key ordering,
 * whitespace, and Unicode escaping, which invalidates the signature.
 *
 * Reference:
 *   https://github.com/sendgrid/sendgrid-go/blob/main/helpers/eventwebhook/eventwebhook.go
 */

import { createVerify } from 'crypto';

/**
 * Convert a base64-encoded DER (SPKI) public key into PEM format.
 * Strips any whitespace the env var might contain, then wraps to 64-char lines.
 */
export function derBase64ToPem(base64Key: string): string {
  const clean = base64Key.replace(/\s+/g, '');
  if (clean.length === 0) throw new Error('Empty public key');

  const lines = clean.match(/.{1,64}/g)!;
  return (
    '-----BEGIN PUBLIC KEY-----\n' +
    lines.join('\n') +
    '\n-----END PUBLIC KEY-----'
  );
}

/**
 * Verify a SendGrid Signed Event Webhook request.
 *
 * @param publicKeyBase64  Base64-encoded ECDSA P-256 public key (SPKI/DER)
 * @param rawPayload       Raw HTTP body bytes — MUST NOT be parsed/re-serialized
 * @param signatureBase64  Value of X-Twilio-Email-Event-Webhook-Signature header
 * @param timestamp        Value of X-Twilio-Email-Event-Webhook-Timestamp header
 * @returns true when signature is valid
 */
export function verifySendGridSignature(
  publicKeyBase64: string,
  rawPayload: Buffer,
  signatureBase64: string,
  timestamp: string,
): boolean {
  try {
    const pem = derBase64ToPem(publicKeyBase64);

    // Signed data = timestamp bytes ++ raw payload bytes (no separator)
    const verifier = createVerify('SHA256');
    verifier.update(timestamp, 'utf8');
    verifier.update(rawPayload);
    verifier.end();

    return verifier.verify(
      { key: pem, dsaEncoding: 'der' },
      signatureBase64,
      'base64',
    );
  } catch (err) {
    console.error('[sendgrid-verify] signature verification error:', err);
    return false;
  }
}
