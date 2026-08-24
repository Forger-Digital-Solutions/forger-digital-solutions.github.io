# KAYLA COPILOT — PHASE 4

## Public launch, zero-cost enforcement, and production hardening

Phase 4 keeps the FDS website static on GitHub Pages and places Kayla's private
runtime behind a Cloudflare Worker on its `workers.dev` hostname. The browser
receives no provider credentials, model controls, system prompt, or full
knowledge graph.

## Production architecture

```text
GitHub Pages frontend
        |
        | exact-origin HTTPS + NDJSON
        v
Cloudflare Worker /api/kayla/*
        |-- strict request validation and CORS
        |-- ZERO_COST_ONLY model firewall
        |-- server-side knowledge retrieval
        |-- safe local fallback
        |
        +--> SQLite Durable Object
        |      |-- hashed-client minute/hour windows
        |      `-- global UTC-day AI request budget
        |
        `--> OpenRouter official endpoint
               `-- openrouter/free only by default
```

The default policy is `ZERO_COST_ONLY`. `openrouter/free` and explicitly free
OpenRouter model IDs ending in `:free` are eligible. Paid, unknown, malformed,
or custom-endpoint configurations fail closed to grounded local knowledge.
Provider retries are disabled so one user request cannot silently multiply AI
requests.

## Configuration

Checked-in, non-secret Worker variables live in `worker/wrangler.toml`:

- `KAYLA_ENABLED` — set to `true` only after both production secrets exist
- `KAYLA_PROVIDER=openrouter`
- `KAYLA_MODEL=openrouter/free`
- `KAYLA_ALLOWED_ORIGINS` — exact GitHub Pages origin; never `*`
- `KAYLA_RATE_LIMIT_PER_MINUTE=5`
- `KAYLA_RATE_LIMIT_PER_HOUR=20`
- `KAYLA_AI_DAILY_REQUEST_LIMIT=40`
- `KAYLA_MAX_PAYLOAD_BYTES=16384`
- `KAYLA_PROVIDER_TIMEOUT_MS=12000`
- `KAYLA_MAX_RETRIES=0`

Required secrets must be entered directly in Wrangler or the Cloudflare
dashboard and must never be pasted into source, logs, issues, or chat:

```powershell
cd worker
pnpm exec wrangler secret put KAYLA_API_KEY
pnpm exec wrangler secret put KAYLA_RATE_LIMIT_SALT
```

Use a long random salt. The limiter stores only SHA-256 identifiers derived
from `salt + NUL + client IP`; it does not persist raw IP addresses or messages.

## Durable Object state

`KaylaAbuseGuard` uses the SQLite Durable Object storage backend required by
the Workers Free plan. Per-client object instances persist minute and hour
windows. A separate `global-ai-budget` object enforces the UTC-day AI ceiling.
If hashing, storage, bindings, or limiter calls fail, chat requests fail
conservatively instead of bypassing the protection.

The Durable Object migration is declared as `v1` with
`new_sqlite_classes = ["KaylaAbuseGuard"]`. Do not rename the class or migration
tag after deployment without adding a new migration.

## Request and response contract

- `GET /api/kayla/health` returns safe readiness and policy fields only.
- `POST /api/kayla/chat?stream=true` accepts JSON and streams NDJSON.
- Root request fields are limited to `message`, `history`, and `context`.
- Client attempts to set model, provider, endpoint, API key, system prompt, or
  pricing mode are rejected.
- Size, nesting, history count, roles, route context, Unicode, and prompt
  injection patterns are validated before provider access.
- Provider timeouts, 429s, 5xx responses, malformed payloads, and exhausted AI
  budget degrade to a grounded local answer.
- Responses include no-store, content-type hardening, request IDs, and exact
  origin CORS headers.
- Logs contain operational metadata only, never user messages, raw IPs, API
  keys, prompts, or provider response bodies.

## Local development

Install and validate the site:

```powershell
npm install
npm test
npm run validate
npm run dev
```

Open `http://localhost:4321`. Astro's local Kayla endpoint allows only
`localhost:4321` and `127.0.0.1:4321`. Without server secrets, Kayla stays in
knowledge mode.

Run the Worker locally in a second terminal:

```powershell
cd worker
pnpm install --frozen-lockfile
pnpm exec wrangler dev --ip 127.0.0.1 --port 8787 `
  --var KAYLA_RATE_LIMIT_SALT:replace-with-a-long-local-only-salt `
  --var KAYLA_ALLOWED_ORIGINS:http://127.0.0.1:4321
```

Then create a git-ignored `.env.local` for the frontend and run Astro:

```powershell
PUBLIC_KAYLA_API_URL=http://127.0.0.1:8787
```

```powershell
npm run dev
```

The frontend accepts either a Worker base URL or a complete
`/api/kayla/chat` URL and normalizes the health/chat paths.

## Deployment

Preflight all non-secret requirements:

```powershell
npm run kayla:deploy:check
npm run kayla:secret-scan
npm run worker:build
cd worker
pnpm exec wrangler whoami
pnpm exec wrangler secret list
```

After confirming the account is intended to remain on the Workers Free plan,
set the two secrets, change `KAYLA_ENABLED` to `true`, and deploy:

```powershell
npm run kayla:deploy
```

The command prints the resulting `https://...workers.dev` URL. No custom DNS
or zone is required. Set that base URL as the GitHub repository variable
`PUBLIC_KAYLA_API_URL`, then redeploy GitHub Pages.

## Live verification

```powershell
npm run kayla:verify:live -- https://your-worker.your-subdomain.workers.dev
```

The verifier checks safe health output, allowed-origin streaming chat,
completion framing, and hostile-origin blocking. Browser verification should
also cover open/close/reopen focus, Escape, starter prompts, multi-turn chat,
mobile layout, network failures, 429 handling, and console errors.

## Cost containment

Phase 4 contains cost at several independent layers:

1. The server-side model firewall rejects paid or unknown models.
2. Only the official OpenRouter endpoint is accepted.
3. The default router is `openrouter/free`.
4. Provider retries are disabled.
5. Persistent minute/hour quotas limit individual clients.
6. A global daily AI request ceiling limits aggregate use.
7. Exhaustion or dependency failure falls back locally.
8. The Worker uses a Free-plan-compatible SQLite Durable Object configuration.

Quotas are deliberately configurable because third-party free-plan limits can
change. Reconfirm current provider and Cloudflare terms before raising them.

## CI and maintenance

The GitHub Pages workflow runs the test suite, deployment configuration gate,
Worker dry-run build, Astro validation/build, and post-build secret scan.
`scripts/kayla-knowledge.mjs` loads the real structured modules and fails on
broken references or divergence between the canonical product, app, download,
and release records.

For a new app or release, update the canonical public product data first,
derive Kayla records from it where practical, run `npm run validate:knowledge`,
then run the entire CI-equivalent command set before deployment.
