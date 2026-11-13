import { describe, it, expect } from 'vitest';
import {
  parseEdgeFunctionError,
  mapStatusToErrorCode,
  isRetryableErrorCode,
} from './edgeFunctionErrorParser';

describe('edgeFunctionErrorParser', () => {
  it('correctly maps HTTP status codes to ChatErrorCode', () => {
    expect(mapStatusToErrorCode(400)).toBe('bad_request');
    expect(mapStatusToErrorCode(401)).toBe('unauthorized');
    expect(mapStatusToErrorCode(403)).toBe('forbidden');
    expect(mapStatusToErrorCode(404)).toBe('not_found');
    expect(mapStatusToErrorCode(429)).toBe('rate_limited');
    expect(mapStatusToErrorCode(502)).toBe('service_unavailable');
    expect(mapStatusToErrorCode(503)).toBe('service_unavailable');
    expect(mapStatusToErrorCode(504)).toBe('gateway_timeout');
  });

  it('identifies retryable error codes', () => {
    expect(isRetryableErrorCode('network_error')).toBe(true);
    expect(isRetryableErrorCode('service_unavailable')).toBe(true);
    expect(isRetryableErrorCode('gateway_timeout')).toBe(true);
    expect(isRetryableErrorCode('rate_limited')).toBe(true);
    expect(isRetryableErrorCode('unauthorized')).toBe(false);
    expect(isRetryableErrorCode('forbidden')).toBe(false);
    expect(isRetryableErrorCode('bad_request')).toBe(false);
  });

  it('handles fetch network failures', async () => {
    const error = new TypeError('Failed to fetch');
    const result = await parseEdgeFunctionError(error);

    expect(result.errorCode).toBe('network_error');
    expect(result.retryable).toBe(true);
    expect(result.userFacingMessage).toContain('check your network connection');
  });

  it('handles FunctionsRelayError', async () => {
    const error = { name: 'FunctionsRelayError', message: 'Relay failure' };
    const result = await parseEdgeFunctionError(error);

    expect(result.errorCode).toBe('relay_error');
    expect(result.retryable).toBe(true);
    expect(result.diagnostic).toContain('FunctionsRelayError');
  });

  it('safely parses JSON context from non-2xx response', async () => {
    const mockContext = new Response(
      JSON.stringify({
        error: 'Monthly usage limit reached',
        errorCode: 'rate_limited',
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );

    const error = {
      name: 'FunctionsHttpError',
      message: 'Edge Function returned a non-2xx status code',
      context: mockContext,
    };

    const result = await parseEdgeFunctionError(error);

    expect(result.statusCode).toBe(429);
    expect(result.errorCode).toBe('rate_limited');
    expect(result.retryable).toBe(true);
    expect(result.diagnostic).toContain('HTTP 429');
    expect(result.diagnostic).toContain('AppCode: rate_limited');
  });

  it('discards gateway HTML error bodies and prevents HTML leakage in diagnostic', async () => {
    const htmlBody = '<!DOCTYPE html><html><head><title>502 Bad Gateway</title></head><body><h1>Bad Gateway</h1></body></html>';
    const mockContext = new Response(htmlBody, {
      status: 502,
      headers: { 'Content-Type': 'text/html' },
    });

    const error = {
      name: 'FunctionsHttpError',
      message: 'Edge Function returned a non-2xx status code',
      context: mockContext,
    };

    const result = await parseEdgeFunctionError(error);

    expect(result.statusCode).toBe(502);
    expect(result.errorCode).toBe('bad_gateway');
    expect(result.diagnostic).not.toContain('<!DOCTYPE html>');
    expect(result.diagnostic).toContain('[HTML response discarded]');
    expect(result.userFacingMessage).toContain('temporarily unavailable');
  });

  it('handles timeout (504) gateway with friendly message', async () => {
    const mockContext = new Response('Gateway Timeout', {
      status: 504,
    });

    const error = {
      name: 'FunctionsHttpError',
      context: mockContext,
    };

    const result = await parseEdgeFunctionError(error);

    expect(result.statusCode).toBe(504);
    expect(result.errorCode).toBe('gateway_timeout');
    expect(result.userFacingMessage).toContain('timed out');
    expect(result.retryable).toBe(true);
  });
});
