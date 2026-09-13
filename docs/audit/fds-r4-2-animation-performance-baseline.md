# FDS Website R4.2 — Animation Performance Baseline Audit

**Starting Baseline Commit:** `bdfaa573d7c127ce2ff93465018826bed95d9244` (`FDS_WEBSITE_R4_1_HARDENED_LIVE_CERTIFIED`)  
**Audit Timestamp:** 2026-09-13T11:31:52Z  
**Methodology:** Playwright Headless Chromium + Chrome DevTools Protocol (CDP) `Performance.getMetrics` & `PerformanceObserver`  
**Execution Mode:** Serial execution (`--workers=1`), embedded in-process HTTP static file server (port 4323) serving `dist/`  
**Statistical Method:** 5 iterations per numerical scenario (reporting samples, median, mean, min, max; medians used for all primary metrics)  
**Raw Data Artifact:** `docs/audit/r42-perf-raw-before.json` (SHA-256: `853AC1893DCA62BB87924BF77FDF4C37A418F81696C09569B485970AF2DE19CC`)  
**Evidence Manifest:** `docs/audit/r42-performance-evidence-manifest.json`  

---

## 1. Executive Summary

Under R4.1 (`bdfaa573`), the website visual identity and core functionality met all acceptance criteria. However, targeted performance profiling against the untouched baseline commit revealed specific runtime rendering and lifecycle opportunities:
1. **Unthrottled `pointermove` handler:** Each pointer movement event synchronously updated CSS custom properties `--pointer-x` and `--pointer-y` on `<html>`, invalidating inline styles with zero frame-level coalescing (200 writes across 100 burst events; 2.0 writes per event).
2. **Offscreen ecosystem animations:** The 8 orbital planets, 4 orbit energy pulses, 3 core rings, and reactor vents continued animating when scrolled completely offscreen (`data-eco-paused` absent / `false`), consuming layout (0.0817s) and style recalculation (0.1557s) in background.
3. **Animated SVG filters:** The core reactor heart halo utilized an SVG `<filter>` (`<feGaussianBlur stdDeviation="7">`) and orbit pulses utilized CSS `filter: drop-shadow()`, requiring continuous software/GPU filter re-evaluations during each animation frame.
4. **Constellation keyframe mutations:** Keyframe animations mutated `box-shadow` dynamically, inducing paint invalidations.
5. **No visibility suspension:** Planetary and background animations continued running when the browser tab was hidden or backgrounded (`data-bg-paused` absent / `false`).

---

## 2. Animation & Motion Inventory

| Element / Class | Component | Mechanism | Properties Animated | Infinite? | Layer / Compositor Status | Offscreen Paused? (R4.1) |
|---|---|---|---|---|---|---|
| `.planet-motion` (×8) | `FDSEcosystem` | CSS Animation | `offset-distance` | Yes | `will-change: offset-distance` | ❌ No (`running`) |
| `.orbit-pulse` (×4) | `FDSEcosystem` | CSS Animation | `stroke-dashoffset` + `drop-shadow` filter | Yes | Filter boundary | ❌ No (`running`) |
| `.core__ring` (×3) | `FDSEcosystem` | CSS Animation | `transform: rotate()` | Yes | Compositor layer | ❌ No (`running`) |
| `.core__vents` | `FDSEcosystem` | CSS Animation | `transform: rotate()` + `drop-shadow` | Yes | Filter boundary | ❌ No (`running`) |
| `.core__heart-halo` | `FDSEcosystem` | CSS Animation | `transform: scale()` + `opacity` + `filter: url(#core-glow)` | Yes | Gaussian blur filter invalidation | ❌ No (`running`) |
| `.ecosystem-stars__calm` | `FDSEcosystem` | CSS Animation | `opacity` | Yes | Compositor layer | ❌ No (`running`) |
| `.constellation__node` (×14) | `CosmicBackdrop` | CSS Animation | `opacity`, `transform`, `box-shadow` | Yes | Repaint on shadow keyframe | ❌ No |
| `.system-node` (×6) | `SystemBackground` | CSS Animation | `opacity`, `transform: scale()` | Yes | Compositor layer | ❌ No |
| `body::before` | `BaseLayout` | Pointer Event Handler | `--pointer-x`, `--pointer-y` | Raw events | Global fixed repaint | N/A |

---

## 3. Reconciled Baseline Measurements (5-Iteration Medians)

Data collected via CDP `Performance.getMetrics` and injected `requestAnimationFrame` timing loops across 5 deterministic iterations:

### S1: Homepage Idle (1440px Desktop, 3 seconds)
- **Active Web Animations:** 75
- **DOM Node Count:** 1,154
- **Layout Duration (Median):** 0.0433s (samples: 0.0254s – 0.0721s)
- **Recalc Style Duration (Median):** 0.0428s (samples: 0.0407s – 0.0500s)
- **Task Duration (Median):** 0.3476s (samples: 0.2788s – 0.3892s)
- **RAF Frame Rate Proxy (Median):** 18.8 fps
- **Dropped Frames Proxy (>33.3ms, Median):** 52 frames

