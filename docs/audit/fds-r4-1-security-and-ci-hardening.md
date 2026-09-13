# FDS Website R4.1 — Security, CI & Release-Certification Hardening

Scope: narrow hardening pass on top of the certified R4 release
(`8d37c9f002641de8b6909e8463393128f93af2bb`). No redesign, no product changes,
no ecosystem changes. This document records the dependency-security triage, the
CI release-gate change, and the certification evidence strategy.

---

## 1. Dependency advisories

Starting state (reported by the R4 production GitHub Actions build during
`npm ci`, reproduced exactly by `npm audit` on the starting lockfile):
5 advisories — 1 critical, 4 high. The Worker lockfile carried 1 additional
high advisory (dev-only).

### Website (npm, `package-lock.json`)

| Advisory | Package | Installed | Vulnerable range | Fixed in | Severity | Dependency path | Exposure | Final status |
|---|---|---|---|---|---|---|---|---|
| GHSA-26w7-cxv4-gfx2 | astro | 7.2.4 | <7.2.8 | 7.2.8 | Critical (CVSS 9.8, CWE-125/CWE-787) | direct dependency | BUILD TOOLCHAIN — Astro runs only at build time on trusted repository content; the deployed artifact is fully static HTML/CSS/JS served from GitHub Pages, so no Astro code runs in the browser or on a server that accepts untrusted requests. The on-demand image service attack surface the advisory targets does not exist in this deployment (static output, no adapter). | PATCHED — astro 7.3.2 |
| GHSA-2883-xcg3-v3hh | js-yaml | 4.3.1 | >=4.0.0 <4.3.2 | 4.3.2 | High (CVSS 7.5, CWE-400/CWE-407) | astro → js-yaml; @astrojs/internal-helpers → js-yaml | BUILD TOOLCHAIN — YAML parsing of repository-owned config/content during build. No untrusted input reaches it. | PATCHED — js-yaml 4.3.2 |
| GHSA-rgj7-g3m4-5g8c | sharp | 0.35.3 | <0.35.4 | 0.35.4 | High (CWE-122, libheif) | astro → sharp | BUILD TOOLCHAIN — image optimization of repository-owned assets during `astro build`. AVIF/HEIF decoding of attacker-controlled images is not reachable: all processed images are committed files. | PATCHED — sharp 0.35.4 |
| GHSA-w27v-7q3p-w38r (high) and GHSA-4vpr-x523-8j87 (moderate) | svgo | 4.0.2 | >=4.0.0 <4.1.0 | 4.1.0 | High (CVSS 8.2) / Moderate (6.1) | astro → svgo | BUILD TOOLCHAIN — SVG optimization of repository-owned assets at build time. The removeScripts sanitization bypass requires processing attacker-supplied SVG, which the build never does. | PATCHED — svgo 4.1.0 |
| GHSA-5jgf-p345-68v8, GHSA-f65p-4m7j-42xc, GHSA-fph4-wmhf-6fwf, GHSA-jqff-g426-hqxp | fast-uri | 3.1.5 | >=3.0.0 <3.1.6 | 3.1.6 | High (CVSS 7.5, SSRF/host confusion) | svgo → css-tree → mdn-data → ajv → fast-uri (build tree); @astrojs/check → @astrojs/language-server → yaml-language-server → ajv → fast-uri (dev tooling) | BUILD TOOLCHAIN / TEST, DEVELOPMENT ONLY — URI normalization used by build/schema tooling. No request-capable surface. | PATCHED — fast-uri 3.1.7 |

### Worker (pnpm, `worker/pnpm-lock.yaml`)

| Advisory | Package | Installed | Vulnerable range | Fixed in | Severity | Dependency path | Exposure | Final status |
|---|---|---|---|---|---|---|---|---|
| GHSA-rgj7-g3m4-5g8c | sharp | 0.35.2 | <0.35.4 | 0.35.4 | High (CWE-122) | wrangler → miniflare → sharp (devDependency) | TEST / DEVELOPMENT ONLY — Wrangler and Miniflare run only on developer machines and in CI dry-run builds. The deployed Kayla Worker executes on Cloudflare's runtime, which does not run Wrangler, Miniflare, or sharp; image decoding is not part of the Worker's attack surface. | PATCHED — wrangler 4.125.0 → 4.131.1 (resolved sharp 0.35.4) |

### Verification

After remediation (all fixes applied within the existing semver ranges; no
major upgrades; no `npm audit fix --force`):

- `npm audit --json` → 0 vulnerabilities
- `npm audit --omit=dev --json` → 0 vulnerabilities (meets the preferred target)
- `pnpm --dir worker audit --json` → 0 vulnerabilities

No advisory remains open; there are no accepted-risk advisories in this pass.

### Runtime classification summary

- Static browser bundle: ships no Astro, sharp, svgo, js-yaml, or fast-uri
  code. None of the five website advisories were reachable from the deployed
  artifact; they were build-time-only. Patched regardless, to keep the build
  toolchain clean and the CI audit gate green.
