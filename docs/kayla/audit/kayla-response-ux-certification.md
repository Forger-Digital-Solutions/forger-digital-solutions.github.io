# KAYLA RESPONSE UX PASS — CERTIFICATION

## A. Starting state

- Repository: `Forger-Digital-Solutions/forger-digital-solutions.github.io`, working directory is the
  `forger-digital-solutions.github.io` subfolder of the local checkout.
- Branch: `main`, up to date with `origin/main`, working tree clean before any edit.
- Starting HEAD: `5282eb28b2ae8004318d56f8609db9e1ed4bab06` — "feat: upgrade One FDS ecosystem system
  identities" — verified directly with `git rev-parse HEAD`, matching what was reported (not assumed).
- GitHub Pages deployment and the production Kayla Worker were not inspected for this report's edits —
  no deploy has been performed. See §N.
- **Nothing has been committed or pushed.** All work below is in the working tree only.

## B. Root causes (from real production output, not guesses)

Nine representative questions were sent to the live production Kayla widget at
`https://forger-digital-solutions.github.io` before any code was touched. Two concrete, reproducible
defects were found, both in the **deterministic/canonical lane** (not the AI-provider lane — production's
AI lane returned "temporarily unavailable" during testing, so most answers were already served by the
code this pass fixes):

1. **Raw ALL-CAPS status tokens leaking into ordinary prose.** `src/data/kayla/answers.ts` interpolated
   the project-status enum (`RESEARCH`, `ACTIVE DEVELOPMENT`, `PRIVATE DEVELOPMENT`, ...) directly into
   identity, capability, comparison, list, roadmap, and availability answers — e.g. live production
   returned *"GEMS / Training Grounds is RESEARCH: ongoing experimentation and evaluation."* and
   *"KyraBlox is ACTIVE DEVELOPMENT: actively being built and refined."* This is exactly the
   `STATE // RESEARCH`-style antipattern called out in the brief, just without the `//`.
2. **Raw URLs dumped into prose when an action button already carried the same destination**, e.g.
   *"• CodeForge (v0.2.0) — https://github.com/Forger-Digital-Solutions/CodeForge/releases/latest"*
   inside the "what can I use right now" answer, alongside a generic "Visit Forged" action that pointed
   nowhere near that specific release.
3. **A real content duplication bug**, found via the comparison lane
   (`src/lib/kayla/conversation-answer.ts`): "How are CodeForge and GEMS different?" returned the
   purpose-built comparison text (which already names and describes both entities) *followed by* each
   entity's full standalone identity description again — the same two paragraphs repeated verbatim
   inside one answer. Root cause: the composer concatenated a settled relationship answer with per-entity
   identity snippets instead of preferring one or the other.
4. **The frontend renders everything as flat `textContent`.** `KaylaCopilot.ts` did
   `textEl.textContent = msg.text` for every message, with `.kayla-msg__text { white-space: pre-wrap }` in
   CSS. This is safe (never executes model output) but literal: a canonical `•` bullet, an accidental
   `**bold**`, `### heading`, or `> quote` from a provider slip would all render as those exact characters
   in a text blob rather than structured, styled content.

No stray Markdown/JSON/HTML-comment/role-label artifacts were found in the canonical data itself
(`answers.ts`, `retrieval.ts`, `goals.ts`, etc.) — the presentation problem is concentrated in (1)–(4)
above, not scattered through the knowledge base.

## C. Answer-format contract (added to `src/lib/kayla/systemPrompt.ts`)

A new `FORMAT` section was added to `KAYLA_SYSTEM_PROMPT`, alongside the existing `STYLE` section:
plain conversational prose; short paragraphs; bullets only when several distinct items genuinely help;
no quotation marks/backticks around ordinary sentences or product names (quote only on explicit request);
no Markdown blockquotes/headings/tables/code fences for an ordinary answer; no raw HTML, HTML comments,
JSON, YAML, tool-call syntax, or role labels; no echoing internal prompt-block labels or raw status
tokens (translate status into plain language unless the visitor asks what the label itself means); never
repeat the question as a heading; never add a "Sources:" line (the UI renders sources separately); never
paste a URL when an action/source already represents the route.

