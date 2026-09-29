# FDS Website — Maintenance Baseline & Product Truth Sync

**Date:** 2026-09-29
**Verdict:** FDS_MAINTENANCE_BASELINE_CERTIFIED

## 1. Repository state

- HEAD `593ae28` on `main`, clean, synced with `origin/main`
- Baseline: post-release quality live certification (run 36579454534)

## 2. Production canary

10 routes probed on `https://forgerdigitalsolutions.com` — `/`, `/projects`,
`/projects/codeforge`, `/projects/gems-training-grounds`, `/technology`,
`/forged`, `/about`, `/faq`, `/support`, `/notes` — all HTTP 200, correct
titles/H1s, **zero console errors, zero pageerrors, zero failed requests**.

## 3. Product-claim inventory

| Claim | Where | Source of truth | Result |
|---|---|---|---|
| CodeForge v0.2.0 public release, Win 10/11 x64, installer+portable, SHA-256 published | manifest, projects, upgrade, faq, lab, visuals, kayla, notes | `package.json` 0.2.0; GitHub release `v0.2.0` (2026-08-29, Latest) with `CodeForge-Setup-0.2.0.exe` + `CodeForge-Portable.exe` + `SHA256SUMS.txt` | **MATCH** |
| CodeForge Free active; expanded plans in development, no checkout | codeforge-plans.ts, upgrade page | plans: `checkoutEnabled:false`, `price:null`; repo billing work still on `codex/r3-live-services-hardening` branch | **MATCH** |
| ForgeZero fail-closed free-first routing; no paid fallback, no local LLMs | manifest nonClaims, projects copy | repo AGENTS.md contract confirms same policy | **MATCH** |
| ForgerEMS v1.2.3-preview.1 public preview for Windows | manifest, projects, kayla changelog/github/apps, notes | GitHub pre-release `v1.2.3-preview.1` (2026-07-02) with installer + zip + `CHECKSUMS.sha256` | **MATCH** |
| KyraBlox private 0.3.0-preview.2 dev line, no public download | manifest, projects | repo `version.json` `productVersion: 0.3.0-preview.2`, `channel: preview`; release artifacts are private certification output | **MATCH** |
| KyraBlox: Roblox deepest, Studio-paired mutation; Unreal fixture-validated; Unity/Godot planning paths; provider auth fixture-tested | projects.ts sections/highlights | KyraBlox `AGENTS.md` contract and capability rules state the same maturity split | **MATCH** |
| GEMS = 4 research lineages (Topaz/Sapphire/Peridot/Garnet), none publicly released, foundation strategy honest | manifest, projects, gems.ts | consistent across all site sources; gems-factual-alignment test guards it | **MATCH** |
| Kayla copilot ≠ Kayla Publisher | launcher tooltip, panel subtitle, manifest nonClaim, project highlights, FAQ | distinction preserved everywhere | **MATCH** |
| We The People private development | manifest `private-development` ↔ projects `PRIVATE DEVELOPMENT` | internal agreement | **MATCH** |
| FarmStand Finder active development, discovery-only scope | manifest ↔ projects | internal agreement | **MATCH** |

## 4. CodeForge sync (READ-ONLY)

- Worktree: `CodeForge-R3-worktree`, branch `codex/r3-live-services-hardening`,
  HEAD `6b0770b`, **clean tree** — observed only.
- `package.json` version `0.2.0` = website claim = latest GitHub release tag.
- Published source archive on `/forged` was generated from commit `6b0770b` —
  the same commit as the current worktree HEAD. Archive SHA-256 is verified
  against real bytes in `project-archives.test.ts` and live by
  `verify-production.cjs`.
