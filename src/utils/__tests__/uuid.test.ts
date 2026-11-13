import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateUUID } from '../uuid';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('generateUUID', () => {
  const originalCrypto = globalThis.crypto;

  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: originalCrypto,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('generates a valid RFC 4122 v4 UUID with standard crypto.randomUUID', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(UUID_V4_REGEX);
  });

  it('generates a valid RFC 4122 v4 UUID when crypto.randomUUID is undefined but getRandomValues is present', () => {
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
          return arr;
        },
      },
      writable: true,
      configurable: true,
    });

    const uuid = generateUUID();
    expect(uuid).toMatch(UUID_V4_REGEX);
  });

  it('generates a valid RFC 4122 v4 UUID when crypto is completely undefined', () => {
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const uuid = generateUUID();
    expect(uuid).toMatch(UUID_V4_REGEX);
  });

  it('produces unique values across consecutive calls', () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) {
      set.add(generateUUID());
    }
    expect(set.size).toBe(100);
  });
});

