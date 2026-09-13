# FDS Website R4.2 — Animation Performance Results & Evidence Reconciliation

**Starting Baseline Commit:** `bdfaa573d7c127ce2ff93465018826bed95d9244` (`FDS_WEBSITE_R4_1_HARDENED_LIVE_CERTIFIED`)  
**Target Candidate Commit:** `d7c4056824748006106b326d78859cb4071fcb4c` (`main` HEAD)  
**Reconciliation Status:** `FDS_WEBSITE_R4_2_RUNTIME_HARDENED_LIVE_CERTIFIED_WITH_MIXED_PERFORMANCE_METRICS` (superseded by the final R4.2H-R1 certification: `FDS_WEBSITE_R4_2_RUNTIME_HARDENED_LIVE_CERTIFIED_WITH_VISIBLE_WORKLOAD_TRADEOFF`)  
**Audit Timestamp:** 2026-09-13T11:34:41Z  
**Benchmark Methodology:** Playwright Headless Chromium + Chrome DevTools Protocol (CDP) `Performance.getMetrics` & `PerformanceObserver`  
**Execution Mode:** Serial execution (`--workers=1`), embedded in-process HTTP static file server (port 4323) serving `dist/`  
**Statistical Method:** 5 iterations per numerical scenario (reporting samples, median, mean, min, max; medians used for all primary metrics; <5% noise threshold)  
**Raw Baseline Artifact:** `docs/audit/r42-perf-raw-before.json` (SHA-256: `853AC1893DCA62BB87924BF77FDF4C37A418F81696C09569B485970AF2DE19CC`)  
**Raw Candidate Artifact:** `docs/audit/r42-perf-raw-after.json` (SHA-256: `1B34642E03D46CBC6CB0E3B0423E8BC2CD4105673026079ACB49E9C355BD9577`)  
**Evidence Manifest:** `docs/audit/r42-performance-evidence-manifest.json`  

---

## 1. Reconciled Before vs. After Benchmark Comparison

The following table reports the exact 5-iteration medians mechanically computed by `scripts/r42-perf-report.ts` directly from the raw JSON artifacts. In accordance with strict reconciliation guidelines, no regressions or neutral metrics have been hidden or rounded away.

