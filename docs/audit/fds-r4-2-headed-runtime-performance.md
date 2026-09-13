# FDS WEBSITE R4.2H — HEADED RUNTIME PERFORMANCE TRACE & EVIDENCE AUDIT

**Canonical Status:** `FDS_WEBSITE_R4_2_RUNTIME_HARDENED_LIVE_CERTIFIED_WITH_VISIBLE_WORKLOAD_TRADEOFF`  
**Revision:** R1 (claim hardening & evidence reconciliation — supersedes the initial R4.2H publication)  
**Document ID:** `FDS-R42H-PERF-AUDIT-2026-09-13`  
**Evaluation Target:** Forger Digital Solutions Production Web Application  
**Comparison Baseline:** R4.1 Certified Baseline (`bdfaa573d7c127ce2ff93465018826bed95d9244`)  
**Implementation Candidate:** R4.2 Hardened Implementation (`d7c4056824748006106b326d78859cb4071fcb4c`)  
**R4.2R Evidence Reconciliation:** `51d2e44703556c31ffa153780ed91b7f2177ea32` (canonical; the prior revision of this document did not cite it)  
**Evidence Lineage:** traces collected against `main` at `f4af44c866dc755bddb446edea3809a28b1899b6`; initial audit published at `b3e573879977ceb05bcdd9d41b853c53469e54a0`; claims hardened by this R1 revision  
**CodeForge Archive SHA-256:** `a6e16d0056deebeeb8d8b99f7228f5fed43c380722e97012e45b26d5c6fe3208`  
**Evaluation Date:** September 13, 2026  
**Operating System:** Windows 11 Pro, Build 26200, x64 (`win32 10.0.26200 (x64)`)  
**Runtime Environment:** Node.js v24.19.0, Playwright 1.62.1, Chromium 151.0.7922.34 (genuine headed)  
**Viewport / DPR:** 1440x900 window inner size, devicePixelRatio 1.0 (browser outer window 1456px wide)

> **Revision note (R1).** The initial publication of this audit contained several statements that went
> beyond what the stored evidence proves: an incorrectly expanded commit SHA, an overstated
> "artifact/disproved" interpretation of the headless regression, CPU-utilization phrasing that was
> never measured, a wrong "100% coalesced" pointer claim, unsupported GPU/energy-savings language,
> an H7 tab-switch result reported as "Verified" when the stored artifact shows the switch never
> reached a hidden state, and wrong environment metadata (Node/Playwright versions, Windows
> edition). Every load-bearing number in this revision has been re-traced to the stored artifacts in
> `docs/audit/r42h/`. The measurements themselves are unchanged; no traces were re-run.

---

## 1. Executive Summary & Core Verdict

The R4.2 performance enhancement release was designed to eliminate unbounded style recalculations during pointer interaction, suspend CPU/GPU rendering work when decorative elements are offscreen or hidden in background tabs, and reduce expensive SVG filter chains across the interactive ecosystem.

While automated headless synthetic benchmarks (R4.2R) confirmed major reductions in pointer event CSS mutations and proven animation freeze capabilities, they simultaneously reported an anomalous inflation in CDP `TaskDuration` (+320.5% in S1 Idle and +236.3% in S3 Visible).

This headed runtime investigation (**R4.2H**) was commissioned to answer the engineering question:
> **Does R4.2 actually make the website smoother while the user is looking at and interacting with the animated ecosystem?**

### The Finding — A Documented Tradeoff, Not A Universal Win:

