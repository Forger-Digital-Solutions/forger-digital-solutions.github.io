# FDS Public Content Registry — Canonical Record

> **Machine-Readable Source of Truth:** [`content/public-status/registry.json`](../content/public-status/registry.json) (`schema_version: 1.1.0`)
> **JSON Schema:** [`docs/FDS_MODEL_STATUS_SCHEMA.json`](./FDS_MODEL_STATUS_SCHEMA.json)
> **CI Validation Script:** [`scripts/validate-content.mjs`](../scripts/validate-content.mjs)
> **Last Reconciled:** 2026-11-26 (Operation Digital Forge II — 100% synchronized with `registry.json`)

---

## 1. Registry Architecture & Enforcement

Every technology, model family, commercial application, research infrastructure program, original entertainment production, and preserved legacy software item presented on `forgerdigitalsolutions.com` is governed by `content/public-status/registry.json`.

Automated enforcement via `npm run validate:content` and `test/operation-digital-forge-ii.test.ts` guarantees:
1. Every entry matches `FDS_MODEL_STATUS_SCHEMA.json` allowed `category`, `development_status`, and `availability` enums.
2. Unreleased development statuses (`research-vision`, `training-planned`, `active-research`, `experimental-checkpoint`, `internal-evaluation`, `commercial-direction`, `private-development`) cannot claim `availability: "commercially-available"` or `"public-release"`.
3. Every entry includes explicit `verified_capabilities`, `planned_capabilities`, `known_limitations`, `non_claims`, `public_evidence`, `commercial_direction`, `route`, and `last_verified` metadata.
4. Zero private local paths (`Z:\`, `C:\Users\`, `My Drive`) and zero unapproved internal pricing/revenue strings appear anywhere in public registry files.

---

## 2. Canonical Registry Table (All 14 Entries — Reconciled 100% Against `registry.json`)

| ID | Name | Division | Category | Development Status | Availability | Flagship | Route | Last Verified |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- | :---: |
| `alexandrite` | **Alexandrite** | FDS Intelligence | `ai-model-family` | `research-vision` | `not-publicly-available` | Yes | `/models/alexandrite/` | 2026-11-26 |
| `hackmanite` | **Hackmanite** | FDS Intelligence | `ai-model-family` | `training-planned` | `early-interest-open` | Yes | `/models/hackmanite/` | 2026-11-26 |
| `hackmanite-prime` | **Hackmanite Prime** | FDS Intelligence | `ai-model` | `training-planned` | `not-publicly-available` | No | `/models/hackmanite/prime/` | 2026-11-26 |
| `hackmanite-reasoning` | **Hackmanite Reasoning** | FDS Intelligence | `ai-model` | `training-planned` | `not-publicly-available` | No | `/models/hackmanite/reasoning/` | 2026-11-26 |
| `cinnabar` | **Cinnabar** | FDS Intelligence | `ai-model-family` | `experimental-checkpoint` | `research-only` | Yes | `/models/cinnabar/` | 2026-11-26 |
| `jaspilite` | **Jaspilite** | FDS Applications | `application` | `active-development` | `early-interest-open` | Yes | `/products/jaspilite/` | 2026-11-26 |
| `battleverse` | **Forge BattleVerse** | FDS Applications | `application` | `active-development` | `early-interest-open` | Yes | `/products/battleverse/` | 2026-11-26 |
| `battleverse-arena` | **BattleVerse Arena** | FDS Applications | `application` | `active-development` | `early-interest-open` | No | `/products/battleverse/arena/` | 2026-11-26 |
| `battleverse-creator-studio` | **BattleVerse Creator Studio** | FDS Applications | `commercial-direction` | `commercial-direction` | `early-interest-open` | No | `/products/battleverse/creator-studio/` | 2026-11-26 |
| `project-forge` | **Project Forge** | FDS Research | `research-infrastructure` | `active-research` | `research-only` | Yes | `/research/project-forge/` | 2026-11-26 |
| `state-lines` | **State Lines** | FDS Original Productions | `original-production` | `private-development` | `private-development` | Yes | `/studio/state-lines/` | 2026-11-26 |
| `forgerems` | **ForgerEMS** | Extended Portfolio | `legacy-product` | `public-preview` | `public-preview` | No | `/forgerems/` | 2026-10-08 |
| `codeforge` | **CodeForge** | Extended Portfolio | `legacy-product` | `public-release` | `downloads-paused` | No | `/projects/codeforge` | 2026-10-19 |
| `dead-trails-west` | **Dead Trails West** | FDS Original Productions | `original-production` | `private-development` | `private-development` | No | `/projects/dead-trails-west` | 2026-10-21 |

---

## 3. Reconciliation Notes vs. Operation Digital Forge I

Operation Digital Forge II resolves five table-drift discrepancies noted in Operation Digital Forge I's markdown mirror and expands the registry from **12** to **14** entries:
- Added dedicated sub-platform entries **`battleverse-arena`** (`active-development` / `early-interest-open`) and **`battleverse-creator-studio`** (`commercial-direction` / `early-interest-open`).
- Synchronized `cinnabar` (`experimental-checkpoint` / `research-only`), `jaspilite` (`application` / `active-development` / `early-interest-open`), `battleverse` (`application` / `active-development` / `early-interest-open`), `forgerems` (`legacy-product` / `public-preview`), and `codeforge` (`legacy-product` / `public-release` / `downloads-paused`) verbatim with `content/public-status/registry.json`.
- Recorded verified unmodified **Apache-2.0** upstream foundation licenses for `Qwen/Qwen3.8-27B` (`hackmanite-prime`) and `openai/gpt-oss-120b` (`hackmanite-reasoning`), explicitly noting that upstream license verification does not equal completed FDS fine-tuning.

---

## 4. Companion Structured Content Files

- [`content/solutions/solutions.json`](../content/solutions/solutions.json) — 3 commercial markets, 6 audience solution hubs, 5 studio personalization layers, Hackmanite 5 offerings / 12 segments / 10 roles, Cinnabar 17 R&D domains / 8 roles, BattleVerse Arena original-silhouette illustrative scenarios, Jaspilite 5-tier provider maturity ladder, Alexandrite 7-stage pipeline, and 6 inquiry tracks.
- [`content/company/profile.json`](../content/company/profile.json) — Company mission, 4 permanent divisions, founder info, contact email, and official social links.
- [`content/evaluations/evaluations.json`](../content/evaluations/evaluations.json) — 11 mandatory benchmark disclosure fields, verified website/Kayla engineering baselines, and pending authorized export placeholders for Hackmanite and Cinnabar.
- [`content/publications/updates.json`](../content/publications/updates.json) — Newsroom public dispatches including Operation Digital Forge I & II.
- [`src/data/manifest.ts`](../src/data/manifest.ts) — Legacy project manifest preserving SHA-256 checksums for `ForgerEMS v1.2.4-preview.1` and `CodeForge-source-6b0770b.zip`.
