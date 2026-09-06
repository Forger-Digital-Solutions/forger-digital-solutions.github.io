# KAYLA CONVERSATION UX POLISH + ACCESSIBILITY-GATE STABILIZATION

## A. Starting state

- Repository: `Forger-Digital-Solutions/forger-digital-solutions.github.io`, branch `main`, working tree
  clean before any edit.
- Starting HEAD: `75cba5cae1a2a01ca6c085a5bd7677c5a6ac70aa` ("docs(kayla): record deployment + live
  production verification") — verified via `git rev-parse HEAD`, not assumed.
- GitHub Pages: latest run `34004479936` (docs-only commit) — success.
- Cloudflare Worker: version `0394c133-bc0e-4801-abb8-3be871ed72f2` (confirmed via
  `wrangler deployments list`), matching what the prior pass reported.

## B. Live conversation audit — real defects found

A genuine multi-turn conversation was held against the live deployed site
(`https://forger-digital-solutions.github.io`) before any code was touched, covering simple facts,
project questions, comparisons, ecosystem/recommendation questions, and false-premise/status questions.
Four real, reproducible defects surfaced (all confirmed against actual production responses, not
invented):

1. **A moderation classifier's own verdict served as the entire answer.** Asking *"What's the
   difference between CodeForge and GEMS?"* returned, verbatim: `User Safety: safe` / `Response Safety:
   safe`. This made no claim about FDS, so canonical verification had nothing to contradict and let it
   straight through — the same class of gap that originally motivated `checkAnswerShape` (§14 of the
   brief), just a shape it didn't yet cover.
2. **A hardcoded product name in a generic action button.** Asking about ForgerEMS (*"What is
   ForgerEMS?"*, *"Can I download ForgerEMS?"*) produced an action button labeled **"Download / Try
   CodeForge"** — literally the wrong product, a copy-paste leftover from when CodeForge was the only
   downloadable product.
3. **A "what version" question silently rewritten into an availability question.** *"What version of
   CodeForge is public?"* returned `Yes. CodeForge is publicly available and free... Downloads and
   version history are on GitHub Releases: https://github.com/...` — an availability answer, opening
   with a non-sequitur "Yes.", complete with a raw pasted URL, for a question that was never about
   availability. Root cause: a conversation-context rewrite rule treated the word "public" as an
   availability signal, discarding the more specific "version" framing.
4. **A missed raw status label in one specific comparison branch.** *"How is Kayla AI Publisher different
   from Kayla Copilot?"* answered *"It is in ACTIVE DEVELOPMENT and has no public release yet"* — the one
   hardcoded special-case branch (Kayla Copilot vs. Kayla AI Publisher) that the prior response-UX pass's
   sweep for raw status tokens had missed, because the interpolation (`project(...)?.status || 'active
   development'`) didn't match that pass's regex for `.status}` immediately before a closing brace.

A fifth item was investigated and found to be **not** a bug: two download-related action buttons
("Download / Try X" → `/forged`, "Download X" → the direct release URL) sometimes appear together. This
looked redundant at first, but the pinned test suite (`test/kayla-phase14-conversations.test.ts`)
confirms it is deliberate: `/forged` (the site's own release shelf) is the intended primary action even
when a direct release URL is also available. Only the wrong-product-name defect (#2) was a real bug;
the two-action design itself was left untouched.

A sixth, minor finding: after a comparison question, the follow-up chip **"How does it compare?"**
was suggested — asking the visitor to repeat a question they had just gotten an answer to.

## C. Conversation polish changes

- **`src/lib/kayla/well-formed.ts`**: new `safety_classifier_leak` shape violation — rejects (does not
  strip) a moderation classifier's leaked verdict, narrowly matched (`<word(s)> Safety: safe/unsafe/
  flagged/blocked/allowed/denied`) so it cannot fire on ordinary FDS prose that happens to mention safety
  (verified against "ForgerEMS includes drive validation and safety checks..." and similar).
- **`src/lib/kayla/conversation-answer.ts`**:
  - `rankConversationActions`: the generic download action's label is now `Download / Try ${entity.name}`
    instead of a hardcoded `"Download / Try CodeForge"`.
  - The conversation-context rewrite now recognizes an explicit version question (`version`, `release
    number`) and asks `What version is ${name}?` instead of letting the broader availability/public
    keyword match hijack it into `Can I download ${name}?`.
- **`src/data/kayla/answers.ts`**:
  - `availabilityAnswer()` (the single-product "Can I download X?" / rewritten "what version" answer): the
    download URL is no longer pasted into the prose — the action button already carries it (mirrors the
    fix already applied to the multi-item "what can I use right now" list in the prior pass, which had
    missed this sibling function).
  - The Kayla Copilot vs. Kayla AI Publisher special comparison branch now runs its status through the
    same `naturalStatus()` helper as every other lane, closing the gap from finding #4.
- **`src/components/KaylaCopilot.ts`**: `getFollowUpSuggestions` now drops any "compare"-worded follow-up
  when the question just answered was itself a comparison (`difference`, `compare`, `versus`, `vs`,
  `different from`) — deterministic keyword logic, not a recommendation model.

Nothing else was changed. Retrieval, task planning, grounding, provider routing, canonical verification,
and knowledge data are untouched, per the brief's explicit "do not rebuild Kayla" constraint.

## D. Before → after examples (real production text)

1. **Comparison safety-leak** — Before: `User Safety: safe`\\`Response Safety: safe` (the entire answer).
   After: this exact text is now rejected by `checkAnswerShape` before ever reaching a visitor; the
   canonical/local answer is served instead.
2. **ForgerEMS action label** — Before: action button reads "Download / Try CodeForge" on a ForgerEMS
   answer. After: "Download / Try ForgerEMS".
3. **Version question** — Before: `Yes. CodeForge is publicly available and free. The current public
   version is v0.2.0. It runs on Windows, CLI, VS Code. Downloads and version history are on GitHub
   Releases: https://github.com/Forger-Digital-Solutions/CodeForge/releases/latest`
   After: `CodeForge is at v0.2.0. Canonical packages and version history live on GitHub Releases.` (the
   pre-existing, already-clean `versionAnswer()`, now correctly reached).
4. **Kayla AI Publisher comparison** — Before: `...It is in ACTIVE DEVELOPMENT and has no public release
   yet.` After: `...It is in active development and has no public release yet.`
5. **Follow-ups after a comparison** — Before: `See the release`, `How does it compare?`, `Explore other
   projects` (redundant second option). After: `See the release`, `Explore other projects`.

## E. Accessibility flake — root cause

The prior pass's Playwright run reported `109/110`, with `kayla-phase13-a11y.spec.ts`'s "homepage with
Kayla closed" test intermittently failing an axe `color-contrast` check on `.gems-node__role` (the GEMS
lineage role text) inside `li[data-gem="sapphire"]` / `li[data-gem="peridot"]`.

Root-caused by direct reproduction, not assumption:

- Reproduced reliably under parallel-worker contention (`--repeat-each --workers=4`): roughly 24–36%
  failure rate across several batches, both against the Astro **dev** server and a production **build +
  preview** server (ruling out a dev-mode/HMR-specific cause).
- Captured the full computed-style chain (opacity, transform, active `Element.getAnimations()`,
  background) for the failing element at the exact moment axe ran, across 25 runs. The chain was
  **byte-for-byte identical** between violating and clean runs — same `opacity: 1`, `transform: matrix(1,
  0, 0, 1, 0, -54.68)`, no active animations or transitions, same background. There was no reveal
  animation, opacity ramp, or CSS-loading race: `.gems-node`'s background is a plain static `#0c1424`
  and `.gems-node__role`'s color is a plain `var(--color-text-muted)`, with no `color-mix()`,
  gradient, or transparency in that specific pair.
- Decisive test: when a scan reports the violation, an **immediate re-scan of the exact same, unchanged
  page** was run. Across 13 reproduced failures (out of 30 repeated runs), the re-scan cleared the
  violation **13/13 times** — a real, stable defect would reproduce on every scan (every other violation
  this suite has ever caught does); this one never did twice in a row.

Conclusion: this is a one-off false positive inside axe-core's own rule-evaluation pipeline under CPU
contention — not a page rendering defect, not a reveal-animation timing issue, and not specific to the
dev server.

## F. Flake fix

No production CSS, animation, or component code was changed (there was nothing to fix there — the page's
real, settled state was never actually inaccessible). The fix is in the test harness only, in
`test/e2e/kayla-phase13-a11y.spec.ts`'s shared `audit()` helper: if a scan reports a `color-contrast`
violation, `audit()` immediately re-scans the same, unchanged page once, and only fails if the violation
reproduces on that confirmation scan. This is not "retry until green": it only special-cases the one rule
ID empirically shown to be a transient false positive, the retry is single and bounded (not a loop), and
any other rule (or a `color-contrast` violation that reproduces) still fails immediately. A new
regression test (`the color-contrast confirmation re-scan does not hide a real defect`) injects a
deliberately, stably low-contrast fixed-position element and asserts `audit()` still throws — proving the
confirmation step cannot mask a genuine defect.

## G. Flake proof (repeated runs)

- `homepage with Kayla closed`, run under the same parallel-worker contention that originally reproduced
  the flake (`--repeat-each=20 --workers=4`), **two consecutive batches: 20/20 then 20/20 — 40/40 total**,
  versus the prior ~24–36% failure rate under identical contention.
- New regression test (real defect still fails after the confirmation scan): 1/1, verified separately.
- Full `kayla-phase13-a11y.spec.ts` file (all 10 tests, single run): 10/10.

## H. Security regression results

Re-ran the full renderer/injection/security suite — no regressions from this pass or the prior one:
- XSS-inert renderer tests (`test/e2e/kayla-answer-formatting.spec.ts`, `kayla-phase13-content.spec.ts`
  "hostile text is inert"): all pass — `<script>`, `onerror`, `javascript:` hrefs, and a JSON-shaped
  answer all render as inert text, zero alerts, zero executable elements.
- `test/kayla-answer-shape.test.ts`: prompt-injection/scaffolding rejection cases (control tokens,
  tool-call scaffolding, reasoning leaks, presentation scaffolding, and the new safety-classifier-leak
  cases) all pass, alongside false-positive guards proving ordinary FDS prose mentioning "safety" or
  "JSON" is never mistaken for scaffolding.
- `test/kayla-security.test.ts`, `test/kayla-retrieved-content-injection.test.ts`,
  `test/kayla-trust-boundary.test.ts`: unchanged, all passing.
- `node scripts/kayla-secret-scan.mjs`: PASS (source and built client assets).

## I. Golden queries

`node scripts/kayla-golden-check.mjs`: **322/322 (100%)** — Tier 1 133/133, Tier 2 152/152, Tier 3 37/37.
Verified before and after every code change in this pass; the version-question fix and the two
`naturalStatus()` corrections did not move this number (none of the affected phrasings are golden-query
fixtures), and the strict single-value status-label requirements for direct "what is the status of X"
questions remain untouched and passing.

## J. Unit tests

`npx vitest run`: **937/937 passed** (53 files) — 926 pre-existing (from the prior pass) + 11 new: 3
`safety_classifier_leak` rejection cases + 2 false-positive guards in `kayla-answer-shape.test.ts`, and 6
in a new `test/kayla-conversation-polish.test.ts` (entity-correct action labels, version-question routing,
the Kayla AI Publisher status fix, and the follow-up-suggestion dedup, each reproducing the exact
defect found live before being fixed).

## K. Playwright

`npx playwright test --project=chromium`: **111/111 passed** (110 pre-existing/updated + 1 new
regression test), zero failures, zero skipped, zero unexplained flakes. This is a genuine improvement
over the prior `109/110` — not a lucky single run: the specific previously-flaky test was separately
run 40 additional times under the exact contention that used to fail it, with zero failures.

## L. Accessibility

Full axe suite (`kayla-phase13-a11y.spec.ts`, WCAG 2.2 AA tags): **10/10 passed**, including the new
confirmation-rescan regression test. No axe rule was disabled or excluded; no element was hidden from
axe. `color-contrast` is still fully enforced — including, provably, against a real defect (§F).

## M. Responsive QA

Covered by the unchanged, passing Playwright suite — no responsive/layout CSS was touched in this pass:
`kayla-phase13-mobile-zoom.spec.ts` (320/360/390/430px + keyboard-open simulation, 200% browser zoom,
200% root text scaling), `kayla-phase13-forced-colors.spec.ts`, `kayla-widget.spec.ts` (320px/390px mobile,
reduced motion), `kayla-phase11-task.spec.ts` (390px/320px). All passed in the full 111/111 run.

## N. Deployment

**Performed, with explicit user go-ahead.**

- Commit `a7b9781` on `main` ("fix: polish Kayla conversation UX and stabilize accessibility gate"),
  pushed to `origin/main` (`75cba5c..a7b9781`).
- GitHub Pages: workflow run `34012247949` — success (46s build including its own "Kayla production
  gates" CI step, 11s deploy).
- Cloudflare Worker: `npm run kayla:deploy` (deploy-check PASS) → `wrangler deploy` succeeded. New
  Version ID `0a9d543a-999d-467a-a3ec-12f2e3b2d9e4` (previous: `0394c133-...`), upload 325.68 KiB / gzip
  85.30 KiB, bindings and budgets unchanged. The a11y-harness fix needed no deploy at all (CI-only); it
  shipped in the same commit for repository hygiene.

## O. Live production certification

Re-ran the three directly-reproducible defects from §B against `https://forger-digital-solutions.github.io`
after both deploys completed, with a hard cache-busting reload:

1. **"Can I download ForgerEMS?"** — action buttons now read "Download / Try ForgerEMS" and "Download
   ForgerEMS" (previously "Download / Try CodeForge"); prose no longer carries a raw URL. Confirmed fixed.
2. **"What version of CodeForge is public?"** — *"CodeForge is at v0.2.0. Canonical packages and version
   history live on GitHub Releases."* — no "Yes." non-sequitur, no pasted URL, correctly the version
   answer. Confirmed fixed.
3. **"How is Kayla AI Publisher different from Kayla Copilot?"** — *"...It is in active development and
   has no public release yet."* — lowercase, conversational. Confirmed fixed.
4. **"How is ForgerEMS different from CodeForge?"** — the AI provider was unavailable for this turn (an
   external, unrelated intermittency — see §P), so it exercised the local comparison fallback: clean,
   no duplication, natural lowercase statuses ("released", "public-beta"). Confirms the prior pass's
   fixes still hold under live conditions.

The safety-classifier-leak (finding #1) could not be re-triggered on demand live — it depends on the
free router's moderation wrapper, which is outside this site's control and was intermittently unavailable
during this verification pass. Its fix is verified deterministically instead: `checkAnswerShape` rejects
the exact string observed in production (unit-tested in `kayla-answer-shape.test.ts`), so any future
recurrence is caught before it reaches a visitor regardless of when the provider produces it again.

## P. Remaining debt

- No golden query currently pins the comparison lane's or the single-product availability lane's exact
  wording — both real bugs found in this pass (finding #1, #3) existed without a regression test catching
  them until now. The new `kayla-conversation-polish.test.ts` closes part of this gap; a broader golden
  fixture for comparison-lane wording would close more of it.
- The `safety_classifier_leak` pattern was designed from one observed production string plus its two most
  likely siblings (`Response Safety:`, `Content Safety:`). If the free router's moderation wrapper leaks a
  differently-worded verdict in the future, this exact regex won't catch it — it is a targeted fix for an
  observed shape, not a general "detect any classifier leak" solution.
- The axe color-contrast confirmation re-scan is scoped to the `homepage with Kayla closed` test's
  `audit()` helper (shared by all `kayla-phase13-a11y.spec.ts` tests). If a different, unrelated element
  ever produces a similarly transient axe false positive, the same helper will already cover it (any test
  using `audit()` benefits), but this was not separately stress-tested for every state.

## Q. Verdict

**KAYLA_CONVERSATION_UX_CERTIFIED** — deployed to production (commit `a7b9781`, Pages run `34012247949`,
Worker version `0a9d543a-999d-467a-a3ec-12f2e3b2d9e4`) and reverified live. A real, demonstrated
multi-turn production audit found four genuine defects (a critical safety-classifier leak, a wrong
product name in an action label, a misrouted version question, and one missed status label); three were
directly reconfirmed fixed live and the fourth (the safety-classifier leak, dependent on an external,
intermittently-unavailable moderation wrapper) is verified deterministically via a unit test rejecting
the exact observed string. All four are covered by new regression tests reproducing the exact original
condition. Canonical correctness (golden 322/322) and security posture are unchanged. The one
previously-flaky accessibility gate has a rigorously evidenced root cause (a transient axe-core internal
false positive under CPU contention, proven not to be a page defect) and a precise, non-weakening fix,
proven with 40/40 repeated passes under the exact contention that used to fail it plus a dedicated test
proving a real defect still fails. Full suite: vitest 937/937, golden 322/322, Playwright 111/111,
`astro check` 0 errors, build clean.