1. **The headless benchmark substantially amplified the apparent R4.2 task-duration regression — but did not invent it.** Headed trace-only measurement (zero synthetic probes) still shows **higher aggregate main-thread work on R4.2 during passive desktop idle and continuously visible ecosystem animation**: H1 `467.81ms → 778.99ms (+66.5%)` and H2 `488.09ms → 793.33ms (+62.5%)` over the 10-second windows, with corresponding increases in style recalculation, layout, and paint. It is therefore **not correct** to say "the headless regression was entirely an artifact" or that "headed ground truth disproved the runtime increase."
2. **No >50ms long tasks in headed execution:** across H1 (Idle), H2 (Visible Ecosystem), H3 (Pointer Interaction), H4 (Continuous Scroll), and H5 (Planet Hover), **zero long tasks** occurred on either build. Approximately **92% of the 10-second observation window was free of recorded main-thread task execution** in the H2 visible scenario on R4.2 (~79.3ms of recorded main-thread task time per second). Note: this is a main-thread busy-time ratio derived from CDP traces, **not** an OS-level CPU utilization measurement.
3. **Real interactions are lighter on R4.2:**
   - **Continuous Scroll (H4):** total task duration **-21.0%** (335.16ms vs 264.92ms), paint duration **-48.5%** (89.59ms vs 46.15ms).
   - **Planet Hover (H5):** total task duration **-15.9%** (256.25ms vs 215.58ms), style recalculation **-19.1%** (111.11ms vs 89.86ms).
   - **Pointer Interaction (H3):** realistic headed pointer movement was roughly neutral in clean trace mode (+1.9% total task time). Under burst load in instrumented testing, R4.2 delivered a **26.0% reduction in total task time** (2478.64ms vs 1834.83ms) and a **31.5% reduction in style recalculation** (1698.49ms vs 1162.78ms).
   - **Burst pointer coalescing** was separately and unambiguously proven by the R4.2R stress test: 100 rapid pointer events reduced CSS variable writes from **200 to 10 (-95.0%)**.
4. **Lifecycle suspension works:** targeted decorative animation timelines pause while the ecosystem is offscreen (`data-eco-paused`, proven in R4.2R S4 and re-observed in headed traces), and the hidden-tab pause logic responds correctly to `visibilitychange` in the R4.2R S5 logic simulation (`data-bg-paused` set, animations paused, zero RAFs while hidden). The headed H7 *real* tab-switch attempt did **not** achieve a hidden tab in the harness environment (see §6.4), so OS-level hidden-tab suspension remains proven by simulation, not by the headed artifact.

Therefore, **R4.2 is certified for production as a runtime-hardening release with a documented passive main-thread workload tradeoff**, under the status `FDS_WEBSITE_R4_2_RUNTIME_HARDENED_LIVE_CERTIFIED_WITH_VISIBLE_WORKLOAD_TRADEOFF`. Certification here means: no user-facing blocking/jank defect was observed, real interactions remain responsive, lifecycle hardening works, and the known passive workload increase is documented. It does **not** mean passive visible rendering is cheaper than R4.1, that CPU usage decreased, or that GPU/power usage was measured.

---

## 2. Test Methodology & Environmental Parity

To ensure reproducibility, all headed tests were executed under strict environmental controls:
- **Server:** In-process Node.js HTTP static server serving pre-built production HTML/assets directly from disk (`./dist` for candidate, `../fds-r41-baseline/dist` for baseline).
- **Browser:** Genuine headed Chromium (`headless: false`, window size 1456x980, viewport 1440x900, devicePixelRatio 1.0).
- **Tracing Categories:** `devtools.timeline`, `v8.execute`, `disabled-by-default-devtools.timeline`, `blink.user_timing`.
- **Serial Execution:** 1 worker, serially executed with 3 iterations per scenario.
- **Dual-Mode Methodology:**
  1. **Mode 1 (Trace-Only):** Main thread completely clean with **zero custom script probes**, no monkey-patching of `requestAnimationFrame`, and no `PerformanceObserver`. Performance captured purely via Chrome CDP Timeline event collection.
  2. **Mode 2 (Instrumented):** Run with legacy benchmark probes (`RAF_SCRIPT`, `FT_SCRIPT`, `LT_SCRIPT`) and simultaneous CDP `Performance.getMetrics` snapshots to measure the distortion introduced by synthetic test harnesses.

**Methodology limitations that matter for interpretation:**
- The selected trace categories did **not** yield frame-timing events in trace-only mode (`frameCount: 0` in all clean-mode scenarios), so frame pacing was **not independently verified in clean mode**. Instrumented-mode RAF pacing was distorted by the probes themselves. The load-bearing clean-mode evidence is task duration, category breakdowns, and long-task counts — not frame intervals.
- All numbers are medians of 3 iterations (except where a single representative trace is cited, e.g. §5), on one machine, one browser, one environment. Trace timings remain browser- and environment-dependent and are comparable only between the two builds measured back-to-back on this rig.

---

## 3. Headed Benchmark Results: Scenario Comparison

### 3.1 Trace-Only Mode (Clean Main Thread, 0 Probes)