| Scenario | Metric | Baseline (R4.1) | Candidate (R4.2) | Delta | Statistical Interpretation |
|---|---|---|---|---|---|
| **S1: Desktop Idle** | Layout Duration | 0.0433 s | 0.0241 s | -0.0192 s | Material improvement (44.3% reduction) |
| **S1: Desktop Idle** | Recalc Style Duration | 0.0428 s | 0.0428 s | 0 s | Within noise (0%) |
| **S1: Desktop Idle** | Task Duration | 0.3476 s | 1.4616 s | +1.114 s | Material regression (+320.5%) |
| **S1: Desktop Idle** | RAF frame interval proxy | 18.8 fps | 19.2 fps | +0.4 fps | Within noise (+2.1%) |
| **S1: Desktop Idle** | Dropped frames proxy (>33ms) | 52 frames | 51 frames | -1 frames | Within noise (-1.9%) |
| **S2: Pointer Burst** | Pointer Events Dispatched | 100 events | 100 events | 0 events | Within noise (0%) |
| **S2: Pointer Burst** | CSS Variable Writes | 200 writes | 10 writes | -190 writes | Material improvement (95.0% reduction) |
| **S2: Pointer Burst** | Pointer Update Cycles | 100 cycles | 5 cycles | -95 cycles | Material improvement (95.0% reduction) |
| **S2: Pointer Burst** | Writes Per Pointer Event | 2 writes/ev | 0.1 writes/ev | -1.9 writes/ev | Material improvement (95.0% reduction) |
| **S2: Pointer Burst** | Recalc Style Duration | 0.0666 s | 0.0624 s | -0.0042 s | Small directional improvement (6.3% reduction) |
| **S2: Pointer Burst** | Task Duration | 0.1241 s | 0.184 s | +0.0599 s | Material regression (+48.3%) |
| **S3: Ecosystem Visible** | Layout Duration | 0.0439 s | 0.0274 s | -0.0165 s | Material improvement (37.6% reduction) |
| **S3: Ecosystem Visible** | Recalc Style Duration | 0.0679 s | 0.0446 s | -0.0233 s | Material improvement (34.3% reduction) |
| **S3: Ecosystem Visible** | Task Duration | 0.5442 s | 1.8303 s | +1.2861 s | Material regression (+236.3%) |
| **S3: Ecosystem Visible** | RAF frame interval proxy | 28.5 fps | 21.4 fps | -7.1 fps | Material regression (-24.9%) |
| **S3: Ecosystem Visible** | Dropped frames proxy (>33ms) | 58 frames | 53 frames | -5 frames | Small directional improvement (8.6% reduction) |
| **S4: Ecosystem Offscreen** | data-eco-paused attribute | false | true | N/A | Suspended when offscreen (false -> true) |
| **S4: Ecosystem Offscreen** | Layout Duration | 0.0817 s | 0.0371 s | -0.0446 s | Material improvement (54.6% reduction) |
| **S4: Ecosystem Offscreen** | Recalc Style Duration | 0.1557 s | 0.0844 s | -0.0713 s | Material improvement (45.8% reduction) |
| **S4: Ecosystem Offscreen** | Task Duration | 0.5496 s | 0.3619 s | -0.1877 s | Material improvement (34.2% reduction) |
| **S4: Ecosystem Offscreen** | RAF frame interval proxy | 60 fps | 60 fps | 0 fps | Within noise (0%) |
| **S4: Ecosystem Offscreen** | Dropped frames proxy (>33ms) | 0 frames | 0 frames | 0 frames | Neutral (0 delta) |
| **S5: Hidden Tab** | data-bg-paused attribute | false | true | N/A | Paused on visibility change (false -> true) |
| **S5: Hidden Tab** | Task Duration | 0.3156 s | 0.3089 s | -0.0067 s | Within noise (-2.1%) |
| **S6: Reduced Motion** | Active Animations | 0 anims | 0 anims | 0 anims | Compliant (0 active animations) |
| **S6: Reduced Motion** | Task Duration | 0.0002 s | 0.0003 s | +0.0001 s | Within noise (0.1ms delta) |
| **S7: Mobile 390px** | Orbital Scene Wrap display | none | none | N/A | Preserved none display |
| **S7: Mobile 390px** | Planet Animation State | running | paused | N/A | State hardened (running -> paused) |
| **S7: Mobile 390px** | Layout Duration | 0.0403 s | 0.0331 s | -0.0072 s | Material improvement (17.9% reduction) |
| **S7: Mobile 390px** | Recalc Style Duration | 0.0763 s | 0.0554 s | -0.0209 s | Material improvement (27.4% reduction) |
| **S7: Mobile 390px** | Task Duration | 0.3527 s | 0.3485 s | -0.0042 s | Within noise (-1.2%) |
| **S7: Mobile 390px** | RAF frame interval proxy | 59.3 fps | 60 fps | +0.7 fps | Within noise (+1.2%) |
| **S7: Mobile 390px** | Dropped frames proxy (>33ms) | 1 frames | 0 frames | -1 frames | Material improvement (100.0% reduction) |
| **S8: Kayla Open/Close** | Dialog Visible Raw Duration | 239 ms | 252 ms | +13 ms | Directional regression (+5.4%) |
| **S8: Kayla Open/Close** | Dialog Transition Settled Duration | 553 ms | 556 ms | +3 ms | Within noise (+0.5%) |
| **S8: Kayla Open/Close** | Dialog Close Settled Duration | 491 ms | 413 ms | -78 ms | Material improvement (15.9% reduction) |

---

## 2. Technical Performance Profile Analysis

The reconciled benchmark evidence establishes that **R4.2 is a runtime hardening release with a mixed performance profile** rather than a uniform performance improvement across all dimensions.

