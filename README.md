# Cerne OSS

Self-hosted platform based on participatory narrative inquiry (PNI) using a single Node.js + Hono + embedded [PGlite](https://pglite.dev) container. Design story instruments, collect anonymous narratives, analyze slider/triangle patterns, run optional OpenAI-compatible AI helpers (Design Assistant, sentiment grouping, translation), and share read-only dashboards without external databases, queues, or SaaS dependencies.

> **Looking for managed hosting or semantic clustering?** **Cerne OSS** is the self-hosted, single-workspace edition. For multi-user workspaces, managed cloud hosting, and automated semantic clustering, visit **[cerne.io](https://cerne.io)**.

## Key Features & Privacy

- **Story Instruments & Sensemaking:** Build structured story prompts paired with custom sliders, triangles, and multiple-choice signifiers, then filter and explore narrative patterns interactively.
- **Structural Respondent Anonymity:** Public forms and AI-assisted interviews enforce zero-identifier collection (no IP addresses, `User-Agent` headers, or tracking cookies persisted) and truncate all public timestamps to `00:00:00 UTC`. See **[FEATURES.md](FEATURES.md)** for full technical details.
- **Bring Your Own LLM:** Optional OpenAI-compatible `/chat/completions` integration configurable at runtime in `/settings` (works with OpenAI, OpenRouter, Ollama, LM Studio, or any compatible endpoint).

## Architecture

- **Frontend:** React 18 + Vite SPA served statically by Node
- **Backend:** Hono HTTP server ([server/index.ts](server/index.ts)) exposing
  `/api/health`, `/api/auth/*`, `/api/db/*`, `/api/rpc/*`, `/api/public/*`,
  `/api/settings/*`, and `/api/ai/*`
- **Database:** Embedded PGlite Postgres persisted on disk under `DATA_DIR`
  (defaults to `./data/pgdata` locally and `/data/pgdata` in Docker)
- **AI:** Single OpenAI-compatible `/chat/completions` client configurable at
  runtime in `/settings`

## Quick Start (Docker Compose)

1. Copy the example environment file and set a strong workspace password:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set `ADMIN_PASSWORD`.

2. Build and start the container:
   ```bash
   docker compose up --build -d
   ```

3. Open [http://localhost:3000](http://localhost:3000), unlock the workspace with `ADMIN_PASSWORD`, and explore the pre-seeded sample project (`Team Onboarding Retrospective`).

Database files are persisted in `./cerne-data` (mounted at `/data` inside the container).

## Local Development

Requirements: Node.js 22+ and npm.

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the backend and Vite dev server in separate terminals:
   ```bash
   npm run dev:server
   npm run dev
   ```
   Vite runs on [http://localhost:8080](http://localhost:8080) and proxies `/api/*` to the backend on port `3000`. Without `ADMIN_PASSWORD` set locally (`NODE_ENV !== production`), the dev workspace unlocks automatically; set `ADMIN_PASSWORD` in `.env` to test the unlock screen locally.

## Cloud Deployment (Single Container)

Three single-instance deployment manifests are included:
- **Railway:** [railway.toml](railway.toml) — attach a Railway Volume mounted at `/data`, set `ADMIN_PASSWORD`, and set `TRUST_PROXY=true`.
- **Render Blueprint:** [render.yaml](render.yaml) — provisions a Docker web service with a 1 GB disk mounted at `/data`, auto-generated `ADMIN_PASSWORD` and `SESSION_SECRET`, and `TRUST_PROXY=true`.
- **Fly.io:** [fly.toml](fly.toml) — run `fly launch --no-deploy`, create a `cerne_data` volume (`fly volumes create cerne_data --size 1`), set `fly secrets set ADMIN_PASSWORD=...`, and run `fly deploy`.

> **Important:** Because PGlite uses embedded single-writer storage, keep deployments pinned to **1 replica / 1 machine** and mount persistent storage at `/data` (with `DATA_DIR=/data/pgdata`).

## Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `ADMIN_PASSWORD` | _(unset)_ | Required in `NODE_ENV=production` to unlock the workspace; production fails closed if omitted. |
| `ALLOW_UNAUTHENTICATED_ADMIN` | `false` | Set `true` only if intentionally running behind an external auth proxy without `ADMIN_PASSWORD`. |
| `SESSION_SECRET` | _(auto-generated)_ | Optional override for HMAC session signing; if omitted, persisted in PGlite on first boot. |
| `PORT` | `3000` | HTTP listen port. |
| `DATA_DIR` | `./data/pgdata` (Docker: `/data/pgdata`) | Directory where PGlite persists Postgres data. |
| `SEED_SAMPLE_PROJECT` | `true` | Seeds `Team Onboarding Retrospective` and a starter template on an empty database (`false` skips sample projects; prompts always seed). |
| `TRUST_PROXY` | `false` | Set `true` behind Railway, Render, Fly.io, Caddy, or Nginx so `X-Forwarded-Proto` and client IP headers are honored. |
| `LLM_API_KEY` | _(unset)_ | Optional default API key (can be set/masked/encrypted at runtime under `/settings`). |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | Default OpenAI-compatible API base URL (optional key when pointing to local Ollama/LM Studio). |
| `LLM_MODEL` | `gpt-4o-mini` | Default chat completion model. |

## Backup & Restore

Stop the container briefly so PGlite flushes cleanly, copy the data directory, and restart:

```bash
docker compose stop
cp -r ./cerne-data ./cerne-data-backup-$(date +%Y%m%d)
docker compose start
```

To restore, stop the container, replace `./cerne-data` with your backup directory, and start again.

## Scripts & Verification

```bash
npm run typecheck   # TypeScript checks across src/ and server/
npm run lint        # ESLint
npm run build       # Build Vite SPA (dist/) + Hono server (dist-server/)
npm run test        # Vitest unit & PGlite server integration tests
npm run test:e2e    # Headless Chromium smoke suite against built bundle
```

## Trademark Notice

"Cerne" is a trademark of Hosting Learning LLC. See [TRADEMARKS.md](TRADEMARKS.md).

## License

Apache License Version 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

## Acknowledgments

We would like to acknowledge the work on PNI (Participatory Narrative Inquiry) by Cynthia F. Kurtz ([cfkurtz.com](https://cfkurtz.com/)), her opus "Working with Stories" ([workingwithstories.org](https://www.workingwithstories.org/)), and the work (together with Paul D. Fernhout) on the open source NarraFirma™ application that you can find at [github.com/pdfernhout/narrafirma](https://github.com/pdfernhout/narrafirma).
