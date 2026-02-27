import assert from 'node:assert/strict';
import test from 'node:test';
import { toCoverageOfferSummary } from '@/modules/shifts-time';

test('toCoverageOfferSummary maps all fields from a complete row', () => {
  const row = {
    id: 'offer-1',
    callout_event_id: 'callout-1',
    candidate_staff_id: 'staff-1',
    candidate: { full_name: 'Jane Doe', staff_code: 'STF-001', id: 'staff-1' },
    status: 'PENDING',
    offered_at: '2026-03-01T08:00:00Z',
    expires_at: '2026-03-01T09:00:00Z',
    responded_at: null,
    response_note: null,
  };

  const result = toCoverageOfferSummary(row);

  assert.equal(result.id, 'offer-1');
  assert.equal(result.callout_event_id, 'callout-1');
  assert.equal(result.candidate_staff_id, 'staff-1');
  assert.equal(result.candidate_name, 'Jane Doe');
  assert.equal(result.candidate_code, 'STF-001');
  assert.equal(result.status, 'PENDING');
  assert.equal(result.offered_at, '2026-03-01T08:00:00Z');
  assert.equal(result.expires_at, '2026-03-01T09:00:00Z');
  assert.equal(result.responded_at, null);
  assert.equal(result.response_note, null);
});

test('toCoverageOfferSummary handles null candidate relation', () => {
  const row = {
    id: 'offer-2',
    callout_event_id: 'callout-2',
    candidate_staff_id: 'staff-2',
    candidate: null,
    status: 'ACCEPTED',
    offered_at: '2026-03-01T08:00:00Z',
    expires_at: null,
    responded_at: '2026-03-01T08:30:00Z',
    response_note: 'On my way',
  };

  const result = toCoverageOfferSummary(row);

  assert.equal(result.candidate_name, null);
  assert.equal(result.candidate_code, null);
  assert.equal(result.status, 'ACCEPTED');
  assert.equal(result.responded_at, '2026-03-01T08:30:00Z');
  assert.equal(result.response_note, 'On my way');
});

test('toCoverageOfferSummary handles array candidate relation (Supabase join)', () => {
  const row = {
    id: 'offer-3',
    callout_event_id: 'callout-3',
    candidate_staff_id: 'staff-3',
    candidate: [{ full_name: 'Bob', staff_code: 'STF-003', id: 'staff-3' }],
    status: 'DECLINED',
    offered_at: '2026-03-01T08:00:00Z',
    expires_at: null,
    responded_at: '2026-03-01T08:15:00Z',
    response_note: 'Cannot make it',
  };

  const result = toCoverageOfferSummary(row);

  assert.equal(result.candidate_name, 'Bob');
  assert.equal(result.candidate_code, 'STF-003');
  assert.equal(result.status, 'DECLINED');
});

test('toCoverageOfferSummary defaults status to PENDING when missing', () => {
  const row = {
    id: 'offer-4',
    callout_event_id: 'callout-4',
    candidate_staff_id: 'staff-4',
    candidate: null,
    offered_at: '2026-03-01T08:00:00Z',
  };

  const result = toCoverageOfferSummary(row);

  assert.equal(result.status, 'PENDING');
  assert.equal(result.expires_at, null);
  assert.equal(result.responded_at, null);
  assert.equal(result.response_note, null);
});

test('toCoverageOfferSummary maps all valid coverage offer statuses', () => {
  const statuses = ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELED'];
  for (const status of statuses) {
    const row = {
      id: `offer-${status}`,
      callout_event_id: 'callout-1',
      candidate_staff_id: 'staff-1',
      candidate: null,
      status,
      offered_at: '2026-03-01T08:00:00Z',
    };

    const result = toCoverageOfferSummary(row);
    assert.equal(result.status, status, `expected status ${status}`);
  }
});
