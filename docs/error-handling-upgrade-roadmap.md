# Cerne Error Handling & Observability Upgrade Roadmap

## 1. Executive Summary & Pragmatic Scope

This roadmap establishes a **lean, privacy-safe error handling and observability foundation** for `cerne-app`.

Rather than building a complex, custom incident-management platform (no outboxes, no background aggregation workers, no incident lifecycle state machines), this design focuses strictly on solving two core questions:
1. **User Experience**: When an error occurs, how do we degrade gracefully, preserve user input, and provide actionable recovery without disruptive alerts?
2. **Observability**: When something breaks, how do we identify the release, component, operation, and backend request—**without collecting or risking any participant narrative data**?

---

### System Architecture Flow

```
                      ┌────────────────────────┐
                      │  Application Failure   │
                      └───────────┬────────────┘
                                  │
                    Normalize & Classify Failure
                     ┌────────────┴────────────┐
                     ▼                         ▼
      ┌─────────────────────────────┐   ┌─────────────────────────────┐
      │   Presentation & Recovery   │   │     Safe Telemetry Facade   │
      │  (src/components/error-ui/) │   │     (src/lib/telemetry/)    │
      │  - Inline degradation       │   │  - Strict small contract    │
      │  - Conversational prompts   │   │  - Non-throwing guarantee   │
      │  - History exclusion        │   │  - Privacy by omission      │
      │  - Input preservation       │   │  - Serialized queue + lease │
      └─────────────────────────────┘   └──────────────┬──────────────┘
                                                       │
                                            HTTP JSON Submission
                                            (1 event per request)
                                                       │
                                                       ▼
                                        ┌─────────────────────────────┐
                                        │   report-error Edge Fn      │
                                        │  - Enforce payload cap (16K)│
                                        │  - Explicit row validation  │
                                        │  - Rate limit (10/hr cap)   │
                                        │  - Accepts unauth (user=null│
                                        │  - Server receivedAt & env  │
                                        └──────────────┬──────────────┘
                                                       │
                                            Idempotent INSERT
                                                       │
                                                       ▼
                                        ┌─────────────────────────────┐
                                        │  client_error_events Table  │
                                        │  (Single queryable table)   │
                                        └──────────────┬──────────────┘
                                                       │
                                            Simple SQL Queries
                                                       │
                                                       ▼
                                        ┌─────────────────────────────┐
                                        │  Admin Investigation / SQL  │
                                        │  Group by: code + operation │
                                        │  Correlate: requestId       │
                                        └─────────────────────────────┘
```

---

## 2. Privacy by Omission

The most secure and maintainable privacy policy is **not collecting risky data in the first place**.

We eliminate the need for complex, fragile regex sanitizers by strictly omitting sensitive fields:
- **No freeform content fields**: All message, narrative, and user text fields are omitted. Identifiers (`code`, `operation`, `component`, `requestId`) and release values are format-validated.
- **No stack traces**: Stacks are omitted from browser telemetry. Component name, operation, and error code **provide initial debugging context** for frontend issues without stack narrative leak risks.
- **No request or response bodies**: Payloads, prompts, stories, and raw API responses are never passed to telemetry.
- **No freeform user feedback in telemetry**: User-submitted support feedback is handled in a separate, explicitly governed support channel.
- **No full URLs**: Query strings, route parameters, and capability tokens are stripped; only static route templates (`/projects/:projectId/stories`) are used if needed.
- **OpenReplay Policy**: Replay tracking is **disabled on all narrative-bearing screens** (including participant survey routes `/submit-story/*`, `/interview/*`, and story-rich authenticated dashboards) until its capture configuration is verified safe. Network body recording is disabled globally, and captured console output and URLs are restricted.

---

## 3. Minimal Event Contract & Runtime Validation

### 3.1 Browser Submission Contract (`src/lib/telemetry/contract.ts`)

