import type { ChatErrorCode } from '@/types/chatTypes';

export interface ParsedEdgeFunctionError {
  errorCode: ChatErrorCode;
  userFacingMessage: string;
  message: string;
  diagnostic: string;
  statusCode?: number;
  status?: number;
  retryable: boolean;
  appCode?: string | null;
}

export const KNOWN_CHAT_ERROR_CODES = new Set<ChatErrorCode>([
  'api_key_missing',
  'invalid_api_key',
  'unauthorized',
  'forbidden',
  'not_found',
  'bad_request',
  'rate_limited',
  'service_unavailable',
  'gateway_timeout',
  'bad_gateway',
  'network_error',
  'relay_error',
  'edge_function_error',
  'client_error',
  'invalid_response',
  'api_error',
]);

export function mapStatusToErrorCode(status?: number): ChatErrorCode {
  if (!status) return 'edge_function_error';
  switch (status) {
    case 400: return 'bad_request';
    case 401: return 'unauthorized';
    case 403: return 'forbidden';
    case 404: return 'not_found';
    case 429: return 'rate_limited';
    case 502: return 'service_unavailable';
    case 503: return 'service_unavailable';
    case 504: return 'gateway_timeout';
    default:
      if (status >= 400 && status < 500) return 'client_error';
      if (status >= 500) return 'edge_function_error';
      return 'api_error';
  }
}

export function resolveErrorCode(status: number | undefined, appCode: unknown): ChatErrorCode {
  if (typeof appCode === 'string' && KNOWN_CHAT_ERROR_CODES.has(appCode as ChatErrorCode)) {
    return appCode as ChatErrorCode;
  }
  return mapStatusToErrorCode(status);
}

export function getFriendlyErrorMessage(
  errorCode: ChatErrorCode,
  appFriendlyResponse?: string,
  appError?: string
): string {
  if (appFriendlyResponse && typeof appFriendlyResponse === 'string' && appFriendlyResponse.trim()) {
    return appFriendlyResponse.trim();
  }
  switch (errorCode) {
    case 'api_key_missing':
      return 'No LLM API key is configured. Add one in Workspace Settings.';
    case 'invalid_api_key':
      return 'Your LLM provider rejected the API key. Check your configuration in Workspace Settings.';
    case 'unauthorized':
      return 'Authentication failed or workspace session expired. Please unlock the workspace.';
    case 'forbidden':
      return 'Access denied. You do not have permission to perform this request.';
    case 'rate_limited':
      return 'Too many requests. Please wait a moment before trying again.';
    case 'gateway_timeout':
      return 'Request timed out while waiting for a response. Please try again in a few moments.';
    case 'service_unavailable':
    case 'bad_gateway':
      return 'The AI service is temporarily unavailable. Please try again in a few moments.';
    case 'network_error':
      return 'Unable to connect to the server. Please check your network connection and try again.';
    case 'relay_error':
      return 'A relay connection error occurred. Please try again in a few moments.';
    case 'invalid_response':
      return 'Received an invalid or empty response from the AI service. Please try again.';
    default:
      if (
        appError &&
        typeof appError === 'string' &&
        !appError.includes('non-2xx') &&
        !appError.includes('object') &&
        !appError.includes('<!DOCTYPE') &&
        !appError.includes('<html')
      ) {
        return appError;
      }
      return 'An error occurred while processing your request with the AI service.';
  }
}

export function isRetryableErrorCode(code: ChatErrorCode): boolean {
  switch (code) {
    case 'network_error':
    case 'relay_error':
    case 'service_unavailable':
    case 'gateway_timeout':
    case 'bad_gateway':
    case 'rate_limited':
      return true;
    default:
      return false;
  }
}

interface EdgeFunctionErrorLike {
  name?: string;
  message?: string;
  context?: {
    status?: number;
    clone?: () => { text?: () => Promise<string>; json?: () => Promise<unknown> };
    text?: () => Promise<string>;
    json?: () => Promise<unknown>;
  };
}

