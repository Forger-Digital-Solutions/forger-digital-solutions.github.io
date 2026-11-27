# Forger Digital Solutions — Performance & Asset Efficiency Report

**Audit Date:** 2026-11-26  
**Build Target:** Astro 7 Static Site (`dist/`, 60 pages built in `3.06s`)

---

## 1. Measurement Boundary Disclosure

All runtime timings below were measured locally in headless Google Chrome (`1440×900`) against the built production `dist/` directory served over localhost. **These are local synthetic lab measurements, NOT real-user field Core Web Vitals (CrUX / RUM).** Real-user performance depends on visitor network latency, GitHub Pages CDN caching, and client device hardware.

---

## 2. Synthetic Homepage Load Measurements (Local Production `dist/`)

| Metric | Measured Value (Synthetic Local) | Notes |
|---|---:|---|
| `DOMContentLoaded` | `233 ms` | Static HTML + bundled CSS |
| `loadEventEnd` | `256 ms` | Includes critical fonts & hero image |
| First Contentful Paint (FCP) | `388 ms` | Self-hosted Fontsource fonts; zero external font round-trips |
| Largest Contentful Paint (LCP) | `388 ms` | `hero-manifold.webp` pre-prioritized via `loading="eager"` + `fetchpriority="high"` |
| Total Network Requests (Initial Load) | `15` | Zero third-party ad/analytics scripts |
| Total Homepage Transfer (uncompressed local HTTP) | `1,599 KB` | Over GitHub Pages Brotli/gzip compression, text & font payloads drop substantially |

---

## 3. Production Asset & Bundle Breakdown (`dist/`)

- **Total built static site (`dist/` across 60 pages + legacy media + ZIP archive):** `12 MB`
- **Global & Homepage CSS (uncompressed):**
  - `BaseLayout.*.css`: `42 KB`
  - `index.*.css`: `22 KB`
- **Client JavaScript:** Zero heavy SPA framework runtime (no React/Vue/Next hydration payload on content pages). Interactive islands (`Header`, `EcosystemGraph`, `JaspiliteWorkbench`, `Docs` search, `News` filter) use lightweight vanilla TypeScript; `KaylaCopilot` script bundle is `66 KB` uncompressed.
- **Self-Hosted Webfonts:** `Inter Variable`, `Space Grotesk Variable`, `JetBrains Mono Variable`, and `Instrument Serif` served directly from `_astro/` — eliminating external DNS lookups, TLS handshakes, and layout jitter from third-party CDNs.

---

## 4. Optimized Image Pipeline (`public/images/forge/`)

All 6 custom marketing/concept visuals ship as dual-resolution WebP (`1600w` desktop + `800w` mobile via `<picture><source media="(max-width: 760px)">`) with explicit `width`/`height` attributes to prevent Cumulative Layout Shift (CLS):

| Asset | Desktop (`1600w`) | Mobile (`800w`) | Loading Strategy |
|---|---:|---:|---|
| `hero-manifold.webp` | `154 KB` | `52 KB` | `eager` + `fetchpriority="high"` |
| `alexandrite-architecture.webp` | `101 KB` | `30 KB` | `lazy` on home, `eager` on Alexandrite page |
| `hackmanite-gamedev.webp` | `150 KB` | `47 KB` | `lazy` on home, `eager` on Hackmanite page |
| `cinnabar-animation.webp` | `221 KB` | `79 KB` | `lazy` on home, `eager` on Cinnabar page |
| `battleverse-combat-sim.webp` | `140 KB` | `47 KB` | `lazy` on home, `eager` on BattleVerse page |
| `state-lines-concept.webp` | `95 KB` | `36 KB` | `lazy` on home, `eager` on State Lines page |
| **Total (`12` files)** | **`861 KB`** | **`291 KB`** | **Combined `1.2 MB`** |
