import test from 'node:test';
import assert from 'node:assert/strict';
import { isExternalHttpUrl } from '@/lib/url';

test('isExternalHttpUrl accepts http and https URLs', () => {
  assert.equal(isExternalHttpUrl('https://example.com/sds.pdf'), true);
  assert.equal(isExternalHttpUrl('http://example.com/sds.pdf'), true);
});

test('isExternalHttpUrl rejects non-URL text and relative paths', () => {
  assert.equal(isExternalHttpUrl('See SDS Sheet'), false);
  assert.equal(isExternalHttpUrl('N/A - Non-hazardous'), false);
  assert.equal(isExternalHttpUrl('/inventory/supplies/abc'), false);
});