### S2: Pointer Burst Coalescing (1440px Desktop, 5 bursts × 20 events = 100 events)
- **Pointer Events Dispatched:** 100 events
- **CSS Variable Writes (`--pointer-x` / `--pointer-y`):** 200 writes (Median: 200)
- **Pointer Update Cycles:** 100 cycles (Median: 100)
- **Writes Per Pointer Event:** 2.0 writes/ev (0% coalesced)
- **Recalc Style Duration (Median):** 0.0666s
- **Task Duration (Median):** 0.1241s
- *Baseline Behavior:* Every dispatched pointermove synchronously updated CSS variables on `<html>` without frame throttling.

### S3: Ecosystem Fully Visible (1440px Desktop, 3 seconds)
- **Active Web Animations:** 75
- **Ecosystem Paused Attribute (`data-eco-paused`):** `false`
- **Planets Animation Play State:** `running`
- **Orbit Pulses Animation Play State:** `running`
- **Core Rings Animation Play State:** `running`
- **Layout Duration (Median):** 0.0439s
- **Recalc Style Duration (Median):** 0.0679s
- **Task Duration (Median):** 0.5442s
- **RAF Frame Rate Proxy (Median):** 28.5 fps
- **Dropped Frames Proxy (>33.3ms, Median):** 58 frames

### S4: Ecosystem Offscreen (Scrolled to Bottom of Page, 3 seconds)
- **Ecosystem Paused Attribute (`data-eco-paused`):** `false` (no IntersectionObserver suspension)
- **Planets Animation Play State:** `running`
- **Core Rings Animation Play State:** `running`
- **Layout Duration (Median):** 0.0817s
- **Recalc Style Duration (Median):** 0.1557s
- **Task Duration (Median):** 0.5496s
- **RAF Frame Rate Proxy (Median):** 60.0 fps
- **Dropped Frames Proxy (>33.3ms, Median):** 0 frames
- *Baseline Behavior:* Orbital CSS animations ran uninhibited while 100% offscreen outside the viewport.

### S5: Hidden / Background Tab State (3 seconds)
- **Tab Background Paused Attribute (`data-bg-paused`):** `false` (no Page Visibility handler)
- **Planets Animation Play State while Hidden:** `running`
- **Constellation Nodes Play State while Hidden:** `running`
- **Task Duration (Median):** 0.3156s
- *Baseline Behavior:* Browser continued running CSS animation timelines when the tab was hidden.
- *Methodology Note:* Visibility lifecycle behavior was verified through a deterministic simulated `document.hidden`/`visibilitychange` path. This verifies application pause logic but is not a physical browser-background CPU/battery benchmark.

### S6: Reduced-Motion Mode (`prefers-reduced-motion: reduce`, 3 seconds)
- **Active Web Animations:** 0 anims
- **Task Duration (Median):** 0.0002s
- *Baseline Behavior:* CSS `@media (prefers-reduced-motion: reduce)` successfully halted keyframe animations.

### S7: Mobile Viewport (390px × 844px, 3 seconds)
- **Orbital Scene Wrap Display:** `none`
- **Planet Animation Play State:** `running` (hidden via `display: none`, but play-state remained `running`)
- **Layout Duration (Median):** 0.0403s
- **Recalc Style Duration (Median):** 0.0763s
- **Task Duration (Median):** 0.3527s
- **RAF Frame Rate Proxy (Median):** 59.3 fps
- **Dropped Frames Proxy (>33.3ms, Median):** 1 frame

### S8: Kayla Copilot Open / Close Interaction Timing
- **Dialog Visible Raw Duration (Median):** 239ms (from launcher click to `#kayla-panel.kayla-panel--open` visibility)
- **Dialog Transition Settled Duration (Median):** 553ms (including 250ms CSS slide transition)
- **Dialog Close Settled Duration (Median):** 491ms (from close button click to hidden settlement)

---

## 4. Measurement Methodology & Limitations

1. **Cumulative Process-Level Metrics:** CDP `Performance.getMetrics` metrics (`LayoutDuration`, `RecalcStyleDuration`, `TaskDuration`) are cumulative process-level counters measured over fixed time windows. Deltas represent relative browser workload rather than absolute wall-clock CPU render times.
2. **Frame Interval Proxy:** Frame intervals and FPS proxies are derived from timestamps captured in an injected `requestAnimationFrame` tracking loop, not physical hardware VSYNC refresh rates.
3. **Headless Environment:** Headless Chromium may schedule timers, background tasks, and GPU rasterization differently than headed browsers on physical hardware. All candidate numbers are strictly compared against this identical baseline run on the same machine, Node version, Playwright version, and server mode.