- Cloudflare Worker: the only advisory (sharp via Wrangler) was local-dev-only
  and never executed in production. Patched via the Wrangler update.
- Build tooling: fully clean after remediation.
- Test tooling: fully clean after remediation.

---

## 2. CI architecture before

The production workflow (`.github/workflows/deploy.yml`) had two jobs:

```
build (npm ci, unit tests, Kayla gates, validate/build, secret scan, upload pages artifact)
  ↓
deploy (deploy-pages)
```

Playwright was never executed in CI. Browser regressions could reach
production even when the full local suite had been run by the release agent,
because deployment depended only on unit/build gates.

## 3. CI architecture after

```
build (unit, Kayla gates, Worker build, validate + production build, secret scan, upload site artifact)
  ↓
browser-certification (Playwright: Chromium full suite + Firefox/WebKit smoke,
                       CI-only visual certification captures)
  ↓
deploy (download site artifact → upload-pages-artifact → deploy-pages)
```

- Deployment is `needs: [build, browser-certification]`: a failing browser gate
  blocks the Pages deployment. Deployment remains a single Pages release — no
  duplicate deployment paths were added.
- The browser job uses the repository-pinned Playwright version from
  `npm ci` and installs browsers with
  `npx playwright install --with-deps chromium firefox webkit`.
- Playwright browser binaries are cached keyed on the OS + lockfile hash.

## 4. Browser certification

- Test count: 134 active Chromium tests (127 R4 baseline + 1 ForgerEMS facade
  regression + 6 site release-critical tests) plus 26 CI-only visual
  certification captures, plus the cross-browser Kayla smoke spec on Firefox
  and WebKit.
- Required deployment gate: the full Chromium suite and the Firefox/WebKit
  cross-browser smoke run in the `browser-certification` job; deployment
  cannot proceed if any of them fail. Cross-browser coverage is preserved,
  not dropped.
- The gate runs 2 workers on CI runners (local hardware runs 4) so the
  step-heavy Kayla journeys stay under their step budgets; CI retries are 1.
- Failure evidence: Playwright HTML report plus failure traces/screenshots
  (`trace: retain-on-failure`, `screenshot: only-on-failure`) uploaded as the
  `playwright-failure-evidence` artifact with 7-day retention. No evidence
  files are committed to Git.

## 5. Visual certification evidence

A CI-only Playwright spec (`test/e2e/visual-certification.spec.ts`) captures a
representative review set: homepage, Forged, GEMS, CodeForge, ForgerEMS, and
About at 390/768/1440/1920 widths, plus reduced-motion captures of the
animated homepage and GEMS surfaces at 1440. The set is uploaded as the
`visual-certification-captures` artifact (7-day retention) on every
browser-certification run. Full automated responsive assertions remain in the
release-critical and visual-commerce specs; this artifact exists so browser
and visual claims are independently auditable without committing screenshots.

## 6. Astro diagnostics disposition

`astro check`: 0 errors, 0 warnings, 1 hint.

The single hint is the deprecation of `document.execCommand('copy')` in the
Forged page SHA copy button
(`src/pages/forged.astro`, marked `KNOWN DEPRECATED COMPATIBILITY FALLBACK`).
Disposition: **retained deliberately**. The button already prefers the async
Clipboard API on secure contexts; the `execCommand` branch runs only when that
API is missing or rejects inside the user gesture, which still happens on some
browser builds. No clean modern replacement exists for that fallback, and
removing it would turn a copy action into a "Copy failed" state for those
users. Functionality was not sacrificed to produce a zero-hint report.

## 7. ForgerEMS video facade fix (R4 audit finding)

The R4 click-to-load facade appended `autoplay=1` to the runtime-created
YouTube iframe URL but omitted `autoplay` from that iframe's `allow`
permissions list, so browsers blocked programmatic playback and the visitor
had to press play a second time inside the player. The dynamic list now
matches the static fallback: `accelerometer; autoplay; clipboard-write;
encrypted-media; gyroscope; picture-in-picture; web-share`. The user's click
remains the only gesture that creates the player; nothing autoplays before
interaction. Regression coverage:
`test/e2e/forgerems-video-facade.spec.ts` asserts zero YouTube requests
before the click, the privacy-enhanced `youtube-nocookie.com` URL with
`autoplay=1` after it, the exact permission list, keyboard reachability, and
the accessible play label (with YouTube route-intercepted so the gate is
deterministic).

## 8. Remaining accepted risks

- None outstanding from the dependency audit: both audits report zero
  vulnerabilities.
- The retained `execCommand` fallback is a documented compatibility measure,
  not an open security finding (it operates on locally generated text within a
  user gesture).

---

Certification totals and the production deployment SHA for this pass are
recorded in the R4.1 release certification run of the
"Deploy to GitHub Pages" workflow.
