import assert from 'node:assert/strict';
import test from 'node:test';
import { generateRoutesForDate } from '@/modules/route-templates';

const API_PATH = '/api/operations/routes/generate';

test('generateRoutesForDate succeeds for manager role', async () => {
  const db = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    rpc(_name: string, _params: Record<string, unknown>) {
      return Promise.resolve({
        data: [{ id: 'route-1' }, { id: 'route-2' }],
        error: null,
      });
    },
  };

  const result = await generateRoutesForDate(
    db as never,
    { userId: 'user-1', tenantId: 'tenant-1', roles: ['MANAGER'] },
    '2026-03-01',
    API_PATH,
  );

  assert.equal(result.success, true);
  if (result.success) {
    const routes = result.data as Array<{ id: string }>;
    assert.equal(routes.length, 2);
  }
});

test('generateRoutesForDate rejects unauthorized role', async () => {
  const db = {
    rpc() {
      return Promise.resolve({ data: [], error: null });
    },
  };

  const result = await generateRoutesForDate(
    db as never,
    { userId: 'user-1', tenantId: 'tenant-1', roles: ['CLEANER'] },
    '2026-03-01',
    API_PATH,
  );

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.status, 403);
  }
});

test('generateRoutesForDate surfaces RPC error', async () => {
  const db = {
    rpc() {
      return Promise.resolve({ data: null, error: { message: 'generation failed' } });
    },
  };

  const result = await generateRoutesForDate(
    db as never,
    { userId: 'user-1', tenantId: 'tenant-1', roles: ['OWNER_ADMIN'] },
    '2026-03-01',
    API_PATH,
  );

  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.detail?.includes('generation failed'));
  }
});

test('generateRoutesForDate returns empty array when no templates match', async () => {
  const db = {
    rpc() {
      return Promise.resolve({ data: null, error: null });
    },
  };

  const result = await generateRoutesForDate(
    db as never,
    { userId: 'user-1', tenantId: 'tenant-1', roles: ['MANAGER'] },
    '2026-03-01',
    API_PATH,
  );

  assert.equal(result.success, true);
  if (result.success) {
    const routes = result.data as unknown[];
    assert.equal(routes.length, 0);
  }
});
