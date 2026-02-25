import test from 'node:test';
import assert from 'node:assert/strict';
import { getPublicFormContext, submitPublicForm } from '@/modules/self-service';

async function withTokenMap(
  value: Record<string, unknown> | undefined,
  run: () => Promise<void>,
) {
  const previous = process.env.PUBLIC_FORM_TOKEN_MAP;
  if (value) {
    process.env.PUBLIC_FORM_TOKEN_MAP = JSON.stringify(value);
  } else {
    delete process.env.PUBLIC_FORM_TOKEN_MAP;
  }

  try {
    await run();
  } finally {
    if (previous === undefined) {
      delete process.env.PUBLIC_FORM_TOKEN_MAP;
    } else {
      process.env.PUBLIC_FORM_TOKEN_MAP = previous;
    }
  }
}

test('public form context rejects unknown tokens', async () => {
  await withTokenMap({ known_site_token: { mode: 'site', siteCode: 'ABC01' } }, async () => {
    const result = await getPublicFormContext('forged-token');
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.status, 404);
    }
  });
});

test('public form context blocks universal tokens', async () => {
  await withTokenMap({ universal_token: { mode: 'universal' } }, async () => {
    const result = await getPublicFormContext('universal_token');
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.status, 403);
      assert.equal(result.error, 'Universal tokens are temporarily disabled');
    }
  });
});

test('public form submit blocks universal tokens before db operations', async () => {
  await withTokenMap({ universal_token: { mode: 'universal' } }, async () => {
    const result = await submitPublicForm('universal_token', {
      requestType: 'supply',
      urgency: 'asap',
      details: { item: 'paper', quantity: 3 },
    });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.status, 403);
      assert.equal(result.error, 'Universal tokens are temporarily disabled');
    }
  });
});

test('public form submit accepts new week-12 request types', async () => {
  const requestTypes = ['bio-hazard', 'photo-upload', 'chemical-restock'];

  await withTokenMap({ universal_token: { mode: 'universal' } }, async () => {
    for (const requestType of requestTypes) {
      const result = await submitPublicForm('universal_token', {
        requestType,
        urgency: 'high',
        details: { test: true },
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.status, 403);
        assert.equal(result.error, 'Universal tokens are temporarily disabled');
      }
    }
  });
});
