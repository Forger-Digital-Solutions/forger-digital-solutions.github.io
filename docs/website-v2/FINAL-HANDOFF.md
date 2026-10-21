# Website V2 handoff

## Current state

The overhaul is on `feature/fds-website-v2` and tracked by [open pull request #3](https://github.com/Forger-Digital-Solutions/forger-digital-solutions.github.io/pull/3) against `main`. The latest previously CI-verified source commit was `08773c4ef12698c3745f627e313239e179943b92`; this handoff follow-up removes remaining unverified Dead Trails West simulation claims and adds a regression guard. The PR remains unmerged and undeployed; owner approval is still required. The earlier recovery audit found website sources intact and traced the original outage to GitHub Pages configuration, not loss of the owner's local `FDSWebsite` folder.

## Product-specific coverage

- CodeForge's released Windows v0.2.0 positioning and release path remain distinct from Forge AAA, which is presented on the CodeForge detail page as planned architecture, not a separate release or complete-game generator.
- Forge Control has a dedicated detail showcase for its intended multi-agent coordination workflow. Provider integrations, V23 certification, installer acceptance evidence, and public availability remain unverified.
- Dead Trails West has a dedicated setting-study showcase labeled as illustrative CSS, not gameplay footage. The owner-reported travel/store/wallet/return scenarios are not independently reproduced and do not certify the game.
- ForgerEMS remains linked from the homepage and keeps its separate preview page, existing GitHub Release artifacts, checksums, and click-to-load video experience.
- Kayla AI Publisher remains in the additional-development catalog and retains its project detail route. The website's Kayla assistant and its existing knowledge, accessibility, and interaction coverage remain in place.
- GEMS / Training Grounds and KyraBlox are not current catalog entries; historical material remains in Git without being promoted as a current release.
- Both retired product URLs return the designed 404 locally (`/projects/gems-training-grounds` and `/projects/kyrablox`). Historical notes and Git history preserve context without presenting them as current products.

## Validation and evidence boundaries

**Local testing:** After the latest Dead Trails West wording corrections, `npm run validate` passed (345/345 Kayla golden queries, Astro 0 errors/0 warnings and 2 existing deprecation hints, 28 static pages, 1,273 internal links with 0 broken); `npm test` passed (62 files, 1,051 tests); focused Chromium product-showcase E2E passed (7/7). Canonical and public copy no longer describes simulation work as partially verified; a regression test guards that language.

**GitHub Actions:** Run [`39619113254`](https://github.com/Forger-Digital-Solutions/forger-digital-solutions.github.io/actions/runs/39619113254) was for commit `cdcb33fa961b24c0e9dd19a1b363d4e04c605f77`. Its workflow succeeded, but the Playwright check-run `119288133152` remained pending. Follow-up run [`39624480634`](https://github.com/Forger-Digital-Solutions/forger-digital-solutions.github.io/actions/runs/39624480634) on `08773c4ef12698c3745f627e313239e179943b92` passed security, build/Kayla, and Playwright; Pages deployment was skipped, and the exact-head PR check rollup became `CLEAN`. Thus the discrepancy was stale on the earlier commit and resolved for `08773c4`. The latest narrow source/doc follow-up is newer than `08773c4`; inspect its newly triggered run before approval.

**Browser evidence:** The real [`visual-certification-captures` CI artifact](https://github.com/Forger-Digital-Solutions/forger-digital-solutions.github.io/actions/runs/39624480634#artifacts) includes homepage, CodeForge, ForgerEMS, Releases, About, and the retired GEMS route's 404 at 390/768/1,440/1,920 widths, plus reduced-motion screenshots. Local browser screenshots for Products, CodeForge, Forge Control, Dead Trails West, ForgerEMS, mobile navigation, Kayla-open, and the footer were inspected; those temporary captures are not in the CI artifact. They showed no failed images, unrevealed sections, or horizontal overflow at the checked local widths. No production visual verification or performance audit is claimed.

The previous recovery baseline at `d931201` had been checked live. No V2 production verification, merge, deployment, DNS change, or Pages-setting change is claimed here. Forge Control integrations/V23, Dead Trails West gameplay evidence and owner-reported checks, and the current deployed rendering remain unverified.

## Next owner-controlled steps

Before approval, verify the new GitHub Actions run on the latest PR head (the narrow source/doc follow-up is newer than `08773c4`). Repository API inspection returned no `main` branch protection and no repository/inherited rulesets; the organization-level ruleset endpoint was unavailable, so do not assume a protected merge gate. After explicit owner approval and the normal merge, inspect the deployment artifact/run and verify the custom domain, HTTPS, redirects, routes, assets, mobile behavior, and retired-route expectations. If Pages or DNS needs adjustment, use observed evidence and the domain owner's authority; do not guess or replace records.

Recommended safeguards: protect `main` against direct pushes and force pushes; require pull requests, a human review, and passing security/test/build checks; retain Actions artifacts and deployment history; and maintain a private repository mirror or scheduled backup that preserves Git history.
