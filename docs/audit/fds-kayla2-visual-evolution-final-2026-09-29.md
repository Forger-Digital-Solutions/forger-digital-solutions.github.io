# FDS Website — Kayla 2.0 and Visual Evolution Final Integration

**Date:** 2026-09-29

**Scope:** local release candidate for human visual review. No push or deployment was performed.

## 1. Verdict

`FDS_KAYLA2_VISUAL_EVOLUTION_FINAL_CERTIFIED`

Kayla 2.0 remains the general AI assistant certified at the local checkpoint. The homepage, Connected Systems, and GEMS visual changes are integrated, the eight product trajectories remain certified, and the final local build and relevant browser, unit, accessibility, knowledge, and content checks pass. This verdict covers the local release candidate; publishing still requires final visual approval.

## 2. Starting state

- Authoritative repository: `forger-digital-solutions.github.io`; branch `main`.
- Visual integration started from `d186b0bb34bac018246e9bce314a0a369ab5fa6b` (`feat: upgrade Kayla Copilot with general free AI`). Remote `origin/main` was `4472812` at inspection.
- The Kayla changes were already isolated in that local checkpoint. The website tree was continued in place. No CodeForge worktree, provider configuration, or database was modified.
- The inherited Kayla audit is [kayla-copilot-2-general-ai-2026-09-29.md](kayla-copilot-2-general-ai-2026-09-29.md).

## 3. Kayla 2.0

Kayla handles general conversation, coding, writing, debugging, and reasoning; deterministic FDS knowledge stays authoritative for company facts. The client retains multi-turn context, streaming NDJSON rendering, cancellation and retry, a textarea composer, new chat, fenced code blocks with Copy feedback, keyboard focus handling, and mobile layout. This visual integration did not change the Kayla runtime or Worker source.

The inherited checkpoint certified 1,045 unit tests, 345 golden queries, and 112 Kayla Chromium browser cases. The current integrated run passed 1,050 unit tests and the complete browser matrix described in section 17.

## 4. Free AI routing — engineering evidence only

The configured free-only chain is Groq `qwen/qwen3.8-27b` followed by OpenRouter `openrouter/free`. `ZERO_COST_ONLY` rejects paid models; the chain has no paid fallback. The 2026-09-29 inherited live probe reported 4/4 successful Groq scenarios (general chat, coding, grounded FDS, streaming), with approximately 156 ms stream time to first token, and 4/4 successful OpenRouter free-router scenarios. The explicit `qwen/qwen3.8-27b:free` route returned 429 during that probe and is not the configured fallback. The configured Gemini key returned 403 and Gemini is excluded from the active chain.

The current pass used a mocked local stream for browser and performance work. It did not make a new live provider request. Provider and model names are **NOT EXPOSED TO USERS** in the launcher, panel status, ordinary answers, or public health response.

## 5. Kayla branding

The public launcher says **ASK KAYLA**. The subtitle is **“AI assistant from Forger Digital Solutions”**; the composer says **“Ask Kayla anything…”**. Public states remain Ready, Thinking…, Responding…, Stopping…, and Temporarily unavailable. Internal route names remain server-side diagnostics.

## 6. Homepage ecosystem

The old visual foregrounded eight individual rails. The final visual uses three calm, crossing electron planes around a larger, faceted CodeForge center. Eight existing product nodes still follow their own measured paths, but their individual rails no longer dominate the composition. Product art, labels, links, hover/focus inspection, and group information remain available. Decorative filters and continuous stroke pulses were reduced.

## 7. CodeForge logo derivation

The nucleus embeds the repository's [canonical CodeForge icon](../../public/images/codeforge/codeforge-icon.svg). Its faceted crystal and three intersecting loops are echoed by angular reactor outlines and visible electron planes at −18°, 42°, and 78°. Small electron dots and restrained targeting ticks support the mark without obscuring it. The [asset reference capture](visual-evolution-2026-09-29/after/reference/codeforge-icon.png) and [final ecosystem capture](visual-evolution-2026-09-29/after/responsive/1440/homepage-ecosystem.png) show the relationship.

## 8. Ecosystem geometry

The visible scaffold is independent of product motion. `src/data/ecosystem.ts`, the orbit model and solver, and the browser geometry test have no diff from `d186b0b`. The eight product IDs, unique paths, periods, tag anchors, and 1,080-second all-prograde repeat cycle remain intact.