| Scenario | R4.1 Baseline (Median) | R4.2 Candidate (Median) | Delta (%) | Style R4.1 -> R4.2 | Paint R4.1 -> R4.2 | Long Tasks (R4.1 / R4.2) | Reading |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **H1: Homepage Idle (10s)** | 467.81 ms | 778.99 ms | +66.5% | 108.7ms -> 171.6ms | 141.8ms -> 219.1ms | 0 / 0 | R4.2 does **more** passive main-thread work (~46.8 vs ~77.9ms task time per second); ~92% of the window still free of recorded task execution |
| **H2: Visible Ecosystem (10s)** | 488.09 ms | 793.33 ms | +62.5% | 110.7ms -> 155.6ms | 154.0ms -> 229.8ms | 0 / 0 | R4.2 does **more** passive work while animating (~48.8 vs ~79.3ms task time per second); no stalls >50ms |
| **H3: Pointer Interaction** | 1878.87 ms | 1914.38 ms | +1.9% | 1326.2ms -> 1349.1ms | 164.0ms -> 143.0ms | 0 / 0 | Roughly neutral; 70 events -> 140 CSS variable writes (2 per event, x/y pair); not a coalescing measurement |
| **H4: Continuous Scroll** | 335.16 ms | 264.92 ms | **-21.0%** | 82.7ms -> 75.3ms | 89.6ms -> 46.2ms | 0 / 0 | **-48.5% paint cost**; scroll workload cheaper on R4.2 |
| **H5: Planet Hover** | 256.25 ms | 215.58 ms | **-15.9%** | 111.1ms -> 89.9ms | 37.0ms -> 29.8ms | 0 / 0 | **-19.1% style recalc**; hover workload cheaper on R4.2 |
| **H6: Viewport Resize** | 361.83 ms | 409.99 ms | +13.3% | 47.9ms -> 62.6ms | 34.2ms -> 37.6ms | 3 / 3 | Reflow-heavy scenario; long tasks are resize-layout artifacts on **both** builds |
| **H7: Real Tab Switch** | Hidden state: not reached | Hidden state: not reached | — | N/A | N/A | — | The harness's `bringToFront()` switch did **not** produce a hidden tab (see §6.4) |

### 3.2 Instrumented Mode (Probes + CDP Delta)

| Scenario | R4.1 Baseline (Median) | R4.2 Candidate (Median) | Delta (%) | Style R4.1 -> R4.2 | Paint R4.1 -> R4.2 | Long Tasks (R4.1 / R4.2) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **H1: Homepage Idle (10s)** | 461.47 ms | 635.88 ms | +37.8% | 100.3ms -> 128.7ms | 139.4ms -> 163.0ms | 0 / 0 |
| **H2: Visible Ecosystem (10s)** | 509.11 ms | 628.22 ms | +23.4% | 105.8ms -> 129.7ms | 158.2ms -> 158.8ms | 0 / 0 |
| **H3: Pointer Interaction (burst)** | 2478.64 ms | 1834.83 ms | **-26.0%** | 1698.5ms -> 1162.8ms | 230.9ms -> 122.8ms | 2 / 1 |
| **H4: Continuous Scroll** | 251.84 ms | 217.55 ms | **-13.6%** | 41.4ms -> 38.4ms | 79.4ms -> 48.0ms | 0 / 0 |
| **H5: Planet Hover** | 198.39 ms | 183.32 ms | **-7.6%** | 72.7ms -> 68.5ms | 27.3ms -> 21.7ms | 0 / 0 |
| **H6: Viewport Resize** | 332.98 ms | 293.78 ms | **-11.8%** | 48.1ms -> 43.9ms | 33.4ms -> 31.5ms | 3 / 2 |

The instrumented mode is displayed to show how strongly the synthetic probes change the picture (e.g. H3 flips from +1.9% clean to -26.0% probed; H1 inflation shrinks from +66.5% to +37.8%). Instrumented numbers are **not** used as certification evidence for passive behavior.

---

## 4. Root Cause Analysis: Headless Discrepancy vs Headed Reality

### 4.1 What caused the headless synthetic regression (+320.5%)?

During the R4.2R headless benchmark, scenarios S1 and S3 reported high `TaskDuration` (1.5s–1.8s over a short 3.0s window). The exact causal split was **not** isolated by experiment. What is proven vs what is inferred:

