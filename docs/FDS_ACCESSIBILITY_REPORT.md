# Forger Digital Solutions — Accessibility Compliance Report (WCAG 2.2 AA)

**Audit Date:** 2026-11-26  
**Tooling:** `@axe-core/playwright` (`wcag2a`, `wcag2aa` rulesets) across **20 rendered static routes** + automated Playwright keyboard & ARIA assertions

---

## 1. Audit Summary (Round 1 -> Round 2)

| Metric | Round 1 Scan | Round 2 Scan (Final) |
|---|---:|---:|
| Routes audited with axe-core | 20 | **20** |
| Critical violations | 0 | **0** |
| Serious violations | 12 | **0** |
| Moderate / Minor violations | 0 | **0** |
| **Total WCAG 2.2 A/AA violations** | **12** | **0** |

---

## 2. Specific Defects Remediated Between Round 1 & Round 2

1. **Color Contrast (WCAG 1.4.3 — 4.5:1 minimum for normal text):**
   - Raised `--accent-cinnabar` from `#E04338` to `#F26A5E` (~6.0:1 on `#101217`, ~5.6:1 on `#171A20`).
   - Raised `--accent-jaspilite` from `#DC2626` to `#F87171` (~6.5:1 on `#101217`, ~5.9:1 on `#171A20`).
   - Updated `/404.html` `.notfound-code` from `#2C64D8` to `var(--color-accent-bright)` (`#6FA0FF`, ~7.6:1 on `#08090C`).
2. **Non-Color Link Distinction in Prose (WCAG 1.4.1 — `link-in-text-block`):**
   - Added subtle persistent underlines (`text-decoration: underline; text-underline-offset: 0.2em; text-decoration-color: rgba(111, 160, 255, 0.58)`) on all inline links inside paragraphs, callouts, documentation bodies, and page descriptions while keeping button/navigation/card links visually clean.

---

## 3. Keyboard, Landmark, ARIA & Reduced-Motion Verification

- **Skip Navigation:** Every page renders `<a class="skip-link" href="#main-content">Skip to main content</a>` as the first focusable element.
- **Visible Focus Indicators:** Global `:focus-visible` rule renders a `2px solid #6FA0FF` outline with `3px` offset across links, buttons, tabs, inputs, and `<summary>` elements.
- **Document Semantics:** Single `<h1>` verified on all 20 audited routes (`h1Count: 1`), semantic `<header>`, `<nav aria-label>`, `<main id="main-content">`, `<footer>`, breadcrumb `<nav aria-label="Breadcrumb">`, and proper `<th scope="col|row">` headers on all data tables.
- **Interactive Widget ARIA Patterns:**
  - `Header.astro`: Desktop mega-menus and mobile menu expose `aria-expanded` and `aria-controls`; Escape closes open menus cleanly.
  - `EcosystemGraph.astro`: All 7 flagship node buttons support Tab focus, click/Enter activation, `aria-pressed`, and update an `aria-live="polite"` inspector panel, plus a full `<noscript>` fallback directory.
  - `JaspiliteWorkbench.astro`: Implements proper `role="tablist"`, `role="tab"` (`aria-selected`, `aria-controls`), and `role="tabpanel"` (`aria-labelledby`).
  - `docs/index.astro`: Live result count updates via `aria-live="polite"`; search input carries a screen-reader `<label class="sr-only">`.
  - `news/index.astro`: Category filter buttons expose `aria-pressed="true|false"`.
- **Reduced Motion (`prefers-reduced-motion: reduce`):** Decorative pulse/transition animations respect user reduced-motion preference with zero loss of readability or layout stability.