The solver was rerun with `MASTER=1080` and `RETRO=none`: minimum shell clearance **+3.535u**, ForgerEMS versus Kayla Publisher at **t=763.078s**; **0/28** product pairs overlap. Label-to-label minimum is **+1.74u**, own-shell minimum **+0.50u**, and label-to-bounds minimum **+2.81u**. The historical **−20.50u** label-to-other-shell under-body occlusion is intentional and was already documented in the [orbit certification](fds-atomic-orbit-final-polish-2026-09-29.md). The browser geometry suite passed sampled master-cycle positions, including the closest approach and reduced-motion T=0 frame. The [closest-approach capture](visual-evolution-2026-09-29/after/geometry/closest-763.078s.png) uses the actual paused browser animations at that timestamp.

## 9. Connected Systems

The card labels now read **Development, Intelligence, Gaming, Publishing, Civic, Local Discovery, Maintenance**. Repeated `CORE //` and `DOMAIN //` prefixes were removed, and the product rail is headed **FDS PRODUCTS**. CodeForge → GEMS / Training Grounds → specialized products remains the section hierarchy.

## 10. GEMS / Training Grounds

Training Grounds is the faceted center of a research reactor. Four distinct, named gem compute nodes surround it: Topaz (general intelligence and orchestration), Sapphire (software engineering and coding), Peridot (mathematics and technical reasoning), and Garnet (multimodal and publishing intelligence). All four retain their authoritative **Research** status.

The seven-stage process is **Curriculum → Teach → Test → Diagnose → Refine → Verify → Advance**. Numbered stage labels and arrow-cued ring segments surround the core. One compositor-friendly sweep travels around the ring; hidden legacy pulses and glow paths no longer animate in the selected version. Static conduits connect each gem to the center. Hover or keyboard focus highlights the selected gem, its conduit, and the center accent. A restrained grid and telemetry marks add lab character. At 390px, the composition becomes a readable vertical stack with a full-width Training Grounds core and a seven-stage list.

## 11. Visual candidate comparison

| Area | Candidate | Review result |
|---|---|---|
| Homepage A | [Direct expansion](visual-evolution-2026-09-29/after/candidates/homepage/direct-expansion.png) | Eight colored individual rails still read as a planetary chart. |
| Homepage B | [CodeForge reactor](visual-evolution-2026-09-29/after/candidates/homepage/codeforge-reactor.png) | **Selected**: strongest logo resemblance and readable product hierarchy. |
| Homepage C | [Quiet scaffold](visual-evolution-2026-09-29/after/candidates/homepage/quiet-scaffold.png) | Too dim; the emblem/scaffold relationship weakens. |
| GEMS A | [Reactor pipeline](visual-evolution-2026-09-29/after/candidates/gems/reactor-pipeline.png) | **Selected**: clear core, independent gem lineages, numbered process, lower animation cost. |
| GEMS B | [Neural lattice](visual-evolution-2026-09-29/after/candidates/gems/neural-lattice.png) | Radial stage labels compete with lineage cards and feel less specific to Training Grounds. |

Candidate selection used desktop/mobile captures, factual readability, accessibility, and settled Chromium performance traces. Candidate switching remains an audit-only query parameter in the local build; the default is the selected version.

## 12. Performance

The two [raw traces](visual-evolution-2026-09-29/performance-before.json) and [final trace](visual-evolution-2026-09-29/performance-after.json) used Chromium 151.0.7922.34, a 1440×900 viewport, 2.5 seconds idle, a 2-second trace, and one run per scenario. The stream scenario is a local mocked incremental NDJSON response. Numbers below are before → final; image decoding is a count of trace tasks.

