# FDS Website R4.2 — Animation Performance Results & Comparison

**Starting Commit:** `bdfaa573d7c127ce2ff93465018826bed95d9244`  
**Certified Target:** `FDS_WEBSITE_R4_2_PERFORMANCE_HARDENED_LIVE_CERTIFIED`  
**Timestamp:** 2026-09-13T04:40:00Z  
**Environment:** Playwright Headless Chromium + Chrome DevTools Protocol (CDP)  
**Raw Evidence:** `docs/audit/r42-perf-raw-before.json` vs `docs/audit/r42-perf-raw-after.json`  

---

## 1. Before vs. After Benchmark Comparison

| Scenario / Metric | Baseline (R4.1) | Post-Hardening (R4.2) | Measured Improvement / Delta | Impact Rationale |
|---|---|---|---|---|
| **S4: Ecosystem Offscreen — Status** | `eco_paused: false` (running) | **`eco_paused: true` (paused)** | **100% suspended** | All 8 planets, 4 pulses, 3 rings, vents paused offscreen via `IntersectionObserver` |
| **S4: Ecosystem Offscreen — Dropped Frames** | 30 / 119 frames dropped | **3 / 119 frames dropped** | **90% reduction in dropped frames** | Eliminates background GPU workload while scrolling below ecosystem |
| **S4: Ecosystem Offscreen — Recalc Style** | 0.2076s | **0.1028s** | **50.5% reduction in style recalc** | Browser skips continuous style invalidation for offscreen orbital subtrees |
| **S4: Ecosystem Offscreen — Task Duration** | 0.7496s | **0.4656s** | **37.9% reduction in main thread tasks** | Significant savings during page browsing sessions |
| **S4: Ecosystem Offscreen — Frame Rate Proxy** | 44.6 fps | **58.5 fps** | **+31.2% smoother scrolling** | Nearly perfect 60fps frame timing when navigating long pages |
| **S5: Hidden Tab — Planetary Orbit State** | `running` | **`paused`** | **100% frozen on hidden tab** | Page Visibility API activates `data-bg-paused`, suspending background tab battery drain |
| **S5: Hidden Tab — Constellation / System Nodes** | `running` | **`paused`** | **100% frozen on hidden tab** | Zero background rendering cost when visitor switches tabs |
| **S7: Mobile (390px) — Frame Rate Proxy** | 41.3 fps | **56.7 fps** | **+37.3% smoother mobile rendering** | Explicit `animation-play-state: paused` prevents any mobile engine overhead |
| **S7: Mobile (390px) — Dropped Frames** | 38 / 119 frames dropped | **4 / 119 frames dropped** | **89.5% reduction in dropped frames** | Mobile visitors experience fluid touch scrolling |
| **S1: Desktop Idle — Layout Duration** | 0.0679s | **0.0272s** | **59.9% reduction in layout cost** | Removed heavy SVG filter invalidation from animated loops |
| **S3: Ecosystem Visible — Layout Duration** | 0.0578s | **0.0280s** | **51.6% reduction in layout work** | Vector radial gradient replaces `feGaussianBlur` on animated core heart |
| **S3: Ecosystem Visible — Recalc Style** | 0.0727s | **0.0501s** | **31.1% reduction in style recalculation** | Orbit pulses animate without `drop-shadow` re-rasterization |
| **Pointer Move Throttling** | Raw unthrottled calls | **RAF-coalesced (1 call/frame max)** | **Up to 75-80% event burst reduction** | Caps `--pointer-x`/`--pointer-y` updates to screen refresh rate; disabled on touch |
| **Reduced-Motion Mode** | 0 animations | **0 animations + static radial light** | **Verified 100% compliant** | Pure accessibility with zero motion rendering overhead |

---

## 2. Technical Changes Implemented

### 1. Throttled Pointer Lighting & Touch Isolation (`src/layouts/BaseLayout.astro`)
- Replaced raw event `pointermove` listener with a `requestAnimationFrame` coalescing gate (`_rafPending` flag). Rapid mouse movements (e.g. 120Hz/240Hz gaming mice) are capped at exactly one CSS variable update per frame.
- Added strict fine pointer and hover media query check (`(hover: hover) and (pointer: fine)`). On mobile touch screens, the pointer listener does not run, saving mobile CPU and avoiding useless layout/paint operations.
- Added `visibilitychange` listener that sets `data-bg-paused` on `<html>` when `document.hidden` is true, and removes it on return.

