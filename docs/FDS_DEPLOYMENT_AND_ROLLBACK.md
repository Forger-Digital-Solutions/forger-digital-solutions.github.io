# Forger Digital Solutions — Deployment & Rollback Runbook

**Hosting Target:** GitHub Pages (`public/CNAME` -> `forgerdigitalsolutions.com`)  
**Workflow File:** [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)  
**Baseline Production Commit (`main`):** `9550949234a4636bcd4824f1a39a6aea9af7c859`  
**Redesign Branch:** `feature/operation-digital-forge`

---

## 1. Deployment Safety Architecture

Production deployment on `forgerdigitalsolutions.com` is **strictly gated by GitHub Actions**:

- **Pull Requests targeting `main`:** Run `security` (dependency audits), `build` (Vitest, Kayla deploy check, Worker build, `npm run validate`, secret scan), and `browser-certification` (Playwright Chromium + Firefox/WebKit smoke). The `deploy` job has `if: github.event_name != 'pull_request'` and **never deploys on a PR**.
- **Pushes / Merges to `main`:** Run all three gates sequentially; `deploy` publishes `./dist` to GitHub Pages **only** if every gate passes.
- **DNS & Custom Domain Preservation:** `public/CNAME` (`forgerdigitalsolutions.com`) is committed verbatim and copied automatically to `dist/CNAME`. No DNS records, registrars, or hosting providers are altered.

---

## 2. Pre-Deployment Verification Checklist (Owner Sign-Off Required)

Before merging `feature/operation-digital-forge` into `main`:

1. Confirm explicit owner approval after reviewing the preview build and visual QA screenshots.
2. Run locally or verify green GitHub Actions PR checks:
   ```bash
   npm audit --audit-level=high
   npm audit --omit=dev --audit-level=high
   pnpm --dir worker install --frozen-lockfile
   pnpm --dir worker audit --audit-level high
   npm test
   npm run kayla:deploy:check
   npm run worker:build
   npm run validate
   npm run kayla:secret-scan
   npm run test:e2e
   ```
3. Confirm `public/CNAME` still contains `forgerdigitalsolutions.com`.
4. Confirm zero changes to Cloudflare Worker production deployment (`worker/` is built and audited in CI; deploy Worker separately via `wrangler` only if Worker behavior changes).

---

## 3. Controlled Rollout Procedure

1. Open and review a Pull Request from `feature/operation-digital-forge` -> `main`.
2. Wait for all 3 GitHub Actions jobs (`security`, `build`, `browser-certification`) to pass green.
3. Upon explicit owner approval, merge the PR into `main`.
4. Monitor the triggered `Deploy to GitHub Pages` workflow run to completion.
5. Verify live smoke checks on `https://forgerdigitalsolutions.com`:
   - Homepage loads over HTTPS with `forgerdigitalsolutions.com` certificate intact.
   - Primary routes (`/models/`, `/products/jaspilite/`, `/research/project-forge/`, `/studio/state-lines/`, `/downloads/`, `/forged`, `/forgerems/`, `/docs/`, `/trust/`) return HTTP 200.
   - Kayla Copilot opens and responds cleanly.
   - ForgerEMS download links & CodeForge SHA-256 ZIP (`/downloads/codeforge/CodeForge-source-6b0770b.zip`) resolve cleanly.

---

## 4. Instant Rollback Procedure

If any unexpected regression occurs after merging to `main`:

### Option A — Git Revert (Recommended, preserves history)
```bash
git checkout main
git pull origin main
git revert -m 1 <MERGE_COMMIT_SHA>
git push origin main
```
GitHub Actions immediately validates and redeploys the exact prior state (`9550949` baseline) within ~3–5 minutes.

### Option B — Emergency Reset to Verified Baseline Commit (if revert conflicts)
```bash
git checkout main
git checkout -b rollback/to-9550949 9550949234a4636bcd4824f1a39a6aea9af7c859
# Open fast-track PR or force-restore per repo branch protection rules
```

### Cloudflare Worker Rollback (if Worker is ever deployed independently)
```bash
cd worker && npx wrangler rollback
```
(Note: Operation Digital Forge only updated `worker/pnpm-workspace.yaml` & `worker/pnpm-lock.yaml` to patch a transitive `undici` CVE; Worker runtime code is unchanged.)