- Finding (documented, not a website defect): the repo's `GEMS_MODE.md` uses
  "GEMS" for an entitlement-gated premium-tier concept ("Global Enterprise Model
  Service"). The public website uses "GEMS" for the model-research family.
  Public copy never calls GEMS a purchasable CodeForge tier; the upgrade page's
  "GEMS-powered intelligence where it matures" is hedged direction copy and
  compatible with both senses. Recorded as a naming-collision sync risk: if the
  premium tier ships under the GEMS name, public naming needs a decision.

## 5. GEMS sync

`gems.ts` lineages, states (all RESEARCH), notClaimed statements, and
`projects.ts` foundation-strategy copy align with the guarded vocabulary;
`gems-factual-alignment.test.ts` and `content-consistency.test.ts` ban the
obsolete claims (from-scratch-only, third-party model naming, old taxonomy,
"no checkpoint trained"). Sapphire wording correctly reflects "experimental
research checkpoints evaluated through Training Grounds". No site text claims a
released/production GEM.

## 6. Kayla sync

Copilot-vs-Publisher distinction intact in launcher tooltip, panel subtitle,
manifest nonClaims, project highlights, and FAQ. Golden queries 345/345;
knowledge drift check 0 errors / 0 warnings; identity answers ("I am Kayla
Copilot, the FDS website guide") verified in source.

## 7. Version consistency

Every version literal reconciled:

- `v0.2.0` — manifest, products.releaseNotesUrl, projects copy, visuals
  alt/caption, upgrade, faq, lab, kayla (answers/releases/task-planner), notes
  — all equal the live latest tag.
- `v1.2.3-preview.1` (and `v1.2.3` shorthand in Kayla knowledge) — all equal
  the live ForgerEMS pre-release.
- `0.3.0-preview.2` — KyraBlox private dev line; matches repo `version.json`.
- Historical notes posts legitimately pin their release versions — untouched.

## 8. Status consistency

Manifest `canonicalStatus` → `projects.ts` status agreement for all 7 projects
(enforced by `content-consistency.test.ts`). Homepage status strip is
manifest-fed. No "Coming Soon"/"Available" contradictions found across pages.
`ProjectCard` flagship badges derive from real status (RELEASED→Flagship
Release, RESEARCH→Flagship Research); only flagship-flagged projects get badges.

## 9. Links / downloads

- Internal links: 1256 checked, 0 broken.
- Download CTAs verified semantically: "Get CodeForge" → `/forged` shelf;
  product/Kayla/upgrade CTAs → correct `releases/latest` and `releases/tag/v0.2.0`.
- Live GitHub release assets match site claims exactly (installer + portable +
  checksums for CodeForge; installer + zip + checksums for ForgerEMS).
- Source archive: real bytes on disk, SHA-256 verified by test, published only
  for CodeForge; all other projects carry explicit not-published/private
  policies — no fake download cards.
- `codeforge-plans.ts`: Free tier active, expanded tier `checkoutEnabled:false`,
  `price:null` — fail-closed, matches "no checkout exists" copy.

## 10. Drift found

**None.** No factual mismatch between public claims and current product truth.

## 11. Fixes made

None required. Additions are baseline tooling only:

- `scripts/product-truth-sync.mjs` — authoring-time drift audit: manifest
  versions/statuses vs live GitHub Releases + stray version-literal scan.
  Deliberately NOT a CI gate (needs network/`gh` auth against sibling repos).
  Current output: `ok` on all 8 manifest entries, 0 drift findings.
- `docs/MAINTENANCE.md` — frozen-systems policy + maintenance canary definition.

## 12. Maintenance canary (this tree)

- `npm run check`: 0 errors / 0 warnings / 1 pre-existing hint (execCommand)
- `npm test`: **1024/1024** (60 files)
- `npm run build`: 29 pages
- `npm run validate`: content ✓, knowledge PASS (0 drift), golden **345/345**,
  links **1256 / 0 broken**

## 13. Frozen systems

Atomic ecosystem untouched (certificate +3.535u / 0-28 / 1080s unchanged).
Performance architecture untouched. CodeForge auth untouched. Kayla untouched.

## 14. Concurrent-agent safety

CodeForge inspected: **YES — READ-ONLY ONLY.**
Branch observed: `codex/r3-live-services-hardening`. HEAD: `6b0770b`.
Working tree: clean. Files modified by this agent: **ZERO.** Git mutations:
**ZERO.** Processes altered: **ZERO.**
KyraBlox repo also read-only (`version.json`, `AGENTS.md` consulted for truth
sync; zero writes, zero mutations).

## 15. Remaining sync risks

- **GEMS name collision**: CodeForge's in-development premium tier is internally
  called "GEMS" while the public research program is also "GEMS". If the tier
  ships publicly under that name, naming needs a decision. No action now.
- **Version literal spread**: `v0.2.0`/`v1.2.3-preview.1` appear in ~15 places
  (mostly intentional — notes posts, alt text, Kayla knowledge). The new
  `product-truth-sync.mjs` flags strays; manifest remains the edit point.
- **manifest `lastVerified` 2026-09-12**: honest "last reconciled" stamp; bump it
  when the next product release is verified rather than mechanically.
- **Source archive freshness**: the `/forged` CodeForge archive pins `6b0770b`
  (= current worktree HEAD today). Future CodeForge commits will not auto-update
  it — by design; regenerate via `generate-project-archives.mjs` when a new
  release ships.

## Deployment

NOT DEPLOYED — MAINTENANCE BASELINE ONLY. No source changes required; the two
new files (script + policy doc) are additive tooling pending approval.
