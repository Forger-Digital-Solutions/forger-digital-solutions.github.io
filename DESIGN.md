# DESIGN.md — Forger Digital Solutions Permanent Website Design Governance

> **Authority:** Permanent design-system specification for `forgerdigitalsolutions.com`. Every human contributor and coding agent modifying this repository MUST read and obey this file before authoring or revising any page, component, or stylesheet.
> **Last verified:** 2026-11-26 (Operation Digital Forge)

---

## 1. Purpose & Governance Model

Inspired by Vercel's `design.md` discipline, this file prevents visual drift across agent sessions. FDS pages must look like they were crafted by a single disciplined research-and-engineering studio — never like independent one-off marketing experiments.

This specification operates as a three-part system:
1. **`DESIGN.md` (this file):** Observable design judgment, composition rules, named anti-patterns, and reader-task framing.
2. **Global Token & Primitive Stylesheet (`src/styles/global.css`):** The single bounded vocabulary of CSS custom properties, typography scales, surface elevation tiers, button primitives, ledgers, and mineral accent tokens. Agents must compose from these primitives rather than inventing ad-hoc palettes, border radii, or spacing scales.
3. **Deterministic Verification (`npm run validate`, `npm test`, `npm run test:e2e`):** Automated checks covering contrast, horizontal overflow, route integrity, content schema compliance, private-path leakage, and WCAG 2.2 AA accessibility.

---

## 2. Visual Identity Thesis: Scientific-Industrial Obsidian

Forger Digital Solutions is an independent AI research laboratory, specialized model developer, autonomous software engineering company, and original entertainment studio.