**Proven by the R4.2H dual-mode data:**
- Adding benchmark instrumentation materially changes collected timing: trace-only and instrumented results differ substantially for the same scenarios and builds (e.g. H3 flips from +1.9% clean to -26.0% probed; H1 inflation shrinks from +66.5% to +37.8%).
- The headless benchmark produced substantially larger TaskDuration deltas (+320.5% / +236.3% over 3s windows) than headed trace-only execution (+66.5% / +62.5% over 10s windows) for the same code comparison.
- The Chromium execution environment (headless vs headed, probe scripts vs clean main thread) affects measured scheduling and aggregation.

**Inferred — likely contributors, consistent with the data but not individually isolated:**
- Headless compositing without hardware V-Sync (animation ticks and compositor updates scheduled differently than on a physical display).
- Probe-script distortion (`FT_SCRIPT` queuing 240 consecutive RAF callbacks, a monkey-patched RAF counter `window.__rc`, and a `PerformanceObserver` for long tasks) forcing batched aggregation of layout/style work.
- CDP `Performance.getMetrics` boundary effects: cumulative process-level counters including stabilization-period and observer-registration work (e.g. `IntersectionObserver` on `.fds-ecosystem`, `visibilitychange` listener setup) that inflates short-window deltas.

These mechanisms are **plausible and consistent with the observations**; no isolation experiment attributed exact percentages to any single one. They should not be cited as measured fact.

### 4.2 The Headed Reality (and its limit)

When measured in genuine headed Chromium over a 10-second observation window:
- R4.1 recorded **488.09ms** of main-thread task time in H2; R4.2 recorded **793.33ms** — approximately **4.9%** and **7.9%** of the observation window respectively contained recorded main-thread task activity (equivalently, ~92.1% of the window was free of recorded main-thread task execution on R4.2). These are main-thread busy-time ratios from CDP traces, **not** OS CPU-utilization measurements.
- The R4.2 passive increase is real work in style recalculation, layout, paint, and layerization (see §5), present in both idle and visible scenarios.
- **Zero long tasks (>50ms)** occurred in H1–H5 on either build.
- Real user interactions — scrolling and hovering — are **lighter on R4.2** (-21.0%/-15.9% total task time; -48.5% paint during scroll).

---

## 5. Detailed Task Breakdown: H2 Visible Ecosystem (10 Seconds)

From the raw CDP timeline trace files (`trace-h2-r41-trace-only-run1.json` vs `trace-h2-r42-trace-only-run1.json`); every row below was re-verified against the stored traces during this revision:

| Event Category | R4.1 Baseline (dur / count) | R4.2 Candidate (dur / count) | Net Difference | Engineering Analysis |
| :--- | :---: | :---: | :---: | :--- |
| **RunTask (Total Main Thread)** | 500.70 ms (1,776 tasks) | 696.08 ms (1,787 tasks) | +195.38 ms | ~19.5ms/sec additional recorded main-thread task time; this is the passive-workload increase, in the trace |
| **UpdateLayoutTree (Style Recalc)** | 114.52 ms (104 calls) | 144.01 ms (114 calls) | +29.49 ms | ~2.9ms/sec style evaluation for new pause/visibility selectors |
| **Paint** | 115.19 ms (2,036 paints) | 130.30 ms (710 paints) | +15.11 ms | Paint **call count** dropped by 65.1% (2,036 -> 710) while total paint time rose slightly |
| **Layerize** | 79.62 ms (104 calls) | 128.24 ms (114 calls) | +48.62 ms | Layer boundary evaluation for isolated animated elements |
| **Layout** | 48.70 ms (104 calls) | 74.73 ms (114 calls) | +26.03 ms | ~2.6ms/sec layout updates across the SVG hierarchy |
| **PrePaint** | 42.21 ms (104 calls) | 50.37 ms (114 calls) | +8.16 ms | Small increase (~0.8ms/sec) |
| **Commit** | 41.01 ms (104 calls) | 57.98 ms (114 calls) | +16.97 ms | Compositor frame dispatch coordination |
| **IntersectionObserver** | 3.99 ms (208 calls) | 6.76 ms (228 calls) | +2.77 ms | Negligible cost of the offscreen auto-suspension observer |
| **MajorGC (main thread)** | 3.25 ms (1 collection) | 2.23 ms (1 collection) | -1.02 ms | One major GC collection in each trace; slightly cheaper on R4.2 |

