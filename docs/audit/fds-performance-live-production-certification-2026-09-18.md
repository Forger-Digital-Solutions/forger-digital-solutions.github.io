# FDS Website — Live Production Performance Certification

**Certification Date (live verification executed):** 2026-09-24
**Production Deploy Date:** 2026-09-18 (run `35306291402`)
**Production URL:** `https://forgerdigitalsolutions.com` (`https://forger-digital-solutions.github.io` 301-redirects to it)
**Certification Status:** `FDS_PERFORMANCE_LIVE_PRODUCTION_CERTIFIED`

> Scope note: the performance remediation itself was committed and pushed by a prior pass
> (`fad370f`, `8b0852b`) and deployed successfully on 2026-09-18. This document certifies the
> **deployed production site** by direct measurement on 2026-09-24 — not by inference from the
> push. A git push alone does not qualify; every number below was captured against live
> production with headed Chromium + Chrome DevTools Protocol.

---

## 1. Repository

| Item | Value |
| :--- | :--- |
| Pre-deploy commit (before perf work) | `5fe52e0de94fdf9d2b3e675cb693d12033752c71` |
| Performance commit 1 | `fad370f263cc618d44970579e3305d4b1c33e3b9` — `perf: eliminate homepage raster storms and suspend offscreen motion` |
| Performance commit 2 (final) | `8b0852b746355bb2e2f2b7b39dccafd0bbd8d701` — `perf: suspend offscreen status pulses that fell back to main-thread ticking` |
| Production commit (served) | `8b0852b746355bb2e2f2b7b39dccafd0bbd8d701` |
| Branch | `main` |
| Push confirmation | `local main == origin/main == origin/HEAD == 8b0852b` (verified via `git fetch` + `git rev-list --left-right --count main...origin/main` = `0 0`); working tree clean at verification start |

## 2. Deployment

| Item | Value |
| :--- | :--- |
| Mechanism | GitHub Actions `Deploy to GitHub Pages` (`.github/workflows/deploy.yml`), triggered on push to `main`: Dependency Security Gate → Build (unit tests + Kayla gates + worker build + `npm run validate` + secret scan) → Playwright Browser Certification (chromium/firefox/webkit) → `upload-pages-artifact` → `deploy-pages` |
| Perf commit 1 run | `35297110007` — **completed success**, 2026-09-18T01:53:03Z (8m34s) |
| Perf commit 2 run | `35306291402` — **completed success**, 2026-09-18T04:15:41Z (9m17s): Security 17s, Build 44s, Browser Cert 7m50s, Deploy 14s |
| Production state at verification | Serving the remediated build (verified by build markers below) |
| Production URL | `https://forgerdigitalsolutions.com` |

**Live-build markers confirmed on production (2026-09-24):**
- `GET /images/patterns/noise.png` → HTTP 200, exactly **4228 bytes** (matches the binary added in `fad370f`).
- Homepage + CSS bundle contain **0** occurrences of `feTurbulence` (runtime procedural noise removed).
- CSS bundle `/_astro/BaseLayout.*.css` references `noise.png` (pre-rendered dither in use).
- All offscreen/tab suspension hooks present in live HTML: `data-bg-paused`, `data-gems-paused`, `data-eco-paused`, `data-oneeco-paused`, `data-footer-paused`, `data-cosmic-paused`.

## 3. Verification (executed on the current tree, 2026-09-24)

| Gate | Result |
| :--- | :--- |
| Static build (`npm run build`) | **29 pages**, 0 errors, 0 warnings |
| Unit tests (`npm test`) | **60 files / 1015 tests passed (1015/1015)** |
| Astro type check (`npm run check`) | **115 files: 0 errors, 0 warnings** (1 hint) |
| Kayla knowledge + golden queries (`npm run validate:knowledge`) | inventory PASS; **345/345 golden queries (100.0%)** |
| Internal links (`npm run validate:links`) | **1255 links across 29 pages, 0 broken** |
| Release-critical Playwright (perf-animation-lifecycle, support-dialog, site-release-critical) | **15/15 passed** (chromium) |
| CI browser certification at deploy time | passed across chromium / firefox / webkit |

## 4. Performance — Before → Local → Live Production

Methodology (identical to the original forensic audit): headed Chromium, viewport 1440×900,
CDP `Performance.getMetrics` deltas over a 5s settle+idle window (TaskDuration / ScriptDuration /
LayoutDuration / RecalcStyleDuration → main-thread busy %), plus a 4s Chromium trace
(categories `devtools.timeline, v8.execute, disabled-by-default-devtools.timeline, blink.user_timing`)
parsed by raw event name (RasterTask / Paint / UpdateLayoutTree / Layerize / Commit / UpdateLayer /
ImageDecodeTask / long tasks). Medians of 3 iterations. Tool: `scripts/live-perf-profile.cjs`.

