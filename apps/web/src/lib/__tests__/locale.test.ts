import test from 'node:test';
import assert from 'node:assert/strict';
import { getIntlLocale, resolvePreferredLocale, toSupportedLocale } from '@/lib/locale';

test('toSupportedLocale resolves direct locale values and base fallbacks', () => {
  assert.equal(toSupportedLocale('en'), 'en');
  assert.equal(toSupportedLocale('ES'), 'es');
  assert.equal(toSupportedLocale('pt-PT'), 'pt-BR');
});

test('resolvePreferredLocale picks the first supported browser locale', () => {
  assert.equal(resolvePreferredLocale(['de-DE', 'pt-PT', 'en-US']), 'pt-BR');
  assert.equal(resolvePreferredLocale(['zh-CN', 'it-IT']), 'en');
});

test('getIntlLocale maps app locales to BCP-47 values', () => {
  assert.equal(getIntlLocale('en'), 'en-US');
  assert.equal(getIntlLocale('pt-BR'), 'pt-BR');
});
