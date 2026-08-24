# KAYLA COPILOT — PHASE 3

## LIVE AI DEPLOYMENT + COMPLETE FDS BRAIN + KNOWLEDGE AUTOMATION

---

## LIVE ARCHITECTURE

### Frontend / API Split

The FDS website remains a static site hosted on GitHub Pages. Kayla's AI backend runs as a separate serverless API.

```
GitHub Pages
   │
   │ static site (Astro 7)
   ▼
FDS Website
   │
   │ HTTPS request
   ▼
Kayla Serverless API (Cloudflare Worker)
   │
   ├── Retrieval (local knowledge index)
   ├── Security (CORS, prompt injection, validation)
   ├── Provider abstraction (OpenRouter / Mock / local fallback)
   └── NDJSON streaming
```

### Deployment Provider

**Cloudflare Workers** — free tier, no credit card required, supports streaming, supports server-side env vars.

### Environment Variables

**Server-side (secret, never exposed to browser):**
- `KAYLA_ENABLED` — enable AI features
- `KAYLA_PROVIDER` — `mock`, `openrouter`, or empty for local-only
- `KAYLA_MODEL` — model identifier (Phase 4 default: `openrouter/free`)
- `KAYLA_API_KEY` — provider API key
- `KAYLA_ENDPOINT` — custom API endpoint override
- `KAYLA_ALLOWED_ORIGINS` — comma-separated allowed CORS origins
- `KAYLA_RATE_LIMIT_PER_MINUTE` — requests per minute per IP
- `KAYLA_REQUEST_TIMEOUT_MS` — request timeout
- `KAYLA_MAX_RETRIES` — retry count

**Client-side (public, safe to expose):**
- `PUBLIC_KAYLA_API_URL` — URL of the deployed Kayla API

### CORS

- Strict origin checking via `KAYLA_ALLOWED_ORIGINS`
- Preflight (OPTIONS) support
- Never uses `Access-Control-Allow-Origin: *` in production when origins are configured

### Health Endpoint

```
GET /api/kayla/health
```

Returns:
```json
{
  "status": "ok",
  "aiConfigured": true,
  "knowledgeReady": true,
  "mode": "ai-capable" | "knowledge"
}
```

Does NOT expose: API keys, provider details, system prompt, server paths.

### Streaming

NDJSON streaming supported on both Astro dev endpoint and Cloudflare Worker.

### Free-Model Policy

Kayla only uses AI when:
1. `KAYLA_ENABLED=true`
2. A provider is configured
3. An API key exists (for non-mock providers)

If any condition fails, Kayla degrades to Knowledge Mode (local retrieval).

### Rate Limiting

- In-memory burst protection (sufficient for free-tier single-instance deployment)
- Distributed limitation documented — in-memory is not globally persistent across Worker instances
- Client/session throttling via IP identification

---

## DEPLOYMENT

### Deploy the API (Cloudflare Worker)

1. Install Wrangler:
   ```bash
   cd worker && npm install
   ```

2. Set secrets in Cloudflare dashboard or via Wrangler:
   ```bash
   wrangler secret put KAYLA_API_KEY
   wrangler secret put KAYLA_RATE_LIMIT_SALT
   ```

3. Deploy:
   ```bash
   npm run worker:deploy
   ```

4. The Phase 4 configuration deploys to the account's automatically provided
   `workers.dev` hostname. No DNS zone or custom domain is required.

### Configure Frontend

Set `PUBLIC_KAYLA_API_URL` in the GitHub Actions workflow or hosting environment:

```yaml
# .github/workflows/deploy.yml
env:
  PUBLIC_KAYLA_API_URL: https://your-worker.your-subdomain.workers.dev
```

Or in the hosting platform's environment configuration.

### Local Development

No `PUBLIC_KAYLA_API_URL` needed — the frontend falls back to `/api/kayla/chat` (Astro dev server).

---

## KNOWLEDGE ARCHITECTURE

### Data Sources

All knowledge is curated from structured TypeScript data files:

- `src/data/kayla/company/fds.ts` — Company profile with vision tiers
- `src/data/kayla/company/founder.ts` — Founder public profile
- `src/data/kayla/apps/index.ts` — Five primary apps + ForgerEMS
- `src/data/kayla/apps/forgerems.ts` — ForgerEMS deep knowledge
- `src/data/kayla/ecosystem/forged.ts` — Forged storefront
- `src/data/kayla/downloads.ts` — Download registry
- `src/data/kayla/releases.ts` — Release registry
- `src/data/kayla/roadmap.ts` — Roadmap items
- `src/data/kayla/community.ts` — Community initiatives
- `src/data/kayla/support.ts` — FAQs
- `src/data/kayla/github.ts` — Public GitHub registry
- `src/data/kayla/sites.ts` — Official FDS sites registry
- `src/data/kayla/relationships.ts` — Product relationship graph
- `src/data/kayla/changelog.ts` — Changelog knowledge