interface EdgeFunctionResponseBody {
  errorCode?: string;
  error?: string;
  response?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * Standard parser for errors returned from Supabase Edge Function invocations.
 *
 * 1. Safely inspects error.context (FunctionsHttpError.context)
 * 2. Distinguishes fetch-path TypeError from programming bugs
 * 3. Discards HTML error bodies (preventing raw Nginx/Cloudflare dumps in diagnostics)
 * 4. Normalizes status code and error classification
 */
export async function parseEdgeFunctionError(error: unknown): Promise<ParsedEdgeFunctionError> {
  const err = (
    error && typeof error === 'object'
      ? error
      : typeof error === 'string'
      ? { message: error }
      : {}
  ) as EdgeFunctionErrorLike;

  const isFetchPathError =
    err.name === 'FunctionsFetchError' ||
    (error instanceof TypeError && typeof error.message === 'string' && error.message.toLowerCase().includes('failed to fetch')) ||
    (typeof err.message === 'string' && err.message.toLowerCase().includes('failed to fetch'));

  const isRelayError =
    err.name === 'FunctionsRelayError' ||
    (typeof err.message === 'string' && err.message.toLowerCase().includes('relay'));

  if (isFetchPathError) {
    const userFacingMessage = getFriendlyErrorMessage('network_error');
    return {
      errorCode: 'network_error',
      userFacingMessage,
      message: userFacingMessage,
      diagnostic: `Network/Fetch Error: ${err.name ? `[${err.name}] ` : ''}${err.message || 'Failed to fetch'}`,
      retryable: true,
    };
  }

  if (isRelayError) {
    const userFacingMessage = getFriendlyErrorMessage('relay_error');
    return {
      errorCode: 'relay_error',
      userFacingMessage,
      message: userFacingMessage,
      diagnostic: `Relay Error: ${err.name ? `[${err.name}] ` : ''}${err.message || 'FunctionsRelayError'}`,
      retryable: true,
    };
  }

  const context = err.context;
  let statusCode: number | undefined;
  let rawBodyText = '';
  let parsedBody: EdgeFunctionResponseBody | null = null;
  let isHtmlBody = false;

  if (context) {
    if (typeof context.status === 'number') {
      statusCode = context.status;
    }

    try {
      const cloned = typeof context.clone === 'function' ? context.clone() : context;
      if (typeof cloned.text === 'function') {
        rawBodyText = await cloned.text();
      } else if (typeof cloned.json === 'function') {
        try {
          parsedBody = (await cloned.json()) as EdgeFunctionResponseBody;
        } catch {
          // Ignore parse errors
        }
      }

      if (rawBodyText) {
        if (rawBodyText.includes('<!DOCTYPE') || rawBodyText.includes('<html') || rawBodyText.includes('Bad Gateway')) {
          isHtmlBody = true;
        } else {
          try {
            parsedBody = JSON.parse(rawBodyText) as EdgeFunctionResponseBody;
          } catch {
            // Malformed JSON / plain text
          }
        }
      }
    } catch {
      // Stream consumed or uncloneable
    }
  }

  const appCode = parsedBody?.errorCode;
  const isApiKeyIssue =
    (typeof parsedBody?.error === 'string' && parsedBody.error.toLowerCase().includes('api key')) ||
    (typeof err.message === 'string' && err.message.toLowerCase().includes('api key'));

  let errorCode = resolveErrorCode(statusCode, appCode);
  if (!appCode && isApiKeyIssue) {
    errorCode = 'api_key_missing';
  } else if (!parsedBody && (isHtmlBody || (rawBodyText && rawBodyText.includes('Bad Gateway')))) {
    errorCode = statusCode === 504 ? 'gateway_timeout' : 'bad_gateway';
  }

  const appFriendly = parsedBody?.response || parsedBody?.message;
  const appError =
    parsedBody?.error ||
    (typeof err.message === 'string' && !err.message.includes('non-2xx') ? err.message : undefined);
  const userFacingMessage = getFriendlyErrorMessage(errorCode, appFriendly, appError);

  const diagnosticParts = [
    statusCode ? `HTTP ${statusCode}` : null,
    err.name ? `Type: ${err.name}` : null,
    err.message && !err.message.includes('non-2xx') ? `Message: ${err.message}` : null,
    parsedBody?.error ? `Error: ${parsedBody.error}` : null,
    isHtmlBody ? `Body: [HTML response discarded]${rawBodyText.includes('502 Bad Gateway') ? ' (502 Bad Gateway)' : ''}` : (rawBodyText && !rawBodyText.startsWith('{') ? `Body: ${rawBodyText.slice(0, 200)}` : null),
    appCode ? `AppCode: ${appCode}` : null,
  ].filter(Boolean);

  return {
    errorCode,
    userFacingMessage,
    message: userFacingMessage,
    diagnostic: diagnosticParts.join(' | ') || (statusCode ? `HTTP ${statusCode}` : 'Unknown Edge Function Error'),
    statusCode,
    status: statusCode,
    retryable: isRetryableErrorCode(errorCode),
    appCode: typeof appCode === 'string' ? appCode : null,
  };
}