```typescript
export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'GATEWAY_TIMEOUT'
  | 'SERVICE_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'AI_OUTPUT_INVALID'
  | 'UNKNOWN_CLIENT_ERROR';

export type OperationName =
  | 'synthesize'
  | 'cluster'
  | 'fetch_stories'
  | 'save_story'
  | 'interview_chat'
  | 'generate_prompt'
  | 'validate_phase';

export type ComponentName =
  | 'NarrativeInterviewer'
  | 'AskCerneChat'
  | 'CustomLlmWidget'
  | 'DesignAssistant'
  | 'CollectForm'
  | 'Dashboard';

/**
 * Strict wire payload sent by the browser.
 * Only validated identifiers, enums, numbers, and booleans.
 */
export interface ClientErrorSubmission {
  schemaVersion: 1;
  eventId: string;             // Client-generated UUID for idempotency
  occurredAt: string;          // ISO 8601 UTC client timestamp
  clientRelease: string;       // Reported build version (e.g. 'v2.4.0' or Git SHA)
  code: ErrorCode;             // Approved registry code
  operation?: OperationName;   // High-level logical action
  component?: ComponentName;   // Originating UI component
  requestId?: string;          // Correlates directly to backend request logs
  httpStatus?: number;         // 400, 401, 403, 404, 429, 502, 503, 504
  handled: boolean;            // True if caught and gracefully presented to user
}

/**
 * Stored database record in public.client_error_events.
 * Origin ('browser') is implicit to this table.
 */
export interface StoredClientError extends ClientErrorSubmission {
  id: string;
  receivedAt: string;          // Server timestamp
  environment: 'development' | 'staging' | 'production';
  userId?: string;             // Derived on server from verified JWT (null if unauthenticated)
}

export interface ErrorContext {
  operation?: OperationName;
  component?: ComponentName;
  requestId?: string;
  httpStatus?: number;
  handled: boolean;
}

export interface ErrorReference {
  eventId: string | null;      // Non-null indicates reference was generated
  code: ErrorCode;
}
```

### 3.2 Ingestion Runtime Validation & Explicit Row Construction

The ingestion endpoint (`supabase/functions/report-error`) enforces strict runtime schema validation. It **never spreads** `{ ...body }` into the database insert.

**Ingestion Checklist**:
1. Check actual payload byte size (reject > 16 KB with `413 Payload Too Large`).
2. Validate `schemaVersion === 1`.
3. Validate `eventId` is a valid UUID format (`/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`).
4. Validate `occurredAt`: allow modest client clock skew (up to 10 minutes in the future; up to 7 days in the past). If outside bounds, normalize to server `receivedAt`. Server `received_at` is always authoritative for queries.
5. Validate `code` against the approved `ErrorCode` registry.
6. Validate `operation` and `component` against approved enum sets if present.
7. Validate `clientRelease` matches bounded identifier format (`/^[a-zA-Z0-9.\-_]{1,64}$/`).
8. Validate `requestId` matches standard UUID or engine identifier format (`/^[a-zA-Z0-9\-_]{8,64}$/`) if present.
9. Validate `httpStatus` is an integer between `100` and `599` if present.
10. Validate `handled` is an explicit boolean.
11. **Anonymous Support**: If the caller has no valid JWT (e.g. participant on public survey/interview), accept the submission, set `user_id = NULL`, and enforce the IP-based rate limit (10 requests/hour).
12. Construct the database insert row explicitly:
    ```typescript
    const insertRow = {
      event_id: validated.eventId,
      schema_version: 1,
      occurred_at: normalizedOccurredAt,
      received_at: new Date().toISOString(),
      client_release: validated.clientRelease,
      environment: Deno.env.get('ENVIRONMENT') || 'production',
      code: validated.code,
      operation: validated.operation ?? null,
      component: validated.component ?? null,
      request_id: validated.requestId ?? null,
      http_status: validated.httpStatus ?? null,
      handled: validated.handled,
      user_id: authenticatedUserId ?? null,
    };
    ```

---

## 4. Telemetry Facade & Serialized Transport

### 4.1 Guaranteed Non-Throwing Telemetry Facade (`src/lib/telemetry/index.ts`)

All classification, UUID generation, and queueing operations are enclosed within the `try/catch` block so telemetry errors **never throw** into application code or interrupt user recovery:

```typescript
export function reportError(
  error: unknown,
  context: ErrorContext
): ErrorReference {
  let code: ErrorCode = 'UNKNOWN_CLIENT_ERROR';
  let eventId: string | null = null;

  try {
    code = classifyErrorCode(error);
    eventId = crypto.randomUUID();

    enqueueTelemetry({
      schemaVersion: 1,
      eventId,
      occurredAt: new Date().toISOString(),
      clientRelease: import.meta.env.VITE_APP_VERSION || 'unknown',
      code,
      operation: context.operation,
      component: context.component,
      requestId: context.requestId,
      httpStatus: context.httpStatus,
      handled: context.handled,
    });
  } catch {
    // Reporting must not interrupt the application.
  }

  // Note: A non-null eventId means a reference was generated, not confirmed stored.
  // Only display a support reference when eventId is non-null.
  return { eventId, code };
}
```

### 4.2 Tiny Serialized Transport Policy

Avoid building an elaborate batching or worker framework. The v1 transport uses simple serialized dispatch:
- **One event per request**: No batch aggregation in browser memory.
- **Serialized queue**: Send one event at a time; do not drain concurrently.
- **In-memory cap**: Buffer holds at most 30 events. If the buffer fills, drop oldest events.
- **Bounded network timeout**: Wrap every fetch in an explicit 5,000ms timeout (using an `AbortController`) so a hung request cannot block the serialized queue indefinitely.
- **Bounded retries**: Retry network or 5xx failures **at most once** after a short delay (e.g. 2s).
- **Permanent failure drop**: Do not retry on `400 Bad Request`, `413 Payload Too Large`, or `422 Unprocessable Entity`.
- **Rate-limit compliance**: Respect `429 Too Many Requests` responses and pause transmission for the indicated duration.
- **Session generation & Account boundary**: Maintain a `sessionGeneration` counter incremented on login, logout, or account change. Invalidate pending queued requests and clear buffer on session change so a pending retry cannot resume under a different identity.
- **Asynchronous isolation**: Asynchronous fetch rejections are caught and handled internally within the transport loop; they never bubble up to `window.onerror`.
- **Protective cap note**: The existing 10 requests/hour per user/IP cap is an initial abuse protection boundary, not a guarantee of complete error capture. Sustained error spikes may be undercounted.

---

## 5. User-Facing Error Handling & Edge Function Degradation

### 5.1 Shared Edge Function Error Parser (`src/services/utils/edgeFunctionErrorParser.ts`)

For HTTP errors, Supabase exposes the response through `FunctionsHttpError.context` rather than normal success data. Network failures do not necessarily have a response status and must be handled separately.

Consolidate edge parsing into one utility for active integrations:
- **Preserve HTTP Status**: Read `error.context.status` whenever available.
- **Safe Network Classification**:
  - `FunctionsFetchError` or fetch-path `TypeError` (e.g. `"Failed to fetch"`) $\rightarrow$ `NETWORK_ERROR`.
  - Generic non-fetch `TypeError` (programming bug) $\rightarrow$ `UNKNOWN_CLIENT_ERROR`.
  - `FunctionsRelayError` $\rightarrow$ `SERVICE_UNAVAILABLE`.
  - Status `429` $\rightarrow$ `RATE_LIMITED`.
  - Status `502` / `503` $\rightarrow$ `SERVICE_UNAVAILABLE`.
  - Status `504` $\rightarrow$ `GATEWAY_TIMEOUT`.
  - Status `401` $\rightarrow$ `AUTH_REQUIRED`.
  - Status `403` $\rightarrow$ `FORBIDDEN`.
- **Discard Gateway HTML**: If `content-type` is HTML (Cloudflare / Kong error pages), discard the body completely.
- **Empathetic Copy**: Return clear, non-technical guidance without internal system details.

### 5.2 Upgrade Targets & Recovery Principles

1. **Narrative Interviewer (`interviewerService.ts` & `useInterviewer.ts`)**:
   - Replace disruptive red toasts with gentle conversational inline bubbles:
     *"I'm having a brief connection issue. Please give me a moment and try sending your thought again."*
   - **Input Preservation & History Exclusion**:
     - Exclude synthetic error messages and failed assistant responses from LLM model history (`isError: true`).
     - **Preserve the participant's original drafted input** so they do not lose their contribution or need to reconstruct it.
2. **Custom LLM Service (`customLlmService.ts` & `useCustomChatGpt.ts`)**:
   - Show: *"The AI service is temporarily unavailable. Please try again shortly."*
   - Only describe the model as "warming up" if an explicit backend application code confirms it.
