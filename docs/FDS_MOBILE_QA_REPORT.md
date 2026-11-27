# Forger Digital Solutions — Mobile & Responsive QA Report

**Audit Date:** 2026-11-26  
**Target Viewports Verified:** `360×800` (compact Android), `390×844` (iPhone standard), `768×1024` (tablet portrait), `1024×768` (tablet landscape)

---

## 1. Mobile Layout & Overflow Results

Every audited page (all 20 representative routes including homepage, all 7 flagships, model cards, evaluations, trust, developers, docs, downloads, news, company, contact, legacy Forge Control, and 404) was rendered at `390×844` and `360×800` (homepage):

- **Horizontal overflow (`scrollWidth - clientWidth`):** **`0px`** across all 20 routes at `390×844` and across `360×800`, `768×1024`, and `1024×768`.
- **Responsive asset delivery:** All `<SpecimenMedia>` and hero `<picture>` elements serve mobile-optimized `800w` `*-sm.webp` assets (`30–79 KB`) under `(max-width: 760px)` rather than full `1600w` desktop textures.
- **Data tables (`.fds-table-wrap`):** Model card specs, evaluation registers, release SHA-256 ledgers, and public status tables wrap inside horizontally scrollable bordered containers so wide hashes and version strings never break mobile page width.
- **Bottom-right Kayla Copilot clearance:** Footer bottom padding reserves vertical clearance (`padding-bottom: 4rem` under `700px`) so legal links and colophon are never obscured by the circular Kayla launcher button.

---

## 2. Mobile Navigation Drawer Fix & Verification

During Round 1 screenshot review (`after-home-390x844-menu-open.png`), opening the mobile drawer revealed that `.site-header`'s `backdrop-filter` created a containing block that clipped `#site-navigation` to the sticky header's `67px` height.

**Fix verified in Round 2:**
- Moved `backdrop-filter: blur(18px) saturate(125%)` to `.site-header::before` pseudo-element.
- Set `height: calc(100dvh - var(--header-height)); z-index: 200;` on mobile `.nav-links`.
- Re-captured `after-home-390x844-menu-open.png` and confirmed:
  - `.mobile-menu-btn` toggles `aria-expanded="true"` / `"false"` accurately and animates hamburger to close icon.
  - All 6 institutional accordion sections (`Models`, `Products`, `Research`, `Developers`, `Studio`, `Company`), GitHub icon link, and `Releases` CTA render cleanly inside the obsidian full-height drawer with comfortable tap targets (`>= 44px`).

---

## 3. Touch Targets, Typography & Interactive Controls on Small Screens

- **Fluid display typography:** `<h1>` scales down gracefully from `64.8px` (`1920px`) to `37.6px` (`360px`–`768px`) with legible `16px` base prose and zero cramped wrapping.
- **Interactive components on mobile:**
  - `EcosystemGraph`: stacks cleanly into single-column node list + live inspector below.
  - `JaspiliteWorkbench`: `Auto | Meld | Solo` tablist stays accessible with full-width stacked spec rows.
  - `Docs`: sticky TOC collapses cleanly above searchable documentation cards; search input fills width comfortably.
  - `Downloads`: SHA-256 strings wrap safely via `word-break: break-all` alongside accessible `Copy` buttons.