| Scenario | Task duration, s | RasterTask, ms | Paint, ms | Decode tasks | Running animations | Heap, MB | Long tasks |
|---|---:|---:|---:|---:|---:|---:|---:|
| Homepage hero | 0.22 → 0.42 | 571.54 → 96.01 | 35.84 → 36.23 | 464 → 328 | 49 → 42 | 2.29 → 2.06 | 0 → 0 |
| Homepage ecosystem | 0.22 → 0.41 | 644.07 → 188.72 | 39.01 → 34.18 | 432 → 336 | 49 → 42 | 2.36 → 2.06 | 0 → 0 |
| GEMS | 0.18 → 0.01 | 155.92 → 0 | 44.72 → 0 | 0 → 0 | 29 → 7 | 2.36 → 2.37 | 0 → 0 |
| Kayla closed | 0.22 → 0.42 | 567.75 → 97.85 | 35.22 → 35.32 | 392 → 280 | 49 → 42 | 2.06 → 2.06 | 0 → 0 |
| Kayla open | 0.24 → 0.52 | 551.28 → 104.34 | 38.65 → 31.67 | 360 → 248 | 49 → 42 | 2.55 → 2.13 | 0 → 0 |
| Kayla streaming mock | — → 0.54 | — → 162.47 | — → 46.19 | — → 306 | — → 42 | — → 2.43 | — → 0 |

The settled GEMS trace recorded no RasterTask or Paint events while its ring sweep remained active, consistent with composited transform motion. Total page animation objects fell from 83 to 54. The idle traces show a large raster reduction in the hero, ecosystem, and Kayla views, with no long tasks. Task duration rose in those four views, so this is a **mixed** performance result rather than a universal speedup. One-run traces vary; these measurements demonstrate no return to the historical multi-second raster failure, not a stable Core Web Vitals comparison.

## 13. Suspension and reduced motion

The ecosystem and GEMS diagrams pause when offscreen; the page visibility guard pauses decorative background animation on a hidden tab. Reduced motion stops continuous decorative motion, including the GEMS sweep, while retaining readable static states. Mobile strictly pauses desktop orbital SVG motion. Browser lifecycle gates and [reduced-motion captures](visual-evolution-2026-09-29/after/reduced-motion) confirm the compositions.

## 14. Responsive

Final captures cover **1920, 1599, 1440, 1280, 1024, 768, and 390px**. Browser assertions confirm eight product nodes and three scaffold planes on the desktop variants, no mobile horizontal overflow, and stage-label clearance from gem cards at the tested desktop widths. The 390px GEMS layout uses a vertical sequence rather than scaled-down desktop labels. Kayla also passed browser layouts at 320, 360, 390, and 430px, keyboard-open heights, and 200% zoom/text scaling.

## 15. Accessibility

The new diagrams passed scoped Axe WCAG 2 A/AA checks. GEMS lineage nodes are keyboard focusable with a visible focus state that mirrors hover feedback; the gem name, role, Research state, and seven stages remain real text. Decorative SVG layers are hidden from assistive technology where appropriate, and meaning is not conveyed by color alone. The complete browser matrix also passed Kayla Axe checks across closed, open, answer, loading, error, rate-limit, mobile, and reduced-motion states, plus the measured contrast and forced-colors tests.

## 16. Security

No Worker/provider configuration, model policy, secret file, or request handler changed in the visual commit. The inherited Kayla certification covers strict CORS (bad origin → 403), server-side keys, `ZERO_COST_ONLY`, rate/abuse guards, stream handling, bounded diagnostics, minimal public health, and `X-Kayla-Ops` operator gating. Current unit and browser suites passed provider-leakage, response-shape, hostile-markup, and rendered Markdown safety cases. `.dev.vars` is gitignored and absent from both local commits; the inherited audit notes that a local secret scan sees a key-like value inside that ignored local file.

## 17. Tests and validation

| Gate | Final result |
|---|---|
| Vitest, direct local CLI | **1,050/1,050**, 62 files |
| Complete Playwright matrix, two workers | **161 passed, 26 existing capture-only skips, 0 failed**; Chromium plus Firefox/WebKit smoke |
| GEMS visual/responsive/interaction suite after final interaction edit | **6/6 passed** |
| Kayla golden check, direct Node | **345/345 passed**; 138/138 Tier 1, 170/170 Tier 2, 37/37 Tier 3 |
| Kayla knowledge drift | **0 errors, 0 warnings** |
| Kayla knowledge inventory | **0 broken references** |
| Content validation | **7 projects, 6 notes; passed** |
| Astro check | **0 errors, 0 warnings, 1 existing deprecation hint** in `forged.astro:254` |
| Astro static build | **29 pages** |
| Internal links | **1,256 checked, 0 broken** |
| Orbit solver / browser geometry | **+3.535u shell minimum, 0/28 overlaps**; browser samples passed |

