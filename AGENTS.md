# Project Context

## Project: Cerne-app (Open-Source Edition)
Description: Self-hosted narrative inquiry platform for designing participatory story collection instruments, collecting anonymous stories, and exploring narrative patterns using the Cerne methodology.

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui + TanStack Query
- **Backend**: Node.js + Hono (`server/`)
- **Database**: Embedded PGlite (`server/db/`)
- **AI**: Single OpenAI-compatible `/chat/completions` client (`server/utils/llmConfig.ts`)
- **Testing**: Vitest (unit & PGlite API integration) + Playwright (browser E2E)

## Commands
- `npm run dev`: Start Vite dev server (port 8080, proxies `/api` to `:3000`)
- `npm run dev:server`: Start local Hono + PGlite server (`:3000`)
- `npm run build`: Build SPA (`dist/`) and server bundle (`dist-server/`)
- `npm run start`: Run compiled production server (`node dist-server/index.js`)
- `npm run typecheck`: Run TypeScript checks across app and server
- `npm run lint`: Run ESLint
- `npm run test`: Run Vitest unit & server integration tests
- `npm run test:e2e`: Run headless Chromium smoke tests against built production bundle

## Directory Structure
- `/src`: Frontend React application and local API client (`/src/lib/localClient.ts`)
- `/server`: Node/Hono API server, PGlite schema/seed, auth gate, and AI endpoints
- `/tests/e2e`: Playwright browser end-to-end smoke suite
- `/public`: Static assets
- `/scripts`: Utility benchmark scripts

## Conventions
- Use functional components with hooks.
- Use `shadcn/ui` components from `@/components/ui`.
- Fetch data through the client adapter (`@/integrations/supabase/client` backed by `/src/lib/localClient.ts`) or `apiFetch`/`postAiEndpoint`.
- Ensure all new code is typed with TypeScript.
