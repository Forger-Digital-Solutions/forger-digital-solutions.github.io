# Kayla Copilot — Phase 8 Certification: Grounded Adaptive Intelligence

**Date:** 2026-09-04
**Scope:** Continue the post-Phase-7 work already in the repository (adaptive provider routing, answer-shape verification, temporal/causal/roadmap firewalls) rather than redo it. Certify what was inherited, close the gaps an evaluation-driven audit actually found, and extend browser/production coverage.

## 1. Verdict

```
KAYLA_PHASE8_CERTIFIED
```

Every mandatory local gate passes, the deployed Worker matches the pushed commit, and the certified behaviour is proven end to end — through `handleKaylaChat`, not just through the isolated gate function — rather than assumed from the presence of code.

## 2. Repository State

- Branch: `main`, starting and ending
- Starting HEAD: `8cbc7e2248595691640a699e66768648663ccbab` (matched the brief's claimed continuation baseline exactly)
- Ending HEAD: `bdf93c4f6bcf1bac4c256d8bc90de997e3a6a5ca`
- Initial worktree: clean
- Final worktree: clean, single implementation commit
- Production Worker at session start: `db85e758-1d9b-4fc1-84a6-058670d970da` (matched the brief's claimed value exactly, confirmed via `wrangler deployments list`)
- Production health at session start: `aiDailyUsed: 4 / 150` (matched the brief's claimed value exactly)

Both of the brief's specific, checkable claims (Worker version, allowance state) were independently re-verified against live production before anything else, and matched. The rest of the brief's narrative was treated as a claim to verify, not a fact — audited against the actual source in Part 1 below before any new work began.

## 3. Baseline Reverification

Re-run from the clean checkout before any change:

| Gate | Claimed | Re-run | Match |
|---|---|---|---|
| Vitest | 598 / 34 files | 598 / 34 files | Yes |
| Golden queries | 191/191 | 191/191 | Yes |
| Astro check | 0/0/0 | 0/0/0 (90 files) | Yes |
| Build | — | 26 pages | Yes |
| Internal links | 930 / 0 broken | 930 / 0 | Yes |
| Secret scan | PASS | PASS | Yes |
| Worker build | — | builds clean, dry-run OK | Yes |
| Deploy check | PASS | PASS | Yes |

No drift. Nothing needed reconciling before Phase 8 work began.

## 4. Adaptive Provider Routing

**Existing implementation audited, not duplicated.** `src/lib/kayla/handler.ts` already implements the design the brief describes:

- `DETERMINISTIC_INTENTS` and `PROVIDER_ELIGIBLE_INTENTS` gate `isProviderEligible()`.
- `canonicalEntitiesIn()` in `verify.ts` deduplicates entity mentions (`[...new Set(entitiesIn(text))]`), so `"What is CodeForge?"` counts one entity, not two, even though `entityNames` lists CodeForge under more than one record.
- `RELATIONAL_QUESTION` phrasing (`fit together`, `related`, `vs`, `compared`, etc.) keeps an `identity`-classified question provider-eligible when it names more than one entity or uses relational language — confirmed still intact and covered by `test/kayla-adaptive-routing.test.ts`.
- A **more powerful, separate gate** sits in front of `isProviderEligible`: `deterministicAnswer()` short-circuits the whole decision when the top result is `sourceType: 'canonical'` and either `settled: true` or its intent is in `DETERMINISTIC_INTENTS`. This is the mechanism that actually answers the brief's Part 4 (multi-record deterministic synthesis) — `filteredListAnswer()`, `availabilityListAnswer()`, and `gemsAvailabilityAnswer()` in `src/data/kayla/answers.ts` already mark filtered project listings (`"which projects are still research"`, `"which projects are downloadable"`, `"which projects are private"`, `"which GEMS are public"`) as `settled: true`, so they never reach `isProviderEligible` at all. This was not obvious from reading the handler alone and was confirmed empirically before any code was written.

**Regression found and reverted.** Attempting to also mark the generic, unfiltered `listAnswer()` as settled (closing a minor evaluation-corpus gap — see §5) broke a certified Phase 7 live case: `"Explain all of FDS to me"` resolves through the same `listAnswer()` branch, and that question is exactly the ecosystem-synthesis case Phase 7 certified the provider for. The change was reverted before commit; `answers.ts` carries only an explanatory comment recording why `listAnswer()` stays un-settled. Full suite (623/623) and golden (194/194) were re-run after the revert to confirm the regression was actually gone, not just reasoned away.

**Formal end-to-end certification added.** `test/kayla-provider-call-matrix.test.ts` (12 new tests) asserts `providerAttempted` through the real `handleKaylaChat` pipeline with a scripted (non-network) provider shaped exactly like production config — the signal `isProviderEligible()` alone cannot give, since a settled answer never calls it:

| Question | providerAttempted | Mechanism |
|---|---|---|
| Who founded FDS? | false | settled canonical (`founder` intent) |
| What does CodeForge cost? | false | settled canonical (`pricing` intent) |
| Can I download KyraBlox? | false | settled canonical (`availability` intent) |
| What does ACTIVE DEVELOPMENT mean? | false | settled canonical (`status_taxonomy`) |
| Which projects are downloadable? | false | settled canonical (`filteredListAnswer`) |
| Compare CodeForge and Kayla AI Publisher. | true | `comparison` intent |
| How are GEMS and Training Grounds related? | true | relational phrasing override |
| How do the FDS apps fit together? | true | relational phrasing override |
| CodeForge vs ForgerEMS | true | multi-entity + relational |

**Provider calls avoided (evaluation corpus, not production traffic).** New `scripts/kayla-routing-eval.mjs` classifies all 191 golden-query-corpus questions into `deterministic` / `local_only` / `provider_eligible` without ever contacting OpenRouter:

```
deterministic (settled, no provider possible):  115
local_only (not settled, gate declines):         51
provider_eligible (gate would attempt):          25
Provider calls avoided on this corpus: 166 / 191 (86.9%)
```

Labelled throughout as an **evaluation-corpus measurement**, never production analytics.

## 5. Retrieval Intelligence

**Evaluation corpus added.** New `scripts/kayla-retrieval-eval.mjs` runs the 10 questions from the brief's Part 5 list through the full local pipeline and checks whether an expected entity actually grounds the top-3 results (by id/route, or by name inside a settled canonical listing's own text — a filtered availability answer names "CodeForge" in prose rather than carrying a per-entity id, and that is still correct grounding, not a miss).

Two real, evaluation-driven gaps were found and fixed in `src/data/kayla/intents.ts` (not invented — this is exactly the failure the brief asked this evaluation to surface):

- `"What can I actually download?"` and similarly-shaped adverbial phrasing (`"How can I actually get CodeForge?"`) fell through the `availability` intent's rigid space-separated regex (`(can|could|may) (i|we|you|anyone) (download|...)`) because of the interstitial word, landed in raw keyword retrieval, and surfaced **FarmStand Finder** as the top result for a downloads question — a real quality defect, not a hypothetical one. Fixed by tolerating exactly one interstitial word between the pronoun and the verb.
- `"What AI projects does FDS have?"` and `"Where should a developer start?"` similarly missed the `list`/`recommendation` intent patterns for the same reason (an adjective or a third-person subject the original regex didn't anticipate).

**Result after the fix:** 9/10 retrieval-evaluation cases pass. The one remaining failure (`"Which projects are visible publicly but not released?"`) is a genuinely ambiguous phrasing with no current intent match; documented as a known limitation (§24) rather than chased with a broader, riskier regex change this session.

**Multi-record synthesis:** confirmed already implemented (§4) rather than duplicated — `filteredListAnswer`, `availabilityListAnswer`, `gemsAvailabilityAnswer` derive their filters from `projects.ts` / `products.ts` status and availability fields, not hand-written lists.

**Retrieval-only behaviour:** unchanged. `src/data/kayla/retrieval.ts`'s scoring (title/tag/text token overlap, fuzzy matching, entity-context boost) was read in full; per Part 6's instruction to modify retrieval only where evaluation demonstrates a failure, the two failures found were fixed at the intent-classification layer (upstream of retrieval, and the actual point of failure), not by adding new scoring machinery to `retrieval.ts` itself.

## 6. Evidence / Answer Planning

No new `KaylaAnswerPlan` type was introduced. The existing architecture already implements "decide evidence → decide route → generate prose" without a parallel abstraction:

- **Evidence:** `LocalKaylaProvider.search()`'s layered lookup (canonical → known-answer → entity-match → retrieval) *is* the evidence-selection step.
- **Route:** `deterministicAnswer()` + `isProviderEligible()` *is* the route decision.
- **Prose:** either the canonical text directly, or `buildChatMessages()`'s evidence packet handed to the provider.

Adding a second, parallel `KaylaAnswerPlan` type over the same decision would be the abstraction Phase 8's own instructions warn against building without a demonstrated need — the audit found none.

## 7. Provider Grounding

- **Evidence packet** (`systemPrompt.ts`): unchanged, audited only. `knowledgeBlock()` already separates the canonical block (settled fact, deliver verbatim) from supporting knowledge (capped at 4 entries), and the prompt explicitly instructs "Use only supplied FDS evidence... Do not invent missing facts" — defense-in-depth, backed by `verifyAgainstCanon()` doing the actual enforcement.
- **Prompt bounds:** history capped at the last 6 turns, each truncated to 2000 chars; supporting knowledge capped at 4 entries.
- **Output bounds:** `MAX_RESPONSE_TOKENS = 700` (provider.ts, unchanged) plus a new local defense-in-depth check: `checkAnswerShape()` now also rejects any answer over 6000 characters (`oversized_answer`), so a provider that ignores `max_tokens` cannot buffer an unbounded string before the existing buffer-then-validate step runs.
- **Answer length policy:** the system prompt's existing STYLE section ("one or two sentences for a simple fact, more only when the question genuinely asks for depth") already states this; no change needed.
- **Timeout:** confirmed unchanged at 9000ms. Per Part 16's instruction not to raise it blindly, the correct move was to *reduce unnecessary work first* — which is exactly what the intent-classification and settled-answer fixes above do; no live timeout evidence from this session justified a change.

## 8. Semantic Verification V2

Audited `src/lib/kayla/verify.ts` and `verify-relations.ts` in full before writing anything. All of the following were **already implemented and tested**, contradicting nothing in the brief but confirming its own caution that the inherited WIP needed auditing rather than assuming completeness:

- **Relationships:** `verifyRelationsInText()` catches denied/unsupported/false-equivalence claims between recognised FDS entities (`denied_relation`, `unsupported_relation`, `false_equivalence`).
- **Temporal:** `checkTemporalClaims()` rejects future/past dates attached to FDS entities not documented in canonical data (`temporal_claim`).
- **Causal:** `checkCausalClaims()` rejects fabricated reasons for project state (`causal_claim`).
- **Roadmap:** `checkRoadmapClaims()` rejects unsupported future plans, including the exact brief example `"CodeForge will replace the free model with Sapphire"` — already covered by an existing test (`test/kayla-verify.test.ts:46`) proving the determiner fix the brief describes is real and working, not just claimed.
- **Multi-sentence contradiction:** functionally already covered — `verifyAgainstCanon()` iterates every sentence independently, so a paragraph of true facts plus one invented sentence is rejected because the one bad sentence is caught on its own pass. This was previously untested as an explicit multi-sentence case; confirmed working via manual verification during this session (not committed as a new test file edit, since `kayla-verify.test.ts`'s existing single-sentence matrix already exercises the same per-sentence code path this claim depends on).
- **Live confirmation:** the live production matrix (§19) asked `"When will Sapphire be added to CodeForge?"` and got a real `provider_accepted` answer that itself declined to invent a date ("I don't have any documented information about when Sapphire will be added to CodeForge") — the temporal/roadmap firewall held on a genuine live model response, not just a scripted one.

No duplicate implementation was added. No existing behaviour was changed.

## 9. Answer-Shape Verification

**Live defect (inherited, already fixed by the prior continuation):** production request `77b88132` served `<|tool_call_start|>[FDS_Knowledge(query=...)]` to a visitor with `routeMode: provider_accepted`, because canonical verification asks whether an answer is *true* and cannot ask whether it is an *answer*. `checkAnswerShape()` in `src/lib/kayla/well-formed.ts` already existed, running before `verifyAgainstCanon()` in `acceptGenerated()`, catching `control_token`, `tool_call_scaffolding`, `reasoning_leak`, and `empty_answer`. Confirmed by reading the code and the existing regression test (`test/kayla-answer-shape.test.ts`), not re-implemented.

**New this session — pathological repetition and oversized answers (Part 14/15), genuinely missing before:**

- `hasPathologicalRepetition()`: rejects a sentence or paragraph repeated 4+ times back to back (the loop shape a stuck free-router model produces), while explicitly *not* rejecting a fact stated once and echoed once later, or an ordinary bullet list of distinct short lines. False-positive sweep included in the same test file.
- `oversized_answer`: rejects any answer over 6000 characters, as local defense-in-depth alongside the provider's own 700-token cap (§7).

**False-positive sweep preserved and extended:** `test/kayla-answer-shape.test.ts`'s existing sweep against every canonical answer Kayla produces (`describe('real answers are not mistaken for scaffolding')`) still passes; new tests added for repetition and oversized-answer false positives (ordinary bullet lists, ordinary long-form canonical answers, a fact restated once).

**Handler-level replacement proof:** `test/kayla-scaffolding-rejection.test.ts`'s existing end-to-end matrix (scripted provider, unmodified pipeline, asserts `routeMode: provider_replaced` and the exact violation kind in diagnostics) now includes `pathological_repetition` alongside the four existing kinds.

**Ordering preserved:** `provider output → answer-shape verification → canonical verification → accept or safe replacement`, unchanged in `acceptGenerated()`.

## 10. Adversarial Matrix

| Claim / Output | Expected | Actual | Verification Path | Result |
|---|---|---|---|---|
| `<\|tool_call_start\|>[FDS_Knowledge(...)]` | rejected | rejected, `control_token` | `checkAnswerShape` (unit + handler e2e) | CONFIRMED |
| `<tool_call>{"name":"search"}</tool_call>` | rejected | rejected, `tool_call_scaffolding` | `checkAnswerShape` | CONFIRMED |
| `<think>...</think> CodeForge is free.` | rejected | rejected, `reasoning_leak` | `checkAnswerShape` | CONFIRMED |
| Whitespace-only output | rejected | rejected, `empty_answer` | `checkAnswerShape` | CONFIRMED |
| "CodeForge is free." × 5 back to back | rejected | rejected, `pathological_repetition` (new) | `checkAnswerShape` + handler e2e | CONFIRMED |
| 200-repetition oversized string | rejected | rejected, `oversized_answer` (new) | `checkAnswerShape` | CONFIRMED |
| "Sapphire powers CodeForge." | rejected | rejected, `unsupported_relation` | `verifyRelationsInText` + provider-rejection e2e | CONFIRMED |
| "CodeForge is currently version 9.0." | rejected | rejected, `version` | `verifyAgainstCanon` | CONFIRMED |
| "Sapphire will ship in October." | rejected | rejected, `temporal_claim` | `verifyAgainstCanon` | CONFIRMED |
| "KyraBlox is private because of legal concerns." | rejected | rejected, `causal_claim` | `verifyAgainstCanon` | CONFIRMED |
| "CodeForge will replace the free model with Sapphire." | rejected | rejected, `roadmap_claim` | `verifyAgainstCanon` (existing test) | CONFIRMED |
| "When will Sapphire be added to CodeForge?" (live) | no invented date | model itself declined; verifier stood behind it | Live production, `provider_accepted` | CONFIRMED |
| "Why is We The People private?" (live) | no invented reason | settled canonical, no reason invented | Live production, `deterministic` | CONFIRMED |
| Ordinary canonical prose (all of Kayla's own answers) | accepted | accepted, no false positive | `checkAnswerShape` full sweep | CONFIRMED |

## 11. Source / Action Relevance

**Gap found:** neither `toKaylaSources()` nor the action-assembly path deduplicated by actual destination. A comparison or multi-source answer could show two sources or two action buttons pointing at the same route.

**Fixed:**
- `src/lib/kayla/sources.ts`: `toKaylaSources()` now dedupes by `kind:url|route|label` before applying the result limit, so the limit is filled with *distinct* destinations rather than stopping early on a repeat.
- `src/lib/kayla/actions.ts`: new `dedupeActions()`, wired into `handler.ts`'s `localActions()` and `provider.ts`'s `preferredActions()` — both the local-answer and provider-answer action paths.

**Verified live:** the browser check in §20 shows a real production answer ("Can I download KyraBlox?") rendering two distinct action buttons ("View KyraBlox", "See what is available now") with no duplicate, confirming the dedup didn't remove a legitimate second option.

## 12. Recommendation Intelligence

Audited `recommendationAnswer()` in `answers.ts` (scores project category/summary/audience/problem/differentiation text against the visitor's words — already data-driven, not a hand-written persona map). One real intent-classification gap found and fixed: `"Where should a developer start?"` didn't match the `recommendation` intent's `"where should I start"` pattern because the subject was third-person ("a developer") rather than first-person ("I"). Fixed by broadening the pattern to accept `i|a \w+|someone|you` as the subject. Verified: this question now resolves to CodeForge (correctly, matching the audience/category text) instead of falling through to unrelated retrieval results.

Did not infer hidden visitor traits beyond what the question states, per the brief's explicit instruction.

## 13. Input / Context Trust

- `pageType`: `KAYLA_PAGE_TYPES` canonical array (in `types.ts`) drives both the validator's allowlist and the type union; confirmed intact, untouched.
- `pageType` drift test: `test/kayla-adaptive-routing.test.ts`'s existing drift regression (every route `getPageType()` can emit is checked against `KAYLA_PAGE_TYPES`) confirmed still present and passing.
- Malformed input: existing coverage of `123`, `null`, `true`, `['project']`, `{pageType:'project'}` as hostile `pageType` values all normalise to `'other'` without throwing — confirmed still passing, untouched.
- Oversized input: existing payload-size and message-length bounds in `validate.ts` untouched and still tested.

No changes were made to this surface; it was audited and found already correct.

## 14. Provider Resilience

`test/kayla-failure-matrix.test.ts` (pre-existing, audited not duplicated) already covers: no provider configured, HTTP failure, timeout, malformed output, false-fact rejection, 429 rate limit, AI budget exhausted, empty prompt, oversized prompt, unknown fact, empty retrieval, and the streaming equivalents of each. This already satisfies the bulk of Part 19's outage matrix.

**Live evidence, observed naturally (not brute-forced):** the live production matrix (§19) included a genuine `provider_failed_fallback` on `"Give me a short explanation of how the main FDS projects fit together."` — the provider was attempted, failed, and the visitor received the grounded canonical fallback with no alarming internals exposed (`OpenRouter`, `provider_failed_fallback`, and similar are absent from the rendered text — the existing Playwright "Failure UX" test asserts exactly this for a scripted equivalent). This was not sought out or retried into existence; it happened during the ordinary matrix run and is reported honestly as a naturally-occurring failure, per Part 15/36's instruction not to brute-force adverse provider behaviour.

Core invariant (`provider failure ≠ Kayla failure`) reconfirmed both by test and live evidence.

## 15. Efficiency

- **Evaluation routing split** (191-question corpus): 115 deterministic + 51 local_only + 25 provider_eligible = 166/191 (86.9%) avoid a provider attempt.
- **Prompt size:** unchanged (history ≤ 6 turns × 2000 chars, ≤ 4 supporting knowledge entries).
- **Response length:** unchanged (700-token cap, plus new 6000-char local ceiling as defense-in-depth).
- **Latency (live, this session):** deterministic answers 250–397ms; the one `provider_accepted` live case took 1774ms; the one `provider_failed_fallback` live case took 4156ms before falling back. Sample size is far too small for percentiles and is reported as an observed range only, consistent with Phase 7's own latency-reporting caution.

## 16. Browser / Accessibility

- **Chromium:** 16/16 (up from 14 — added 390px mobile and reduced-motion coverage). Verified as a clean, isolated 16/16 pass; a full concurrent 3-engine run occasionally times out one pre-existing test under worker contention (see §24) — not a regression, reproduced as flaky before and after this session's changes.
- **Firefox / WebKit:** newly installed (`npx playwright install firefox webkit`) and added as Playwright projects scoped to a new, bounded `kayla-widget-crossbrowser-smoke.spec.ts` (open/close + focus restoration, send-and-render with a real computed-style check, no-horizontal-overflow at 390px) — 3/3 on each engine, not a duplicate of the full 16-case Chromium suite, per the brief's explicit instruction not to copy the deep suite across engines automatically.
- **Reduced motion:** new test using Playwright's `reducedMotion: 'reduce'` context option — widget opens, answers, and closes with all controls remaining visible and operable.
- **Mobile/touch:** 320px (pre-existing) and 390px (new) both assert no horizontal overflow with launcher, composer, send button, and rendered actions all visible.
- **Accessibility:** audited, not re-built. Dialog semantics, launcher accessible name, close-button name, and focus containment/restoration were already covered by the pre-existing Chromium suite (`Tab`/`Shift+Tab` trap tests, `Escape`-returns-focus test) and confirmed still passing.

## 17. Privacy / Observability

Unchanged. No prompt, answer, history, or raw IP is logged anywhere in the Kayla server surface — confirmed by re-reading `diagnostics.ts` and `worker/index.ts`'s `logSafe()`/`emitDiagnostics()`, both of which are still enum/count-only. No new routing diagnostics fields were added this session, so no new privacy surface was introduced.

## 18. Test Results

| Gate | Result |
|---|---|
| Vitest | 623 / 623 passed, 35 files (was 598/34) |
| Golden queries | 194 / 194 (was 191/191); Tier 1 78/78, Tier 2 90/90, Tier 3 26/26 |
| Playwright — Chromium | 16 / 16 (was 14/14) |
| Playwright — Firefox (smoke) | 3 / 3 (new) |
| Playwright — WebKit (smoke) | 3 / 3 (new) |
| Adaptive-routing eval (corpus) | 191 classified, 166 avoid provider (86.9%) |
| Retrieval eval (corpus) | 9 / 10 |
| Astro check | 0 errors / 0 warnings / 0 hints (90 files) |
| Build | 26 pages |
| Internal links | 930 checked / 0 broken |
| Secret scan | PASS |
| Worker build | 245.02 KiB / 63.80 KiB gzip |
| Deploy check | PASS |
| `npm run validate` (aggregate) | PASS |

## 19. Live Production Matrix

Executed against `https://kayla-api.forgerdigitalsolutions.workers.dev` after deploying this session's Worker changes. 7 distinct questions, 8 HTTP calls (one retried after a natural per-IP rate limit at request 6 — itself confirming the rate limiter works). Shared AI daily allowance moved from 4/150 to 6/150: only 2 of 8 calls actually spent shared provider quota, consistent with the adaptive-routing design.

| Question | HTTP | Latency | Route | Provider | Shape | Canonical Verification | Result |
|---|---:|---:|---|---|---|---|---|
| Who founded Forger Digital Solutions? | 200 | 397ms | deterministic | not attempted | n/a | n/a | matches Edward Schmidt bio |
| Can I download KyraBlox? | 200 | 272ms | deterministic | not attempted | n/a | n/a | correctly "No", ACTIVE DEVELOPMENT |
| What does CodeForge cost? | 200 | 250ms | deterministic | not attempted | n/a | n/a | "free", no invented price |
| Which FDS projects can I use today? | 200 | 265ms | deterministic | not attempted | n/a | n/a | CodeForge + ForgerEMS only |
| When will Sapphire be added to CodeForge? | 200 | 1774ms | provider_accepted | attempted | ok | passed | model itself declined to invent a date |
| Why is We The People private? (1st attempt) | 429 | 252ms | rate_limited | n/a | n/a | n/a | per-IP limiter correctly fired |
| Why is We The People private? (retry) | 200 | 288ms | deterministic | not attempted | n/a | n/a | no invented reason given |
| Give me a short explanation of how the main FDS projects fit together. | 200 | 4156ms | provider_failed_fallback | attempted, failed | n/a | n/a | graceful local fallback, no internals exposed |

## 20. Live Browser Verification

Target: `https://forger-digital-solutions.github.io` (real public site, not a stub).

- **Desktop:** homepage renders correctly; Kayla launcher opens the panel; asked "Can I download KyraBlox?" and received the correct deterministic answer with two distinct, non-duplicated action buttons ("View KyraBlox", "See what is available now") and a rendered sources row.
- **Mobile (375px preset):** same question re-verified — no horizontal overflow, composer and send button visible, action buttons and sources row rendered correctly within the panel.

Frontend behaviour was not certified from API responses alone, per Part 39.

## 21. Production Deployment

- Worker endpoint: `https://kayla-api.forgerdigitalsolutions.workers.dev`
- Worker version before this session: `db85e758-1d9b-4fc1-84a6-058670d970da` (independently confirmed matching the brief)
- Worker version after this session's deploy: `22a218be-6324-4042-afb5-44d0abd5a2a5`
- Pages deployment: GitHub Actions run `33927642675` ("Deploy to GitHub Pages"), completed successfully in 56s for commit `bdf93c4`
- Commits this session: `bdf93c4` (implementation)

## 22. Files Changed

```
package.json                                        (2 new npm scripts)
playwright.config.ts                                 (firefox/webkit smoke projects)
src/data/kayla/answers.ts                            (comment only — settled revert documented)
src/data/kayla/intents.ts                            (3 pattern broadenings)
src/lib/kayla/actions.ts                             (dedupeActions)
src/lib/kayla/handler.ts                             (dedupeActions wiring, exported deterministicAnswer)
src/lib/kayla/provider.ts                            (dedupeActions wiring)
src/lib/kayla/sources.ts                             (destination dedup)
src/lib/kayla/well-formed.ts                         (pathological_repetition, oversized_answer)
test/e2e/kayla-widget.spec.ts                        (390px + reduced-motion tests)
test/e2e/kayla-widget-crossbrowser-smoke.spec.ts     (new — Firefox/WebKit smoke)
test/kayla-actions.test.ts                           (dedup tests)
test/kayla-answer-shape.test.ts                      (repetition/oversized tests)
test/kayla-provider-call-matrix.test.ts              (new — routing certification matrix)
test/kayla-scaffolding-rejection.test.ts             (repetition case added)
test/kayla-source-and-route-mode.test.ts             (source dedup tests)
test/kayla/golden-queries.json                       (3 new adaptive-routing queries)
scripts/kayla-routing-eval.mjs                       (new — provider-calls-avoided evaluation)
scripts/kayla-retrieval-eval.mjs                     (new — retrieval grounding evaluation)
```

## 23. Evidence Artifacts

- This document and `docs/kayla/audit/kayla-phase8-receipt.json`
- `scripts/kayla-routing-eval.mjs --verbose` and `scripts/kayla-retrieval-eval.mjs --verbose` output (reproducible on demand; not stored as static files, since re-running them is the point)
- Live production requests: see §19 (no requestId correlation was captured this session — the Worker returns no request id in the JSON body itself, only in the `X-Request-ID` response header, which was not retained; latency and routeMode were)

## 24. Remaining Limitations

- One retrieval-evaluation case (`"Which projects are visible publicly but not released?"`) still resolves to a generic top hit rather than the intended set of not-yet-released projects. Documented rather than fixed with a broader regex this session, to avoid the kind of over-generalization that caused the `listAnswer()` regression in §4.
- The full 3-engine Playwright suite occasionally times a single, pre-existing (not authored this session) test out under worker contention when all engines run concurrently; every affected test passes reliably 100% of the time when run in isolation or with `--workers=1`, in both the file-alone and full-suite forms tried. This is an environment/parallelism characteristic of this machine, not a functional regression — recommend CI pin a moderate worker count for this suite.
- Multi-sentence contradiction verification is confirmed functionally correct (verification is per-sentence, so any single fabricated sentence in a longer true passage is still caught) but was not added as an explicit new committed test case this session, since it exercises the same code path the existing single-sentence matrix already covers end to end.
- No live production sample of the tool-call-scaffolding defect recurring was sought (per Part 36's explicit instruction not to brute-force this) — the fix's live proof remains "the lane is healthy" (post-fix live requests carry no scaffolding), not "the rejection fired live," exactly as the inherited Phase 7 receipt already stated and Phase 8 should not overstate.
- Upstream OpenRouter free-tier limits above the local 150/day ceiling remain unmeasured, unchanged from Phase 7.

## 25. Final Certification Statement

Kayla Copilot is certified **SAFE + SEMANTIC + ADAPTIVELY ROUTED + RETRIEVAL-GROUNDED + TIME-AWARE + CAUSALITY-SAFE + ROADMAP-SAFE + ANSWER-SHAPE-SAFE + SOURCE-RELEVANT + ACTION-RELEVANT + PROVIDER-RESILIENT + COMPUTE-EFFICIENT + BROWSER-TESTED + PRODUCTION-VERIFIED** as of commit `bdf93c4`, Worker version `22a218be-6324-4042-afb5-44d0abd5a2a5`, deployed and confirmed live.

```
KAYLA_PHASE8_CERTIFIED
```
