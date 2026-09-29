# Kayla Copilot 2.0 — General AI Certification

**Date:** 2026-09-29
**Scope:** evolve the frozen FDS-only Kayla into a general AI assistant (conversation, knowledge, writing, coding, reasoning) while keeping authoritative FDS answers, free-only inference, and a visitor experience that never exposes provider or model internals.
**Deployment status:** `NOT DEPLOYED — AWAITING KAYLA 2.0 APPROVAL`

## Repository state

- Branch: `main`; baseline `4472812` ("chore: establish FDS website maintenance baseline")
- Working tree: 29 modified + 3 new files (Kayla 2.0 changeset); no unrelated user work touched
- `worker/.dev.vars` created for local secrets — gitignored (`.gitignore` lines 16–17), never committed

## What changed

### New general-capability lane

- `src/lib/kayla/lanes.ts` (new): deterministic lane classifier — `deterministic` (settled canonical facts), `fds` (FDS synthesis beyond a settled answer), `mixed` (FDS entity + general task/comparison), `general` (no FDS signal: coding, writing, math, knowledge, conversation). Entity-less broad intents (`explain`, `what is`, `how do I get`) no longer force deterministic routes; entity-dependent intents only settle with an entity in play.
- `src/lib/kayla/systemPrompt.ts`: Kayla 2.0 identity — a general assistant that also knows the FDS ecosystem; lane-aware system/context messages; never names providers or models.
- `src/data/kayla/answers.ts`, `src/lib/kayla/conversation-answer.ts`: task boundary opened — coding, writing, debugging, and diagnosis requests route to inference instead of the old refusal. True physical/account/private-data/live-data boundaries stay deterministic refusals. Model-question copy identifies the product as "Kayla" without naming backends.

### Free-only provider chain

- `src/lib/kayla/config.ts`: `KAYLA_ROUTES` parser — `provider:model` entries plus a per-provider key env name (`GROQ_API_KEY`→groq, etc.); legacy `KAYLA_PROVIDER`/`KAYLA_MODEL`/`KAYLA_API_KEY` still supported.
- `src/lib/kayla/provider.ts`: generic OpenAI-compatible provider + `createProviderChain` — silent failover on 429, timeout, 5xx, network failure, malformed body, model unavailability, and verification rejection. `createAIProvider` retained for the single-provider/test path. Paid models rejected by `model-policy.ts` (`ZERO_COST_ONLY`).
- `worker/wrangler.toml`: `KAYLA_ROUTES = "groq:qwen/qwen3.8-27b|openrouter:openrouter/free"`; secrets only ever via env bindings, never in vars.
- `src/lib/kayla/handler.ts`: `aiUsable` gate counts configured route credentials (the bug that made route-chain deployments read as "AI disabled"); lane routing in both JSON and streaming paths; chain failover shared by both.

### Verification and shape guards

- `src/lib/kayla/verify.ts`: `general` verification mode — strict FDS fact checks (version/price/URL/status) fire only when an FDS entity is present; general answers are checked for shape, not FDS claims.
- `src/lib/kayla/well-formed.ts`: rejects control tokens, tool-call scaffolding, reasoning leaks (`Thought:`, "let me think step by step"), bare safety-classifier output (`Safety: safe`), pathological repetition (including short repeated units), oversized output, unsafe presentation scaffolding. Rejected output fails over or degrades to canonical/local copy.

### Conversation layer

- `src/lib/kayla/conversation.ts`: demonstrative "that/this" is referential only in referent positions — end of question, before a referential noun, or a short modifier chain ending in one ("that coding thing" resolves; "a function that reverses a string" does not). `either` added to referential/plural tokens ("are either public?" resolves both recent entities).
- Entity alias heuristics ("the coding one/thing"→CodeForge) are now visible to the lane classifier via `entities`.

### Retrieval-signal honesty

- `hasFdsSignal` no longer treats any nonzero retrieval score as an FDS hit (a "write a haiku" prompt scored 41–70 on an unrelated FAQ via body-text accumulation). Signal = entity match, site-possessive phrasing ("your newsletter"), a composed canonical answer, a product intent (availability/capability/version/status/roadmap) with a product doc on top, or distinctive query vocabulary in the doc's title/tags.

