# Forger Digital Solutions — Sanitized Private Export Requirements

**Document Date:** 2026-11-26  
**Operation:** Digital Forge II  
**Purpose:** Exact manifest of sanitized, owner-approved public export artifacts required from local FDS development workstations before promoting internal model training, evaluation, application build, or game-production milestones onto `forgerdigitalsolutions.com`.

---

## 1. Environment Boundary Statement

Remote website-engineering agents operate inside an isolated Linux container with access exclusively to the public GitHub repository `Forger-Digital-Solutions/forger-digital-solutions.github.io`. Private local Windows development drives and private Google Drive workspaces are **not mounted or accessible**.

Accordingly, website builds never fabricate benchmark scores, training completions, corpus counts, desktop UI screenshots, or game-production metrics. All such updates enter the website strictly through sanitized, owner-reviewed exports.

---

## 2. Priority Sanitized Exports Requested from Local Development Agents

| Priority File / Export | Target Website Surface | Required Sanitized Fields | Prohibited Content (Must Strip Before Export) |
|---|---|---|---|
| `FDS_PUBLIC_WEBSITE_STATUS_EXPORT.json` | `content/public-status/registry.json` | Canonical `development_status`, `availability`, exact `version`, `last_verified` ISO date, owner sign-off flag | Local drive paths, private repo URLs, unapproved roadmap dates |
| `FDS_MODEL_CAPABILITY_MATRIX.json` | `/model-cards/`, `/evaluations/`, `content/evaluations/evaluations.json` | All 11 required evaluation fields (model version, base-model identity, benchmark version, date, `n`, conditions, raw vs. guarded results, baseline, uncertainty, limitations) | Frozen holdout prompts, training dataset URLs, raw private logs |
| `FDS_HACKMANITE_S22_TRAINING_READINESS.md` (or newer) | `/models/hackmanite/`, `/prime/`, `/reasoning/` | Sanitized training readiness status, verified checkpoint lineage (if trained), licensing verification, public limitations | Internal cluster configs, credentials, private corpus folder paths |
| `FDS_CINNABAR_FRESH_INFERENCE_REPORT.md` & `FDS_CINNABAR_CONFIRMATION_EVALUATION.md` | `/models/cinnabar/`, `/models/cinnabar/oracle/`, `/evaluations/` | Exact Oracle lineage evaluated, raw vs. guarded confirmation scores, `n`, uncertainty bounds, failure modes | Copyrighted source excerpts, private holdout questions, raw weights |
| `FDS_PHASE_II_B_INCREMENTAL_HANDOFF.md` & `FDS_PHASE_III_CONTINUATION_HANDOFF.md` (or newer) | `/products/battleverse/`, `/products/jaspilite/`, `/changelog/` | Verified application milestones, approved redacted desktop screenshots, provider verification tier promotions (`01`–`05`) | Unsigned internal binaries, API keys, local user paths |
| `FDS_LANTERN_QUAY_VERIFICATION_REPORT.md` (or newer game milestone export) | `/studio/state-lines/` | Owner-approved public narrative/production milestone summary (zero spoilers) | Plot twists, mission scripts, character dossiers, internal engine paths |

---

## 3. Sanitization & Intake Procedure

1. Local development agent generates the sanitized JSON/Markdown export and strips all Windows drive paths, usernames, Google Drive folder IDs, credentials, frozen eval items, and unapproved pricing/financial figures.
2. Owner reviews and explicitly approves the export for public website inclusion.
3. Website agent drops approved facts into `content/public-status/registry.json`, `content/evaluations/evaluations.json`, `content/models/models.json`, or `public/images/forge/`.
4. Website CI gates (`npm run validate:content && npm test && npm run validate && npm run kayla:secret-scan`) automatically reject any private path leak, schema mismatch, or unapproved claim before build.
