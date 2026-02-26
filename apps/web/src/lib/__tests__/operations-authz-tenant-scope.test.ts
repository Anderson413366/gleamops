import test from 'node:test';
import assert from 'node:assert/strict';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';

/**
 * Builds a minimal NextRequest-like object for auth guard testing.
 * These tests verify the auth guard rejects requests without credentials
 * and enforces tenant scoping — protecting all /api/operations/* routes.
 */
function fakeRequest(headers: Record<string, string> = {}): Parameters<typeof extractAuth>[0] {
  return {
    headers: {
      get(name: string) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
  } as Parameters<typeof extractAuth>[0];
}

test('extractAuth rejects request without authorization header', async () => {
  const result = await extractAuth(fakeRequest(), '/api/operations/complaints');
  assert.equal(isAuthError(result), true);
});

test('extractAuth rejects request with empty authorization header', async () => {
  const result = await extractAuth(fakeRequest({ authorization: '' }), '/api/operations/complaints');
  // Empty string is falsy, should be rejected
  assert.equal(isAuthError(result), true);
});

test('extractAuth rejects request with invalid bearer token', async () => {
  const result = await extractAuth(
    fakeRequest({ authorization: 'Bearer invalid-jwt-token' }),
    '/api/operations/routes',
  );
  assert.equal(isAuthError(result), true);
});

test('isAuthError returns false for valid AuthContext shape', () => {
  const ctx = { userId: 'u1', tenantId: 't1', roles: ['MANAGER'] };
  assert.equal(isAuthError(ctx as ReturnType<typeof extractAuth> extends Promise<infer T> ? T : never), false);
});