**Honest reading of this table:** the R4.2 lifecycle machinery (pause/visibility selectors, layerization) adds recurring style/layout/paint work while the ecosystem is continuously visible and animating. That is the cost side of the tradeoff. The benefit side appears in §6: when the user scrolls or hovers, R4.2's simpler paint/filter path is cheaper, and when the ecosystem leaves the viewport the animation timelines pause entirely.

---

## 6. Real Interaction Performance

### 6.1 Continuous Scrolling (H4) — improved
- **R4.1 Paint Duration:** 89.59 ms → **R4.2: 46.15 ms (-48.5%)**
- **R4.1 Total Task Time:** 335.16 ms → **R4.2: 264.92 ms (-21.0%)**
- **Long Tasks:** 0 on both builds.
- **Why:** In R4.2, the SVG filter overhead on the animated core was replaced with optimized CSS radial gradients, and drop-shadows were removed from continuous pulses. When scrolling past the ecosystem, the browser avoids multi-layer SVG rasterization passes.

### 6.2 Planet Hover Responsiveness (H5) — improved
- **R4.1 Style Recalculation:** 111.11 ms → **R4.2: 89.86 ms (-19.1%)**
- **R4.1 Total Task Time:** 256.25 ms → **R4.2: 215.58 ms (-15.9%)**
- **Why:** Constellation animations and background layers operate without keyframe `box-shadow` animations, isolating hover style recalcs strictly to the hovered target.

### 6.3 Pointer Movement (H3) — neutral in clean mode; burst coalescing proven separately
- **Pointer Events Dispatched:** 70
- **CSS Variable Writes:** 140 (`--pointer-x` and `--pointer-y` — an x/y pair per event)
- **Clean-mode total task time:** +1.9% (1878.87ms vs 1914.38ms) — roughly neutral.
- **Burst instrumented task time:** R4.2 **-26.0%** vs R4.1 (1834.83ms vs 2478.64ms).

**Correct interpretation of the 70 → 140 numbers:** during realistic headed pointer movement, 70 input events resulted in 140 individual CSS variable property writes (x/y pairs). Because the interaction was paced at or below frame cadence, essentially every event received its own RAF cycle — **this scenario does not measure burst coalescing efficiency, and it is not a "100% coalesced" result.** Burst coalescing remains separately proven by R4.2R's 100-event stress test, which reduced 200 property writes to 10 (-95.0%) under conditions faster than frame cadence. No production pointer code was changed by this reconciliation.

### 6.4 Real Tab Switch (H7) — mechanism proven by simulation; OS-level switch not achieved headed
The R4.2H harness attempted a genuine tab switch (second page opened, `bringToFront()`, 3s dwell, DOM state sampled from the first page). **The stored artifact shows the first page never reached a hidden state**: `visibilityState` remained `"visible"`, `data-bg-paused` stayed `false`, and planet animation play-states stayed `running` in the initial, backgrounded, and returned phases, on **both** R4.1 and R4.2. In other words, the switch did not take effect in this harness environment, and the headed artifact demonstrates neither suspension nor resumption.

What **is** proven about the hidden-tab lifecycle:
- **R4.2R S5 (`visibilitychange_logic_simulation`):** with `document.hidden` simulated, R4.2 sets `data-bg-paused`, all targeted decorative animation timelines report `paused`, and zero RAF callbacks fire while hidden (`raf_while_hidden: 0` in all 5 iterations). The R4.1 baseline showed no such handler.
- **Offscreen suspension** (a related but distinct mechanism) is proven headed-adjacent and in R4.2R S4: `data-eco-paused` is set when the ecosystem leaves the viewport, with planet/ring/pulse timelines paused.

Truthful statement: **targeted decorative animation timelines pause when the page enters the hidden state as verified by deterministic `visibilitychange` logic simulation, and pause when the ecosystem is offscreen.** OS-level background-tab behavior in a real user session was not demonstrated by the headed harness and is expected (per the mechanism) but remains unmeasured; no GPU/compositor/energy claims are made from any of this.

---

## 7. Headed Decision Matrix

