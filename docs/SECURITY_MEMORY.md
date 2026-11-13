# Security Memory

This document records key architectural security decisions, patterns, and accepted risks in the `cerne-app` codebase.

## Token Hashing Pattern (SHA256)

**Pattern**: `encode(digest(token, 'sha256'), 'hex')`
**Context**: Used for `dashboard_tokens` and other public share links.

### Rationale
- **Performance**: SHA256 lookups are significantly faster than bcrypt (`crypt`) for public-facing endpoints that may experience high traffic.
- **Deterministic**: Unlike bcrypt, SHA256 is deterministic without knowing the salt upfront, which simplifies the `WHERE` clause for token lookups while still providing robust protection against plain-text leaks in the event of a database dump.
- **Credential-as-Auth**: For public dashboards, the token itself is the credential. No `auth.uid()` check is required, as possession of the token implies authorization to view the project data.

### Relevant Functions
- `public.create_dashboard_token`
- `public.validate_dashboard_token`
- `public.get_public_dashboard_data`

---

## Cron-Only Function Protection (Defense-in-Depth)

**Pattern**: `IF current_setting('request.jwt.claim.role', true) IS NOT NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;`
**Context**: Used for `SECURITY DEFINER` functions intended exclusively for internal use (e.g., cron jobs or background triggers).

### Rationale
- **PostgREST Isolation**: Supabase exposes the `public` schema via PostgREST. While `REVOKE EXECUTE ... FROM PUBLIC` is the primary control, this in-body check provides a second layer of defense.
- **JWT Context**: Any request coming through the API will have a JWT (even if anonymous). Internal database calls (like those from `pg_cron` or service-role edge functions calling via the direct postgres connection) do not have this JWT context.
- **Fail-Safe**: If permissions are accidentally granted to `PUBLIC` or `authenticated` roles in the future, the function remains protected against external invocation.

### Relevant Functions
- `public.deactivate_expired_projects`

---

## RPC-Only Write Pattern (`push_tokens`)

**Pattern**: Table grants for `INSERT` and `UPDATE` are explicitly **revoked** from both `anon` and `authenticated`. No RLS `INSERT` or `UPDATE` policy exists on the table. All writes are funnelled through a `SECURITY DEFINER` RPC.

**Context**: `public.push_tokens` — device push-notification tokens registered by project owners and anonymous participants.

### Rationale
- **Single choke-point**: `public.save_push_token(token, device_name, platform, project_id, form_id)` is the sole write path. It validates the caller is either an authenticated project owner, an authenticated project member (via `project_completion_state`), or an anonymous participant with a valid, in-window `form_id` before performing the `INSERT … ON CONFLICT DO UPDATE`.
- **Defence against direct writes**: `REVOKE INSERT, UPDATE ON public.push_tokens FROM anon, authenticated` (applied in `20260403_consolidate_push_tokens_security.sql`) ensures PostgREST cannot be used to bypass the RPC's authorization checks, even if a future migration accidentally re-introduces a permissive policy.
- **Scanner false-positive**: Automated scanners (e.g., Lovable) flag the table as having "SELECT and DELETE policies but no INSERT policy". This is **by design**. Adding an INSERT RLS policy without re-granting the underlying privilege would be a no-op; adding one *with* a grant would re-open a direct write path that the RPC pattern intentionally closes.

### Grants & Privileges in effect (post `20260403_consolidate_push_tokens_security.sql`)
| Role | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `anon` | ✗ | ✗ | ✗ | ✓ (via `Allow token deletion by token string` policy) |
| `authenticated` | ✓ (own projects only) | ✗ | ✗ | ✓ (own projects only) |

### Relevant Functions
- `public.save_push_token(text, text, text, uuid, text)` — SECURITY DEFINER; granted to `anon, authenticated`
- `public.remove_push_token(text)` — SECURITY DEFINER; granted to `anon, authenticated`

