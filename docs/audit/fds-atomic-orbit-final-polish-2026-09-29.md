# FDS Atomic Orbit — Final Polish Certification

**Date:** 2026-09-29
**Status:** NOT DEPLOYED — AWAITING FINAL VISUAL APPROVAL

## 1. Starting repository state

Continued from a credit-exhausted checkpoint. The working tree held a verified all-prograde
8-plane geometry candidate (M=1080s, +3.535u shell clearance) and a deterministic label pass
that had not yet been joint-solved or persisted. No work was discarded; the candidate was
re-verified from the shipped source before any further change.

## 2. Inherited candidate

8 worlds, 8 unique tilted orbital planes, FDS nucleus centered, static SVG paths +
CSS `offset-path` animation only. No runtime physics, no `requestAnimationFrame` engine,
no runtime collision avoidance.

## 3. Solver corrections inherited

Coarse-ceiling optimism, crossing-only seeds, narrow refinement bracket, `worstCeiling`
early-abort treating a partial minimum as an incumbent, stale-phase false certification,
spin passing bug, uncorrelated proxy corridor metric — all inherited fixed and kept fixed.
This session additionally fixed: viewBox-based label bounds (replaced by the real measured
clip apron), missing own-shell label constraint, and a joint-CSP approach replacing greedy
anchor descent that kept stalling at `label~label ≈ -5u`.

## 4. Final geometry

All-prograde. Direction mixing was measured destructive: any retrograde plane collapsed
clearance to roughly −25u…−32u at useful sizes, vs +3.535u all-prograde at 33–37u.
Collision safety, legibility, and atomic appearance take precedence over CW/CCW symmetry.

## 5. Orbit table

| world | size | ellipse | rot | period | dir | start | opacity |
|---|---|---|---|---|---|---|---|
| codeforge | 34 | 168×155 | 29° | 30s | fwd | 98.333 | .50 |
| forgerems | 34 | 242×202 | 6° | 45s | fwd | 46.972 | .46 |
| gems | 33 | 208×167 | −12° | 36s | fwd | 0.000 | .42 |
| training-grounds | 33 | 264×228 | −66° | 54s | fwd | 87.750 | .38 |
| kyrablox | 36 | 285×232 | 63° | 60s | fwd | 46.266 | .34 |
| kayla-publisher | 35 | 301×254 | −84° | 72s | fwd | 7.500 | .31 |
| we-the-people | 37 | 306×300 | 90° | 108s | fwd | 0.095 | .28 |
| farmstand-finder | 37 | 318×263 | −37° | 90s | fwd | 47.012 | .26 |

## 6. Size table

World sizes 33–37u — the largest tested family still meeting the ≥3u clearance target.
Locked; labels adapted to planets, not vice-versa.

## 7. Master-cycle schedule

M = 1080s. Revolutions per cycle: 36, 24, 30, 20, 18, 15, 10, 12 — every period divides M
exactly; gcd of the revolution counts is 1 (no degenerate global lockstep before M).

## 8. Proof of exact repetition

`position(1080) = position(0)` for all 8 bodies, max wrap delta 2.2e-12u (float error only).
CSS `animation-delay` negative offsets + `offset-distance: var(--orbit-start)` share the
same model time, so the certificate extends indefinitely. Verified independently in browser
by the e2e suite (t=0 vs t=1080 frame agreement).

## 9. Global shell-clearance result

Dense 0.1s sweep of the shipped source: **+3.535u minimum** — `forgerems ~ kayla-publisher`
at t=763.1s. 0/28 unclearable pairs. Screenshot: `shots/eco-final/closest-763.1-scene.png`.

## 10. Label-clearance results

Dense 0.1s sweep, full cycle:

| category | min | pair | t | overlap time | status |
|---|---|---|---|---|---|
| label~label | +1.74u | forgerems~we-the-people | 137.6s | 0.0s | hard pass |
| label~own shell | +0.50u | codeforge | 3.5s | 0.0s | hard pass |
| label~bounds | +2.80u | we-the-people | 80.9s | 0.0s | hard pass |
| label~core | −0.66u | codeforge | 503.7s | 93.6s (8.7%) | soft graze of abstract aura ring; tag sits on empty space — visually inspected, clean |
| label~shell | −20.50u | kayla-publisher~we-the-people | 84.3s | 276.5s (25.6%) | intentional under-body occlusion depth cue (tags paint below bodies) |

## 11. Clipping/bounds methodology

The SVG uses `overflow: visible`; `html/body` clip at the viewport. The certificate therefore
uses a measured real apron `LABEL_BOUNDS = {l:-36, t:-80, r:730, b:700}` (hero-copy clearance
left, tightest-desktop viewport apron right, hero padding top, inspection panel bottom) rather
than the nominal 680² viewBox. Per-world anchors were found by AC-3 + max-min branch-and-bound
over a 120-candidate space (5 reach tiers × 3 lateral shifts × 8 compass directions), then
polished at dt=0.1 against the honest hinge metric.

## 12. Reduced-motion result