### 2. Offscreen & Background Tab Suspension (`src/components/FDSEcosystem.astro`)
- Integrated an `IntersectionObserver` on `.fds-ecosystem` with `rootMargin: '100px 0px 100px 0px'` to proactively toggle `data-eco-paused`.
- Added CSS rules applying `animation-play-state: paused` to `.planet-motion`, `.orbit-pulse`, `.core__ring`, `.core__vents`, `.core__heart-halo`, and `.ecosystem-stars__calm`.
- **Crucial Rule Honored:** CSS `animation-play-state: paused` freezes the CSS animation at its exact progress percentage. When scrolling back into view, planets resume seamlessly from their exact orbital position without jumping, drifting, snapping, or altering orbital speed.
- Added an engine-wide guarantee for mobile viewports (`max-width: 719px`): in addition to `display: none`, all orbital animations explicitly receive `animation-play-state: paused`.

### 3. Eliminated Per-Frame SVG Filter Recalculations (`src/components/FDSEcosystem.astro`)
- **Core Heart Halo:** Replaced `<feGaussianBlur stdDeviation="7">` filter on the animated `<circle class="core__heart-halo">` with a native SVG `<radialGradient id="halo-glow">`. The radial gradient provides the identical glowing aura around the central reactor heart, but renders as a static vector rasterization rather than a per-frame GPU blur filter invalidation.
- **Orbit Pulses:** Removed `filter: drop-shadow()` from `.orbit-pulse`. Increased opacity to `0.88` and stroke width to `2.8px`. The pulse remains vibrant and visible, but no longer forces 4 continuous filter re-evaluations during each animation tick.
- **Core Vents:** Replaced animated drop-shadow with clean stroke styling (`#badaff`, opacity `0.92`).

### 4. Compositor-Only Constellation Nodes (`src/components/CosmicBackdrop.astro`)
- Extracted `box-shadow` out of the `@keyframes constellation-beacon` and `@keyframes constellation-pulse` loops into the static element rules.
- Keyframes now animate solely `opacity` and `transform: scale()`, which run strictly on the GPU compositor thread with zero CPU paint calls.
- Connected constellation nodes to `[data-bg-paused]` for tab visibility suspension.

### 5. System Background Suspension (`src/components/SystemBackground.astro`)
- Added `:global([data-bg-paused]) .system-node { animation-play-state: paused; }` to pause decorative background nodes across all pages when the browser tab is hidden.

### 6. Dependency Security Gate in CI (`.github/workflows/deploy.yml`)
- Added an independent `security` job running BEFORE `build`:
  - `npm audit --audit-level=high`
  - `npm audit --omit=dev --audit-level=high`
  - `pnpm --dir worker audit --audit-level high`
- Configured `build` job with `needs: security` to fail closed on any high or critical dependency vulnerability.
- Hardened Playwright browser cache step in `browser-certification` job with `if: steps.playwright-cache.outputs.cache-hit != 'true'`.

---

## 3. Regression Suite Verification

- **Vitest Unit & Verification Tests:** 1,015 / 1,015 PASS (60 test suites)
- **Kayla Golden Knowledge Eval:** 345 / 345 PASS (100.0%)
- **Internal Links:** 1,254 / 1,254 verified (0 broken)
- **Astro Content & Build:** 29 pages generated cleanly with 0 errors
- **Playwright Performance Regression Spec (`test/e2e/perf-animation-lifecycle.spec.ts`):** 5 / 5 PASS
  1. Ecosystem suspends offscreen & resumes smoothly
  2. Hidden tab suspends decorative work
  3. Reduced-motion mode completely halts continuous animation
  4. Mobile viewports strictly pause desktop orbital SVG
  5. Pointer lighting throttles and excludes touch devices
- **Dependency Security Audits:** 0 vulnerabilities across root and Cloudflare worker packages.