### Key Migrations
- `20260129_fix_push_token_rls.sql` — introduced open `WITH CHECK (true)` INSERT/UPDATE policies (since removed)
- `20260403_consolidate_push_tokens_security.sql` — dropped open policies, revoked INSERT/UPDATE grants, locked down to RPC-only writes
- `20260517232726_35a6d343-...sql` — hardened `save_push_token` with `user_id` audit column and composite `UNIQUE(token, project_id)` constraint

---

## Accepted Risks

- **`course_quiz_questions_correct_answer_exposed`**: Quizzes are formative and for free educational content. The risk of users discovering correct answers via the `SELECT` policy is accepted as there is no incentive to cheat and no certificate gating depends on them.

- **`project_metadata_enumeration_via_form_id`**: The `get_project_by_form_id` RPC is the public entry point for anonymous form submission. Possession of a valid `form_id` is the intended authorization for retrieving basic project metadata (ID, name, description). We use `nanoid(10)` for shorter, user-friendly URLs. The risk of brute-force enumeration is accepted as the impact is limited to project metadata exposure and unauthorized submissions (polluted data), without exposing existing participant stories or private administrative data.

- **`push_token_deregistration_via_token_string` (`remove_push_token`)**: Mobile survey participants operate anonymously without `auth.uid()`. Possession of the high-entropy Expo push token string (`ExponentPushToken[...]`) is the intended capability-based authorization for a device to deregister itself. Execution access for `anon` is required by design; tokens cannot be enumerated, and the function returns `void` without exposing data.

- **`project_owner_enumeration` (`get_project_owner`)**: `get_project_owner` and `get_domain_config` return the owner's internal `user_id` (UUID) to verify custom-domain ownership on the client. Because user UUIDs reveal no PII, cannot be forged into an `auth.uid()` session, and data access is strictly gated by RLS, this exposure is accepted by design.



---

## Public Form Config RPC Pattern (`get_public_form_config`)

**Pattern**: Public (anon) reads of form configuration rows from `activity_responses` are served exclusively through a `SECURITY DEFINER` RPC rather than a permissive SELECT policy.

**Context**: `public.get_public_form_config(p_form_id text)` — used by the public participant form (`/submit-story/:formId`) to load slider questions, triangle questions, participant questions, story question, form appearance, and gamification config.

### Rationale

- **Scoped by form_id**: The RPC validates `p_form_id` against `form_identifiers` (active window check) and returns only rows for the associated project. An attacker with only the anon key cannot enumerate form configurations across projects.
- **Precedent**: This matches the `get_public_dashboard_data(token)` pattern established for public story dashboards.
- **Anon branch removed**: The previous `has_public_form_id(ar_project_id)` anon branch in the "Unified View Policy for Activity Responses" has been intentionally removed (migration `20260601_secure_public_form_config_rpc.sql`). The `form_id` is now a genuine capability token, not just a routing hint.
- **Cloudflare Worker cache**: The primary public form data path goes through `cachepublicforms.cerne.io` (edge cache). The RPC is the Supabase fallback on cache miss.

### Included Row Types

The RPC returns rows matching these whitelisted `(phase, step, activity)` tuples only:

| Phase | Step | Activity |
|---|---|---|
| `collection` | `public-form` | `form-config`, `story-question`, `slider-questions`, `triangle-questions`, `participant-questions`, `question-type` |
| `collection` | `questions` | `slider-questions`, `triangle-questions`, `participant-questions` |
| `design` | `questions` | `question-type` |
| `*` | `form-appearance` | `form-appearance-editor`, `form-languages` |
| `mobile-app` | `settings` | `gamification-config` |

### Key Migration

- `20260601_secure_public_form_config_rpc.sql` — creates `get_public_form_config`, tightens the Unified View Policy

### Relevant Functions

- `public.get_public_form_config(text)` — SECURITY DEFINER; granted to `anon, authenticated`