Our visual language combines:
- **Architectural restraint** (Linear, Vercel, Anthropic): razor-crisp hairline rules, disciplined dark luminance steps, generous negative space, and full-width data tables where evidence belongs.
- **Scientific credibility** (Google DeepMind, OpenAI, Ai2, Hugging Face): structured model cards, explicit provenance metadata, transparent lifecycle stages, and readable evaluation tables.
- **Physical mineral materiality** (FDS's own signature): matte obsidian/graphite surfaces paired with selective optical mineral accents (`Alexandrite`, `Hackmanite`, `Cinnabar`, `Jaspilite`, `Forge BattleVerse`, `Project Forge`, `State Lines`) that appear strictly inside their dedicated technology context — never as a rainbow of glowing homepage cards.

---

## 3. Canonical Color Tokens (`src/styles/global.css`)

### 3.1 Core Architectural Palette (Company-Wide)

| Token | Hex / Value | Role | Minimum Contrast on Primary Bg |
| :--- | :--- | :--- | :--- |
| `--color-bg` | `#08090C` | Primary page canvas (obsidian void) | — |
| `--color-bg-secondary` | `#101217` | Alternating editorial band surface | — |
| `--color-surface` | `#171A20` | Elevated panels, menus, interactive wells | — |
| `--color-surface-hover` | `#1E222B` | Hover elevation state | — |
| `--color-recessed` | `#050608` | Code blocks, SHA-256 wells, terminal strips | — |
| `--color-text` | `#F4F5F7` | Primary headings & emphasized copy | **18.2:1** (AAA) |
| `--color-text-muted` | `#A7AFBC` | Body copy, descriptions, table cells | **9.1:1** (AAA) |
| `--color-text-subtle` | `#838C9E` | Eyebrows, metadata labels, captions | **5.7:1** (AA) |
| `--color-border` | `#20242E` | Subtle hairline dividers | — |
| `--color-border-structural` | `#292E38` | Structural frames, tables, cards | — |
| `--color-border-strong` | `#3A4252` | Active/focused interactive borders | — |
| `--color-brand-silver` | `#D4DAE4` | FDS metallic brand accent | 14.3:1 |
| `--color-brand-cobalt` | `#3B7BF8` | Heritage FDS cobalt (links, primary focus, logo continuity) | 5.2:1 |
| `--color-brand-cobalt-bright` | `#6FA0FF` | High-contrast text links on dark surfaces | 7.6:1 |

> **Observable Rule — Text Contrast:** Never place text below `#838C9E` (`--color-text-subtle`) on `#08090C` or `#101217`, and never place text below `#9CA5B5` on `#171A20`. Every interactive label must meet WCAG 2.2 AA (`>= 4.5:1` for normal text, `>= 3.0:1` for large text / UI components).

### 3.2 Selective Flagship Mineral Accents

Accents are **strictly scoped** via `data-accent="..."` or CSS custom property `--accent` inside a flagship's own hero, status badge, hairline rule, diagram node, or specimen frame. **Never apply more than one mineral accent to a single card or cover the homepage in saturated colored backgrounds.**

| Flagship | Primary Accent | Secondary / Shift Tone | Soft Tint Surface |
| :--- | :--- | :--- | :--- |
| **Alexandrite** | `#10B981` (Emerald) | `#8B5CF6` (Violet) / `#9F1239` (Deep Pleochroic Plum) | `rgba(16, 185, 129, 0.08)` |
| **Hackmanite** | `#A855F7` (Ultraviolet) | `#EC4899` (Tenebrescent Magenta) / `#60A5FA` (Cobalt) | `rgba(168, 85, 247, 0.08)` |
| **Cinnabar** | `#F26A5E` (Vermilion — WCAG AA text-safe) | `#E0824F` (Copper) / `#F97316` (Ember) | `rgba(224, 67, 56, 0.08)` |
| **Jaspilite** | `#F87171` (Banded Crimson — WCAG AA text-safe) | `#CBD5E1` (Brushed Silver) / `#090A0D` (Hematite Black) | `rgba(220, 38, 38, 0.08)` |
| **Forge BattleVerse** | `#3B82F6` (Electric Cobalt) | `#818CF8` (Spectral Indigo) | `rgba(59, 130, 246, 0.08)` |
| **Project Forge** | `#E59F2A` (Molten Amber) | `#F2C94C` (Burnished Gold) / `#525A69` (Graphite) | `rgba(229, 159, 42, 0.08)` |
| **State Lines** | `#C5A059` (Aged Gold) | `#9E8248` (Tarnished Brass) / `#141311` (Charcoal) | `rgba(197, 160, 89, 0.08)` |

### 3.3 Semantic Status Colors (Consistent Site-Wide)

| Status Key | Display Label | Indicator Color | Meaning |
| :--- | :--- | :--- | :--- |
| `public-release` | Public Release | `#34D399` | Verified public software (note if downloads paused) |
| `public-preview` | Public Preview | `#60A5FA` | Downloadable prerelease software (e.g., ForgerEMS) |
| `active-development` | Active Development | `#F59E0B` | Actively engineered software without public release |
| `research-program` | Active Research | `#A78BFA` | Ongoing research/model development; no public endpoint |
| `research-vision` | Research Vision | `#2DD4BF` | Long-term architectural convergence program |
| `private-development` | Private Development | `#94A3B8` | Private studio production (no public build) |
| `planned` | Planned | `#9CA3AF` | Defined model/feature target; training not complete |

---

## 4. Typography System

All fonts are **100% self-hosted via `@fontsource`** (OFL/MIT licensed, zero third-party font CDN requests, zero visitor tracking).

| Role | Font Family | Variable | Weights | Tracking & Leading |
| :--- | :--- | :--- | :--- | :--- |
| **Display / Headlines** | `'Space Grotesk Variable'` | `--font-display` | 500, 600, 700 | `-0.035em` to `-0.045em`; line-height `0.98–1.08` |
| **Interface / Body** | `'Inter Variable'` | `--font-sans` | 400, 500, 600, 700 | `0` to `-0.01em`; line-height `1.62–1.72` |
| **Editorial Cinematic Accent** | `'Instrument Serif'` | `--font-serif` | 400 (roman & italic) | `-0.01em`; used selectively on **State Lines**, **Cinnabar**, and pull-quotes |
| **Technical Metadata / Code** | `'JetBrains Mono Variable'` | `--font-mono` | 400, 500, 600 | `+0.04em` to `+0.12em` uppercase labels; **use sparingly** (IDs, SHA-256, versions, table tags — never body prose) |

### Type Scale
- **Hero Display (`h1.hero-title`):** `clamp(2.65rem, 5.4vw, 4.75rem)` · weight `600` · tracking `-0.04em` · `text-wrap: balance`
- **Page Title (`h1.page-title`):** `clamp(2.25rem, 4.6vw, 3.75rem)` · weight `600` · tracking `-0.038em`
- **Section Heading (`h2`):** `clamp(1.65rem, 3vw, 2.35rem)` · weight `600` · tracking `-0.03em`
- **Subheading (`h3`):** `clamp(1.12rem, 1.8vw, 1.32rem)` · weight `600` · tracking `-0.02em`
- **Body Lead:** `clamp(1.02rem, 1.4vw, 1.18rem)` · line-height `1.68` · max-width `42rem`
- **Body Standard:** `0.96rem–1.0rem` · line-height `1.7` · max-width `44rem` (`65–75ch`)
- **Micro Label / Eyebrow:** `0.72rem` mono/uppercase · letter-spacing `0.12em`

---

## 5. Layout, Rhythm & Structural Primitives

- **Max Content Measure:** `--content-width: 76rem` (`1216px`), `--content-wide: 88rem` (`1408px`).
- **Reading Column:** Long-form editorial prose capped at `46rem`; evidence tables, model matrices, and architecture diagrams expand to the full available container width (`100%`).
- **Vertical Section Rhythm:**
  - Standard section: `--section-space: clamp(4rem, 7vw, 6.25rem)`
  - Compact / closing band: `--section-space-tight: clamp(2.5rem, 4.5vw, 3.75rem)`
  - Alternating tonal surfaces (`#08090C` ↔ `#101217`) separated by `1px solid var(--color-border)` hairlines — never drop shadows stacked over drop shadows.
- **Border Radius Discipline:**
  - Crisp, restrained industrial geometry: `--radius-xs: 4px`, `--radius-sm: 6px`, `--radius-md: 10px`, `--radius-lg: 14px`. Never use bubbly `24px+` SaaS cards.
- **Varied Editorial Compositions (No Monotonous Grids):**
  - Use **split editorial heroes** (copy + specimen photography/diagram).
  - Use **architectural ledgers** (hairline horizontal rows with index numbers, titles, metadata, and actions) for model lists, newsroom updates, and release tables.
  - Use **asymmetric 58/42 showcases** for flagship applications (Jaspilite, BattleVerse).
  - Use **full-bleed widescreen cinematic frames** for original entertainment (State Lines).
  - Use **full-width specification & evaluation tables** with clean mobile stacked fallbacks (`data-label`).

---

## 6. Named Anti-Patterns (Strictly Forbidden)

Every future agent MUST recognize and reject these recurring generated-design clichés:

1. **The Biscuit Eyebrow Pill:** Never put a rounded pill badge with a pulsing green/blue dot above the main `<h1>` headline. Use a crisp typographic eyebrow with hairline separator.
2. **Gradient-Filled Headline Keywords:** Never apply `background-clip: text` rainbow or blue-purple gradients to `<h1>` or `<h2>` headlines. Headlines are crisp `#F4F5F7` (or `#C5A059` / serif accent only in cinematic contexts).
3. **Wallpaper Grid & Particle Meshes:** Never overlay repeating CSS gridlines, starry constellations, or floating canvas particle webs across the background of pages.
4. **The 3-Card Bento Repetition Trap:** Never compose an entire page out of `centered headline -> 3 identical rounded cards -> centered headline -> 3 identical rounded cards`. Vary layout grammar intentionally per section.
5. **Over-Nested Cards:** Never place rounded cards inside rounded cards inside rounded cards (max nesting depth = 1 framed container; use hairline borders inside).
6. **Neon Colored Border Outlines:** Never ring cards with glowing saturated cyan/purple/pink borders or `box-shadow: 0 0 24px` halos.
7. **Fabricated Metrics & Decorative Dashboards:** Never invent fake counters (`99.99% uptime`, `10M+ tokens`, fake benchmark bars, fake interactive "Try Model" playgrounds, or fake UI screenshots).
8. **AI Cliché Imagery:** Never use glowing brains, humanoid chrome robots, glowing stock circuit boards, or unlicensed anime/game screenshots.
9. **Scroll Hijacking & Hidden Content:** Never block native scrolling, never force scroll-jacking, and never leave sections invisible (`opacity: 0`) if `IntersectionObserver` does not fire or under `prefers-reduced-motion: reduce`.

---

## 7. Motion & Interaction Standards

- **Duration:** Micro-interactions `160ms–220ms cubic-bezier(0.2, 0.8, 0.2, 1)`. Section entrances (when enabled) `500ms`.
- **Compositor-Only:** Animate only `opacity` and `transform`. Never animate `box-shadow`, `width`, `height`, or `backdrop-filter`.
- **Viewport Pausing & Reduced Motion:** Every non-essential animation MUST honor `@media (prefers-reduced-motion: reduce)` and pause when hidden (`document.hidden` / off-viewport).
- **Accessible Controls:** Every dropdown, mega-menu, mode tab (`Auto | Meld | Solo`), and interactive diagram node MUST operate via keyboard (`Tab`, `Enter`, `Space`, `Escape`, arrow keys) with visible `2px solid var(--color-brand-cobalt-bright)` focus rings (`outline-offset: 3px`).

---

## 8. Observable Pre-Ship Checklist for Agents

Before committing any page update, verify:
- [ ] Exactly one `<h1>` per page with clean `h1 -> h2 -> h3` hierarchy.
- [ ] Zero horizontal overflow at `360px`, `390px`, `768px`, `1024px`, `1280px`, `1440px`, `1920px`, `2560px`.
- [ ] All status badges and claims pulled from `content/` or `src/data/registry.ts` (never hardcoded contradicting strings).
- [ ] Every original concept image explicitly labeled (`Concept Art`, `Architectural Study`, `Conceptual Specimen`, `Public Preview Screenshot`, etc.).
- [ ] Full-width evidence tables expand cleanly on desktop and collapse cleanly on mobile (`< 768px`).
- [ ] `npm run validate && npm test && npm run test:e2e` pass with 0 broken links, 0 secret/private-path leaks, and 0 critical/serious axe-core WCAG 2.2 AA violations.
