import test from 'node:test';
import assert from 'node:assert/strict';
import { completePublicWorkOrder, getPublicWorkOrder } from '@/modules/public-work-orders';

async function withTokenMap(
  value: Record<string, unknown> | undefined,
  run: () => Promise<void>,
) {
  const previous = process.env.PUBLIC_WORK_ORDER_TOKEN_MAP;
  if (value) {
    process.env.PUBLIC_WORK_ORDER_TOKEN_MAP = JSON.stringify(value);
  } else {
    delete process.env.PUBLIC_WORK_ORDER_TOKEN_MAP;
  }

  try {
    await run();
  } finally {
    if (previous === undefined) {
      delete process.env.PUBLIC_WORK_ORDER_TOKEN_MAP;
    } else {
      process.env.PUBLIC_WORK_ORDER_TOKEN_MAP = previous;
    }
  }
}

test('public work-order context rejects unknown tokens', async () => {
  await withTokenMap({ known_token: { mode: 'ticket', ticketCode: 'WT-0001' } }, async () => {
    const result = await getPublicWorkOrder('forged-token');
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.status, 404);
    }
  });
});

test('public work-order context blocks universal tokens', async () => {
  await withTokenMap({ universal_token: { mode: 'universal' } }, async () => {
    const result = await getPublicWorkOrder('universal_token');
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.status, 403);
      assert.equal(result.error, 'Universal tokens are temporarily disabled');
    }
  });
});

test('public work-order completion blocks universal tokens before db operations', async () => {
  await withTokenMap({ universal_token: { mode: 'universal' } }, async () => {
    const result = await completePublicWorkOrder('universal_token', {
      signerName: 'Subcontractor One',
      signerEmail: 'sub1@example.com',
      notes: 'Completed all assigned tasks.',
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.status, 403);
      assert.equal(result.error, 'Universal tokens are temporarily disabled');
    }
  });
});
