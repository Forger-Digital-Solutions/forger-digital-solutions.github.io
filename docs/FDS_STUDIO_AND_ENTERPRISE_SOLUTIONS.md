# FDS Studio & Enterprise Solutions Architecture — Operation Digital Forge II

> **Organization:** Forger Digital Solutions (FDS)
> **Canonical Data Source:** [`content/solutions/solutions.json`](../content/solutions/solutions.json)
> **Public Routes:** [`/solutions/`](../src/pages/solutions/index.astro) + 6 dedicated audience pages under `/solutions/[slug]/`
> **Last Verified:** 2026-11-26

---

## 1. Strategic Purpose

Operation Digital Forge II establishes **Solutions** as a first-class institutional navigation pillar alongside Models, Products, Research, Developers, Studio, and Company. Instead of forcing studio technical directors, animation producers, software leads, or enterprise architects to stitch together separate model and application pages, `/solutions/` maps FDS's four divisions directly onto six real customer workflows—while maintaining strict public-readiness honesty.

---

## 2. Three Primary Commercial Markets & Six Audience Pages

| Audience Route | Primary Market | Flagships Highlighted | Commercial Readiness Label | Inquiry Track |
| :--- | :--- | :--- | :--- | :--- |
| `/solutions/game-developers/` | Gaming & Interactive Entertainment | Hackmanite (`Prime`), Jaspilite | Early Interest Open · Planned Specialist Models | `developer` |
| `/solutions/gaming-studios/` | Gaming & Interactive Entertainment | Hackmanite (`Prime` & `Reasoning`), Studio Workforces, Jaspilite | Early Interest Open · Planned Studio Workforces | `gaming-studio` |
| `/solutions/anime-manga-creators/` | Anime, Manga & Creative Production | Cinnabar (`Oracle`), BattleVerse Arena & Creator Studio | Research / Commercial Direction · Early Interest | `anime-studio` |
| `/solutions/animation-studios/` | Anime, Manga & Creative Production | Cinnabar Creative Workforce, BattleVerse Creator Studio | Commercial Direction · Early Interest Open | `anime-studio` |
| `/solutions/software-engineering/` | Autonomous Software Engineering | Jaspilite (`Auto / Meld / Solo`), CodeForge heritage | Active Development · Early Interest Open | `developer` |
| `/solutions/enterprise-private-ai/` | Private & Studio Enterprise AI | Hackmanite Enterprise, Cinnabar Studio, Jaspilite, Project Forge | Planned Commercial Direction · Inquiries Open | `enterprise` |

---

## 3. The Five-Layer Studio Personalization Architecture

A central commercial differentiator across gaming, animation, and software teams is **structured studio personalization without leaking customer IP into public or shared models**:

1. **Layer 1 — Base Specialist Model:** Starting from domain-adapted open-weight foundations (`Qwen/Qwen3.8-27B` Apache-2.0 for Hackmanite Prime; `openai/gpt-oss-120b` Apache-2.0 for Hackmanite Reasoning; Cinnabar text lineages for creative craft).
2. **Layer 2 — Private Retrieval & Knowledge Indexes:** Indexing customer-owned GDDs, engine APIs, lore bibles, character sheets, style guides, and codebases strictly inside isolated customer retrieval stores.
3. **Layer 3 — Tooling & Engine Integration:** Connecting structured prompts and tool execution to studio engines, version control, issue trackers, storyboard software, or Jaspilite workspaces under explicit developer permissions.
4. **Layer 4 — Studio Style, Continuity & Review Rules:** Encoding coding standards, narrative tone constraints, visual continuity checks, and deterministic verification gates so outputs match studio craft rules.
5. **Layer 5 — Optional Custom Adaptation:** Evaluating and, where justified by customer data volume and governance terms, training customer-isolated adapters without cross-pollinating proprietary assets into other customers' deployments.

---

## 4. Specialist Workforce Catalogs

### Hackmanite 10-Role Gaming Workforce (`/models/hackmanite/` & `/solutions/gaming-studios/`)
1. Gameplay Systems Engineer
2. Rendering & Shader Engineer
3. Physics & Simulation Engineer
4. Engine Tools & Pipeline Engineer
5. Multiplayer & Netcode Architect
6. Animation & Technical Rigging Specialist
7. Game QA & Automated Verification Specialist
8. World Systems & Narrative Designer
9. Performance & Profiling Engineer
10. Defensive Game Security & Anti-Cheat Analyst

*Honesty Boundary:* These 10 roles describe structured specialist workforce workflows and evaluation domains—NOT ten separately trained foundation models.

### Cinnabar 8-Role Creative Production Workforce (`/models/cinnabar/` & `/solutions/animation-studios/`)
1. Series Story Architect
2. Character & Lore Bible Specialist
3. Episode & Chapter Outline Director
4. Storyboard & Shot-Composition Assistant
5. Action & Fight Choreography Analyst
6. Dialogue & Localization Consistency Editor
7. Audio, Pacing & Timing Direction Planner
8. Continuity & Canon Auditor

*Honesty Boundary:* Cinnabar Oracle lineages are **text-based storytelling, continuity, and craft models**—NOT native video or animation renderers. Visual drawing, animation, and audio rendering rely on human artists and explicitly identified external production tools.

---

## 5. Commercial Honesty & Zero-Deception Inquiry Boundaries

- **No Unapproved Pricing on Public Pages:** Public `/solutions/*` pages intentionally avoid unapproved tier dollar figures or speculative revenue targets.
- **No Unverified Compliance Claims:** `/solutions/enterprise-private-ai/` and `/trust/` explicitly disclose that FDS does **not** currently hold SOC 2 Type II, ISO 27001, HIPAA, or FedRAMP certifications, while explaining FDS's architectural focus on local-first execution, private isolation, and transparent data boundaries.
- **Static Inquiry Composer (`/contact/?track=...`):** Every solution CTA links directly into `/contact/?track=<id>`, pre-selecting the right engagement track and building a transparent `mailto:forgerdigisolsupport@gmail.com` or clipboard-ready brief with zero fake backend form submission.
