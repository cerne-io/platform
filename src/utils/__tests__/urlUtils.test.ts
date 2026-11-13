import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isValidRedirectUrl } from '../urlUtils';

describe('isValidRedirectUrl', () => {
  beforeEach(() => {
    vi.stubGlobal('location', {
      origin: 'https://app.cerne.io',
      hostname: 'app.cerne.io',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return false for null, undefined or empty string', () => {
    expect(isValidRedirectUrl(null)).toBe(false);
    expect(isValidRedirectUrl(undefined)).toBe(false);
    expect(isValidRedirectUrl('')).toBe(false);
  });

  it('should return true for safe relative paths', () => {
    expect(isValidRedirectUrl('/projects')).toBe(true);
    expect(isValidRedirectUrl('/dashboard?tab=1')).toBe(true);
    expect(isValidRedirectUrl('/auth/callback#token=123')).toBe(true);
  });

  it('should return false for protocol-relative URLs', () => {
    expect(isValidRedirectUrl('//evil.com')).toBe(false);
    expect(isValidRedirectUrl('//cerne.io')).toBe(false);
  });

  it('should return true for same-origin absolute URLs', () => {
    expect(isValidRedirectUrl('https://app.cerne.io/projects')).toBe(true);
  });

  it('should return true for trusted subdomains', () => {
    expect(isValidRedirectUrl('https://admin.cerne.io')).toBe(true);
    expect(isValidRedirectUrl('https://tenant.cerne.io/login')).toBe(true);
    expect(isValidRedirectUrl('https://cerne.io')).toBe(true);
  });

  it('should return false for untrusted domains', () => {
    expect(isValidRedirectUrl('https://google.com')).toBe(false);
    expect(isValidRedirectUrl('https://evil-cerne.io')).toBe(false);
    expect(isValidRedirectUrl('https://cerne.io.evil.com')).toBe(false);
  });

  it('should return false for malformed URLs that are not relative paths', () => {
    expect(isValidRedirectUrl('javascript:alert(1)')).toBe(false);
    expect(isValidRedirectUrl('data:text/html,<html>')).toBe(false);
  });

  it('should work correctly on custom domains', () => {
    // Mock window.location for a custom domain
    vi.stubGlobal('location', {
      origin: 'https://mycustomdomain.com',
      hostname: 'mycustomdomain.com',
    });

    expect(isValidRedirectUrl('/projects')).toBe(true);
    expect(isValidRedirectUrl('https://mycustomdomain.com/dashboard')).toBe(true);
    expect(isValidRedirectUrl('https://app.cerne.io/login')).toBe(true);
    expect(isValidRedirectUrl('https://evil.com')).toBe(false);
  });
});
