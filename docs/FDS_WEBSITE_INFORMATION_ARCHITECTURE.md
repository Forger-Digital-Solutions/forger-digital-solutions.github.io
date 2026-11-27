# Forger Digital Solutions — Website Information Architecture

**Operation:** Digital Forge  
**Last Updated:** 2026-11-26  
**Status:** Verified against 60 static Astro routes built in `dist/` (5,901 internal links, 0 broken)

---

## 1. Strategic Architecture Model

The Forger Digital Solutions public website is structured around **four interconnected studio divisions** surfaced through **six top-level navigation pillars**, preserving all legacy public routes and verified software distribution flows without breaking inbound links.

| Division | Flagship Technologies | Primary Hub |
|---|---|---|
| **FDS Intelligence** | Alexandrite, Hackmanite (Prime & Reasoning), Cinnabar (Oracle v1–v4.1) | `/models/` |
| **FDS Applications** | Jaspilite (`Auto` / `Meld` / `Solo`), Forge BattleVerse (+ preserved ForgerEMS & CodeForge) | `/products/` |
| **FDS Research** | Project Forge (15 divisions, 8-stage lifecycle) | `/research/` |
| **FDS Original Productions** | State Lines (+ preserved Dead Trails West) | `/studio/` |

---

## 2. Primary Navigation (6 Institutional Pillars)

Defined in `src/components/Header.astro`. Top-level navigation stays strictly bounded to six clean institutional domains with keyboard- and click-accessible mega-menus on desktop and an accordion drawer on mobile (`#site-navigation`, `.mobile-menu-btn`). Support links are intentionally kept secondary inside Company/Footer and never occupy a top-level CTA slot.

1. **Models (`/models/`)**
   - `/models/alexandrite/` — Collective intelligence flagship vision
   - `/models/hackmanite/` — Universal gaming & game-dev AI family
     - `/models/hackmanite/prime/` — Planned `Qwen/Qwen3.8-27B` coding & implementation target
     - `/models/hackmanite/reasoning/` — Planned `openai/gpt-oss-120b` architecture & debugging target
   - `/models/cinnabar/` — Anime, manga, animation craft & fictional intelligence family
     - `/models/cinnabar/oracle/` — Documented Oracle text lineages (`v1`–`v4.1`)
   - `/model-cards/` — Unified structured Model Card repository
   - `/evaluations/` — Benchmarks, raw vs. guarded policy & public evaluation register
2. **Products (`/products/`)**
   - `/products/jaspilite/` — Autonomous AI development platform (`Auto`, `Meld`, `Solo`)
   - `/products/battleverse/` — Standalone fictional intelligence & probabilistic combat simulation
   - `/downloads/` — Unified verified downloads center (ForgerEMS preview + CodeForge archive)
   - `/projects` — Extended portfolio directory (CodeForge, ForgerEMS, legacy Forge Control, Dead Trails West, Kayla AI Publisher, We The People Library, FarmStand Finder)
3. **Research (`/research/`)**
   - `/research/project-forge/` — Permanent 15-division foundation & 8-stage lifecycle
   - `/research/gaming/` — Universal gaming & engine research track
   - `/research/animation/` — Anime, manga & animation craft track
   - `/research/artificial-intelligence/` — Specialist AI & distillation research track
   - `/research/training/` — Training methodology, data eligibility & controlled runs
   - `/research/laboratory/` — Engineering experiments & executable verification harnesses
   - `/research/publications/` — Approved public research write-ups & field notes
   - `/trust/` — Public Trust & Transparency Center (12 governance pillars)
4. **Developers (`/developers/`)**
   - `/docs/` — Searchable Technical Documentation Hub
   - `/model-cards/` — Open-weight provenance & limitations
   - `/releases/` — Chronological Release Index with SHA-256 ledger
   - `/changelog/` — Website & platform revision log
   - `/technology` — Preserved technology architecture matrix
5. **Studio (`/studio/`)**
   - `/studio/state-lines/` — Prestige cinematic State Lines dossier (Preproduction)
   - `/studio/productions/` — Original Productions slate (State Lines & Dead Trails West)
6. **Company (`/company/`)**
   - `/about` — Founder (Edward Schmidt), studio philosophy & background
   - `/news/` — Public Newsroom with category filtering + Field Notes
   - `/trust/` — Governance & non-conflation axioms
   - `/contact/` — Verified email, Discord, GitHub, YouTube, LinkedIn & hardware donations
   - `/support` & `/support/hardware` — Development & hardware support disclosures

---

## 3. Preserved Legacy & Operational Routes

Every pre-existing public route remains live and functional to protect bookmarks, search equity, Kayla canonical links, and release verification:

- `/forged` — Forged software distribution & SHA-256 verified ZIP archive shelf (`CodeForge-source-6b0770b.zip`)
- `/forgerems/` & `/projects/forgerems` — ForgerEMS `v1.2.4-preview.1` download links, SHA-256 checksums, video facade
- `/projects/codeforge`, `/codeforge/sign-in`, `/codeforge/upgrade` — Paused installer policy & fail-closed commercial guardrails (`noindex, nofollow`)
- `/projects/forge-control` — Preserved with an explicit migration banner redirecting attention to `/products/jaspilite/`
- `/projects/dead-trails-west`, `/projects/kayla-ai-publisher`, `/projects/we-the-people`, `/projects/farmstand-finder`
- `/notes` & `/notes/*` — Engineering Field Notes journal
- `/lab`, `/faq`, `/privacy`, `/terms`, `/community-impact`, `/404.html`

---

## 4. Non-Conflation Structural Boundaries

- **Alexandrite vs. Specialist Models:** Alexandrite is positioned as a long-term research vision (not trained); Hackmanite and Cinnabar stand on their own specialist lineages.
- **Cinnabar vs. Forge BattleVerse:** Cinnabar lives under `/models/cinnabar/` (AI model family); BattleVerse lives under `/products/battleverse/` (standalone application designed to integrate with Cinnabar Oracle).
- **Jaspilite vs. Forge Control:** Jaspilite (`/products/jaspilite/`) is the active flagship brand with owner-approved `Auto`, `Meld`, and `Solo` modes; `/projects/forge-control` is preserved solely as a migration reference.
- **Project Forge vs. Models:** Project Forge (`/research/project-forge/`) is shared research infrastructure, never advertised as a public inference model.
- **Support vs. Products:** Development support (`/support`) and hardware donations (`/support/hardware`) stay visually and navigationally distinct from product releases and research claims.