### Worker boundary

- `worker/index.ts`: route-chain endpoint config; public health reduced to `{"status":"ok"|"degraded","streaming":true}` — provider names, route ids, quota counters moved behind `X-Kayla-Ops`; `X-Request-ID` stays server-side; concurrency lease wraps inference only; CORS allowlist enforced; payload/method/content-type guards.
- `worker/abuse-guard.ts`: per-minute + per-hour limits, daily AI budget counter, concurrency leases.
- `src/lib/kayla/diagnostics.ts`: bounded enum/count telemetry only — no prompts, answers, raw IPs, keys, or high-cardinality identifiers.

### Client

- `src/components/KaylaCopilot.ts`: generic status model (Ready / Thinking… / Responding… / Stopping… / Temporarily unavailable) — lane names never render; new-chat action; retry starter on failures; textarea composer with autogrow + Enter/Shift+Enter; stale-response sequence guard retained.
- `src/lib/kayla/render-answer.ts`: fenced code blocks render as inert `<pre><code>` with a Copy affordance (Copy→Copied); markdown bold/italic/inline code/lists/blockquotes; hostile markup stays inert.
- `src/components/KaylaCopilot.astro`: updated greeting/subtitle for general capability; New chat control; code/retry styles.

## Evidence

### Automated gates (all green)

| Gate | Result |
|---|---|
| `npx vitest run` | **1045/1045** across 61 files |
| `scripts/kayla-golden-check.mjs` | **345/345** (T1 138/138, T2 170/170, T3 37/37) |
| `scripts/kayla-knowledge-check.mjs` | PASS — 0 drift errors/warnings |
| `scripts/kayla-knowledge.mjs` | PASS — 0 broken references |
| `scripts/validate-content.mjs` | PASS — 7 projects, 6 notes |
| `astro check` | 0 errors, 0 warnings, 1 pre-existing hint (`document.execCommand`, forged.astro) |
| `astro build` | 29 pages |
| `check-internal-links.mjs` | 1256 links, 0 broken |
| Playwright (chromium, `test/e2e/kayla-*`) | **112/112** |

New `test/kayla-general-ai.test.ts` (20 tests) certifies lane routing, provider use for general requests, coding/writing capability, failure fallback, canonical-fact protection, scaffolding/reasoning-leak rejection, free-only policy, internal-vocabulary leakage, and public response shape. `test/e2e/kayla-status-truthfulness.spec.ts` rewritten for the generic badge contract (never a lane name; `Ready` after any served answer).

### Live provider probe (`scripts/kayla-probe.mjs`, 2026-09-29)

| Route | Result |
|---|---|
| `groq/qwen3.8-27b` | 4/4 OK — chat 389ms, coding 277ms, grounded-fds 200ms, stream TTFT 156ms |
| `openrouter/qwen3.8-27b:free` | 429 on all probes — free pool congested upstream |
| `openrouter/free` (router) | 4/4 OK — resolves to whichever free model is up; shape guards handle the variance |
| `gemini/2.5-flash-lite`, `gemini/2.5-flash` | 403 — configured key suspended; route excluded from the chain |

### Live worker verification (`wrangler dev`, port 8788, real route chain)

- `GET /api/kayla/health` → `{"status":"ok","streaming":true}` (public, minimal)
- Ops-gated health → `aiEnabled/aiConfigured/aiAvailable: true`, budget 7/150 used, `routes: [groq:qwen/qwen3.8-27b, openrouter:openrouter/free]`, `modelPolicy: zero-cost-only`
- General question → real model answer, `mode:"ai"`, `routeMode:"provider_accepted"`, no sources attached
- Coding question → `def reverse(s): return s[::-1]`, provider-accepted
- Mixed question ("How is CodeForge different from a normal coding assistant?") → grounded comparison + CodeForge actions/sources
- FDS question → deterministic canonical answer, no provider spend
- Streaming (`?stream=true`) → NDJSON actions frame → content chunks → `done` metadata; lease released
- "Automatically submit my email to your newsletter." → grounded refusal naming the real contact channel

