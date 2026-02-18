import { describe, expect, it } from 'vitest';
import { canTransitionPlanningSyncState } from '../planning-state-machine';

describe('canTransitionPlanningSyncState', () => {
  it('allows documented workflow transitions', () => {
    expect(canTransitionPlanningSyncState('synced', 'draft_change')).toBe(true);
    expect(canTransitionPlanningSyncState('draft_change', 'applied')).toBe(true);
    expect(canTransitionPlanningSyncState('applied', 'synced')).toBe(true);
    expect(canTransitionPlanningSyncState('conflict', 'dismissed')).toBe(true);
  });

  it('blocks undefined transitions', () => {
    expect(canTransitionPlanningSyncState('synced', 'applied')).toBe(false);
    expect(canTransitionPlanningSyncState('dismissed', 'applied')).toBe(false);
    expect(canTransitionPlanningSyncState('applied', 'draft_change')).toBe(false);
  });
});
