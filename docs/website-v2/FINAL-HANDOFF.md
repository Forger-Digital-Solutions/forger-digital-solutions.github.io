# Website V2 handoff

## Current state

The migration is in progress on `feature/fds-website-v2`, based on recovery commit `d931201edd8570013b5e8c630060d88b5a7a72b3`. Source files have not been committed, no pull request has been opened, and production has not been changed by this V2 work.

The public portfolio and Kayla knowledge now emphasize CodeForge / Forge AAA, Forge Control, and Dead Trails West while retaining the other current project pages. GEMS / Training Grounds and KyraBlox are no longer promoted as current projects. Historical notes remain in Git as drafts and are excluded from production routes.

## Verified locally

- Clean dependency install completed.
- Unit suite: 62 files and 1,051 tests passed.
- `npm run validate` passed, including 345/345 offline Kayla golden queries, a 28-page static build, and 1,265 internal links.
- Astro reports no errors; two `document.execCommand` deprecation hints remain on existing Forged and ForgerEMS copy controls.
- Chromium browser certification passed 153 tests with 26 intentional skips; Firefox and WebKit each passed all three Kayla shell smoke tests.
- Updated portfolio-specific geometry, responsive-layout, accessibility, navigation, and project-route browser checks passed 14/14.
- `git diff --check` passed.

## Continue through GitHub

Use this repository as the authoritative source. Continue on the dedicated feature branch, make changes through a reviewed pull request, and rely on the existing GitHub Actions gates for tests, dependency security, build, browser certification, and Pages deployment. Do not merge or deploy until the owner approves.

Recommended safeguards after the migration: protect `main` against direct pushes and force pushes; require pull requests and passing required checks; require at least one human review; retain Actions artifacts and deployment history; and maintain a repository backup or mirror with Git history.

## Production boundary

The recovery baseline had previously been verified live. This V2 handoff does not assert that the migrated portfolio is live. Recheck the custom domain, HTTPS, redirects, routes, assets, mobile behavior, and expected absence of retired routes only after an approved deployment.