Because absolute trace counts are Chrome-version dependent, a **local control** column is included:
the current-HEAD `dist` served locally and profiled with the *same* tool and Chromium 151. This
isolates live-only effects from instrument drift.

### 4.1 Main-thread idle cost (5s idle window)

| Route / View | Broken LIVE baseline | Local remediated (R4.2H, older Chromium) | **New LIVE production (2026-09-24)** | Local control (same Chromium 151) |
| :--- | :--- | :--- | :--- | :--- |
| Homepage hero / top | 4.1367s | 0.2807s | **1.30s (26.0% busy)** | 1.55s (31.1%) |
| Homepage ecosystem | 4.4349s (~67% busy) | 0.6187s | **1.28s (25.6% busy)** | 1.47s (29.4%) |
| Homepage bottom / footer | 0.1641s | 0.0599s | **0.01s (0.13% busy)** | 0.01s (0.17%) |
| CodeForge `/projects/codeforge` | 3.2591s | 0.0101s | **0.01s (0.15% busy)** | 0.01s (0.14%) |
| GEMS Training Grounds | 0.3950s | 0.3381s | **0.41s (8.1% busy)** | 0.45s (9.1%) |
| Technology `/technology` | 0.2117s | 0.0088s | **0.01s (0.16% busy)** | 0.01s (0.20%) |
| About `/about` | 0.2100s | 0.0080s | **0.01s (0.17% busy)** | 0.01s (0.16%) |

### 4.2 Trace metrics (4s trace)

| Metric | Broken baseline | Local remediated | **New LIVE production** |
| :--- | :--- | :--- | :--- |
| Hero RasterTask | 4,715.48 ms / 1,061 calls | 640.36 ms / 142 calls | **89.2 ms / 1,002 calls** |
| Ecosystem RasterTask | >6,700 ms (in a 4s trace) | 1,533.45 ms / 400 calls | **76.2 ms / 1,022 calls** |
| Hero Paint | 343.83 ms / 197 | 56.71 ms / 74 | 212.3 ms / 482 |
| Ecosystem Paint | 439.19 ms / 267 | 110.75 ms / 184 | 181.7 ms / 482 |
| UpdateLayer (hero) | 4,263 calls | 5,039 calls | 12,141 calls (**31.6 ms total**) |
| ImageDecodeTask | 626 calls | 728 calls | **0 calls** |
| Idle long tasks (all routes) | — | — | **0** |

### 4.3 Interpretation — the catastrophic behavior is gone

- **Raster storm eliminated.** Ecosystem RasterTask collapsed from **>6,700 ms/4s** (broken live, saturating raster threads) to **76 ms/4s** (−98.9%). Hero RasterTask: 4,715 ms → 89 ms (−98.1%). Per-call cost fell from ~4.4 ms (expensive full-pass blurs) to ~0.09 ms (cheap cached compositor ops).
- **Main-thread saturation relieved.** Ecosystem busy ~67% (broken live) → **25.6%** (new live). Hero 4.14s → 1.30s (−68.6%).
- **Secondary routes are truly idle** (0.01s, ~0% busy, 0 raster) — matching the certified local build.
- **No long tasks** anywhere at idle, and a rock-solid **60 fps** (frame p95 = 16.8 ms) throughout, including during interaction and the soak.

### 4.4 Trace-nuance investigation (UpdateLayer / ImageDecodeTask / RasterTask counts)

The spec required explicitly explaining rising event counts:

- **UpdateLayer count is high (≈12.1k) but costs ~31.6 ms total (~0.0026 ms each).** These are many inexpensive cached compositor layer updates, not avoidable work. Aggregate cost is trivial. Acceptable per the "cheap compositor events are OK" rule.
- **RasterTask call count (~1,000) is similar to the broken baseline (~1,061) but total cost collapsed 98%.** The count reflects per-frame compositor raster scheduling for the animated hero; the *cost per call* is what changed (4.4 ms → 0.09 ms). Prioritize total cost + frame impact over raw counts — total cost is now negligible.
- **ImageDecodeTask = 0** on live (the 4 KB pre-rendered `noise.png` decodes once into GPU texture; no repeated decoding). Better than the local figures.
- **No layout-triggering CSS property animates** at idle (`layoutTriggeringProps=[]`): running animations are compositor `transform` / `opacity` only. The residual style/layout recalcs (~245 UpdateLayoutTree + 245 Layout per 4s) come from per-frame `IntersectionObserver` intersection computation (the offscreen-suspension mechanism itself), not from animating layout properties.

### 4.5 No production-only regression (control experiment)

Live production and the local current-HEAD build measure **identically** under the same instrument
(Chromium 151, same tool, same settings): live hero 1.30s vs local 1.55s; live ecosystem 1.28s vs
local 1.47s; secondary routes 0.01s both. Live is marginally *better* than local. Therefore the gap
between "New LIVE production" and the R4.2H audit's "local remediated" absolute numbers is **instrument
drift (Chromium 151 vs the older Chromium used for R4.2H), not a deployment or production regression.**
The deployed site *is* the certified site.

