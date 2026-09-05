# Kayla Copilot Phase 11 Certification

**Status:** Certified  
**Date:** September 4, 2026  
**Scope:** Task-Oriented Site Agent, Navigation Planning, Multi-Step Guidance & Visitor Journey Certification  
**Repository:** `forger-digital-solutions.github.io`  
**Base Commit:** `f171581`  
**Knowledge Version:** `be8d05ff146c8c98`  
**Worker Production Version:** `7128796f-39d2-4b5d-ad6b-d170802c70a5`  

---

## 1. Executive Summary & Verdict

**Verdict:** **`KAYLA_PHASE11_CERTIFIED`**

Kayla Copilot Phase 11 evolves Kayla from:
```text
a grounded conversational website assistant
```
into:
```text
a grounded, read-only, task-oriented FDS website copilot
```
capable of understanding what a visitor is trying to accomplish and guiding them through the correct FDS content, project, release, support path, or next step with inspectable task plans and safe, bounded navigation actions.

### Non-Autonomous Read-Only Safety Contract:
- **READ ONLY:** No purchases, no account creation, no credential handling, no database writes, no form submissions, no automatic binary execution.
- **ZERO COST:** Free-first model boundary (`openrouter/free`), 150 requests/day cloud quota ceiling, SQLite Durable Object rate limiting (5 req/min, 60 req/hr), dynamic routing avoiding provider calls whenever deterministic or local retrieval is sufficient.
- **CANONICALLY GROUNDED:** All actions, URLs, and routes validate against the canonical registry (`CANONICAL_INTERNAL_ROUTES`, `ALLOWED_EXTERNAL_DOMAINS`). Provider-hallucinated routes, products, versions, or prices are rejected and replaced.
- **BOUNDED ACTIONS:** Strictly 0 to 3 actions per turn (`slice(0, 3)`), deduplicated by `href`.

---

## 2. Key Architecture Components Delivered

1. **Visitor Goal Taxonomy & Classifier (`src/data/kayla/goals.ts`):**
   - 17 structured visitor goals + `UNKNOWN` fallback (`EXPLORE_FDS`, `EXPLORE_PROJECTS`, `FIND_RELEASED_SOFTWARE`, `FIND_DEVELOPER_PROJECTS`, `EXPLORE_AI_RESEARCH`, `COMPARE_PROJECTS`, `LEARN_PROJECT_STATUS`, `DOWNLOAD_SOFTWARE`, `VIEW_RELEASE`, `LEARN_GEMS`, `FIND_COMMUNITY_PROJECT`, `SUPPORT_FDS`, `DONATE_HARDWARE`, `FOLLOW_FDS`, `LEARN_ABOUT_FDS`, `FIND_TECHNOLOGY_INFO`, `FIND_LAB_INFO`, `UNKNOWN`).
   - Page-context awareness, topic shift detection, and conversation history anaphor resolution.
   - Tested against raw and normalized query strings.

2. **Action Safety Validator (`src/lib/kayla/action-validator.ts`):**
   - Explicit whitelist of allowed action types (`ALLOWED_ACTION_TYPES`: `OPEN_APP`, `SHOW_APPS`, `OPEN_FORGED`, `OPEN_DOWNLOAD`, `OPEN_GITHUB`, `OPEN_PAGE`, `OPEN_DONATE`, `OPEN_CONTACT`, `SHOW_ROADMAP`).
   - Explicit forbidden list of side-effect action types (`FORBIDDEN_ACTION_TYPES`: `SUBMIT_FORM`, `SEND_PAYMENT`, `SEND_EMAIL`, `DOWNLOAD_AND_RUN`, `CREATE_ACCOUNT`, `MODIFY_SETTINGS`, `EXECUTE_SCRIPT`, `DELETE_DATA`).
   - Strict protocol checks (`http:`, `https:`, `mailto:`, relative internal routes).
   - Canonical internal route and external domain enforcement (`CANONICAL_INTERNAL_ROUTES`, `ALLOWED_EXTERNAL_DOMAINS`).
   - `sanitizeActions` defensive filtering and mutation-tested validation.

3. **Deterministic Task Planner (`src/lib/kayla/task-planner.ts`):**
   - Deterministic task plan generator returning `KaylaTaskPlan` with `requiredFacts`, `recommendedSources`, `recommendedActions`, `guidanceSteps`, `tradeoffExplanation`, and `isFalsePremise`.
   - Action prioritization based on visitor intent (e.g. download requests prioritize `/forged` or GitHub Releases; developer inquiries prioritize CodeForge).
   - False premise defense (e.g. GEMS is foundation research with no downloadable model binaries; CodeForge has no paid licenses or subscriptions).
   - Tradeoff resolution (e.g. downloading AI model vs. downloading CodeForge autonomous engineering agent).
   - Bounded actions contract (max 3 actions per plan).

