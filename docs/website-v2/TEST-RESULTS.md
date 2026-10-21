# Website V2 test results

These results distinguish local validation, GitHub Actions, and production. The latest source commit, `b081d4ccd15d3d0ef708f434e576607e7768694d`, is on `feature/fds-website-v2`, PR #3. Its exact-head Actions run is [`39627371915`](https://github.com/Forger-Digital-Solutions/forger-digital-solutions.github.io/actions/runs/39627371915).

## Local automated checks

| Check | Result |
|---|---|
| `npm ci` | Passed from the lockfile; 323 packages installed and audit reported 0 vulnerabilities. npm emitted a non-blocking approval warning for the existing `esbuild` install script. |
| `npm run validate` | Passed: content and knowledge checks, 345/345 offline Kayla golden queries, Astro diagnostics, static build, and internal links. |
| `npm test` | Passed after the latest local copy correction: 62 test files, 1,051 tests. |
| `npm run build` | Passed: 28 static pages generated, including `dist/index.html` and all seven current project routes. |
| Internal links | Passed: 1,273 links across 28 built pages, 0 broken. |
| Astro diagnostics | 0 errors, 0 warnings, and 2 existing `document.execCommand` deprecation hints on Forged and ForgerEMS pages. |
| Secret and deployment-boundary scans | `npm run kayla:secret-scan`, `npm run codeforge:secret-scan`, and `npm run kayla:deploy:check` passed. |
| Earlier local CI-mode Playwright | `CI=1 npm run test:e2e` passed before the final evidence-copy correction: 161 tests, 26 condition-skipped, across the configured Chromium, Firefox, and WebKit projects. |
| Earlier portfolio-focused Playwright | Passed 16/16 before the final review correction; the updated focused suite is listed below. |
| `git diff --check` | Passed before commit. |

After the latest Dead Trails West evidence-copy corrections across the canonical manifest and public surfaces, the focused Chromium showcase suite passed 7/7, including route rendering, responsive bounds, accessibility, mobile caption clearance, and the copy regression assertion. The complete unit suite passed 62 files and 1,051 tests. `npm run validate` passed: 345/345 Kayla golden queries, Astro 0 errors/0 warnings and 2 existing deprecation hints, 28 static pages, 1,273 links with 0 broken. The Kayla and CodeForge secret scans and Kayla deployment-boundary check passed on the same source.

## GitHub Actions

Run [`39619113254`](https://github.com/Forger-Digital-Solutions/forger-digital-solutions.github.io/actions/runs/39619113254) completed successfully for commit `cdcb33fa961b24c0e9dd19a1b363d4e04c605f77`. Its security and build jobs and Playwright test step succeeded, and Pages deployment was skipped; however, check-run `119288133152` remained `in_progress`.

Follow-up run [`39624480634`](https://github.com/Forger-Digital-Solutions/forger-digital-solutions.github.io/actions/runs/39624480634) on `08773c4ef12698c3745f627e313239e179943b92` completed successfully: Dependency Security Gate, Unit/Kayla/Build, and Playwright all passed; Pages deployment was skipped. The later exact-source-head run [`39627371915`](https://github.com/Forger-Digital-Solutions/forger-digital-solutions.github.io/actions/runs/39627371915) tested `b081d4ccd15d3d0ef708f434e576607e7768694d`; security, build/Kayla, and Playwright passed, and Pages deployment was skipped. Playwright completed in 7m46s. The PR check rollup for that source head was `CLEAN`; the older `119288133152` discrepancy is historical, not an unresolved current-head check. Repository API inspection found no `main` branch protection or repository/inherited rulesets; the organization ruleset endpoint was unavailable, so organization-level rules are not asserted.

The documentation-only handoff update does not change the source validated by run `39627371915`. Check GitHub for the exact current PR head's status before owner approval; do not attribute a source result to a different code commit.

## Visual evidence and performance limits

The GitHub Actions [`visual-certification-captures` artifact](https://github.com/Forger-Digital-Solutions/forger-digital-solutions.github.io/actions/runs/39627371915#artifacts) for `b081d4c` contains 26 real browser captures: homepage, CodeForge, ForgerEMS, Releases (`/forged`), About, and the retired GEMS route's 404 at 390, 768, 1,440, and 1,920 CSS pixels, plus reduced-motion homepage and retired-route captures. The artifact does not contain standalone Forge Control, Dead Trails West, product-directory, mobile-navigation-open, or Kayla-open captures.

For the final source correction, a local browser review captured and inspected the homepage, Products, CodeForge, Forge Control, Dead Trails West, ForgerEMS, mobile navigation, the Kayla interface, and the footer. The reviewed mobile and desktop detail pages returned HTTP 200, had no failed images or horizontal overflow at 390/1,440 pixels, and had no unrevealed sections after settling. The mobile menu opened with `aria-expanded=true` and exposed its secondary links; Kayla opened with `aria-expanded=true`. These local review captures are temporary and are not included in the GitHub artifact. The committed browser checks additionally cover mobile navigation, routes, release downloads/checksum, accessibility, and product showcase behavior.

This is not production visual verification, an exhaustive visual-baseline comparison, or a performance audit. No Core Web Vitals or production performance audit was run.

## Production boundary

No V2 source was merged or deployed during these checks. The earlier recovery baseline at `d931201` had previously been checked live; that does not verify this V2 branch or the current production configuration. The Pages deployment workflow, Cloudflare Worker files, CNAME, and DNS settings were not changed. The successful PR checks validate the branch build, not the production domain; live verification remains an owner-approved post-deployment step.