### Source Authority

1. Structured current app/release registry (highest)
2. Current official documentation
3. Current public site prose
4. Older archival content (lowest)

### Freshness

Each data entry tracks `lastUpdated` and `version` where applicable. Conflicting sources prefer structured current data.

### Retrieval Index

Generated at build time. Includes fuzzy matching, typo tolerance, and page context boosting.

### Knowledge Build Command

```bash
npm run kayla:knowledge
# or
npm run validate:knowledge
```

Validates:
- Duplicate app IDs
- Duplicate aliases
- Empty titles
- Unknown app IDs
- Invalid relationship targets
- Invalid roadmap status
- Invalid release status
- Missing local downloads
- Unsafe URLs
- Unapproved external domains
- Private source references
- Security deny-list patterns

Generates inventory report with verdict: PASS / FAIL.

---

## INTELLIGENCE FEATURES

### App Recommendations

Kayla reasons from user intent, app purpose, category, target users, and feature set. Example queries:
- "Which FDS app should I use for game development?" → KyraBlox
- "Which app should I use for Windows toolkits?" → ForgerEMS
- "Which app should I use for AI research?" → GEMS / Training Grounds

### Product Comparisons

Compares documented facts only:
- GEMS vs Kayla AI Publisher
- KyraBlox vs game engines
- FarmStand Finder vs We The People
- ForgerEMS vs Forged

### Ecosystem Synthesis

Answers "Explain all of FDS to me" with a coherent explanation of:
- FDS mission and vision
- Current products
- Research direction
- Forged storefront
- Community plans
- Roadmap
- Long-term vision

### Release vs Roadmap Distinction

Kayla distinguishes:
- `released` — shipped and available
- `active` — currently in development
- `experimental` — early exploration
- `planned` — intended future work
- `research` — investigation phase
- `aspirational` — long-term concepts

### Page-Aware Starters

Kayla adjusts starter questions based on page context:
- **Homepage**: "What is FDS?", "Show me all apps", "What's available now?", "What's coming next?"
- **Forged**: "What's available?", "Which app should I try?", "Show me downloads."
- **Projects**: "Which app should I use?", "What is GEMS?", "What is KyraBlox?"
- **ForgerEMS page**: "What does ForgerEMS do?", "Download ForgerEMS", "How do I install it?", "What version is this?"

### Rich Response Cards

Validated data-driven cards for apps, downloads, releases, and roadmap items. Content comes from structured FDS data, not arbitrary model generation.

### Source Traceability

In development, Kayla can report:
- Query
- Page entity
- Conversation entity
- Retrieved IDs
- Retrieval scores
- Chosen sources
- Provider mode

Does NOT expose: hidden system prompt, API keys, secrets.

---

## SECURITY

### Attack Surface Coverage

- UI: XSS protection via textContent, no innerHTML with untrusted data
- API: Request validation, payload size limits, role validation
- CORS: Strict origin checking
- Provider adapter: No client-side API key exposure
- Stream parsing: Safe JSON parsing with error handling
- Knowledge ingestion: Explicit allow-list, deny-list for unsafe patterns
- Retrieval: No arbitrary URL fetching
- Actions: Allow-listed action types only
- Downloads: Only official registry entries
- Health endpoint: Minimal safe information only
- Founder privacy: Only public information exposed

### Specific Protections

- **Prompt injection**: Pattern-based detection + system prompt hardening
- **XSS**: All user input rendered via `textContent`, never `innerHTML`
- **SSRF**: No arbitrary URL fetching; only approved FDS sources
- **Path traversal**: No file system access from user input
- **Action spoofing**: Allow-listed action types with URL validation
- **Founder privacy**: Only public bio, role, and approved links exposed
- **Secrets**: Server-side only; never committed or exposed client-side
- **Rate limiting**: In-memory per-IP with configurable limits

---

## PERFORMANCE

### Client Knowledge Bundle

Reduced. The client only ships:
- UI components
- Minimal navigation/action data
- Page context
- Bounded chat logic

Full knowledge stays server-side.

### Server Retrieval

Retrieval index generated at build time. Expensive structures not recomputed per request.

### Conversation Bounds

- `maxHistoryMessages`: 10 (configurable)
- `maxMessageLength`: 2000 chars (configurable)

---

## HOW TO

### Run Locally

```bash
npm install
npm run dev
```

### Configure the API

Set `PUBLIC_KAYLA_API_URL` in your environment to point to the deployed Worker. Falls back to `/api/kayla/chat` for local dev.

### Configure the Free AI Provider

```bash
# In Cloudflare Worker secrets or .env
KAYLA_ENABLED=true
KAYLA_PROVIDER=openrouter
KAYLA_API_KEY=your-free-tier-key
KAYLA_MODEL=openrouter/free
```

