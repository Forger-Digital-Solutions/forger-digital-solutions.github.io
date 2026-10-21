# Website V2 handoff

## Current state

The overhaul is committed on `feature/fds-website-v2` and tracked by open pull request #3 against `main`. Use the PR's head SHA as the source of truth for the final commit identifier; this handoff is committed with that source. The PR remains unmerged and undeployed. The earlier recovery audit found website sources intact and traced the original outage to GitHub Pages configuration, not loss of the owner's local `FDSWebsite` folder.

## Product-specific coverage

- CodeForge's released Windows v0.2.0 positioning and release path remain distinct from Forge AAA, which is presented on the CodeForge detail page as planned architecture, not a separate release or complete-game generator.
- Forge Control has a dedicated detail showcase for its intended multi-agent coordination workflow. Provider integrations, V23 certification, installer acceptance evidence, and public availability remain unverified.
- Dead Trails West has a dedicated setting-study showcase labeled as illustrative CSS, not gameplay footage. The owner-reported travel/store/wallet/return scenarios are not independently reproduced and do not certify the game.
- ForgerEMS remains linked from the homepage and keeps its separate preview page, existing GitHub Release artifacts, checksums, and click-to-load video experience.
- Kayla AI Publisher remains in the additional-development catalog and retains its project detail route. The website's Kayla assistant and its existing knowledge, accessibility, and interaction coverage remain in place.
- GEMS / Training Grounds and KyraBlox are not current catalog entries; historical material remains in Git without being promoted as a current release.

## Validation and evidence boundaries

Local `npm run validate`, `npm test` (62 files, 1,050 tests), and `npm run build` passed. The build generated 28 static pages and internal-link validation found 0 broken among 1,273 links. CI-mode Playwright passed 161 tests with 26 condition-skipped tests; the final focused portfolio/product/release run passed 16/16. Local responsive screenshots were inspected at 360, 390, 768, 1,280, and 1,920 CSS pixels for key homepage/product presentations. Formal visual-certification captures were among the skipped tests, and no production performance audit was performed.

The previous recovery baseline at `d931201` had been checked live. No V2 production verification, merge, deployment, DNS change, or Pages-setting change is claimed here. Forge Control integrations/V23, Dead Trails West gameplay evidence and owner-reported checks, and the current deployed rendering remain unverified.

## Next owner-controlled steps

Review the final branch diff and GitHub Actions results for the PR head, then approve and merge only through the normal protected workflow. After the approved deployment, check the deployment artifact/run and verify the custom domain, HTTPS, redirects, routes, assets, mobile behavior, and retired-route expectations. If Pages or DNS needs adjustment, use observed evidence and the domain owner's authority; do not guess or replace records.

Recommended safeguards: protect `main` against direct pushes and force pushes; require pull requests, a human review, and passing security/test/build checks; retain Actions artifacts and deployment history; and maintain a private repository mirror or scheduled backup that preserves Git history.
