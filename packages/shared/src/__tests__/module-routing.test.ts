import { describe, expect, it } from 'vitest';
import { getModuleFromPathname } from '../constants';

describe('module routing', () => {
  it('maps shifts-time to dedicated module key', () => {
    expect(getModuleFromPathname('/shifts-time')).toBe('shifts_time');
    expect(getModuleFromPathname('/shifts-time?tab=coverage')).toBe('shifts_time');
  });

  it('keeps jobs and operations mapped to jobs module key', () => {
    expect(getModuleFromPathname('/jobs')).toBe('jobs');
    expect(getModuleFromPathname('/operations')).toBe('jobs');
  });
});
