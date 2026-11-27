# FDS Deployment & Rollback Runbook — Operation Digital Forge II

> **Repository:** `Forger-Digital-Solutions/forger-digital-solutions.github.io`
> **Production Branch:** `main` (GitHub Pages custom domain: `forgerdigitalsolutions.com`)
> **Development Candidate Branch:** `feature/operation-digital-forge`
> **Workflow:** [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)
> **Last Updated:** 2026-11-26

---

## 1. Non-Negotiable Production Safeguards

1. **No Unapproved Production Deploys:** Automated agents must NEVER merge `feature/operation-digital-forge` into `main`, trigger GitHub Pages production deployment, deploy Cloudflare Workers (`worker/`), or alter DNS without explicit owner approval.
2. **Pull Request CI Gate Only:** Opening a Pull Request against `main` executes:
   - `security`: `npm ci`, `npm audit --audit-level=high`, `npm audit --omit=dev --audit-level=high`, `pnpm --dir worker install --frozen-lockfile`, `pnpm --dir worker audit --audit-level high`
   - `build`: `npm test` (64 files / 1,063 tests), `npm run kayla:deploy:check`, `npm run worker:build` (dry-run), `npm run validate` (content schema, Kayla drift/inventory/365 golden queries, `astro check`, `astro build` across 69 pages, 7,916 internal link check), `npm run kayla:secret-scan`
   - `browser-certification`: Full Playwright E2E across Chromium plus cross-browser smoke tests on Firefox and WebKit, uploading `visual-certification-captures`
   - `deploy` is **explicitly skipped on Pull Requests** (`if: github.event_name != 'pull_request'`).

---

## 2. Owner Approval & Production Release Procedure

Once the executive owner has reviewed the Pull Request, Visual Review Gallery, and green GitHub Actions checks:

1. **Merge the Pull Request** (`feature/operation-digital-forge` → `main`) in GitHub UI using standard merge or squash merge.
2. **Automatic GitHub Pages Deployment:** Merging to `main` triggers `.github/workflows/deploy.yml` (`security` → `build` → `browser-certification` → `deploy`), publishing `./dist` via `actions/deploy-pages@v5` to `https://forgerdigitalsolutions.com`.
3. **Optional Cloudflare Worker Update (Separate Explicit Step):** Because Operation Digital Forge II expanded Kayla's canonical knowledge (`src/data/kayla/*`, `src/lib/kayla/*`) to cover all 7 flagships and 15 commercial queries, the owner should deploy the updated Kayla Worker AFTER reviewing and approving:
   ```bash
   npm run kayla:deploy
   ```
   *(Runs `kayla:deploy:check` before `wrangler deploy`; requires authenticated Cloudflare Wrangler credentials. Static pages and offline deterministic fallback continue working safely even before the Worker is redeployed.)*
4. **Post-Release Smoke Verification:**
   - Verify `https://forgerdigitalsolutions.com/`, `/solutions/`, `/models/hackmanite/`, `/products/battleverse/arena/`, `/products/battleverse/creator-studio/`, and `/contact/?track=enterprise` return HTTP 200 with zero broken images.
   - Verify `/forgerems/` and `/forged` download links and SHA-256 digests remain intact.
   - Verify Kayla Copilot responds accurately to `"What is Hackmanite?"`, `"What is BattleVerse Creator Studio?"`, and `"Can FDS build a private AI for my gaming studio?"`.

---

## 3. Instant Rollback Procedure

If any defect appears after merging into `main`:

### Option A — GitHub Revert PR (Recommended, Preserves Full Audit Trail)
```bash
git checkout main
git pull origin main
git revert -m 1 <merge-commit-sha>
git push origin main
```
GitHub Actions immediately rebuilds and redeploys the prior verified baseline (`9550949` or prior release commit) through the full `security → build → browser-certification → deploy` pipeline (~4–6 minutes).

### Option B — Cloudflare Worker Rollback (If Worker Was Deployed)
```bash
cd worker
npx wrangler deployments list
npx wrangler rollback <previous-version-id>
```

---

## 4. DNS & Custom Domain Integrity

- `public/CNAME` (`forgerdigitalsolutions.com`) is preserved unchanged in `dist/CNAME`.
- Zero DNS records (`A`, `AAAA`, `CNAME`, `TXT`) are modified by Operation Digital Forge II.
