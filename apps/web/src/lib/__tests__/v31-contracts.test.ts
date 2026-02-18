import test from 'node:test';
import assert from 'node:assert/strict';
import { getLegacyRedirectUrl } from '@/lib/routing/legacy-redirect-map';
import { evaluateEnforcementMode } from '@/modules/schedule/policy-evaluator';
import { defaultCheckwritersFileName, toCheckwritersCsv } from '@/modules/payroll/checkwriters';

test('legacy operations planning redirects to canonical planning route', () => {
  const url = new URL('https://gleamops.example/operations?tab=planning&site=abc');
  const redirected = getLegacyRedirectUrl(url);
  assert.ok(redirected);
  assert.equal(redirected?.pathname, '/planning');
  assert.equal(redirected?.searchParams.get('tab'), null);
  assert.equal(redirected?.searchParams.get('site'), 'abc');
});

test('legacy operations calendar redirects to canonical schedule route', () => {
  const url = new URL('https://gleamops.example/operations?tab=calendar');
  const redirected = getLegacyRedirectUrl(url);
  assert.ok(redirected);
  assert.equal(redirected?.pathname, '/schedule');
  assert.equal(redirected?.searchParams.get('tab'), 'calendar');
});

test('legacy pipeline sub-routes redirect to sales equivalents', () => {
  const url = new URL('https://gleamops.example/pipeline/supply-calculator?x=1');
  const redirected = getLegacyRedirectUrl(url);
  assert.ok(redirected);
  assert.equal(redirected?.pathname, '/sales/supply-calculator');
  assert.equal(redirected?.searchParams.get('x'), '1');
});

test('checkwriters default file name remains under 15 chars', () => {
  const fileName = defaultCheckwritersFileName({
    pay_period_start: '2026-02-01',
    pay_period_end: '2026-02-19',
  });
  assert.match(fileName, /^cw\d{6,8}\.csv$/);
  assert.ok(fileName.length < 15);
});

test('checkwriters CSV writer emits raw data rows without header', () => {
  const csv = toCheckwritersCsv([
    {
      employee_id: 'EMP-1',
      det: 'E',
      det_code: 'REG',
      hours: '8.00',
      rate: '20.00',
      amount: '160.00',
    },
    {
      employee_id: 'EMP-2',
      det: 'E',
      det_code: 'BONUS',
      hours: '',
      rate: '',
      amount: '1,000.00',
    },
  ]);

  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.equal(lines[0], 'EMP-1,E,REG,8.00,20.00,160.00');
  assert.equal(lines[1], 'EMP-2,E,BONUS,,,1000.00');
  assert.equal(lines[0].startsWith('ID,'), false);
});

test('policy evaluator maps enforce modes deterministically', () => {
  assert.deepEqual(evaluateEnforcementMode('warn'), {
    severity: 'WARNING',
    is_blocking: false,
    requires_override: false,
  });
  assert.deepEqual(evaluateEnforcementMode('block'), {
    severity: 'ERROR',
    is_blocking: true,
    requires_override: false,
  });
  assert.deepEqual(evaluateEnforcementMode('override_required'), {
    severity: 'ERROR',
    is_blocking: true,
    requires_override: true,
  });
});