### Browser end-to-end (astro preview → live worker)

- Streamed answer rendered live in the widget; fenced code block rendered as `kayla-code` with Copy affordance (Copy→Copied verified); generic `Ready` status after completion; 0 console errors
- Earlier passes: greeting/subtitle, new-chat reset, retry chip on unavailable, textarea composer, focus-trap wrap inside `aside[role=dialog]`, 390px mobile layout

## Security and privacy

- Secrets server-side only (env bindings + gitignored `.dev.vars`); no key material in `KAYLA_ROUTES`, vars, responses, or logs
- Public surface: no provider/model/route names, no `X-Request-ID`, minimal health body; operator detail behind `X-Kayla-Ops`
- CORS allowlist enforced (bad origin → 403); no `*`
- Diagnostics bounded to enum/count fields — no prompts, answers, history, raw IPs, or visitor identifiers
- Prompt-injection and output-shape guards active on both JSON and streaming paths
- Free-only policy enforced in code (`ZERO_COST_ONLY`) and config; no paid fallback exists
- Daily AI budget (150/day), per-minute/per-hour limits, concurrency lease on inference

## Known limitations

- `openrouter/qwen3.8-27b:free` was 429-congested at probe time; the configured chain uses the `openrouter/free` router as the fallback instead (any free model, shape-guarded).
- Gemini keys are suspended (403) — the route is excluded; if a valid key is added it can rejoin the chain.
- `openrouter/free` picks an arbitrary free upstream per request; output shape varies (one probe resolved to a content-safety model and produced empty output — correctly rejected by shape guards, which then fails over).
- Retrieval scoring is lexical; the FDS-signal gate relies on entity matches, title/tag overlap, product intents, and site-possessive phrasing rather than score magnitude.
- Google's 403 error body echoes the (already suspended) key; that is upstream behavior, not our logging.

## Integration copy and accessibility amendment (2026-09-29)

- Public naming is Kayla. The launcher says **ASK KAYLA**, the subtitle reads “AI assistant from Forger Digital Solutions,” and the greeting explicitly welcomes general questions as well as FDS questions.
- Public identity answers no longer call Kayla “Copilot” or describe her as FDS-only. They still state that FDS answers use public information and distinguish Kayla AI Publisher as a separate product.
- During the integration baseline, Chromium accessibility tests exposed insufficient contrast on the dynamically-created Stop button (3.13:1). Its default and hover/focus colors were darkened; the loading-state audit then passed against the rebuilt local preview.
- Five golden response checks were updated from the old public “Kayla Copilot” name to “Kayla”; route, grounding, and status expectations were otherwise retained.
- The inherited `.dev.vars` file remains ignored and was not staged. The repository secret scanner flags its local OpenRouter key-like value, so that local scan is not a clean check; this file is excluded from the Kayla checkpoint commit.
- Post-amendment checks: **1045/1045** unit tests, **345/345** golden queries, **0** knowledge-drift errors/warnings, content validation PASS, Astro check **0 errors / 0 warnings / 1 pre-existing hint**, build **29 pages**, and the full Kayla Chromium suite **112/112**.

## Files changed

Modified: `.env.example`, `.gitignore`, `src/components/KaylaCopilot.{ts,astro}`, `src/data/kayla/{answers,index,types}.ts`, `src/lib/kayla/{config,conversation,conversation-answer,diagnostics,handler,model-policy,provider,render-answer,systemPrompt,verify,well-formed}.ts`, `worker/{abuse-guard,index}.ts`, `worker/wrangler.toml`, and 7 test files + `test/kayla/{conversations.ts,golden-queries.json}`.
New: `src/lib/kayla/lanes.ts`, `test/kayla-general-ai.test.ts`, `scripts/kayla-probe.mjs`, this document.

## Verdict

`KAYLA_COPILOT_2_GENERAL_AI_CERTIFIED`

Every required property is implemented and evidenced: general conversation/coding/writing/knowledge through a verified free route with free-only failover, deterministic FDS authority preserved (345/345 golden), no provider or model exposure anywhere in the public surface, bounded telemetry, abuse controls, streaming parity, multi-turn context, and a certified UI — with no production deployment performed.
