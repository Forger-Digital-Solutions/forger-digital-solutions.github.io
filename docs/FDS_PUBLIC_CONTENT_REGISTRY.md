# Forger Digital Solutions — Public Content & Status Registry

**Schema:** [`docs/FDS_MODEL_STATUS_SCHEMA.json`](../docs/FDS_MODEL_STATUS_SCHEMA.json)  
**Canonical Registry:** [`content/public-status/registry.json`](../content/public-status/registry.json)  
**Typed Loader:** [`src/data/registry.ts`](../src/data/registry.ts)  
**CI Validator:** [`scripts/validate-content.mjs`](../scripts/validate-content.mjs) (`npm run validate:content`)

---

## 1. Purpose

Every model family, flagship application, research infrastructure program, original production, and preserved software release displayed on the FDS website reads its development status, availability status, verified capabilities, limitations, and explicit non-claims from structured JSON files under `content/`.

This prevents copy drift across pages and enforces schema-level publication rules during CI builds.

---

## 2. Registry Inventory (12 Canonical Entries)

| ID | Name | Category | Division | Development Status | Availability | Route |
|---|---|---|---|---|---|---|
| `alexandrite` | Alexandrite | `ai-model-family` | FDS Intelligence | `research-vision` | `not-publicly-available` | `/models/alexandrite/` |
| `hackmanite` | Hackmanite | `ai-model-family` | FDS Intelligence | `training-planned` | `not-publicly-available` | `/models/hackmanite/` |
| `hackmanite-prime` | Hackmanite Prime | `ai-model` | FDS Intelligence | `training-planned` | `not-publicly-available` | `/models/hackmanite/prime/` |
| `hackmanite-reasoning` | Hackmanite Reasoning | `ai-model` | FDS Intelligence | `training-planned` | `not-publicly-available` | `/models/hackmanite/reasoning/` |
| `cinnabar` | Cinnabar | `ai-model-family` | FDS Intelligence | `experimental` | `not-publicly-available` | `/models/cinnabar/` |
| `jaspilite` | Jaspilite | `application` | FDS Applications | `private-development` | `private-development` | `/products/jaspilite/` |
| `battleverse` | Forge BattleVerse | `application` | FDS Applications | `private-development` | `private-development` | `/products/battleverse/` |
| `project-forge` | Project Forge | `research-infrastructure` | FDS Research | `active-development` | `research-only` | `/research/project-forge/` |
| `state-lines` | State Lines | `original-production` | FDS Original Productions | `private-development` | `private-development` | `/studio/state-lines/` |
| `forgerems` | ForgerEMS | `application` | FDS Applications | `public-preview` | `public-preview` | `/forgerems/` |
| `codeforge` | CodeForge | `application` | FDS Applications | `active-development` | `downloads-paused` | `/projects/codeforge` |
| `dead-trails-west` | Dead Trails West | `original-production` | FDS Original Productions | `private-development` | `private-development` | `/projects/dead-trails-west` |

---

## 3. Supporting Content Collections (`content/`)

| File | Role |
|---|---|
| `content/public-status/registry.json` | Single source of truth for status, availability, capabilities, limitations, and non-claims |
| `content/models/models.json` | Model family narratives, taglines, visual assets, and lineage metadata |
| `content/products/products.json` | Flagship application descriptions and architectural summaries |
| `content/research/divisions.json` | Project Forge 15 research divisions, 8 lifecycle stages, and 4 non-conflation axioms |
| `content/evaluations/evaluations.json` | Evaluation policy, 10 mandatory disclosure fields, and public benchmark records |
| `content/releases/releases.json` | Verified public software packages with exact byte sizes, commits, signing status, and SHA-256 digests |
| `content/publications/updates.json` | Dated Newsroom dispatches linked to verified routes and field notes |
| `content/company/profile.json` | Company headline, supporting mission copy, heritage slogan, and four-division map |

---

## 4. Automated Validation Rules Enforced by `scripts/validate-content.mjs`

1. Every registry entry must declare required fields (`id`, `name`, `category`, `division`, `development_status`, `availability`, `verified_capabilities`, `known_limitations`, `non_claims`, `route`, `last_verified`, `approved_for_publication`).
2. `id` values must be unique across the registry.
3. Status-to-availability consistency: a `research-vision` or `training-planned` entry cannot simultaneously declare `public-release` availability.
4. Every referenced image path in `content/` must exist under `public/`.
5. Automated leak scanner blocks private Windows/Google Drive paths (`Z:\`, `E:\`, `D:\`, `C:\Users\Daddy_FDS`, `My Drive`), secret token prefixes, and unverified compliance assertions (`SOC 2 certified`, `ISO 27001 certified`, `HIPAA compliant`).
