import { describe, it, expect } from 'vitest';
import { getSafeIntegerId, MAX_SAFE_INT } from '../validationSchemas';

describe('getSafeIntegerId', () => {
  it('normalizes negative integers and overflows into [0, MAX_SAFE_INT) matching server parity', () => {
    expect(getSafeIntegerId(-42)).toBe(42);
    expect(getSafeIntegerId(MAX_SAFE_INT)).toBe(0);
    expect(getSafeIntegerId(MAX_SAFE_INT + 7)).toBe(7);
    expect(getSafeIntegerId(123.9)).toBe(123);
  });

  it('hashes string IDs into non-negative 32-bit integers below MAX_SAFE_INT', () => {
    const hashed = getSafeIntegerId('slider-q-1');
    expect(hashed).toBeGreaterThanOrEqual(0);
    expect(hashed).toBeLessThan(MAX_SAFE_INT);
    expect(getSafeIntegerId('slider-q-1')).toBe(hashed);
  });
});

