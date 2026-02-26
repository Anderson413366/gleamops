import test from 'node:test';
import assert from 'node:assert/strict';
import { _resetFlagCache } from '@gleamops/shared';
import { getTonightBoard } from '@/modules/shifts-time';

const API_PATH = '/api/operations/shifts-time/tonight-board';

test('tonight board denies non-operator roles', async () => {
  _resetFlagCache();
  const result = await getTonightBoard(
    {} as never,
    {
      userId: 'user-1',
      tenantId: 'tenant-1',
      roles: ['SALES'],
    },
    API_PATH,
  );

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.code, 'AUTH_002');
    assert.equal(result.error.status, 403);
  }
});

test('tonight board returns pilot-off payload when shifts-time flags are disabled', async () => {
  const prevV1 = process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1;
  const prevRoute = process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION;
  delete process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1;
  delete process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION;
  _resetFlagCache();

  try {
    const result = await getTonightBoard(
      {} as never,
      {
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['MANAGER'],
      },
      API_PATH,
    );

    assert.equal(result.success, true);
    if (result.success) {
      const payload = result.data as {
        pilot_enabled: boolean;
        my_next_stop: unknown;
        site_summaries: unknown[];
        totals: { sites: number; stops: number; uncovered_sites: number };
      };
      assert.equal(payload.pilot_enabled, false);
      assert.equal(payload.my_next_stop, null);
      assert.equal(payload.site_summaries.length, 0);
      assert.equal(payload.totals.sites, 0);
    }
  } finally {
    if (typeof prevV1 === 'string') process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1 = prevV1;
    else delete process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1;
    if (typeof prevRoute === 'string') process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION = prevRoute;
    else delete process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION;
    _resetFlagCache();
  }
});

test('tonight board does not widen scope when cleaner has no staff mapping', async () => {
  const prevV1 = process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1;
  const prevRoute = process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION;
  process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1 = '1';
  process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION = '1';
  _resetFlagCache();

  const db = {
    from(table: string) {
      if (table !== 'staff') {
        throw new Error(`unexpected table query: ${table}`);
      }
      return {
        select() { return this; },
        eq() { return this; },
        is() { return this; },
        maybeSingle: async () => ({ data: null, error: null }),
      };
    },
  };

  try {
    const result = await getTonightBoard(
      db as never,
      {
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['CLEANER'],
      },
      API_PATH,
    );

    assert.equal(result.success, true);
    if (result.success) {
      const payload = result.data as {
        pilot_enabled: boolean;
        my_next_stop: unknown;
        site_summaries: unknown[];
        totals: { sites: number; stops: number; uncovered_sites: number };
      };
      assert.equal(payload.pilot_enabled, true);
      assert.equal(payload.my_next_stop, null);
      assert.equal(payload.site_summaries.length, 0);
      assert.equal(payload.totals.stops, 0);
    }
  } finally {
    if (typeof prevV1 === 'string') process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1 = prevV1;
    else delete process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1;
    if (typeof prevRoute === 'string') process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION = prevRoute;
    else delete process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_ROUTE_EXECUTION;
    _resetFlagCache();
  }
});