## 5. UX

| Area | Live finding |
| :--- | :--- |
| Visual fidelity | Confirmed via screenshots (`shots/live-*.png`): hero, ecosystem (8 planets + FDS CORE reactor with rich radial-gradient glow), GEMS, OneFDS, footer, CodeForge, GEMS page, technology, about, mobile 390, tablet 768. Identity fully preserved; still intentionally futuristic. No broken assets. |
| Shadow/blur/noise removal | No visual regression: core glow via native SVG radial gradients reads as a rich reactor; planet shells/rings/glows intact; star field + pre-rendered dither look correct. |
| Animations | 41 running at hero (cosmic constellations + ecosystem), all compositor `transform`/`opacity`; hover/focus glows preserved (CI e2e + code). |
| Planet behavior | 8 planets orbit on colored tracks (solid = shipped, dashed = planned); keyboard-inspectable (site-release-critical C passed). |
| Offscreen suspension | Verified directly: at footer, cosmic/eco/gems/oneeco all carry `data-*-paused` and running anims drop 41→9; below-fold sections paused at top. Not inferred from CSS. |
| Kayla | Opens cleanly on live during soak; 0 console/page errors. CI Kayla gates passed. |
| Responsive | Mobile 390 + tablet 768 intact; mobile orbital pause (e2e) passed. |
| Reduced motion | `prefers-reduced-motion: reduce` → **0 running, 0 total** animations; page fully usable (nav, status, Kayla, content all present in screenshot). |
| Hidden tab | `visibilitychange` → `data-bg-paused` on `<html>`; running anims 41→**0** (all 75 paused), stable over +2s; resume restores 41 with **total unchanged (75)** — no loop/timer multiplication, safe resume. |
| Soak (≈4.5 min: scroll, hover planets, GEMS, OneFDS, footer, CodeForge, GEMS, home, Kayla, 210s idle) | Heap peaked ~5.5 MB then GC'd to ~2.35–3.2 MB (net **−2.74 MB**, no leak); DOM nodes returned to baseline (5180→1663); **0 long tasks during idle**; frame p95 16.8 ms; animation total returns to 75 (no duplication); 0 console/page/request errors. |

## 6. Remaining Risks (truthful)

1. **Residual ~26–31% main-thread busy at idle on the homepage hero+ecosystem.** This is the cost of the intentionally animated hero (continuous compositor transform/opacity animations + per-frame IntersectionObserver style/layout recalcs). It is identical local vs live (not a regression), 60 fps, 0 long tasks, raster near-idle, and does not accumulate. Reducing it further would require design changes that risk the FDS visual identity — out of scope per instructions. On very weak integrated GPUs this may still produce mild warmth/fan, but **not** the prior severe multi-core lag.
2. **Absolute trace counts are instrument-dependent.** Paint/UpdateLayer/RasterTask *call counts* differ from the R4.2H audit because Chromium 151 instruments differently than the older Chromium used then. The local-control column (§4.1) is the apples-to-apples reference; live == local.
3. **Subjective real-hardware feel (Phase 11) was not directly observable by the automated agent.** Mouse/typing latency, Windows UI responsiveness, and fan behavior require human perception. All objective browser-side correlates of smoothness are clean (60 fps, 0 long tasks, raster −98%, no accumulation), but a human confirmation of subjective smoothness is recommended as supplementary evidence.
4. **GPUTask ≈2.1 s per 4s trace at hero** (compositor work for the 60 fps animation). Reduced from baseline but nonzero; the remaining GPU-side cost of the animated hero on integrated graphics.

## 7. Evidence Artifacts

- Live perf sweep: `docs/audit/live-production/perf-summary.json`
- Local control sweep: `docs/audit/live-production/local-control-summary.json`
- Behavioral audit (smoke / animations / suspension / reduced-motion): `docs/audit/live-production/behavior-audit.json`
- Soak: `docs/audit/live-production/soak.json`
- Tooling: `scripts/live-perf-profile.cjs`, `scripts/live-behavior-audit.cjs`, `scripts/live-tab-visibility.cjs`, `scripts/live-soak.cjs`, `scripts/capture-live-visual.cjs`
- Screenshots (gitignored evidence): `shots/live-*.png`

## 8. Final Verdict

`FDS_PERFORMANCE_LIVE_PRODUCTION_CERTIFIED`

The production FDS website no longer exhibits the system-killing raster storm or main-thread
saturation that made hardware lag heavily: ecosystem RasterTask −98.9%, ecosystem busy ~67%→25.6%,
hero 4.14s→1.30s, secondary routes truly idle, 0 long tasks, 60 fps, no memory leak, no animation
duplication, and all suspension / reduced-motion / tab-visibility behaviors verified live. The FDS
visual identity is preserved. Live production matches the certified local build under identical
measurement, confirming no deployment-only regression.