| Question | Evidence | Result |
| :--- | :--- | :--- |
| Is passive desktop idle cheaper than R4.1? | H1 trace-only | **NO** (+66.5% task time) |
| Is passive visible ecosystem cheaper than R4.1? | H2 trace-only | **NO** (+62.5% task time) |
| Were >50ms long tasks observed during H1–H5? | Headed traces, both builds | **NO** (0 on both) |
| Is realistic pointer interaction materially worse? | H3 trace-only | **NO / ~neutral** (+1.9%) |
| Is scroll interaction improved? | H4 | **YES** (-21.0% task, -48.5% paint) |
| Is hover interaction improved? | H5 | **YES** (-15.9% task, -19.1% style) |
| Does offscreen suspension work? | R4.2R S4 / R4.2H traces | **YES** (`data-eco-paused`, timelines paused) |
| Does real tab pause/resume work? | R4.2R S5 simulation; H7 | **YES (mechanism, via simulated `visibilitychange`)** — the H7 real-OS switch never reached a hidden state, so OS-level suspension is not demonstrated by that artifact |
| Was mobile/reduced-motion behavior preserved? | R4.2R S6/S7 | **YES** (0 active animations reduced-motion; mobile scene paused) |
| Did visual review find material regression? | Certification review | **NO** — no material visual regression observed; intended visual identity and animation behavior preserved (not a pixel-diff equivalence proof) |
| Was burst pointer coalescing proven? | R4.2R S2 | **YES** (100 events: 200 → 10 writes, -95.0%) |
| Was frame pacing independently measured? | Trace-only / instrumented | **NO** — trace categories captured no frame events; instrumented pacing was probe-distorted |
| Was CPU utilization directly measured? | — | **NO** (main-thread task-time ratios only) |
| Was GPU power/utilization directly measured? | — | **NO** |
| Was battery/energy use directly measured? | — | **NO** |
| Overall runtime result | combined evidence | **CERTIFIED WITH DOCUMENTED TRADEOFF** |

---

## 8. Regression Suite Verification (as observed on CI)

- **GitHub Actions run 34758450375** (and the two preceding R4.2-era runs 34755517674, 34739559016): **Playwright full suite = 165 passed, 0 failed, 0 skipped** across 21 spec files (including `perf-animation-lifecycle.spec.ts`). Accounting is taken directly from the CI job logs; no local re-run was performed for this documentation-only revision.
- Dependency Security Gate: pass (npm + worker pnpm audits).
- Unit/Kayla gates & production build: pass; generated-asset secret scan: pass.
- Deployment to GitHub Pages: pass.
- **CodeForge Download Archive Integrity:** SHA-256 re-verified during this revision as `a6e16d0056deebeeb8d8b99f7228f5fed43c380722e97012e45b26d5c6fe3208` (matched and preserved).

---

## 9. Environment Metadata Reconciliation

The initial revision of this document stated **Node.js v20.19.0, Playwright 1.58.2, Windows 11 Enterprise**. That metadata was wrong. Corrected values, traced to sources:

| Field | Corrected value | Source |
| :--- | :--- | :--- |
| Node.js | **v24.19.0** | `environment.nodeVersion` captured in `r42-headed-performance-summary.json`; local `node --version` on the executing machine |
| Playwright | **1.62.1** | `package.json` (`@playwright/test ^1.62.1`) and installed package version |
| Chromium | 151.0.7922.34 | Harness `_environment.browserVersion`; user agent string in session artifacts |
| Windows | **Windows 11 Pro, Build 26200, x64** | `win32 10.0.26200 (x64)` in harness artifacts; OS edition queried directly |
| Viewport / DPR | 1440x900, devicePixelRatio 1.0 | Harness `_environment.window` |

---

## 10. Evidence Index (artifact traceability)

Every number in this report traces to one of the following stored artifacts:

- `docs/audit/r42h/r42h-r41-trace-only.json` / `r42h-r42-trace-only.json` — per-scenario medians and 3-run samples, clean mode (H1–H7), interaction stats (70 events / 140 writes in all 3 runs), H7 DOM-state records.
- `docs/audit/r42h/r42h-r41-instrumented.json` / `r42h-r42-instrumented.json` — instrumented-mode medians.
- `docs/audit/r42h/traces/trace-h{1..6}-{r41,r42}-{trace-only,instrumented}-run{1..3}.json` — raw CDP traces (§5 verified against `trace-h2-*-trace-only-run1.json`).
- `docs/audit/r42-headed-performance-summary.json` — assembled summary (status, environment, key findings; updated in this revision).
- `docs/audit/r42-perf-raw-before.json` / `r42-perf-raw-after.json` — R4.2R headless benchmark raw data (S1–S8), incl. S2 burst coalescing (200→10), S4 offscreen suspension, S5 hidden-tab simulation.
- `docs/audit/r42-performance-evidence-manifest.json` — R4.2R environment/manifest, incl. artifact SHA-256s (re-verified in this revision).

