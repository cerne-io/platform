import { describe, it, expect } from 'vitest';
import { getUserInitials } from '../avatarUtils';

describe('avatarUtils', () => {
  describe('getUserInitials', () => {
    it('extracts two initials from full name', () => {
      expect(getUserInitials('Jane Doe')).toBe('JD');
    });

    it('extracts single initial from one name', () => {
      expect(getUserInitials('Alice')).toBe('A');
    });

    it('falls back to email initial when name is absent', () => {
      expect(getUserInitials(null, 'bob@example.com')).toBe('B');
    });

    it('returns default fallback when name and email are absent', () => {
      expect(getUserInitials(null, null)).toBe('U');
    });
  });
});