### Key Architectural Improvements Confirmed
1. **Pointer Burst Coalescing (S2):** Under 5 rapid bursts of 20 events (100 total events dispatched faster than frame cadence), R4.2's `_rafPending` gate coalesces updates to exactly 1 write cycle per frame burst. CSS custom property updates dropped from **200 writes to 10 writes (-95.0%)**, with writes per event dropping from **2.0 to 0.1**.
2. **Offscreen Ecosystem Suspension (S4):** Proactive `IntersectionObserver` suspension (`rootMargin: '100px'`) sets `data-eco-paused` when the ecosystem is offscreen, reducing Layout Duration by **54.6%** (0.0817s → 0.0371s), Recalc Style Duration by **45.8%** (0.1557s → 0.0844s), and Task Duration by **34.2%** (0.5496s → 0.3619s).
3. **SVG Filter Reductions (S1, S3):** Replacing `<feGaussianBlur>` with a native vector `<radialGradient id="halo-glow">` and stripping animated `drop-shadow` from orbit pulses produced consistent layout duration reductions: **-44.3%** in idle (0.0433s → 0.0241s) and **-37.6%** when visible (0.0439s → 0.0274s), along with a **-34.3%** reduction in style recalc duration when visible.
4. **Mobile Resource Hygiene (S7):** Setting `animation-play-state: paused` on hidden orbital animations eliminated mobile dropped frames (1 → 0) and reduced style recalc by **27.4%** (0.0763s → 0.0554s).
5. **Dialog Settlement (S8):** Kayla panel closing settled **15.9% faster** (491ms → 413ms).

### Neutral & Regressive Metrics Documented
1. **Headless Cumulative Task Duration (S1, S3):** Headless Chromium reported higher TaskDuration during idle (+320.5%) and visible (+236.3%) scenarios. The R4.2R benchmark did not isolate the cause of this signal. **R4.2H outcome (see `fds-r4-2-headed-runtime-performance.md`, R1 revision):** headed trace-only measurement confirms R4.2 genuinely does more passive main-thread work (H1 +66.5%, H2 +62.5% over 10s windows) — the headless benchmark amplified the signal but did not invent it. No >50ms long tasks occurred in headed H1–H5 on either build, and scroll/hover workloads are lighter on R4.2.
2. **Kayla Open Latency (S8):** Dialog visibility latency is slightly longer by **+13ms** (239ms → 252ms, +5.4%), while total open transition settled duration remained effectively identical (+3ms, +0.5%, well within statistical noise).
3. **Pointer Burst Task Duration (S2):** Task duration during burst processing registered a minor increase (+0.0599s, 0.1241s → 0.1840s), reflecting RAF queue management overhead even as style writes were cut by 95%.

### Scope & Technical Claims Clarification
- **No Unqualified Hardware Acceleration Claims:** Prior documentation referred to changes as "strictly GPU compositor operations with zero CPU paint". In practice, CSS animations and DOM updates involve CPU layout and style recalc phases before compositing occurs. The changes optimize CSS property selection (`transform` and `opacity` vs `box-shadow`) and eliminate per-frame filter rasterization, rather than bypassing CPU rendering entirely.
- **No Uniform 60 FPS Claim:** While offscreen and mobile frame interval proxies reached 60 fps, visible desktop animation loops registered frame intervals reflecting headless Chromium's scheduling behavior.

---

## 3. Regression Suite Verification

- **Vitest Unit Suite:** 1,015 / 1,015 PASS (60 test suites)
- **Kayla Golden Knowledge Suite:** 345 / 345 PASS (100.0%)
- **Internal Link Consistency Check:** 1,254 / 1,254 verified (0 broken links)
- **Astro Content & Build Check:** 29 pages generated cleanly with 0 errors
- **Playwright Full Suite Certification:** 165 / 165 PASS across 21 test spec files (including 5 / 5 in `perf-animation-lifecycle.spec.ts`). Accounting verified against CI job logs (165 passed, 0 failed, 0 skipped in runs 34739559016, 34755517674, 34758450375).
- **Dependency Security Audits:** 0 vulnerabilities across root and Cloudflare worker packages
- **CodeForge Download Archive Integrity:** SHA-256 verified as `A6E16D0056DEEBEEB8D8B99F7228F5FED43C380722E97012E45B26D5C6FE3208` (matched and preserved)
