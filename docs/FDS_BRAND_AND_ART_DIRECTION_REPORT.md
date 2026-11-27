# FDS Brand & Art Direction Report — Operation Digital Forge II

> **Organization:** Forger Digital Solutions (FDS)
> **Date:** 2026-11-26
> **Governing Specs:** [`DESIGN.md`](../DESIGN.md) · [`BRAND_GUIDELINES.md`](../BRAND_GUIDELINES.md)
> **Scope:** Visual identity evolution from research showcase (Operation Digital Forge I) to commercial AI technology & original entertainment company (Operation Digital Forge II).

---

## 1. Creative Thesis: Scientific-Industrial Obsidian with Commercial Clarity

Operation Digital Forge II retains and strengthens FDS's **Scientific-Industrial Obsidian** design language (`#08090C` primary canvas, `#101217` alternating editorial surface, `#171A20` elevated structural panels, `#F4F5F7` primary ink at `18.2:1` AAA contrast) while elevating its editorial rhythm to serve commercial buyers, studio technical directors, software teams, and entertainment partners alongside researchers.

Core visual commitments preserved and enforced across all 69 built pages:
- **Zero visual drift:** Every newly added page (`/solutions/*`, `/products/battleverse/arena/`, `/products/battleverse/creator-studio/`, upgraded `/contact/`, `/developers/`, `/models/*`) composes exclusively from `src/styles/global.css` tokens and primitives.
- **Selective optical mineral accents:** Each flagship accent (`Alexandrite` emerald/violet, `Hackmanite` ultraviolet, `Cinnabar` vermilion, `Jaspilite` banded crimson, `BattleVerse` electric cobalt, `Project Forge` molten amber, `State Lines` aged gold) appears only inside its dedicated flagship context—never as rainbow card borders across the homepage.
- **Anti-pattern discipline:** Zero pulsing biscuit pills above `<h1>`, zero gradient-clipped headlines, zero neon outer glow halos, zero repeating wallpaper meshes, zero invented dashboards or fake testimonials.
- **Self-hosted typography:** `Space Grotesk Variable`, `Inter Variable`, `Instrument Serif`, and `JetBrains Mono Variable` bundled via `@fontsource` (zero external font CDNs or tracking).

---

## 2. Mineral Identity System (Abstract Materiality, Never Literal Rocks)

Mineral names inspire **color science, refraction logic, structural banding, and geometric motifs**—never stock photography of rocks or gemstones:

| Flagship | Visual Domain Communicated | Primary Accent | Structural Application |
| :--- | :--- | :--- | :--- |
| **Alexandrite** | Converging multi-specialist computational topology | `#10B981` ↔ `#8B5CF6` | 7-stage convergence diagram, emerald-to-violet hairlines |
| **Hackmanite** | Real-time 3D game-engine shaders, physics, rigs & UV topology | `#BE7EFF` | 10-role gaming workforce explorer, game-dev pipeline study |
| **Cinnabar** | Manga g-pen storyboards, cel-shaded key visuals & continuity craft | `#F26A5E` | 17-domain R&D taxonomy, 8-role creative workforce explorer |
| **Jaspilite** | Banded multi-agent software engineering orchestration | `#F87171` | `Auto / Meld / Solo` switcher, 5-tier provider maturity ladder |
| **Forge BattleVerse** | Ballistic analysis, canonical graphs & creative production | `#3B82F6` | Arena illustrative simulator (original silhouettes) + Creator Studio |
| **Project Forge** | Structured 15-division research & evaluation pipelines | `#E59F2A` | Interactive SVG knowledge graph & 8-stage provenance pipeline |
| **State Lines** | Tri-state NY/NJ/PA nocturnal industrial cinema | `#C5A059` | Instrument Serif headline & widescreen 21:9 concept frame |

---

## 3. Operation Digital Forge II Visual Asset Inventory (10 Dual-Width WebP Pairs)

All commissioned assets are stored in `public/images/forge/` with desktop (`1600px` wide) and mobile (`800px` wide `-sm.webp`) variants served via responsive `<picture>` / `srcset` inside `SpecimenMedia.astro`, each carrying mandatory provenance captions:

### Operation Digital Forge I Retained Assets (6 Pairs)
1. `hero-manifold.webp` / `-sm.webp` — Homepage hero computational architecture visualization.
2. `alexandrite-architecture.webp` / `-sm.webp` — Collective intelligence convergence concept diagram.
3. `hackmanite-gamedev.webp` / `-sm.webp` — Isometric 3D game-engine split pipeline study.
4. `cinnabar-animation.webp` / `-sm.webp` — Original manga roughs to cel-shaded rooftop anime key visual study.
5. `battleverse-combat-sim.webp` / `-sm.webp` — Original armored silhouettes with cobalt ballistic probability envelopes.
6. `state-lines-concept.webp` / `-sm.webp` — Tri-state industrial riverfront cantilever bridge concept painting (`Concept Art — Work in Progress (Not Gameplay)`).

### Operation Digital Forge II Newly Commissioned Assets (4 Pairs)
| Asset Base | Desktop Size | Mobile `-sm` Size | Page Placement | Mandatory Caption Label | Visual QA Review |
| :--- | :---: | :---: | :--- | :--- | :--- |
| `solutions-studio-workforce.webp` | `103 KB` | `37 KB` | `/solutions/` & Homepage Solutions band | *Studio Workforce Architectural Concept* | Clean obsidian architectural craft; zero text artifacts, zero third-party IP |
| `jaspilite-orchestration.webp` | `43 KB` | `20 KB` | `/products/jaspilite/` | *Orchestration Architecture Concept — Not a Live Screenshot* | Crisp obsidian/crimson/silver topology; explicitly separated from unverified desktop builds |
| `battleverse-creator-studio.webp` | `204 KB` | `81 KB` | `/products/battleverse/creator-studio/` & `/products/battleverse/` | *Creator Studio Concept Study — Not Software Output* | Original silhouette storyboards & turnaround framing; zero copyrighted franchise IP |
| `project-forge-lab.webp` | `101 KB` | `42 KB` | `/research/project-forge/` | *Research Infrastructure Concept Visualization* | Molten-amber & graphite data-gate architectural corridors; zero stock-lab clichés |

---

## 4. Bespoke Interactive Visual Primitives Added in ODF II

To avoid monotonous card grids while communicating complex commercial architectures clearly, Operation Digital Forge II introduces four zero-dependency interactive Astro components:
1. **`AlexandriteArchitecture.astro`:** Keyboard-accessible 7-stage convergence explorer paired with a full-width *Runtime Orchestration vs. Trained Collective Model* comparison table.
2. **`SpecialistWorkforceExplorer.astro`:** Tabbed inspector used on `/models/hackmanite/` (10 game-development roles) and `/models/cinnabar/` (8 anime/manga/animation roles), clarifying that specialist roles are operational workforce configurations rather than claiming separate foundation models per role.
3. **`BattleVerseArenaDemo.astro`:** Interactive comparison workbench using original FDS silhouettes (`Aegis`, `Vesper`, `Kestrel`) that visually separates **Canonical Citations**, **Physics/Modeling Assumptions**, **Statistical Probability Bands**, and **Explicit Uncertainty Ranges**—with clear disclosure that it is an illustrative static showcase, not a live backend physics solver.
4. **`CommercialInquiryBuilder.astro`:** Zero-deception static inquiry composer on `/contact/` reading `?track=` URL parameters (`gaming-studio`, `anime-studio`, `developer`, `enterprise`, `research`, `entertainment`, `general`) to build structured `mailto:forgerdigisolsupport@gmail.com` drafts and one-click clipboard briefs without pretending to submit to a live CRM backend.

---

## 5. Preserved Verified Product Photography & Heritage Assets

- `/images/brand/fds-logo.png` — Official FDS cobalt & silver emblem preserved in header/footer.
- `/images/brand/edward-schmidt.png` — Founder portrait preserved on `/about` & `/company/`.
- `/images/codeforge/codeforge-workspace-v0-2.png` — Verified CodeForge v0.2.0 screenshot (redacted local paths).
- `/images/forgerems/forgerems-preview-poster.jpg` — Verified ForgerEMS public preview interface poster.
- `/images/og/fds-default.jpg` — Verified Open Graph share card.
