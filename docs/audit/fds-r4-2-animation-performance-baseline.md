# FDS Website R4.2 — Animation Performance Baseline Audit

**Starting Baseline Commit:** `bdfaa573d7c127ce2ff93465018826bed95d9244` (`FDS_WEBSITE_R4_1_HARDENED_LIVE_CERTIFIED`)  
**Timestamp:** 2026-09-13T04:32:22.681Z  
**Methodology:** Playwright Headless Chromium + Chrome DevTools Protocol (CDP) `Performance.getMetrics` & `PerformanceObserver`  
**Raw Data Artifact:** `docs/audit/r42-perf-raw-before.json`  

---

## 1. Executive Summary

Under R4.1, the website visual identity and functionality met all acceptance criteria, but visitors reported an overall feeling of rendering lag. Profiling against the untouched baseline commit `bdfaa573` confirmed that the lag stemmed from five specific runtime and compositor inefficiencies:
1. **Unthrottled `pointermove` handler:** Each mouse move directly modified CSS custom properties `--pointer-x` and `--pointer-y`, invalidating styles and forcing style recalculation (`recalc_s: 1.7695s` in a 2s window) and long tasks (`lt: 3`, max 65ms).
2. **Offscreen ecosystem animations:** The 8 planets, 4 orbit energy pulses, 3 core rings, and core vents continued running at full frame rate when scrolled completely offscreen (`120` RAFs in 3s, `recalc_s: 0.2076s`, 30 dropped frames proxy).
3. **Animated SVG filters:** The core reactor heart halo (`feGaussianBlur stdDeviation=7`) and moving orbit pulses (`filter: drop-shadow`) forced software/GPU filter re-evaluations during each animation frame.
4. **Constellation keyframe box-shadow:** Keyframe mutations on `box-shadow` forced paint operations rather than compositor-only transforms.
5. **No visibility suspension:** Animations ran unchecked when browser tabs were hidden or backgrounded.

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

## 3. Baseline Measurements (R4.1 Untouched Commit `bdfaa573`)

Data collected via CDP `Performance.getMetrics` and RAF timestamp delta distributions:

### S1: Homepage Idle (1440px Desktop, 3 seconds)
- **Active Web Animations:** 75
- **DOM Node Count:** 1,154
- **Script Duration:** 0.0115s
- **Layout Duration:** 0.0679s
- **Recalc Style Duration:** 0.0623s
- **Task Duration:** 0.3245s
- **RAF Callback Count:** 34
- **Frame Interval Mean:** 94.27ms (fps proxy: 10.6)
- **Dropped Frame Proxy (>33.3ms):** 31 / 32

### S2: Continuous Pointer Movement (1440px Desktop, ~2 seconds, 60 events)
- **Pointer Events Emitted:** 60
- **CSS Variable Updates:** 120 (2 updates per pointer event, 0% coalesced)
- **Script Duration:** 0.0084s
- **Recalc Style Duration:** 1.7695s
- **Total Task Duration:** 2.5538s
- **Long Tasks (>50ms):** 3 (Max Duration: 65.0ms)
- *Finding:* Unthrottled style updates triggered continuous full-viewport fixed background repaints.

### S3: Ecosystem Fully Visible (1440px Desktop, 3 seconds)
- **Active Web Animations:** 75
- **Ecosystem Paused Attribute:** `false`
- **Planets Animation State:** `running`
- **Orbit Pulses Animation State:** `running`
- **Core Rings Animation State:** `running`
- **Script Duration:** 0.0017s
- **Layout Duration:** 0.0578s
- **Recalc Style Duration:** 0.0727s
- **Total Task Duration:** 0.8326s
- **Frame Interval Mean:** 58.82ms (fps proxy: 17.0)
- **Dropped Frame Proxy (>33.3ms):** 47 / 51

### S4: Ecosystem Offscreen (Scrolled to Page Bottom, 3 seconds)
- **Ecosystem Paused Attribute:** `false` (no IntersectionObserver suspension)
- **Planets Animation State:** `running`
- **Core Rings Animation State:** `running`
- **Recalc Style Duration:** 0.2076s
- **Total Task Duration:** 0.7496s
- **RAF Callbacks:** 120
- **Frame Interval Mean:** 22.41ms (fps proxy: 44.6)
- **Dropped Frame Proxy (>33.3ms):** 30 / 119
- *Finding:* Complete solar system animation machinery executed unthrottled despite being 100% invisible.

### S5: Hidden / Background Tab (3 seconds)
- **Tab Background Paused Attribute (`data-bg-paused`):** `false`
- **Planet States while Hidden:** `running`
- *Finding:* Background tabs wasted CPU/battery maintaining full 60fps CSS animation state.

### S6: Reduced-Motion Mode (`prefers-reduced-motion: reduce`)
- **Active Animations:** 0
- **Planet Motion State:** static
- **Orbit Pulse State:** static
- **Core Ring State:** static
- **Total Task Duration:** 0.0003s
- *Finding:* CSS reduced-motion rule effectively suppressed CSS animations.

### S7: Mobile Viewport (390px × 844px, 3 seconds)
- **Active Animations:** 28
- **Desktop Scene Display:** `none`
- **Planet Motion States:** empty
- **Recalc Style Duration:** 0.0813s
- **Total Task Duration:** 0.4076s
- **Frame Interval Mean:** 24.23ms (fps proxy: 41.3)
- **Dropped Frame Proxy (>33.3ms):** 38 / 119

### S8: Kayla Copilot Open / Close Journey
- **Open Latency (including 250ms CSS transition):** 367ms
- **Close Latency:** 519ms
- **Long Tasks during Open/Close:** 2

---

## 4. Measurement Limitations
1. CDP `Performance.getMetrics` deltas reflect cumulative process-level rendering time and serve as relative proxies for CPU style/script work.
2. Frame intervals are derived from injected `requestAnimationFrame` timing loops rather than hardware VSYNC displays.
3. Headless Chromium may throttle certain rendering operations differently than physical GPUs; numbers are strictly compared against identical execution conditions in the "after" measurement run.
