# Forger Digital Solutions — Website Maintenance Guide

**Stack:** Astro 7 (Static Output) · TypeScript · Self-Hosted Fontsource Fonts · Cloudflare Worker (Kayla Copilot) · Vitest · Playwright  
**Governance Docs:** Always read [`DESIGN.md`](../DESIGN.md) and [`BRAND_GUIDELINES.md`](../BRAND_GUIDELINES.md) before modifying UI or copy.

---

## 1. Local Development Commands

```bash
npm install                               # Install website dependencies
pnpm --dir worker install --frozen-lockfile  # Install Worker dependencies
npm run dev                               # Start Astro dev server at http://localhost:4321
npm run validate                          # Full content, Kayla, Astro check, build & link gate
npm test                                  # Run Vitest unit & governance suite
npm run test:e2e                          # Run Playwright browser certification suite
npm run worker:build                      # Dry-run Cloudflare Worker bundle check
```

---

## 2. How to Update a Model, Product, or Project Status

**Never hardcode status text across multiple Astro files.** Update the canonical JSON registry:

1. Edit [`content/public-status/registry.json`](../content/public-status/registry.json) matching [`docs/FDS_MODEL_STATUS_SCHEMA.json`](../docs/FDS_MODEL_STATUS_SCHEMA.json).
2. Update `last_verified` to the current ISO date (`YYYY-MM-DD`).
3. If updating a model family narrative or lineage, also update [`content/models/models.json`](../content/models/models.json).
4. Run `npm run validate:content && npm test` to verify schema compliance and non-conflation checks.

---

## 3. How to Publish a New Software Release

1. Verify binary artifacts, exact byte sizes, signing status, Git commit SHA, and 64-character SHA-256 checksums.
2. Add or update the entry in [`content/releases/releases.json`](../content/releases/releases.json) (and `src/data/products.ts` / `src/data/manifest.ts` if modifying Forged/CodeForge/ForgerEMS).
3. Add a dated entry in [`src/pages/changelog/index.astro`](../src/pages/changelog/index.astro) and [`content/publications/updates.json`](../content/publications/updates.json).
4. Run `npm run validate && npm test` so Kayla canonical knowledge, internal links, and Forged checksum tests stay 100% synchronized.

---

## 4. How to Publish Approved Evaluation Results

1. Confirm all 10 required fields in [`content/evaluations/evaluations.json`](../content/evaluations/evaluations.json) are backed by an owner-approved public export (including separate Raw vs. Guarded results and uncertainty bounds).
2. Add the record to `content/evaluations/evaluations.json` and update the matching model's `development_status` in `content/public-status/registry.json` if certified.
3. Never delete historical limitations or baseline disclosures.

---

## 5. How to Add Visual Assets Safely

Follow [`BRAND_GUIDELINES.md`](../BRAND_GUIDELINES.md):

- Mineral names inspire **accent tokens, geometric marks, and abstract computational forms** — NOT literal photographs of rocks, gemstones, or laboratory hardware.
- Generate/save dual-width `.webp` images under `public/images/forge/`: desktop (`1600px` wide, target `< 220 KB`) and mobile (`800px` wide `*-sm.webp`, target `< 80 KB`).
- Render via `<SpecimenMedia />` with honest provenance labeling (`Concept Art — Work in Progress (Not Gameplay)` for studio art; `Illustrative Architecture Visualization` for abstract model art).
- Always specify explicit `width`/`height` attributes to keep CLS near zero.

---

## 6. Dependency Security Maintenance

CI enforces zero high/critical advisories across both root `package.json` and `worker/`:

```bash
npm audit --audit-level=high
npm audit --omit=dev --audit-level=high
pnpm --dir worker audit --audit-level high
```

If a transitive Worker dependency reports a high-severity CVE, pin a minimal patched semver override in `worker/pnpm-workspace.yaml`, run `pnpm --dir worker install`, verify `pnpm --dir worker install --frozen-lockfile && pnpm --dir worker audit --audit-level high`, and test `npm run worker:build`.
