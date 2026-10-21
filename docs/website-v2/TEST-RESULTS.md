# Website V2 test results

These results distinguish local validation, GitHub Actions, and production. The latest completed Actions run at this review targeted `08773c4ef12698c3745f627e313239e179943b92` on `feature/fds-website-v2`, PR #3. A subsequent narrow local source follow-up corrects remaining unsupported Dead Trails West simulation-verification language; it requires its own Actions run after push.

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

Follow-up run [`39624480634`](https://github.com/Forger-Digital-Solutions/forger-digital-solutions.github.io/actions/runs/39624480634) on `08773c4ef12698c3745f627e313239e179943b92` completed successfully: Dependency Security Gate, Unit/Kayla/Build, and Playwright all passed; Pages deployment was skipped. The PR check rollup was `CLEAN`. The old check-run discrepancy was therefore historical, not a pending check on the exact `08773c4` PR head. Repository API inspection found no `main` branch protection or repository/inherited rulesets; the organization ruleset endpoint was unavailable, so organization-level rules are not asserted.

The latest narrow source/doc follow-up was not part of run `39624480634`; its Actions result must be checked on the new PR head. Do not attribute previous CI success to newer code.

## Visual evidence and performance limits

The GitHub Actions [`visual-certification-captures` artifact](https://github.com/Forger-Digital-Solutions/forger-digital-solutions.github.io/actions/runs/39624480634#artifacts) for `08773c4` contains 26 real browser captures: homepage, CodeForge, ForgerEMS, Releases (`/forged`), About, and the retired GEMS route's 404 at 390, 768, 1,440, and 1,920 CSS pixels, plus reduced-motion homepage and retired-route captures. The artifact does not contain standalone Forge Control, Dead Trails West, product-directory, mobile-navigation-open, or Kayla-open captures.

For the final source correction, a local browser review captured and inspected the homepage, Products, CodeForge, Forge Control, Dead Trails West, ForgerEMS, mobile navigation, the Kayla interface, and the footer. The reviewed mobile and desktop detail pages returned HTTP 200, had no failed images or horizontal overflow at 390/1,440 pixels, and had no unrevealed sections after settling. The mobile menu opened with `aria-expanded=true` and exposed its secondary links; Kayla opened with `aria-expanded=true`. These local review captures are temporary and are not included in the GitHub artifact. The committed browser checks additionally cover mobile navigation, routes, release downloads/checksum, accessibility, and product showcase behavior.

This is not production visual verification, an exhaustive visual-baseline comparison, or a performance audit. No Core Web Vitals or production performance audit was run.

## Production boundary

No V2 source was merged or deployed during these checks. The earlier recovery baseline at `d931201` had previously been checked live; that does not verify this V2 branch or the current production configuration. The Pages deployment workflow, Cloudflare Worker files, CNAME, and DNS settings were not changed. GitHub Actions results for the latest pushed PR head and live-domain verification remain separate follow-up evidence.