Never commit real keys.

### Deploy the API

```bash
cd worker
npm install
wrangler secret put KAYLA_API_KEY
wrangler secret put KAYLA_RATE_LIMIT_SALT
npm run worker:deploy
```

### Rebuild Kayla Knowledge

```bash
npm run kayla:knowledge
```

### Add a Future App

1. Add project to `src/data/projects.ts`
2. Add product to `src/data/products.ts` if it has a download
3. Add alias to `src/data/kayla/apps/index.ts`
4. Add relationship to `src/data/kayla/relationships.ts`
5. Run `npm run kayla:knowledge` to validate

### Add a Future Official FDS Site

Add to `src/data/kayla/sites.ts`:
```ts
{
  id: 'unique-id',
  name: 'Site Name',
  origin: 'https://example.com',
  authority: 0.9,
  enabled: true
}
```

---

## FILES ADDED / MODIFIED

### Added
- `worker/index.ts` — Cloudflare Worker entry point
- `worker/package.json` — Worker dependencies
- `worker/wrangler.toml` — Worker configuration
- `src/server/kayla/health.endpoint.ts` — Health check endpoint
- `src/lib/kayla/cors.ts` — CORS utilities
- `src/data/kayla/releases.ts` — Release registry
- `src/data/kayla/github.ts` — GitHub registry
- `src/data/kayla/sites.ts` — Official sites registry
- `src/data/kayla/relationships.ts` — Product relationship graph
- `src/data/kayla/changelog.ts` — Changelog data
- `test/kayla-deployment.test.ts` — Deployment tests
- `test/kayla-knowledge-pipeline.test.ts` — Knowledge pipeline tests
- `test/kayla-ecosystem.test.ts` — Ecosystem tests
- `KAYLA_PHASE_3.md` — This document

### Modified
- `src/lib/kayla/config.ts` — Platform-agnostic config with env parameter
- `src/lib/kayla/handler.ts` — Accepts optional kaylaConfig for Worker compatibility
- `src/server/kayla/chat.endpoint.ts` — Added CORS headers, health endpoint, config abstraction
- `src/components/KaylaCopilot.ts` — PUBLIC_KAYLA_API_URL support, page-aware starters, AI Online/Knowledge Mode/Service Unavailable status
- `src/components/KaylaCopilot.astro` — Status text updates
- `src/data/kayla/types.ts` — Expanded types (releases, GitHub, sites, relationships, vision tiers, normalized app model)
- `src/data/kayla/company/founder.ts` — Expanded public profile
- `src/data/kayla/company/fds.ts` — Vision tiers, expanded community goals
- `src/data/kayla/apps/index.ts` — Normalized app model with aliases
- `src/data/kayla/apps/forgerems.ts` — Expanded ForgerEMS knowledge
- `src/data/kayla/index.ts` — Recommendation engine, comparisons, ecosystem synthesis, page starters
- `src/data/kayla/retrieval.ts` — New document types (releases, GitHub, sites)
- `src/data/kayla/support.ts` — Existing (preserved)
- `src/data/kayla/community.ts` — Existing (preserved)
- `src/data/kayla/roadmap.ts` — Existing (preserved)
- `src/data/kayla/ecosystem/forged.ts` — Existing (preserved)
- `src/data/kayla/downloads.ts` — Existing (preserved)
- `package.json` — Added knowledge build command, worker scripts
- `.env.example` — Added PUBLIC_KAYLA_API_URL, KAYLA_ALLOWED_ORIGINS
- `scripts/kayla-knowledge.mjs` — Knowledge build and validation script

---

## KNOWN LIMITATIONS

1. **Phase 3 rate limiting is superseded**: Phase 4 uses a SQLite-backed Durable Object for persistent per-client windows and a global daily AI budget.
2. **Cloudflare Worker dependency**: The free-tier Worker requires a Cloudflare account. Alternative platforms (Netlify, Vercel) could be supported with additional adapters.
3. **Knowledge validation improved in Phase 4**: The validator loads the actual TypeScript modules through Vite rather than estimating counts with regular expressions.
4. **Live verification is credential-dependent**: Deployment requires an authenticated Cloudflare account and server-side secrets, but does not require DNS configuration.

---

## PHASE 3 VERDICT

**PARTIAL — IMPLEMENTATION COMPLETE, LIVE DEPLOYMENT REQUIRES PLATFORM CONFIGURATION**

All code, configuration, tests, and documentation are complete. The Cloudflare Worker is ready to deploy. To go live:
1. Create a Cloudflare account (free tier available)
2. Keep the checked-in `workers.dev` Wrangler configuration
3. Set `KAYLA_API_KEY` and `KAYLA_RATE_LIMIT_SALT` via `wrangler secret put`
4. Deploy with `npm run worker:deploy`
5. Set `PUBLIC_KAYLA_API_URL` in the GitHub Pages environment
