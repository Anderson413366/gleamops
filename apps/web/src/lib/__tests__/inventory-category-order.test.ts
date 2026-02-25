import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareSupplyCategories,
  formatSupplyCategoryLabel,
  normalizeSupplyCategory,
} from '@/lib/inventory/category-order';

test('normalizeSupplyCategory converts user labels to canonical keys', () => {
  assert.equal(normalizeSupplyCategory('Floor Care'), 'FLOOR_CARE');
  assert.equal(normalizeSupplyCategory('restroom-items'), 'RESTROOM_ITEMS');
  assert.equal(normalizeSupplyCategory(''), 'UNCATEGORIZED');
  assert.equal(normalizeSupplyCategory(null), 'UNCATEGORIZED');
});

test('compareSupplyCategories enforces standard inventory category order', () => {
  const categories = ['SPECIALTY', 'RESTROOM', 'GENERAL', 'FLOOR_CARE'];
  categories.sort(compareSupplyCategories);
  assert.deepEqual(categories, ['GENERAL', 'RESTROOM', 'FLOOR_CARE', 'SPECIALTY']);
});

test('compareSupplyCategories falls back to alphabetical for non-standard categories', () => {
  const categories = ['Zeta', 'Alpha', 'GENERAL'];
  categories.sort(compareSupplyCategories);
  assert.deepEqual(categories, ['GENERAL', 'Alpha', 'Zeta']);
});

test('formatSupplyCategoryLabel renders readable headers', () => {
  assert.equal(formatSupplyCategoryLabel('FLOOR_CARE'), 'Floor Care');
  assert.equal(formatSupplyCategoryLabel('UNCATEGORIZED'), 'Uncategorized');
});