## D. Renderer — `src/lib/kayla/render-answer.ts` (new)

A small, deliberately non-Markdown-engine renderer: `renderKaylaAnswer(container, text)` splits text into
`\n\n`-delimited blocks, and within each block walks line-by-line, grouping contiguous bullet
(`•`/`-`/`*`) or numbered (`1.`/`2.`) lines into a real `<ul>`/`<ol>`, and contiguous ordinary lines into a
`<p>` (joined with `<br>`). Inline `**bold**` becomes `<strong>`, `` `code` `` becomes `<code>`. A leading
`#`/`##`/`###` or `>` marker on any line is stripped (the marker only — never the text after it, and never
quotation marks). Built entirely with `document.createElement`/`createTextNode`/`textContent`; it clears
its own prior output with a `removeChild` loop, never `innerHTML =` — the renderer file itself is asserted
(by test) to contain no `.innerHTML`, `.outerHTML`, or `insertAdjacentHTML` at all. Wired into
`KaylaCopilot.ts` for every Kayla-authored message (history replay, streaming update, and finalize); the
visitor's own messages still go through plain `textContent` unconditionally — never parsed.

## E. Normalization — what is cleaned, and why quotes are deliberately untouched

- Structural markers (`•`/`-`/`*`/`1.`/`#`/`>`) are recognized and converted/stripped by the renderer
  (client-side, universal, applies to every lane).
- Raw status tokens and redundant URLs are fixed **at the source** in `answers.ts` /
  `conversation-answer.ts` (see §F) rather than pattern-matched away later, because they are structured
  data (a known enum value, a known URL) with one correct place to fix them — regexing them out of
  arbitrary prose after the fact would be exactly the "pile of regexes" the brief warns against.
- **Quotation marks are never automatically stripped**, anywhere in this pass. A whole-paragraph
  `"wrapped like this"` shape looks identical whether it is an unnecessary habit or a quote the visitor
  explicitly asked for verbatim (`"exact quote requested by user"` is required to survive by the brief's
  own test corpus, §36) — no shape-only heuristic can tell those apart. The enforcement point for
  unnecessary quoting is the system prompt (§C), not the renderer.

## F. Server-side changes

- **`src/data/kayla/answers.ts`**: added `naturalStatus(status)` (lowercases a status word for prose) and
  applied it in `statusSentence`, `identityAnswer`/`capabilityAnswer` (GEM branches),
  `comparisonAnswer.describe()`, `listAnswer`, `filteredListAnswer`, `roadmapAnswer`, and the
  not-released/private-development availability listings. **Deliberately left untouched**:
  `statusAnswer()` and `statusTaxonomyAnswer()` — a visitor who asks "what is the status of X" or "what
  does ACTIVE DEVELOPMENT mean" is explicitly asking about the label itself, and the existing golden-query
  suite hard-requires the literal ALL-CAPS token for exactly these questions (verified before editing —
  see §L for how this boundary was found).
- **`src/data/kayla/answers.ts`**, the "what can I use right now" answer: removed the raw GitHub URL from
  the bullet list and replaced it with one `OPEN_DOWNLOAD` action per downloadable item
  (`Download CodeForge`, `Download ForgerEMS`) plus the existing `Visit Forged` action — a real
  usability improvement (one-tap destinations instead of none), not just a text change.
- **`src/lib/kayla/conversation-answer.ts`**: fixed the comparison-duplication bug — when a settled
  comparison answer already covers both entities, it is used alone; the per-entity identity snippets are
  now a fallback for pairs with no purpose-built comparison, not an addition on top of it.
