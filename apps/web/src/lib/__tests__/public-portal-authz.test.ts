import test from 'node:test';
import assert from 'node:assert/strict';
import { getPublicPortal, authCustomerPortal } from '@/modules/public-portal';

test('public portal rejects empty token', async () => {
  const result = await getPublicPortal('');
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.status, 400);
  }
});

test('public portal rejects non-UUID token', async () => {
  const result = await getPublicPortal('not-a-valid-uuid');
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.status, 404);
    assert.equal(result.error, 'Invalid or expired portal link');
  }
});

test('public portal rejects forged UUID token', async () => {
  const result = await getPublicPortal('00000000-0000-1000-8000-000000000000');
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok([404, 500].includes(result.status), `Expected 404 or 500, got ${result.status}`);
  }
});

test('customer portal auth rejects empty token', async () => {
  const result = await authCustomerPortal('');
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.status, 400);
  }
});

test('customer portal auth rejects short token', async () => {
  const result = await authCustomerPortal('abc');
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.status, 404);
    assert.equal(result.error, 'Invalid or expired access code');
  }
});

test('customer portal auth rejects unknown token', async () => {
  const result = await authCustomerPortal('unknown-token-that-is-long-enough');
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok([404, 500].includes(result.status), `Expected 404 or 500, got ${result.status}`);
  }
});
