import assert from 'node:assert/strict';
import test from 'node:test';
import { localDateIso } from '../constants';

test('localDateIso returns YYYY-MM-DD in local timezone', () => {
  const result = localDateIso();
  // Must match ISO date format
  assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
});

test('localDateIso matches local Date components (not UTC)', () => {
  const result = localDateIso();
  const now = new Date();
  const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  assert.equal(result, expected);
});

test('localDateIso pads single-digit month and day', () => {
  const result = localDateIso();
  const parts = result.split('-');
  assert.equal(parts[1]!.length, 2);
  assert.equal(parts[2]!.length, 2);
});
