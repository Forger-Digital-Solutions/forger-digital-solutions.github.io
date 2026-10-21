# Website V2 test results

These results describe local validation of the V2 source on `feature/fds-website-v2`, based on recovery commit `d931201edd8570013b5e8c630060d88b5a7a72b3`. The local CI-mode Playwright run is not a GitHub Actions result, and neither is evidence that this branch is deployed.

## Local automated checks

| Check | Result |
|---|---|
| `npm ci` | Passed from the lockfile; 323 packages installed and audit reported 0 vulnerabilities. npm emitted a non-blocking approval warning for the existing `esbuild` install script. |
| `npm run validate` | Passed: content and knowledge checks, 345/345 offline Kayla golden queries, Astro diagnostics, static build, and internal links. |
| `npm test` | Passed: 62 test files, 1,050 tests. |
| `npm run build` | Passed: 28 static pages generated, including `dist/index.html` and all seven current project routes. |
| Internal links | Passed: 1,273 links across 28 built pages, 0 broken. |
| Astro diagnostics | 0 errors, 0 warnings, and 2 existing `document.execCommand` deprecation hints on Forged and ForgerEMS pages. |
| Secret and deployment-boundary scans | `npm run kayla:secret-scan`, `npm run codeforge:secret-scan`, and `npm run kayla:deploy:check` passed. |
| CI-mode Playwright | `CI=1 npm run test:e2e` passed: 161 tests, 26 skipped, across the configured Chromium, Firefox, and WebKit projects. |
| Final portfolio-focused Playwright | Passed: 16/16 tests for the current portfolio, product detail showcases, responsive bounds, mobile caption clearance, accessibility, navigation, and release-critical routes. |
| `git diff --check` | Passed before commit. |

## Visual and performance limits

Local rendered screenshots were captured and inspected for the homepage, CodeForge/Forge AAA, Forge Control, Dead Trails West, and ForgerEMS at 360, 390, 768, 1,280, and 1,920 CSS pixels. Responsive browser checks also assert bounds and overflow at those widths. This is a local visual review, not production verification or a formal visual-baseline certification. The CI-mode run skipped 26 tests under their configured conditions, including visual-certification captures; those captures must not be reported as passed. No Core Web Vitals or production performance audit was run.

## Production boundary

No V2 source was merged or deployed during these checks. The earlier recovery baseline at `d931201` had previously been checked live; that does not verify this V2 branch or the current production configuration. The Pages deployment workflow and production security gates were not changed. GitHub Actions results for the final pushed PR head and live-domain verification remain separate follow-up evidence.
