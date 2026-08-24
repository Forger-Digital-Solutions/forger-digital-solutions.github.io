# KAYLA COPILOT — PHASE 5

## Live production launch and certification

Kayla Copilot is deployed as a static Astro frontend on GitHub Pages with a
server-side Cloudflare Worker for retrieval, abuse protection, and optional
zero-cost AI. The production launch was completed on August 23, 2026 EDT
(August 24 UTC) without enabling paid infrastructure or paid model fallback.

## Production endpoints

- FDS website: `https://forger-digital-solutions.github.io/`
- Worker base URL: `https://kayla-api.forgerdigitalsolutions.workers.dev`
- Health: `GET /api/kayla/health`
- Chat: `POST /api/kayla/chat?stream=true`
- Final certified Worker version: `c8edd177-4ad0-4517-98d6-911d1f500860`

The GitHub Actions repository variable `PUBLIC_KAYLA_API_URL` contains the
Worker base URL. The frontend appends `/api/kayla/chat` and
`/api/kayla/health`; it also safely normalizes a complete chat URL.

## Production architecture

```text
GitHub Pages / Astro
        |
        | exact-origin HTTPS + NDJSON
        v
Cloudflare Worker (kayla-api)
        |-- strict request validation and CORS
        |-- server-side FDS retrieval
        |-- ZERO_COST_ONLY model firewall
        |-- local grounded fallback
        |
        +--> SQLite Durable Object
        |      |-- salted SHA-256 client identifiers
        |      |-- persistent minute/hour limits
        |      `-- persistent global UTC-day AI allowance
        |
        `--> OpenRouter official endpoint
               `-- openrouter/free only
```

No provider credential, rate-limit salt, private prompt, Worker server module,
or complete knowledge graph is shipped to the browser.

## Deployment method

The Worker is deployed to its canonical `workers.dev` route using Wrangler 4.
Production changes are prepared with `wrangler versions upload`, inspected
with `wrangler versions view`, and promoted explicitly with
`wrangler versions deploy <VERSION_ID>@100%`. Secrets are added through
Wrangler's masked interactive secret prompt and are never committed.

The account accepted the Worker, SQLite Durable Object migration, and
`workers.dev` route without a billing or paid-plan prompt.

## Configuration

Committed non-secret production variables in `worker/wrangler.toml`:

- `KAYLA_ENABLED=true`
- `KAYLA_PROVIDER=openrouter`
- `KAYLA_MODEL=openrouter/free`
- `KAYLA_ALLOWED_ORIGINS=https://forger-digital-solutions.github.io`
- `KAYLA_RATE_LIMIT_PER_MINUTE=5`
- `KAYLA_RATE_LIMIT_PER_HOUR=20`
- `KAYLA_AI_DAILY_REQUEST_LIMIT=40`
- `KAYLA_MAX_PAYLOAD_BYTES=16384`
- `KAYLA_PROVIDER_TIMEOUT_MS=12000`

Required Cloudflare secret names:

- `KAYLA_API_KEY`
- `KAYLA_RATE_LIMIT_SALT`

Secret values must never appear in configuration, source, logs, screenshots,
test fixtures, documentation, or chat. List names without values with:

```powershell
cd worker
pnpm exec wrangler versions secret list
```

## Zero-cost policy

The production policy is `ZERO_COST_ONLY`:

- `openrouter/free` is eligible.
- Explicit OpenRouter model IDs ending in `:free` are eligible.
- Paid, unknown, malformed, client-selected, or custom-endpoint models are
  rejected before provider invocation.
- Provider retries are disabled.
- The 12-second provider timeout remains active through response-body and
  streaming consumption, so a provider cannot stall Kayla after sending only
  HTTP headers.
- No paid fallback or second AI provider exists.
- At most 40 upstream AI calls are allowed per UTC day.
- Provider failure or allowance exhaustion preserves grounded local Kayla.

A controlled production request reached `openrouter/free`, returned a streamed
`mode: "ai"` response, and correctly identified the current ForgerEMS release
as `v1.2.4-preview.5`.

## Security and abuse protection

`KaylaAbuseGuard` uses SQLite Durable Object storage. Per-client limits are
keyed by salted SHA-256 identifiers; raw IP addresses and the salt are not
persisted or returned. A separate global object coordinates the daily AI
allowance across Worker instances.

Production certification covers exact-origin and no-origin behavior, hostile
origin rejection, OPTIONS preflight, unsupported methods, content type,
malformed JSON, payload size, object depth, privileged client fields, prompt
injection, inert HTML text, security headers, and secret-free health output.

Worker logs contain request ID, route, status, duration, response category,
and limiter result only. They do not contain user messages, conversation
history, raw IPs, authorization headers, secrets, system prompts, or provider
response bodies.

## Verification commands

```powershell
npm install
npm run kayla:knowledge
npm test
npm run check
npm run build
npm run worker:build
npm run kayla:deploy:check
npm run kayla:secret-scan
npm run kayla:verify:live -- https://kayla-api.forgerdigitalsolutions.workers.dev
git diff --check
```

Inspect production state without revealing secret values:

```powershell
cd worker
pnpm exec wrangler whoami
pnpm exec wrangler deployments status
pnpm exec wrangler versions secret list
```

## Rollback

### Disable AI immediately

Set `KAYLA_ENABLED="false"` in `worker/wrangler.toml`, validate, upload the
disabled version, inspect it, then promote it to 100 percent. Kayla will keep
serving grounded local answers through the Worker.

```powershell
npm run kayla:deploy:check
cd worker
pnpm exec wrangler versions upload --message "Disable Kayla AI"
pnpm exec wrangler versions view <VERSION_ID>
pnpm exec wrangler versions deploy <VERSION_ID>@100% --yes
```

### Roll back the Worker

List known versions and explicitly redeploy a known-good version:

```powershell
cd worker
pnpm exec wrangler versions list
pnpm exec wrangler versions deploy <KNOWN_GOOD_VERSION_ID>@100% --yes
```

The last AI-disabled production version from launch is
`770faefa-9a70-42d3-bd57-40159540f5ac`.

### Roll back the frontend

Redeploy a known-good Git commit through the existing GitHub Pages workflow.
If the Worker URL must be removed temporarily, unset the repository variable
`PUBLIC_KAYLA_API_URL` and redeploy Pages. The static frontend then attempts
same-origin Kayla endpoints; network failure is presented as a temporary
service-unavailable message rather than raw technical output.

## Known limitations

- Availability and latency of `openrouter/free` depend on OpenRouter's current
  free-router capacity and eligible upstream models.
- The intentionally conservative per-client and global limits can move users
  to local Knowledge Mode during busy periods.
- The Worker uses its public `workers.dev` hostname; a custom domain is outside
  Phase 5 scope.
- GitHub Pages receives the Worker URL at build time, so changing the repository
  variable requires a new Pages deployment.
- Local grounded answers remain the reliability and cost-safety fallback.