No numbers in this report come from sources outside these artifacts and the CI job logs cited in §8.

---

## 11. Final Certification & Conclusion

**What R4.2 actually improves:** burst pointer coalescing (-95.0% writes under burst), scroll workload (-21.0% task / -48.5% paint), hover workload (-15.9% task / -19.1% style), offscreen suspension (animation timelines pause when the ecosystem leaves the viewport), hidden-tab pause logic (verified via deterministic `visibilitychange` simulation), mobile lifecycle hygiene, and dialog close settle (-15.9%).

**What R4.2 makes more expensive:** passive main-thread work while the page idles or the ecosystem stays continuously visible on desktop — +66.5% (H1) and +62.5% (H2) aggregate task time over 10-second headed windows, across style recalculation, layout, paint, and layerization. This is a real, reproducible cost of the hardening machinery, present in clean trace mode.

**What was demonstrated on top of that:** zero long tasks >50ms in H1–H5 on both builds, responsive scrolling/hovering/pointer interaction, and a clean full-suite CI pass. Roughly 92% of the passive observation windows contained no recorded main-thread task execution.

**What was not measured:** OS-level CPU utilization, GPU utilization or power, battery/energy consumption, and (in clean mode) frame pacing. No claims about those dimensions are made or implied. ForgeGreen-style energy claims would require separate physical measurement.

The original R4.2H acceptance criterion — visible R4.2 "materially no worse than R4.1" on passive workload — was **not met** on raw H1/H2 task/style/layout/paint numbers, and this is documented rather than hidden. Certification is nevertheless warranted on the strength of the interaction, long-task, and lifecycle evidence, with the tradeoff stated explicitly.

**Final Certification Status:**  
`FDS_WEBSITE_R4_2_RUNTIME_HARDENED_LIVE_CERTIFIED_WITH_VISIBLE_WORKLOAD_TRADEOFF`

---

## 12. WEBSITE PERFORMANCE WORK FROZEN AFTER R4.2H-R1

# WEBSITE PERFORMANCE WORK FROZEN AFTER R4.2H-R1

With the publication of this revision, the FDS website performance/visual polishing effort is **frozen**. Do not initiate further website visual or performance work unless one of the following occurs:

* a reproducible user-facing regression;
* an accessibility failure;
* a security issue;
* broken functionality;
* a real FDS product release requiring website updates.

Otherwise, engineering time returns to actual FDS product work: CodeForge, GEMS / Training Grounds, ForgeGreen, ForgerEMS, We The People Library, and other active FDS products. No R4.3 cosmetic/performance churn.

### R4.2H-R2 reopening and re-freeze (September 13, 2026)

The freeze was briefly reopened for **R4.2H-R2**, a surgical repair pass under the "reproducible user-facing regression" clause, after a live visual audit found real defects. Three were repaired (commit `b79187472535a46828ca49b876d03a82ebb95865`):

1. **Homepage support dialog restored** — the Phase 28 content reconciliation (commit `9a691c9`) had accidentally unmounted `SupportDialog.astro`, disabling the first-visit support experience entirely. Re-mounted; trigger, 24h dedupe, and dismissal behavior certified by new e2e guards; verified live in a real browser.
2. **ForgerEMS ecosystem destination corrected** — the One FDS Ecosystem Maintenance domain linked to `/forged` (the CodeForge storefront) instead of `/projects/forgerems`. Fixed and verified live.
3. **Visual-certification harness repaired** — the site's global `scroll-behavior: smooth` defeated the capture harness's stepped scroll sweep, so scroll-reveal sections below the fold were captured as blank regions (the "huge empty regions" in prior automated screenshots). The harness now sweeps with instant scrolling, waits for every reveal target to actually reveal (failing the capture if any does not), and pre-seeds the support-dialog dismissal. Repaired-harness captures were exercised locally (26/26) and show every section rendered.

Also verified during R2: the live Kayla assistant works end-to-end (health, streaming chat through the deployed worker, hostile-CORS block, real browser Q&A round trip); the upstream OpenRouter free lane was returning HTTP 429 during verification, which the worker classifies and falls back from gracefully to the verified knowledge lane — visitors keep working answers, and the zero-cost model policy is unchanged.

**The freeze is back in force as of R4.2H-R2.** The same reopening conditions apply, unchanged.