3. **Anthropic & Perplexity Services (`anthropicService.ts` & `perplexityService.ts`)**:
   - Replace raw `"Edge Function returned a non-2xx status code"` toasts with typed feedback.
4. **Proportionate Mutation Handling**:
   - Remove blind automatic retries now.
   - Reuse existing idempotency support where available. If an endpoint lacks idempotency, do not add automatic retry until that endpoint is made safe. (Do not turn this into a rewrite of every save/billing workflow).
5. **Quiet Intentional Cancellations**:
   - Ignore an abort only when the application knows it intentionally canceled the operation (e.g. component unmount or superseded search query). Timeout-triggered aborts must remain logged as diagnostic events.

---

## 6. Cross-Service Correlation (No Telemetry Duplication)

The backend Python engine (`cerne-engine`) already maintains its own structured logs and metrics. We do **not** duplicate backend exceptions into Supabase tables.

Instead, we link frontend and backend through a single identifier: **`requestId`**.

```
Browser Client                       Supabase Edge Function                 Python Engine (cerne-engine)
      │                                       │                                         │
      ├─── HTTP POST (X-Request-Id: req_a1b2c3d4) ─────────────────────────────────────>│
      │                                       │                                         ├── Logs structured error
      │                                       │                                         │   with requestId: req_a1b2c3d4
      │<── HTTP 504 Gateway Timeout ──────────┼─────────────────────────────────────────┤
      │
      ├── Enqueues ClientErrorSubmission:
      │   { code: 'GATEWAY_TIMEOUT', requestId: 'req_a1b2c3d4', ... }
      │
      └── Persists to client_error_events
```

**Diagnostic Expectation**:
When investigating an issue using `requestId`, administrators find matching backend diagnostics **when the request successfully reached the backend and backend logs remain available**. A browser network failure or gateway timeout that never reached the engine is a meaningful diagnostic outcome in itself.

---

## 7. Database Schema: Single `client_error_events` Table

> [!NOTE]
> Per project guidelines, SQL migrations on Supabase are executed manually. Review the DDL below.

```sql
-- Single, lean frontend error events table
CREATE TABLE IF NOT EXISTS public.client_error_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_version INTEGER NOT NULL DEFAULT 1,
    event_id UUID NOT NULL UNIQUE,
    occurred_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    client_release TEXT NOT NULL,
    environment TEXT NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
    code TEXT NOT NULL,
    operation TEXT,
    component TEXT,
    request_id TEXT,
    http_status INTEGER CHECK (http_status BETWEEN 100 AND 599),
    handled BOOLEAN NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Essential targeted indexes for fast operational lookups
CREATE INDEX IF NOT EXISTS idx_client_error_events_received_at ON public.client_error_events (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_error_events_request_id ON public.client_error_events (request_id) WHERE request_id IS NOT NULL;

-- Row Level Security: Superadmin read-only, service_role write
ALTER TABLE public.client_error_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_error_events FROM PUBLIC, anon, authenticated;

CREATE POLICY "Superadmins can view frontend error events"
ON public.client_error_events
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'superadmin'
    )
);

GRANT SELECT ON public.client_error_events TO authenticated;
GRANT ALL ON public.client_error_events TO service_role;

-- Simple TTL cleanup function (retained for 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_expired_client_errors(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    IF retention_days IS NULL OR retention_days < 7 OR retention_days > 90 THEN
        RAISE EXCEPTION 'Retention days must be between 7 and 90';
    END IF;

    DELETE FROM public.client_error_events
    WHERE received_at < now() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_client_errors(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_client_errors(integer) TO service_role;
```

---

## 8. Operational Investigation Queries

Administrators can investigate issues directly with fast SQL queries:

```sql
-- 1. What are the top frontend errors in the latest release?
SELECT code, component, operation, COUNT(*) AS occurrences
FROM public.client_error_events
WHERE client_release = 'v2.4.0' AND received_at > now() - INTERVAL '24 hours'
GROUP BY code, component, operation
ORDER BY occurrences DESC;

-- 2. Trace a user-reported failure to backend request ID
SELECT event_id, occurred_at, code, component, operation, request_id, http_status
FROM public.client_error_events
WHERE event_id = '00000000-0000-0000-0000-000000000000';

-- 3. Recorded failure counts after a recent deployment
SELECT date_trunc('hour', received_at) AS hour, code, COUNT(*)
FROM public.client_error_events
WHERE received_at > now() - INTERVAL '12 hours'
GROUP BY 1, 2
ORDER BY 1 DESC;
```

---

## 9. Lean 3-Phase Implementation Plan

### Phase 1: User-Facing Error Handling & Recovery (Highest Impact)
- [x] Extract and unit-test `src/services/utils/edgeFunctionErrorParser.ts` for active Edge integrations.
- [x] Upgrade **Narrative Interviewer** (`interviewerService.ts`, `useInterviewer.ts`): conversational inline fallback, preserve participant input, exclude error turns from LLM dialogue history (`isError: true`).
- [x] Upgrade **Custom LLM** (`customLlmService.ts`) and **Anthropic / Perplexity** services: map 502/504 to polite inline recovery without cold-start assumptions.
- [x] Ensure intentional user cancellations (`AbortError` on unmount / navigation) are ignored quietly without triggering toasts; retain timeout aborts.
- [x] Remove blind automatic retries on mutations.

### Phase 2: Minimal Safe Telemetry & Persistence
- [x] Create `src/lib/telemetry/contract.ts` with minimal `ClientErrorSubmission`.
- [x] Implement `src/lib/telemetry/index.ts` with guaranteed non-throwing `reportError()`, session-generation tracking, 5s fetch timeout, and serialized in-memory transport.
- [x] Apply migration for `client_error_events` table and RLS policies.
- [x] Update `supabase/functions/report-error`:
  - Limit body size to 16 KB.
  - Enforce explicit row construction and runtime schema validation (never spread submitted JSON).
  - Accept unauthenticated submissions with `user_id = NULL` and IP rate limiting (10 req/hr).
  - Insert into `client_error_events` using `ON CONFLICT (event_id) DO NOTHING`.
- [x] Schedule `cleanup_expired_client_errors` (e.g. weekly via pg_cron or scheduled maintenance).
- [x] Disable OpenReplay on all narrative-bearing screens (including `/submit-story/*`, `/interview/*`, and story dashboards) and disable network body recording globally.

### Phase 3: Consolidation, Cleanup & Verification
- [x] Route application error-reporting calls through the facade (`reportError`).
- [x] Preserve separate development diagnostics, backend operational logs, and security/audit logging where they serve distinct purposes.
- [x] Migrate any useful presentation or recovery utilities from `errorHandling.tsx` into `src/components/error-ui/`, then deprecate obsolete logging files.
- [x] **Automated Acceptance Tests Checklist**:
  1. **Non-Throwing Guarantee**: Classification, UUID generation, enqueueing, and transport failures never throw into application code.
  2. **Privacy Enforcement**: Unknown fields and injected narrative text are not persisted.
  3. **Idempotent Ingestion**: Retrying the same `eventId` creates only one row (`ON CONFLICT DO NOTHING`).
  4. **Access Security**: Ordinary and anonymous users cannot read `client_error_events` or execute `cleanup_expired_client_errors`.
  5. **Input & History Preservation**: Participant input survives failure and retry without duplicated conversation turns.
  6. **Session Isolation**: Logout / account switching clears the buffer and increments session generation, preventing old queued reports from submitting under a new identity.

---

## 10. When to Add Deferred Features

| Feature | Only Add When |
| :--- | :--- |
| **Incident Lifecycle (Open/Resolved)** | Team grows and multiple engineers need formal ownership and resolution workflows. |
| **Notification Outbox** | Missed error alert emails become a verified, recurring operational problem. |
| **Custom Admin Dashboard** | Direct SQL queries in Supabase become too slow or awkward for daily investigation. |
| **Browser Stack Capture** | Error codes and component names are proven insufficient to locate a specific frontend bug. |
| **Distributed Tracing (Spans)** | `requestId` correlation fails to explain multi-service latency bottlenecks. |
| **True SLO Burn Alerting** | Reliable denominators (total eligible operations vs. failures) are measured and alert fatigue demands it. |