`npm run validate` itself could not start because the machine's global npm shim points to a missing `%APPDATA%/npm/node_modules/npm/bin/npm-cli.js`. The equivalent steps were run directly through project-local Node CLIs. The Vite-backed Kayla scripts needed elevated local execution to complete; all three then passed. No validation script or application code was changed to work around the host shim.

## 18. Files changed

The Kayla checkpoint was already committed before this visual pass. The visual commit contains these implementation and verification files:

| Area | Exact paths |
|---|---|
| Components | `src/components/FDSEcosystem.astro`; `src/components/OneFDSEcosystem.astro`; `src/components/GemsLearningSystem.astro` |
| Tests | `test/ecosystem-orbits.test.ts`; `test/visual-evolution-contract.test.ts`; `test/e2e/gems-visual-responsive.spec.ts`; `test/e2e/site-release-critical.spec.ts` |
| Reproducible evidence tools | `scripts/capture-visual-evolution.mjs`; `scripts/visual-evolution-perf.mjs` |
| Review evidence | `docs/audit/visual-evolution-2026-09-29/` — before/after, candidate, interaction, reduced-motion, responsive, Kayla, logo, closest-approach PNGs and both JSON traces |
| Final audit | `docs/audit/fds-kayla2-visual-evolution-final-2026-09-29.md` |

The exact 68-file visual commit inventory is available with `git show --format= --name-only bdeb890a96aff5fc7a307f3f2d791a951e9faf45`. The audit commit updates the capture helper, adds the closest-approach image, and refreshes its final screenshots.

## 19. Local commits

- `d186b0bb34bac018246e9bce314a0a369ab5fa6b` — `feat: upgrade Kayla Copilot with general free AI` (inherited checkpoint).
- `bdeb890a96aff5fc7a307f3f2d791a951e9faf45` — `feat: evolve FDS ecosystem and GEMS visual systems` (implementation, tests, and evidence).
- This report and the final closest-approach evidence are saved in a separate local audit commit; its hash is in the final task response and `git log`.

## 20. Screenshots and evidence paths

The [review evidence directory](visual-evolution-2026-09-29) contains the full capture set. Useful entry points:

- Homepage [before](visual-evolution-2026-09-29/before/responsive/1440/homepage-ecosystem.png) / [after](visual-evolution-2026-09-29/after/responsive/1440/homepage-ecosystem.png), [390px mobile](visual-evolution-2026-09-29/after/responsive/390/homepage-ecosystem.png), [closest approach](visual-evolution-2026-09-29/after/geometry/closest-763.078s.png).
- Connected Systems [before](visual-evolution-2026-09-29/before/responsive/1440/connected-systems.png) / [after](visual-evolution-2026-09-29/after/responsive/1440/connected-systems.png), [390px mobile](visual-evolution-2026-09-29/after/responsive/390/connected-systems.png).
- GEMS [before](visual-evolution-2026-09-29/before/responsive/1440/gems.png) / [after](visual-evolution-2026-09-29/after/responsive/1440/gems.png), [390px mobile](visual-evolution-2026-09-29/after/responsive/390/gems.png), [Topaz keyboard focus](visual-evolution-2026-09-29/after/interactions/gems-topaz-focus.png), [Peridot hover](visual-evolution-2026-09-29/after/interactions/gems-peridot-hover.png).
- Kayla [launcher](visual-evolution-2026-09-29/after/kayla/launcher.png), [open panel](visual-evolution-2026-09-29/after/kayla/panel-open.png), [code response](visual-evolution-2026-09-29/after/kayla/code-response.png), [mobile](visual-evolution-2026-09-29/after/kayla/mobile.png).
- All seven viewport widths are under `after/responsive/{1920,1599,1440,1280,1024,768,390}/`. The two JSON traces sit at the evidence directory root.

## 21. Remaining risks

- Final human visual approval is pending. No public release has occurred.
- The global npm shim needs repair before a literal `npm run validate` invocation can run on this host; all current component checks passed through direct Node entry points.
- The performance evidence is a short single-run trace. Main-thread TaskDuration increased in several views despite large raster reductions; performance should be watched on the eventual release build.
- Free upstream inference availability can vary. The free-only failover and safe local response path remain in place; Gemini is excluded while its configured credential returns 403.

## 22. Deployment

**NOT PUSHED — NOT DEPLOYED — AWAITING FINAL VISUAL APPROVAL**

The rebuilt local preview remains available at `http://127.0.0.1:4321`. The existing worker at port 8788 was left untouched.
