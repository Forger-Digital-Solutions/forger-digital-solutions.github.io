# FDS Website Information Architecture — Operation Digital Forge II

> **Domain:** `https://forgerdigitalsolutions.com`
> **Framework:** Astro 7 Static Site Generation (`69` generated HTML routes)
> **Top-Level Navigation:** **7 Institutional Pillars** (`Models`, `Products`, `Solutions`, `Research`, `Developers`, `Studio`, `Company`) + `Releases` & `Contact FDS` CTAs
> **Last Updated:** 2026-11-26

---

## 1. Seven-Pillar Navigation Architecture (`src/components/Header.astro`)

Desktop horizontal navigation transitions cleanly to the accessible mobile drawer at `1180px` (`@media (max-width: 1180px)`), preventing cramped wrapping across all standard laptop and desktop widths:

| Pillar | Primary Route | Dropdown / Mega-Menu Destinations |
| :--- | :--- | :--- |
| **Models** | `/models/` | Model Catalog (`/models/`), Alexandrite (`/models/alexandrite/`), Hackmanite (`/models/hackmanite/`), Cinnabar (`/models/cinnabar/`), Model Cards (`/model-cards/`), Evaluations (`/evaluations/`) |
| **Products** | `/products/` | Products Overview (`/products/`), Jaspilite (`/products/jaspilite/`), Forge BattleVerse (`/products/battleverse/`), BattleVerse Arena (`/products/battleverse/arena/`), BattleVerse Creator Studio (`/products/battleverse/creator-studio/`), ForgerEMS (`/forgerems/`), Downloads (`/downloads/`) |
| **Solutions** *(New in ODF II)* | `/solutions/` | Solutions Overview (`/solutions/`), Game Developers (`/solutions/game-developers/`), Gaming Studios (`/solutions/gaming-studios/`), Anime & Manga Creators (`/solutions/anime-manga-creators/`), Animation Studios (`/solutions/animation-studios/`), Software Engineering (`/solutions/software-engineering/`), Enterprise & Private AI (`/solutions/enterprise-private-ai/`) |
| **Research** | `/research/` | Research Hub (`/research/`), Project Forge (`/research/project-forge/`), Laboratory (`/research/laboratory/`), Training Methodology (`/research/training/`), Gaming AI (`/research/gaming/`), Animation AI (`/research/animation/`), Artificial Intelligence (`/research/artificial-intelligence/`), Publications (`/research/publications/`) |
| **Developers** | `/developers/` | Developer Hub (`/developers/`), Documentation (`/docs/`), Releases / Forged (`/forged`), Downloads Center (`/downloads/`), Changelog (`/changelog/`) |
| **Studio** | `/studio/` | Studio Hub (`/studio/`), State Lines (`/studio/state-lines/`), Original Productions (`/studio/productions/`) |
| **Company** | `/company/` | Company & Vision (`/company/`), About FDS (`/about`), Newsroom (`/news/`), Trust Center (`/trust/`), Contact & Inquiries (`/contact/`), Support FDS (`/support`), Community Impact (`/community-impact`) |

---

## 2. Complete Route Inventory (69 Built Static Pages)

### Core Flagship & Commercial Entry Routes (21 pages)
- `/` — Institutional & Commercial Homepage (Hero + Flagship Portfolio + Studio & Enterprise Solutions Band + Ecosystem Convergence Map + Research/Productions/Releases + Commercial Partnership CTA)
- `/models/`, `/models/alexandrite/`, `/models/hackmanite/`, `/models/hackmanite/prime/`, `/models/hackmanite/reasoning/`, `/models/cinnabar/`, `/models/cinnabar/oracle/`
- `/model-cards/`, `/evaluations/`
- `/products/`, `/products/jaspilite/`, `/products/battleverse/`, `/products/battleverse/arena/`, `/products/battleverse/creator-studio/`
- `/solutions/`, `/solutions/game-developers/`, `/solutions/gaming-studios/`, `/solutions/anime-manga-creators/`, `/solutions/animation-studios/`, `/solutions/software-engineering/`, `/solutions/enterprise-private-ai/`

### Research & Original Studio Routes (11 pages)
- `/research/`, `/research/project-forge/`, `/research/laboratory/`, `/research/training/`, `/research/gaming/`, `/research/animation/`, `/research/artificial-intelligence/`, `/research/publications/`
- `/studio/`, `/studio/state-lines/`, `/studio/productions/`

### Developer, Documentation, Release & Trust Routes (15 pages)
- `/developers/`, `/docs/`, `/downloads/`, `/releases/`, `/changelog/`, `/forged/`, `/forgerems/`, `/trust/`, `/technology/`, `/lab/`, `/faq/`
- `/news/`, `/notes/`, `/notes/codeforge-v0-2-free-first-engineering/`, `/notes/evidence-over-assumptions/`, `/notes/forgerems-technician-workbench/`, `/notes/introducing-fds-notes/`

### Company, Contact, Support & Legal Routes (10 pages)
- `/company/`, `/about/`, `/contact/` (with `?track=` Commercial Inquiry Composer), `/support/`, `/support/hardware/`, `/community-impact/`, `/privacy/`, `/terms/`, `/404.html`

### Preserved Legacy Catalog & Fail-Closed Commerce Routes (10 pages)
- `/projects/`, `/projects/codeforge/`, `/projects/forgerems/`, `/projects/forge-control/` (explicit historical migration reference pointing to Jaspilite), `/projects/dead-trails-west/`, `/projects/kayla-ai-publisher/`, `/projects/we-the-people/`, `/projects/farmstand-finder/`
- `/codeforge/sign-in/`, `/codeforge/upgrade/` (preserved fail-closed boundary)

---

## 3. Footer Architecture (`src/components/Footer.astro`)

Five organized navigation columns alongside the FDS brand mark, retained heritage slogan (`Build the tools. Build the worlds.`), and verified social links (`GitHub`, `YouTube`, `Discord`, `LinkedIn`, `TikTok`):
1. **Models** (6 links)
2. **Products** (7 links — includes `Jaspilite`, `Forge BattleVerse`, `BattleVerse Arena`, `Creator Studio`, `ForgerEMS`, `Downloads & Releases`, `Extended Portfolio`)
3. **Solutions** (7 links — Solutions hub + all 6 audience routes)
4. **Research & Dev** (6 links)
5. **Studio & Company** (7 links)
