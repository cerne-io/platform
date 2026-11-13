import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidRedirectUrl } from '../urlUtils';

describe('isValidRedirectUrl Security Hardening', () => {
  beforeEach(() => {
    // Standard mock for window.location.origin
    vi.stubGlobal('location', {
      origin: 'https://app.cerne.io',
      hostname: 'app.cerne.io'
    });
  });

  it('blocks protocol-relative URLs (Bypass attempt: //evil.com)', () => {
    expect(isValidRedirectUrl('//evil.com')).toBe(false);
    expect(isValidRedirectUrl('///evil.com')).toBe(false);
    expect(isValidRedirectUrl('\\\\evil.com')).toBe(false);
  });

  it('allows safe relative paths', () => {
    expect(isValidRedirectUrl('/dashboard')).toBe(true);
    expect(isValidRedirectUrl('/projects/123?tab=settings')).toBe(true);
    expect(isValidRedirectUrl('/auth/callback#access_token=xyz')).toBe(true);
  });

  it('allows exact same-origin URLs', () => {
    expect(isValidRedirectUrl('https://app.cerne.io/settings')).toBe(true);
  });

  it('allows trusted subdomains', () => {
    expect(isValidRedirectUrl('https://admin.cerne.io')).toBe(true);
    expect(isValidRedirectUrl('https://tenant1.cerne.io/login')).toBe(true);
    expect(isValidRedirectUrl('https://cerne.io')).toBe(true);
  });

  it('blocks malicious subdomains/cousin domains', () => {
    expect(isValidRedirectUrl('https://cerne.io.malicious.com')).toBe(false);
    expect(isValidRedirectUrl('https://not-cerne.io')).toBe(false);
    expect(isValidRedirectUrl('https://cerne-io.com')).toBe(false);
  });

  it('blocks other external domains', () => {
    expect(isValidRedirectUrl('https://google.com')).toBe(false);
    expect(isValidRedirectUrl('https://supabase.com')).toBe(false);
  });

  it('blocks dangerous protocols', () => {
    expect(isValidRedirectUrl('javascript:alert(1)')).toBe(false);
    expect(isValidRedirectUrl('data:text/html,<html>')).toBe(false);
    expect(isValidRedirectUrl('vbscript:msgbox(1)')).toBe(false);
  });

  it('handles custom domain environments correctly', () => {
    // Simulate being on a custom domain
    vi.stubGlobal('location', {
      origin: 'https://my-org.com',
      hostname: 'my-org.com'
    });
    
    // Should allow relative paths on custom domain
    expect(isValidRedirectUrl('/dashboard')).toBe(true);
    // Should still allow primary cerne.io domains
    expect(isValidRedirectUrl('https://app.cerne.io/login')).toBe(true);
    // Should NOT allow other domains even if embedded
    expect(isValidRedirectUrl('https://evil.com')).toBe(false);
  });

  it('handles invalid URL strings gracefully', () => {
    expect(isValidRedirectUrl('not-a-url')).toBe(false);
    expect(isValidRedirectUrl(null)).toBe(false);
    expect(isValidRedirectUrl(undefined)).toBe(false);
    expect(isValidRedirectUrl('')).toBe(false);
  });
});