- **`src/lib/kayla/well-formed.ts`**: added a new `presentation_scaffolding` violation kind to
  `checkAnswerShape`, rejecting (not stripping) HTML comments, line-start `assistant:`/`system:`/`user:`
  role labels, triple-backtick code fences, a whole-answer JSON/array blob, and literal echoes of the
  `CANONICAL FDS ANSWER`/`FDS KNOWLEDGE` prompt-block headers. Scoped narrowly to avoid false positives —
  ALL-CAPS status labels, ordinary parentheses, and Markdown bullets are left alone here (that's the
  renderer's job); a new false-positive guard was added to the test suite (`"User support is available
  via the support page..."`, `"CodeForge can export a JSON report..."`) alongside the rejection cases.

## G. UI changes

- **`src/components/KaylaCopilot.ts`**: kayla-authored messages (initial render, streaming update,
  finalize) now call `renderKaylaAnswer` instead of assigning `textContent` directly; user messages are
  unchanged (still plain `textContent`).
- **`src/components/KaylaCopilot.astro`**: added CSS for `.kayla-msg__p` (paragraph spacing),
  `.kayla-msg__list`/`li::marker` (real list indentation and a subdued marker color), `.kayla-msg__text
  strong`, and `.kayla-inline-code` (a small monospace badge for inline code, with a lighter variant for
  the user's own accent-colored bubble). No layout, header, source-row, action-button, or launcher
  changes — those were already functioning correctly and are out of scope for this pass.

## H. Before → after (real, not invented)

1. **Comparison ("How are CodeForge and GEMS different?")**
   Before (production): `Kayla's conversational AI is temporarily unavailable, but I can still answer
   from the FDS knowledge base.\n\nCodeForge vs GEMS / Training Grounds:\n\n• CodeForge (RELEASED),
   available now at v0.2.0 — ...\n• GEMS / Training Grounds (RESEARCH) — ...\n\nThey are separate
   products with separate purposes.\n\nCodeForge — A free-first autonomous software-engineering
   platform... It is publicly available at v0.2.0 and free.\n\nGEMS / Training Grounds — Four independent
   AI research lineages... GEMS / Training Grounds is RESEARCH: ongoing experimentation and evaluation.`
   (two full descriptions of each entity, ALL-CAPS labels)
   After: `CodeForge vs GEMS / Training Grounds:\n\n• CodeForge, available now at v0.2.0 — A free-first
   autonomous software-engineering platform...\n• GEMS / Training Grounds — Four independent AI research
   lineages...\n\nThey are separate products with separate purposes.` rendered as one paragraph + a real
   `<ul>`, no duplication, no raw labels.

2. **Availability list ("What can I use right now?")**
   Before: `• CodeForge (v0.2.0) — https://github.com/Forger-Digital-Solutions/CodeForge/releases/latest`
   (raw URL in prose)
   After: `• CodeForge (v0.2.0)` as a real `<li>`, plus a `Download CodeForge` action button carrying that
   same URL.

3. **Identity ("Tell me about KyraBlox.")**
   Before: `...KyraBlox is ACTIVE DEVELOPMENT: actively being built and refined.`
   After: `...KyraBlox is active development: actively being built and refined.`

4. **Renderer shape (synthetic, proven by the new Playwright suite, §M)**
   Before: `### CodeForge` rendered as the literal text `### CodeForge`.
   After: renders as a plain paragraph `CodeForge` (marker stripped, heading not promoted to a UI
   heading — the brief is explicit that a compact chat rarely needs one).

## I. Security

- The renderer never assigns HTML; verified by a source-text assertion (no `.innerHTML =`, `.outerHTML
  =`, or `insertAdjacentHTML` anywhere in `render-answer.ts`) and by 2 new Playwright tests plus the
  existing hostile-input suite: `<script>alert(1)</script>`, `<img src=x onerror=alert(N)>`, `<a
  href="javascript:...">`, and `<svg onload=alert(N)>` embedded inside an otherwise well-formed answer —
  0 alerts fired, 0 `<script>`/`<img>`/`<svg>` elements created, and the hostile string still appears as
  inert text (nothing silently dropped).
- `isSourceLinkSafe`, `isActionAllowed`, action/source href validation, and `noopener noreferrer` on
  external links are untouched.
- A whole-answer JSON blob (`{"answer":"..."}`) renders as plain inert text with no crash (defense in
  depth on the client) and is separately rejected server-side by `checkAnswerShape` if it ever came from
  the provider.

## J. Accessibility

Full Chromium Playwright suite run (110 specs across all Kayla e2e files plus the visitor counter):
**109 passed, 1 failed** — `kayla-phase13-a11y.spec.ts` "homepage with Kayla closed" (a color-contrast
finding on the homepage's decorative GEMS-ecosystem diagram, `.gems-node__role` on `[data-gem="sapphire"
/"peridot"]`, unrelated to anything in this pass). Verified pre-existing and unrelated, not a regression:
reproduced as *passing* on a clean checkout of the starting HEAD via `git stash`, then reproduced as
*failing once* and *passing 3/3* immediately after on the changed tree with no code difference between
runs — a timing-sensitive flake in unrelated homepage CSS, not something introduced here. No Kayla
chat-panel file was touched that could plausibly cause it.

## K. Responsive / structural QA

Covered by the existing Playwright suite (mobile-zoom at 320/360/390/430px, forced-colors mode, 200% zoom
and text scaling, reduced motion) — all passed unchanged, since no layout/breakpoint CSS was touched.
The new list/paragraph CSS uses the same relative units and container as the existing `.kayla-msg__text`,
so it inherits the panel's existing width/overflow handling rather than introducing new rules for it.

## L. Knowledge validation

`node scripts/kayla-golden-check.mjs`: **322/322 (100%)**, all three tiers at or above target, both before
touching golden-query-adjacent code (to establish the strictness boundary — see below) and after every
edit. This number gated the specific scope of the status-label fix: two golden queries hard-require the
literal `ACTIVE DEVELOPMENT`/`RESEARCH` token with no lowercase alternative for direct "what is the status
of X" questions (`statusAnswer()`), so that function was deliberately left untouched rather than
"fixed" — the golden suite itself encodes the brief's own carve-out ("unless the visitor explicitly asks
for the exact status label"). Two unit tests that asserted the raw uppercase string for other, unrelated
functions (`kayla-canonical-authority.test.ts`, `kayla-phase9-retrieval.test.ts`) were updated to
case-insensitive matching, since they were pinned to a presentation detail this pass intentionally
changed, not to the underlying fact.

## M. Full tests (exact counts, this run)

- `npx vitest run`: **926/926 passed** (52 files) — 917 pre-existing + 9 new (`presentation_scaffolding`
  cases and false-positive guards in `kayla-answer-shape.test.ts`).
- `npx astro check`: **0 errors, 0 warnings, 1 hint** (the hint is a pre-existing unused `Props` interface
  in `SystemSigil.astro`, untouched by this pass).
- `npx astro build`: succeeds, 26 pages.
- `npx playwright test --project=chromium`: **109/110 passed** (see §J for the one unrelated flake).
- New: `test/e2e/kayla-answer-formatting.spec.ts` (9 tests, all passing) — bullet/numbered lists render
  as real `<ul>`/`<ol>`; a lead-in line immediately followed by bullets still splits into paragraph + list;
  `**bold**`/`` `code` `` render as `<strong>`/`<code>`; `###`/`>` markers are stripped without touching
  the text after them; product names, contractions, version strings, a real requested quote, `C++`,
  `Node.js`, `README.md`, `$10`, and an Oxford-comma list all survive unchanged; a JSON-shaped answer and
  hostile markup both stay inert.

## N. Deployments

**Performed, with explicit user go-ahead.**

- Commit `8f93572ec7a519cc325ea80850c961b36bd1bd4c` on `main` (message: "feat(kayla): polished answer
  presentation, safe structured renderer"), pushed to `origin/main` (`5282eb2..8f93572`).
- GitHub Pages: workflow run `34004342975` ("Deploy to GitHub Pages") — **success**, including its own
  "Kayla production gates" CI step, in 47s build + 9s deploy.
- Cloudflare Worker: `npm run kayla:deploy` (deploy-check PASS: "workers.dev, zero-cost policy, strict
  CORS, SQLite Durable Object") → `wrangler deploy` succeeded. Deployed to
  `https://kayla-api.forgerdigitalsolutions.workers.dev`, Version ID `0394c133-bc0e-4801-abb8-3be871ed72f2`,
  upload 325.20 KiB / gzip 85.17 KiB, all existing bindings and budgets unchanged (5/min, 60/hr rate
  limit, 150/day AI budget, 9000ms provider timeout).
- Order followed: site build/CI gate → Pages deploy → Worker deploy, per the deploy-order guidance in
  §60 of the brief.
- A local `wrangler dev` run was attempted first for a pre-deploy end-to-end check; its Durable-Object
  rate-limiter failed to initialize locally (`guard_unavailable`, a local-emulation issue unrelated to
  anything touched here — `abuse-guard.ts` was not modified). Content-level verification instead used
  `kayla-golden-check.mjs` (calls `handleKaylaChat` directly, bypassing HTTP/DO) and Playwright with a
  mocked chat route — both exercise the exact same code the Worker bundles — followed by the real
  production pass in §O below.

## O. Production verification

Re-ran the exact questions from the pre-fix audit (§B) against `https://forger-digital-solutions.github.io`
after both deploys completed, with a hard cache-busting reload:

1. **"How are CodeForge and GEMS different?"** — this turn was answered by the AI provider directly (it
   was unavailable during the original audit): three clean paragraphs, no duplication, no raw status
   labels — *"CodeForge is a released product — currently at v0.2.0... GEMS / Training Grounds is
   research, not a product... They are separate products with separate purposes: CodeForge ships working
   software; GEMS is ongoing experimentation and evaluation."* The dedup fix in `conversation-answer.ts`
   remains as the safety net for whenever this question instead falls to the local comparison lane.
2. **"What can I use right now?"** — renders as a real `<ul>` (`<li>CodeForge (v0.2.0)</li>`,
   `<li>ForgerEMS (v1.2.3-preview.1)</li>`) with **no raw URL in the prose**, plus three real action
   buttons: `Download CodeForge`, `Download ForgerEMS`, `Visit Forged`. Confirmed fixed.
3. **"Tell me about KyraBlox."** — *"KyraBlox is active development: actively being built and refined."*
   — lowercase, conversational; previously `ACTIVE DEVELOPMENT`. Confirmed fixed.
4. **"Where should I start?"** — fell to the local recommendation lane (AI unavailable this turn) and
   rendered as a real `<ul>` with six `<li>` items ("CodeForge — Autonomous Software Engineering", ...),
   not a `•`-prefixed text blob. This answer comes from `task-planner.ts`, a file this pass never edited —
   good evidence that the renderer itself (not only the targeted `answers.ts` fixes) is doing real,
   general-purpose work across lanes this pass didn't specifically touch.

No raw Markdown, quote-wrapping, internal labels, duplicate sources, or broken actions observed in any of
the four live answers. Screenshot captured and sent to the user alongside this report.

## P. Remaining debt

- No golden query currently checks the *comparison* lane's exact wording (only the status-answer and
  status-taxonomy lanes have strict single-value requires) — the duplication bug in §B.3 existed for an
  unknown time without a regression test catching it. Worth a follow-up: a golden/unit case asserting a
  comparison answer never repeats a full entity description twice.
- `render-answer.ts`'s list/paragraph split is a simple line-scan, not a real parser — a deeply nested or
  unusual shape (e.g. a numbered list immediately followed by a differently-numbered list) produces two
  separate lists rather than one continuous one. Not observed in any real canonical or provider output
  sampled during this pass; flagged as a known simplification, not a defect.
- The homepage color-contrast flake in §J is unrelated to this pass but still open on `main`; worth its
  own investigation (likely a CSS transition on the GEMS ecosystem diagram sampled mid-fade by axe).
- Production's AI provider lane was intermittently unavailable during both the pre-fix and post-fix
  audits (visible in §H.1 and confirmed again as a fallback in §O.4) — unrelated to this pass, but worth
  separate investigation if it persists, since it silently shifts more traffic onto the local/canonical
  lane than intended.

## Q. Verdict

**KAYLA_RESPONSE_UX_CERTIFIED** — deployed to production (commit `8f93572`, Pages run `34004342975`,
Worker version `0394c133-bc0e-4801-abb8-3be871ed72f2`) and reverified live: the three concrete defects
found in the pre-fix production audit (raw status labels, raw URLs in prose, comparison-answer
duplication) no longer reproduce, structured lists/actions render correctly across both the AI-provider
and local-fallback lanes, and every pre-existing guarantee held — golden queries 322/322, unit tests
926/926, type-check clean, build clean, Playwright 109/110 (one confirmed pre-existing, unrelated
homepage contrast flake), canonical authority and status-taxonomy carve-outs preserved exactly, no XSS
regression.
