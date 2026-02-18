import { describe, expect, it } from 'vitest';
import { canTransitionSchedulePeriod } from '../schedule-state-machine';

describe('canTransitionSchedulePeriod', () => {
  it('allows valid transitions', () => {
    expect(canTransitionSchedulePeriod('DRAFT', 'PUBLISHED')).toBe(true);
    expect(canTransitionSchedulePeriod('PUBLISHED', 'LOCKED')).toBe(true);
    expect(canTransitionSchedulePeriod('LOCKED', 'ARCHIVED')).toBe(true);
  });

  it('blocks invalid transitions', () => {
    expect(canTransitionSchedulePeriod('DRAFT', 'LOCKED')).toBe(false);
    expect(canTransitionSchedulePeriod('PUBLISHED', 'DRAFT')).toBe(false);
    expect(canTransitionSchedulePeriod('ARCHIVED', 'DRAFT')).toBe(false);
  });
});
