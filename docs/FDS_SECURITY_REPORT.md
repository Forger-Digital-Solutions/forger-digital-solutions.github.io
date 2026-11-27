# Forger Digital Solutions — Security & Dependency Audit Report

**Audit Date:** 2026-11-26  
**Branch:** `feature/operation-digital-forge`  
**Hosting Model:** Static HTML/CSS/JS output on GitHub Pages + isolated Cloudflare Worker (`worker/`) for optional Kayla Copilot requests

---

## 1. Dependency Vulnerability Remediation

During baseline inspection on `main` (`9550949`), two high-severity dependency advisories existed across root dependencies (`undici`, `zod`) and the Cloudflare Worker (`undici` transitive via `wrangler`/`miniflare`). All advisories were remediated without introducing breaking runtime changes:

| Gate Command | Baseline (`main`) | Operation Digital Forge |
|---|---|---|
| `npm audit --audit-level=high` | 2 high (`undici`, `zod`) | **0 vulnerabilities** |
| `npm audit --omit=dev --audit-level=high` | 0 high | **0 vulnerabilities** |
| `pnpm --dir worker install --frozen-lockfile` | Valid | **Valid (lockfile up to date)** |
| `pnpm --dir worker audit --audit-level high` | High (`undici` transitive) | **No known vulnerabilities found** |

**Fix Applied:**
- Executed `npm audit fix` to patch root `undici` and `zod` within compatible semver ranges.
- Added `"undici": ">=7.30.1"` override in `worker/pnpm-workspace.yaml` and refreshed `worker/pnpm-lock.yaml`; verified `npm run worker:build` dry-run passes cleanly.

---

## 2. Static Site & Client Security Controls

- **Zero Inline Eval / Zero Unsafe Dynamic HTML Injection:** Interactive components (`Header.astro`, `EcosystemGraph.astro`, `JaspiliteWorkbench.astro`, `docs/index.astro`, `news/index.astro`) use safe DOM text updates (`textContent`, attribute toggles, `hidden` state) rather than unsanitized `innerHTML` with user input.
- **External Link Hygiene (`rel="noopener noreferrer"`):** External links opening in new tabs (`target="_blank"`) consistently specify `rel="noopener noreferrer"` to prevent reverse tabnabbing.
- **Self-Hosted Webfonts (Zero External Font Trackers):** All typography (`Inter Variable`, `Space Grotesk Variable`, `JetBrains Mono Variable`, `Instrument Serif`) is bundled locally via `@fontsource/*` packages, eliminating Google Fonts network requests and third-party IP disclosure.
- **Binary Download Verification:** Every public package on `/downloads/`, `/releases/`, `/forged`, and `/forgerems/` publishes exact 64-character SHA-256 digests and explicitly discloses unsigned prerelease SmartScreen behavior.
- **Fail-Closed Commercial Boundaries:** `/codeforge/upgrade` remains `noindex, nofollow` with zero active checkout endpoints or spoofable `?status=success` entitlement banners.

---

## 3. Secret, Token & Private Data Leakage Scans

- **`npm run kayla:secret-scan`:** PASS (0 secrets detected in generated assets).
- **`npm run kayla:deploy:check`:** PASS (Worker config, CORS allowlists, rate limits, and payload limits verified).
- **Private Path & Compliance Leak Scan (`scripts/validate-content.mjs` + `test/operation-digital-forge-governance.test.ts` + `rg` on `dist/`):** PASS — **0 occurrences** of private Windows/Drive paths (`Z:\`, `E:\`, `D:\`, `Daddy_FDS`, `My Drive`), API keys, or unverified `SOC 2` / `ISO 27001` / `HIPAA` claims.

---

## 4. Cloudflare Worker & Kayla Copilot Security Boundary

All pre-existing Kayla Copilot security test suites remain 100% green:
- Trust boundary & prompt injection resistance (`test/kayla-trust-boundary.test.ts`, `test/kayla-retrieved-content-injection.test.ts`)
- Observability & privacy guards (`test/kayla-observability-privacy.test.ts`)
- Rate limiting (`5/min`, `60/hr`, `150/day` AI cap), `16,384 B` max payload size, `9,000 ms` provider timeout (`worker/wrangler.toml`)

---

## 5. Honest Scope Disclosure

GitHub Pages does not allow arbitrary custom HTTP response headers (such as server-level `Content-Security-Policy` or `Permissions-Policy` response headers) without placing a reverse proxy/CDN layer in front of Pages. Because DNS and hosting changes are explicitly out of scope for Operation Digital Forge, FDS preserves its GitHub Pages static deployment unchanged and avoids claiming unconfigured server headers or uncompleted third-party security certifications.
