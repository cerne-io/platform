/**
 * Returns the base URL to use for public form links
 * Defaults to current domain
 */
export const getPublicFormBaseUrl = (customDomain?: string | null): string => {
  if (customDomain) {
    // Ensure protocol is present
    if (customDomain.startsWith('http://') || customDomain.startsWith('https://')) {
      return customDomain;
    }
    return `https://${customDomain}`;
  }
  return window.location.origin;
};

/**
 * Validates a redirect URL to prevent Open Redirect vulnerabilities.
 * A URL is considered valid if it is:
 * 1. A relative path (starts with / but not //)
 * 2. On the same origin as the current window
 * 3. A trusted subdomain (*.cerne.io)
 */
export const isValidRedirectUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;

  // Block protocol-relative URLs (e.g., //evil.com) as they are often used in bypasses
  if (url.startsWith('//')) {
    return false;
  }

  // Relative paths starting with / are safe
  if (url.startsWith('/')) {
    return true;
  }

  // If it doesn't start with / and doesn't look like an absolute URL (contains a scheme),
  // it's likely malformed or a relative path without a leading slash, which we block
  // to avoid ambiguity.
  if (!url.includes(':')) {
    return false;
  }

  try {
    const parsedUrl = new URL(url, window.location.origin);
    
    // Check if it's the same origin
    if (parsedUrl.origin === window.location.origin) {
      return true;
    }

    // Check if it's a trusted subdomain
    const hostname = parsedUrl.hostname;
    if (hostname.endsWith('.cerne.io') || hostname === 'cerne.io') {
      return true;
    }
  } catch (_e) {
    return false;
  }

  return false;
};