`prefers-reduced-motion: reduce` freezes exactly the animated T=0 frame via
`animation: none; offset-distance: var(--orbit-start)` on the shared `.planet-motion` class —
one geometry, one truth, no separate static map. Verified: e2e reduced-motion test passes;
`shots/eco-final/reduced-motion-scene.png` is identical to `t-0000-scene.png`.

## 13. Responsive review

- 1920 / 1599 / 1440 / 1280: full composition in hero right column; all tags legible.
- 768: scene under hero copy; composition and labels intact.
- 390: existing card-stack fallback (scene not rendered at <720px) — unchanged behavior.

## 14. Performance measurements

- Steady-state orbit window: **0 long tasks** (5s PerformanceObserver window).
- Scene animations: 27 running (16 planet-motion: 8 bodies + 8 tag shadows — all CSS).
- No `requestAnimationFrame`, no MutationObserver, no JS positioning, no animated
  filters/shadows (drop-shadow exists only inside `:hover`/`:focus-visible`), no permanent
  `will-change` (reduced-motion block resets to `auto`), IntersectionObserver pause intact.
- `perf-animation-lifecycle` spec: 5/5 pass (offscreen pause, visibility suspend,
  reduced-motion cost, mobile pause, pointer throttle).

## 15. Tests

- `npm run check` (astro check): 0 errors, 0 warnings, 1 pre-existing hint
  (`document.execCommand` deprecation, `src/pages/forged.astro:254` — unrelated).
- `npm test` (vitest): **1024/1024 pass, 60 files**.
- `npm run build`: 29 pages, clean.
- `npm run validate` (content + knowledge + golden + check + build + links):
  all PASS; 1256 internal links, 0 broken; KAYLA golden 345/345.
- `test/e2e/ecosystem-orbit-geometry.spec.ts`: **5/5 pass**
  (static composition; master-cycle divisibility; browser↔solver at t=0/137.5/540/763.1/916.9
  + closure at 1080; reduced-motion freeze = animated T=0; label anchors rendered).
- `test/e2e/perf-animation-lifecycle.spec.ts`: 5/5 pass.
- `test/e2e/site-release-critical.spec.ts`: 6/6 pass (incl. ecosystem keyboard inspection).
- `test/e2e/visual-certification.spec.ts`: 26 skipped — CI-only by design
  (`test.skip(process.env.CI !== 'true')`).

## 16. Unrelated known failure

`test/e2e/codeforge-auth.spec.ts` — 1/2 fail on the `return` parameter origin:
the sign-in page emits `siteConfig.siteUrl` (production) outside dev mode while the test
expects the local preview origin. Pre-existing, unrelated to orbit work; not modified per
task instructions. Second test (narrow-viewport a11y) passes.

## 17. Exact files changed

- `src/data/ecosystem.ts` — certified orbit specs + deterministic label fields.
- `src/components/FDSEcosystem.astro` — under-body `.tag-layer` synchronized motion groups;
  `data-planet`/`data-tag-for` markers; tag-layer CSS (non-interactive, `currentColor`).
- `src/data/manifest.ts` — JSON import attribute (`with { type: 'json' }`) so bare Node ESM
  can load it (Playwright harness requirement).
- `test/ecosystem-orbits.test.ts` — MASTER_CYCLE 1080, all-prograde expectations, current
  size/eccentricity family, label-metadata assertions.
- `test/e2e/ecosystem-orbit-geometry.spec.ts` — new spec: composition, master cycle,
  solver↔browser sampling, reduced-motion freeze, label markup.
- `scripts/eco-orbit-model.cjs` — real-apron bounds, per-kind label metrics, own-shell
  constraint, expanded anchor candidates, `solveLabelsCSP` (AC-3 + max-min B&B).
- `scripts/eco-orbit-solver.cjs`, `scripts/eco-label-solve.cjs`,
  `scripts/eco-label-polish.cjs`, `scripts/eco-geometry-check.cjs`,
  `scripts/eco-screenshot-campaign.cjs`, `scripts/capture-eco-*.cjs` — authoring-time
  tooling (never imported by the production bundle).
- `docs/audit/live-production/perf-*.json` — prior session's perf evidence.
- Removed: 29 `tmp-*.json` search/scratch dumps.

## 18. Screenshots

`shots/eco-final/` (gitignored evidence): `t-0000`…`t-1080` frames + scene crops,
`closest-763.1` (shell min), `closest-137.6` (label min), `closest-503.7` (core graze),
`closest-80.9` (bounds min), `core-closeup`, `reduced-motion(.png|-scene.png)`,
`responsive-{1920,1599,1440,1280,tablet-768,mobile-390}(.png|-scene.png)`.

## 19. Deployment status

NOT DEPLOYED — AWAITING FINAL VISUAL APPROVAL. No commit, no push, no deploy. Local preview
running at http://127.0.0.1:4321 serving the current build.

## 20. Final verdict

FDS_ATOMIC_ORBIT_FINAL_POLISH_CERTIFIED
