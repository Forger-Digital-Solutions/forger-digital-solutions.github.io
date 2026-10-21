# Website V2 test results

Validation is against the V2 working tree on `feature/fds-website-v2`, based on `d931201edd8570013b5e8c630060d88b5a7a72b3`.

| Check | Result |
|---|---|
| `npm ci` | Passed; lockfile install completed, audit reported 0 vulnerabilities. |
| `npm test -- --run` | Passed: 62 test files, 1,051 tests. |
| `npm run validate` | Passed after the final Kayla-routing and production-note changes. Includes content validation, Kayla drift and knowledge checks, the 345-query offline Kayla golden suite, Astro diagnostics, static build, and internal-link validation. |
| Kayla golden queries | Passed: 345/345 across all three tiers. Legacy portfolio prompts now assert the current-portfolio response and `/projects` destination rather than old product claims. |
| Astro diagnostics | 0 errors; 0 warnings and 2 existing deprecation hints (`document.execCommand` on Forged and ForgerEMS pages). |
| Static build | Passed; 28 pages generated, including the homepage and all seven current project routes. Draft note detail routes are excluded in production. |
| Internal links | Passed: 1,265 links checked across the production build, 0 broken. |
| Playwright Chromium | Passed: 153 tests; 26 tests were intentionally skipped by their test conditions. No failures. |
| Playwright Firefox + WebKit | Passed: all 6 cross-browser Kayla shell smoke tests. |
| Updated portfolio browser checks | Passed: 14/14 Chromium tests for current orbital geometry, responsive portfolio presentation, accessibility, navigation, and project detail routes. |
| `git diff --check` | Passed. |

The obsolete homepage GEMS-specific visual checks and retired eight-project orbit assumptions were replaced with browser coverage for the current seven-project portfolio. The production workflow and its security gates were not changed.
