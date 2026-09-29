# FDS Website — Final Release Certification (Local)

**Date:** 2026-09-29
**Scope:** atomic ecosystem freeze + CodeForge auth origin repair + full gate matrix

## Repository state

- Branch: `main`, HEAD `82ccc03` at takeover (== origin/main)
- Working tree: uncommitted atomic ecosystem changeset + auth repair, no unrelated user work touched

## Atomic ecosystem certification (frozen)

Re-verified this session from shipped source (`src/data/ecosystem.ts`):

- Master cycle: **1080s**; revolution counts 36/24/30/20/18/15/10/12; wrap delta ≤2.2e-12u — exact repeat
- Shell clearance: **+3.535u** (`forgerems ~ kayla-publisher` @ 763.1s), 0/28 unclearable
- Labels: `label~label` +1.74u, `label~own` +0.50u, `label~bounds` +2.80u; `label~core` −0.66u (abstract aura graze, inspected clean); `label~shell` −20.50u (intentional under-body occlusion)
- Browser↔solver agreement: e2e samples t=0/137.5/540/763.1/916.9 + cycle closure — pass
- Runtime architecture unchanged: static data + SVG + CSS `offset-path`; no rAF/physics/MutationObserver; authoring solver never ships

## CodeForge auth root cause

`src/pages/codeforge/sign-in.astro` derived the OAuth `return` target with
`import.meta.env.DEV ? Astro.url.origin : siteConfig.siteUrl`. For a static build,
`Astro.url.origin` resolves at **build time** to `site` (`https://forgerdigitalsolutions.com`),
so a local production preview emitted `return=https://forgerdigitalsolutions.com/codeforge/sign-in`
while being served from `http://localhost:4321` — the test's same-origin invariant correctly
caught it.

## Auth fix

- Build-time `href` keeps the **canonical production** return as a no-JS fallback.
- Inline script rebinds `return` to `new URL('/codeforge/sign-in', window.location.origin)` —
  the origin that actually served the page — in dev, preview, and production alike.
- Security: `return` is never taken from query/input (`?return=`/`?redirect=`/`?next=`/`?callback=`
  cannot steer it — e2e-verified), so no open redirect is introduced. The cloud service retains
  its own allowlist; the site now only ever emits same-origin self-returns.
- Test coverage: serving-origin return, foreign-param injection, canonical no-JS fallback,
  a11y + 390px shell — `codeforge-auth.spec.ts` 3/3 pass.

## Local gates (executed)

- `npm run check` — 0 errors, 0 warnings, 1 pre-existing hint (`document.execCommand`, forged.astro)
- `npm test` — **1024/1024**, 60 files
- `npm run build` — 29 pages
- `npm run validate` — content ✓, knowledge drift 0 ✓, golden 345/345 ✓, check ✓, build ✓, links 1256/0 broken ✓
- e2e (chromium): ecosystem-orbit-geometry 5/5, perf-animation-lifecycle 5/5,
  site-release-critical 6/6, codeforge-auth 3/3, support-dialog 4/4, visitor-counter 5/5,
  forgerems-video-facade 1/1, fds-r2-visual-commerce 8/8, kayla-widget 16/16.
  One parallel-worker flake in support-dialog (localStorage race) passed 4/4 on isolated re-run.
  visual-certification 26 skipped — CI-only by design (`test.skip(CI !== 'true')`).

## Performance

- Steady-state 5s orbit window: **0 long tasks**; 27 running scene animations (16 CSS planet-motion)
- No rAF/JS-positioning/animated filters; offscreen + hidden-tab pause verified by perf spec
- Auth change adds a 5-line inline href rebind — no steady-state cost

## Visual review

Screenshot campaign (gitignored `shots/eco-final/`): T=0/10/30/60/120/300/540/1080 + closest-763.1
(shell min), closest-137.6 (label min), closest-503.7 (core graze), closest-80.9 (bounds),
reduced-motion, core-closeup, responsive 1920/1599/1440/1280/768/390. Atomic appearance retained;
all labels legible; no clipping; mobile card fallback intact. Sign-in page verified rendered +
same-origin return.

## Files changed

- `src/data/ecosystem.ts`, `src/components/FDSEcosystem.astro`, `src/data/manifest.ts`,
  `src/pages/codeforge/sign-in.astro`
- `test/ecosystem-orbits.test.ts`, `test/e2e/ecosystem-orbit-geometry.spec.ts`,
  `test/e2e/codeforge-auth.spec.ts`
- `scripts/eco-*.cjs`, `scripts/capture-eco-*.cjs` (authoring tooling)
- `docs/audit/fds-atomic-orbit-final-polish-2026-09-29.md`,
  `docs/audit/fds-website-final-release-certification-2026-09-29.md`,
  `docs/audit/live-production/perf-after-*.json`
- Removed earlier: 29 `tmp-*.json` solver dumps

## Known remaining issues

None blocking. `document.execCommand` deprecation hint in `src/pages/forged.astro` is pre-existing
and unrelated.

## Deployment readiness

All release-critical gates green locally. Ready to commit → push → GitHub Pages → live
re-certification on https://forgerdigitalsolutions.com.