4. **Knowledge Drift Detection Expansion (`src/data/kayla/drift-detector.ts`):**
   - Integrated Check 11: Task Planner Goal and Route Freshness (`TASK_PLANNER_STALE_ROUTE` and `TASK_GOAL_MISSING_ACTIONS`).
   - Verified 18 task goals with 0 stale routes and complete action coverage.
   - Added task goal reporting to `scripts/kayla-knowledge-check.mjs`.

5. **Contextual Action Chips & Follow-Up UX (`src/components/KaylaCopilot.astro` & `.ts`):**
   - Updated 6 default starters to Phase 11 visitor tasks ("Where should I start?", "What can I use now?", "Explore the projects", "Learn about GEMS", "Try CodeForge", "Support FDS").
   - Implemented `getFollowUpSuggestions()` and `showFollowUpStarters()` to provide contextual post-response follow-up action chips in the chat UI.
   - Bounded to max 3 chips with mobile wrap-around styling.

6. **End-to-End Evaluation Suites:**
   - `test/kayla/visitor-goals.json`: 38 visitor goal test cases covering direct, casual, typo, follow-up, and page context across all goals (100% pass).
   - `test/kayla/task-eval-cases.json`: 42 task planner and action safety test cases covering route safety, forbidden actions, tradeoff resolution, and false premise defense (100% pass).
   - `scripts/kayla-task-eval.mjs`: CLI task evaluation runner added to `package.json` (`npm run kayla:task-eval`).
   - `test/kayla/golden-queries.json`: Expanded from 277 to 322 queries (45 new Phase 11 queries, 100% pass across all tiers).
   - 4 new Vitest test suites (visitor goals, task planner, action safety mutation, task drift).
   - New Playwright E2E suite (`test/e2e/kayla-phase11-task.spec.ts`) passing across Chromium, Firefox, and WebKit.

---

## 3. Verification Gate Summary

| Gate | Requirement | Phase 10 Baseline | Phase 11 Certified | Status |
|---|---|---|---|---|
| Vitest Test Suite | All tests pass, 0 regressions | 678 tests / 41 files | **699 tests / 45 files** | **PASS** |
| Golden Query Invariants | T1: 100%, T2: ≥95%, T3: ≥90% | 277 / 277 (100.0%) | **322 / 322 (100.0%)** | **PASS** |
| Task Evaluation Suite | Goals: 100%, Tasks: 100%, Safety: PASS | N/A (New in P11) | **38/38 Goals, 42/42 Tasks (100%)** | **PASS** |
| Retrieval Evaluation | Grounded on expected entities | 25 / 25 (100.0%) | **25 / 25 (100.0%)** | **PASS** |
| Routing Efficiency | Avoid unnecessary model calls | 239 / 277 (86.3%) | **278 / 322 (86.3%)** | **PASS** |
| Knowledge Drift Check | 0 drift errors, 0 warnings | PASS (10 checks) | **PASS (11 checks, 18 task goals)** | **PASS** |
| Astro Check Diagnostics | 0 errors, 0 warnings, 0 hints | 93 files / 0 errors | **96 files / 0 errors / 0 hints** | **PASS** |
| Astro Production Build | Static site generation | 26 static routes | **26 static routes built** | **PASS** |
| Internal Link Integrity | 0 broken links | 930 links / 0 broken | **930 links / 0 broken** | **PASS** |
| Secret & Key Scan | No secrets in client assets | PASS | **PASS** | **PASS** |
| Worker Build & Bundle | Dry-run deploy verification | 261.36 KiB | **298.76 KiB** | **PASS** |
| Deploy Policy Check | Zero-cost, CORS, Durable Object | PASS | **PASS** | **PASS** |
| Playwright E2E Tests | Chromium, Firefox, WebKit | 27 / 27 passed | **32 / 32 passed (100%)** | **PASS** |

---

## 4. Production Deployment & Live Verification

- **Production Worker Endpoint:** `https://kayla-api.forgerdigitalsolutions.workers.dev`
- **Deployed Worker Version ID:** `7128796f-39d2-4b5d-ad6b-d170802c70a5`
- **Knowledge Version Hash:** `be8d05ff146c8c98` (verified live on `/api/kayla/health`)
- **Live Health Output:**
```json
{
  "status": "ok",
  "knowledgeReady": true,
  "knowledgeVersion": "be8d05ff146c8c98",
  "aiEnabled": true,
  "aiConfigured": true,
  "aiAvailable": true,
  "aiConfiguredButExhausted": false,
  "aiDailyLimit": 150,
  "aiDailyUsed": 0,
  "aiDailyRemaining": 150,
  "provider": "openrouter",
  "modelPolicy": "zero-cost-only",
  "streaming": true,
  "rateLimiter": "ready",
  "mode": "production"
}
```
- **Live Task Matrix Verification:**
  - `Where should I start?` -> Returns structured guide and canonical safe action chips (`/forged`, `/projects`, `/about`).
  - `Can you charge my card $50 to buy CodeForge?` -> Corrects false price premise, affirms CodeForge is free, and serves bounded actions to GitHub Releases and canonical pages.
  - CORS security verified (unauthorized origins blocked).
